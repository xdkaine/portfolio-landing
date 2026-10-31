import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { test, expect, type APIRequestContext } from "@playwright/test";
import type { PostNode } from "../src/lib/postContent";
import type { WritingArticle, WritingSummary } from "../src/lib/v2/writing";

const fixtureId = randomUUID();
const fixtureSlugs = {
  published: `v2-writing-published-${fixtureId}`,
  draft: `v2-writing-draft-${fixtureId}`,
  archived: `v2-writing-archived-${fixtureId}`,
};
const fixtureSearch = `v2-writing-fixture-${fixtureId}`;
let fixturesCreated = false;

function isDisposableCi(baseURL: string | undefined): boolean {
  return process.env.CI === "true" && baseURL === "http://127.0.0.1:18089";
}

function fixtureSql(baseURL: string | undefined, query: string): string {
  if (!isDisposableCi(baseURL)) throw new Error("Writing fixtures require the exact disposable CI Compose stack.");
  // Never use DATABASE_URL here: local previews can point at a real dev database.
  return execFileSync("docker", [
    "compose", "-p", "portfolio-ci", "-f", "docker-compose.test.yml",
    "exec", "-T", "db", "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "xtomm", "-d", "portfolio",
  ], { input: query, encoding: "utf8", timeout: 10000 });
}

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

async function writing(request: APIRequestContext): Promise<WritingSummary[]> {
  const response = await request.get("/v2/api/writing");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toBe("noindex");
  const payload = await response.json();
  expect(payload.version).toBe("v2");
  expect(Array.isArray(payload.data.items)).toBeTruthy();
  expect(payload.data.total).toBe(payload.data.items.length);
  return payload.data.items;
}

async function article(request: APIRequestContext, slug: string): Promise<WritingArticle> {
  const response = await request.get(`/v2/api/writing/${slug}`);
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.version).toBe("v2");
  return payload.data;
}

function nodes(node: PostNode): PostNode[] {
  return [node, ...(node.content ?? []).flatMap(nodes)];
}

function text(node: PostNode): string {
  return node.type === "text" ? node.text ?? "" : (node.content ?? []).map(text).join("");
}

test.describe("v2 published writing", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60000);

  test.beforeAll(async ({ baseURL }) => {
    if (!isDisposableCi(baseURL)) return;
    expect(fixtureSql(baseURL, "SELECT current_database();").trim()).toBe("portfolio");
    const document = JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A CI article section" }] },
        { type: "paragraph", content: [{ type: "text", text: `Published fixture body ${fixtureSearch}.` }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "A second section" }] },
        { type: "paragraph", content: [{ type: "text", text: "A second paragraph verifies the article body is rendered." }] },
        { type: "image", attrs: { src: "javascript:alert(1)", alt: "Unsafe fixture media" } },
      ],
    });
    const values = Object.entries(fixtureSlugs).map(([state, slug]) => (
      `(${literal(slug)},${literal(slug)},${literal(`Disposable writing ${state} ${fixtureSearch}`)},` +
      `${literal(`Disposable CI fixture ${fixtureSearch}`)},${literal(document)}::jsonb,` +
      `'2026.10.31','1 MIN',ARRAY['INFRASTRUCTURE']::text[],true,${literal(state.toUpperCase())}::"PostStatus",now(),now())`
    )).join(",");
    fixtureSql(baseURL, `INSERT INTO posts(id,slug,title,excerpt,body_json,date,read_time,tags,published,status,published_at,updated_at) VALUES ${values};`);
    fixturesCreated = true;
  });

  test.afterAll(async ({ baseURL }) => {
    if (!fixturesCreated) return;
    fixtureSql(baseURL, `DELETE FROM posts WHERE id IN (${Object.values(fixtureSlugs).map(literal).join(",")});`);
    fixturesCreated = false;
  });

  test("public APIs read published author content and exclude CMS metadata", async ({ request }) => {
    const items = await writing(request);
    const sourceResponse = await request.get("/v1/api/posts");
    expect(sourceResponse.ok()).toBeTruthy();
    const source = await sourceResponse.json() as WritingSummary[];
    expect(items.map(item => item.slug)).toEqual(source.map(item => item.slug));
    for (const item of items) {
      const original = source.find(post => post.slug === item.slug)!;
      expect(item.title).toBe(original.title);
      expect(item.excerpt).toBe(original.excerpt);
      expect(item.href).toBe(`/v2/writing/${item.slug}`);
      expect(item.kind).toBe("writing");
      for (const field of ["id", "status", "published", "version", "deletedAt", "hasUnpublishedChanges", "needsContent", "createdAt", "content", "bodyJson"]) {
        expect(Object.hasOwn(item, field), `${field} must not leak into summaries`).toBeFalsy();
      }
    }
    if (!items.length) return;
    const detail = await article(request, items[0].slug);
    const originalResponse = await request.get(`/v1/api/posts/${items[0].slug}`);
    expect(originalResponse.ok()).toBeTruthy();
    const original = await originalResponse.json();
    expect(detail.title).toBe(original.title);
    expect(detail.bodyJson).toEqual(original.bodyJson);
    expect(detail.content).toBe(original.content?.trim() ? original.content : null);
    for (const field of ["id", "status", "published", "version", "deletedAt", "hasUnpublishedChanges", "needsContent", "createdAt"]) {
      expect(Object.hasOwn(detail, field), `${field} must not leak into article responses`).toBeFalsy();
    }
  });

  test("library filters have separate groups and reject invalid input or mutation", async ({ request }) => {
    for (const kind of ["all", "projects", "writing"]) {
      const response = await request.get(`/v2/api/library?kind=${kind}&discipline=Infrastructure`);
      expect(response.status()).toBe(200);
      const { version, data } = await response.json();
      expect(version).toBe("v2");
      expect(data.query).toEqual({ q: "", discipline: "Infrastructure", kind });
      expect(data.total).toBe(data.projects.total + data.writing.total);
      expect(data.projects.total).toBe(data.projects.items.length);
      expect(data.writing.total).toBe(data.writing.items.length);
      if (kind === "writing") expect(data.projects.items).toEqual([]);
      if (kind === "projects") expect(data.writing.items).toEqual([]);
      for (const item of [...data.projects.items, ...data.writing.items]) expect(item.disciplines).toContain("Infrastructure");
    }
    for (const path of [
      "/v2/api/library?kind=invalid", "/v2/api/library?discipline=invalid",
      `/v2/api/library?q=${"x".repeat(121)}`, "/v2/api/writing?discipline=invalid",
      `/v2/api/writing?q=${"x".repeat(121)}`,
    ]) {
      const response = await request.get(path);
      expect(response.status()).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_QUERY");
    }
    for (const slug of [`v2-missing-${fixtureId}`, "Invalid_Slug", "x".repeat(121)]) {
      expect((await request.get(`/v2/api/writing/${slug}`)).status()).toBe(404);
    }
    for (const path of ["/v2/api/writing", "/v2/api/writing/missing", "/v2/api/library"]) {
      for (const method of ["POST", "PATCH", "DELETE"]) {
        expect((await request.fetch(path, { method, data: {} })).status()).toBe(405);
      }
    }
  });

  test("GET discovery and native articles work without JavaScript", async ({ browser, request, baseURL }) => {
    const items = await writing(request);
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    try {
      await page.goto("/v2/work");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects & writing");
      await page.getByLabel("Show", { exact: true }).selectOption("writing");
      await page.getByLabel("Discipline", { exact: true }).selectOption("All");
      const query = items[0]?.title ?? `missing-writing-${fixtureId}`;
      await page.getByRole("searchbox", { name: "Search work", exact: true }).fill(query);
      await page.getByRole("button", { name: "Find", exact: true }).click();
      const url = new URL(page.url());
      expect(url.searchParams.get("q")).toBe(query);
      expect(url.searchParams.get("kind")).toBe("writing");
      expect(url.searchParams.get("discipline")).toBe("All");
      await expect(page.getByRole("searchbox", { name: "Search work", exact: true })).toHaveValue(query);
      await expect(page.getByLabel("Show", { exact: true })).toHaveValue("writing");
      if (items.length) {
        const link = page.locator(`main a[href="${items[0].href}"]`).first();
        await expect(link).toContainText(items[0].title);
        await link.click();
        await expect(page).toHaveURL(new RegExp(`/v2/writing/${items[0].slug}$`));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(items[0].title);
        await expect(page.getByRole("link", { name: /Back to library$/ }).first()).toHaveAttribute("href", "/v2/work");
      }
      await page.goto(`/v2/work?kind=writing&q=missing-writing-${fixtureId}`);
      await expect(page.locator('main a[href^="/v2/writing/"]')).toHaveCount(0);
      await expect(page.locator("main")).toContainText(/No .*match|No .*found|No results/i);
      await page.goto("/v2/work?kind=invalid&q=LDAP");
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("searchbox", { name: "Search work", exact: true })).toHaveValue("LDAP");
    } finally {
      await context.close();
    }
  });

  // Baseline Next.js nested notFound rendering returns an empty no-JS body in
  // both development and production, also reproduced on /v1/blog and /v2/work.
  // Related report: https://github.com/vercel/next.js/issues/95613 (closed for an
  // invalid reproduction; it does not establish a fix). Preserve this assertion
  // for a separately scoped framework fix; published no-JS reading stays strict.
  test.fixme("baseline: a missing article has a visible no-JavaScript fallback", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    try {
      expect((await page.goto(`/v2/writing/missing-writing-${fixtureId}`))?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Article not found");
      await expect(page.getByRole("link", { name: /Back to library$/ }).first()).toHaveAttribute("href", "/v2/work");
    } finally {
      await context.close();
    }
  });

  test("native article preserves published headings, contents links, media, and metadata", async ({ page, request }) => {
    const items = await writing(request);
    test.skip(items.length === 0, "The published writing source is legitimately empty.");
    const selected = items.find(item => item.coverImage) ?? items[0];
    const detail = await article(request, selected.slug);
    const v1Requests: string[] = [];
    page.on("request", outgoing => {
      if (new URL(outgoing.url()).pathname.startsWith("/v1/api/")) v1Requests.push(outgoing.url());
    });
    expect((await page.goto(selected.href))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(detail.title);
    await expect(page.getByText(detail.excerpt, { exact: true })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/v2/writing/${detail.slug}$`));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const headings = (detail.bodyJson?.content ?? []).filter(node => node.type === "heading");
    const renderedHeadings = page.locator(".article-prose h2, .article-prose h3, .article-prose h4");
    await expect(renderedHeadings).toHaveCount(headings.length);
    for (let index = 0; index < headings.length; index += 1) await expect(renderedHeadings.nth(index)).toHaveText(text(headings[index]));
    const contents = page.getByRole("navigation", { name: "On this page", exact: true }).locator('a[href^="#"]');
    await expect(contents).toHaveCount(headings.length);
    if (headings.length) {
      const parentDetails = page.locator('main details:has(nav a[href^="#"])');
      if (await parentDetails.count() && await parentDetails.first().locator("summary").isVisible() && await parentDetails.first().getAttribute("open") === null) {
        await parentDetails.first().locator("summary").click();
      }
      for (let index = 0; index < headings.length; index += 1) {
        const href = await contents.nth(index).getAttribute("href");
        expect(href).toMatch(/^#[a-z0-9-]+$/);
        await expect(page.locator(`main [id="${href!.slice(1)}"]`)).toHaveText(text(headings[index]));
      }
      await contents.first().click();
      expect(new URL(page.url()).hash).toBe(await contents.first().getAttribute("href"));
    }
    const inlineImages = (detail.bodyJson?.content ?? []).flatMap(nodes).filter(node => node.type === "image");
    const media = [
      ...(detail.coverImage ? [{ src: detail.coverImage, alt: detail.coverAlt ?? "" }] : []),
      ...inlineImages.map(node => ({ src: String(node.attrs?.src), alt: String(node.attrs?.alt ?? "") })),
    ];
    for (const image of media) {
      const renderedImages = page.locator("main img");
      const index = await renderedImages.evaluateAll((elements, src) => elements.findIndex(element => element.getAttribute("src") === src), image.src);
      expect(index, `The authored image ${image.src} is rendered`).toBeGreaterThanOrEqual(0);
      // Match the authored source, then decode lazy images after bringing them into view.
      const imageElement = renderedImages.nth(index);
      await expect(imageElement).toHaveAttribute("alt", image.alt);
      await imageElement.scrollIntoViewIfNeeded();
      await expect.poll(() => imageElement.evaluate(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBeTruthy();
    }
    await expect(page.locator('main img[src^="javascript:"], main a[href^="javascript:"]')).toHaveCount(0);
    expect(v1Requests).toEqual([]);
    expect((await page.goto(`/v2/writing/missing-writing-${fixtureId}`))?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Article not found");
    await expect(page.getByRole("link", { name: /Back to library$/ }).first()).toHaveAttribute("href", "/v2/work");
  });

  test("SDC Cloud and its published isolated-lab article connect in both directions", async ({ page, request }) => {
    const items = await writing(request);
    const connected = items.find(item => item.relatedProjects.some(project => project.slug === "sdc-cloud"));
    await page.goto("/v2/work/sdc-cloud");
    await expect(page.locator("main")).toContainText(/isolated|nested|mock data center/i);
    if (!connected) {
      await expect(page.locator('main a[href^="/v2/writing/"]')).toHaveCount(0);
      return;
    }
    await expect(page.getByRole("heading", { name: "Related writing", exact: true })).toBeVisible();
    await page.locator(`main a[href="${connected.href}"]`).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(connected.title);
    await expect(page.getByRole("heading", { name: "Related project", exact: true })).toBeVisible();
    await page.locator('main a[href="/v2/work/sdc-cloud"]').first().click();
    await expect(page).toHaveURL(/\/v2\/work\/sdc-cloud$/);
    for (const slug of ["uma", "uar"]) {
      await page.goto(`/v2/work/${slug}`);
      await expect(page.locator(`main a[href="${connected.href}"]`)).toHaveCount(0);
    }
    const homelab = items.find(item => item.slug === "building-my-homelab");
    if (homelab) {
      await page.goto(homelab.href);
      await expect(page.getByRole("heading", { name: "Related project", exact: true })).toHaveCount(0);
    }
  });

  test("article layouts fit and pass automated accessibility checks", async ({ page, request }) => {
    const items = await writing(request);
    test.skip(items.length === 0, "The published writing source is legitimately empty.");
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(items[0].href);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
      const scan = await new AxeBuilder({ page }).include(".v2").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(scan.violations).toEqual([]);
    }
  });

  test("CI publication state excludes drafts and archives, then removes unpublished content immediately", async ({ request, page, baseURL }) => {
    test.skip(!isDisposableCi(baseURL), "Mutation coverage runs only in the exact disposable CI Compose stack.");
    expect(fixturesCreated).toBeTruthy();
    const initial = await writing(request);
    expect(initial.some(item => item.slug === fixtureSlugs.published)).toBeTruthy();
    for (const slug of [fixtureSlugs.draft, fixtureSlugs.archived]) {
      expect(initial.some(item => item.slug === slug)).toBeFalsy();
      expect((await request.get(`/v2/api/writing/${slug}`)).status()).toBe(404);
      expect((await page.goto(`/v2/writing/${slug}`))?.status()).toBe(404);
    }
    // Prime both rendered and JSON routes to detect stale publication caches.
    expect((await page.goto(`/v2/writing/${fixtureSlugs.published}`))?.status()).toBe(200);
    try {
      fixtureSql(baseURL, `UPDATE posts SET published=false WHERE id=${literal(fixtureSlugs.published)};`);
      expect((await request.get(`/v2/api/writing/${fixtureSlugs.published}`)).status()).toBe(404);
      expect((await writing(request)).some(item => item.slug === fixtureSlugs.published)).toBeFalsy();
      const library = await request.get(`/v2/api/library?kind=writing&q=${fixtureSearch}`);
      expect(library.status()).toBe(200);
      expect((await library.json()).data.writing.items).toEqual([]);
      expect((await page.goto(`/v2/writing/${fixtureSlugs.published}`))?.status()).toBe(404);
      await page.goto(`/v2/work?kind=writing&q=${fixtureSearch}`);
      await expect(page.locator(`main a[href="/v2/writing/${fixtureSlugs.published}"]`)).toHaveCount(0);
    } finally {
      fixtureSql(baseURL, `UPDATE posts SET published=true WHERE id=${literal(fixtureSlugs.published)};`);
    }
  });
});
