import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { ensureProjectFixture, removeProjectFixture } from "./fixture-project";
import { expectBlockReplay } from "./scroll-helpers";

const id = randomUUID();
const marker = `v2-blog-${id}`;
const slugs = { published: `${marker}-published`, draft: `${marker}-draft`, archived: `${marker}-archived` };
let seeded = false;
let projectFixture: string | null = null;
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const disposable = (baseURL?: string) => process.env.CI === "true" && baseURL === "https://127.0.0.1:18089";
function sql(baseURL: string | undefined, statement: string) {
  if (!disposable(baseURL)) throw new Error("Blog fixtures require the exact disposable CI database.");
  return execFileSync("docker", ["compose", "-p", "portfolio-ci", "-f", "docker-compose.test.yml", "exec", "-T", "db", "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "xtomm", "-d", "portfolio"], { input: statement, encoding: "utf8", timeout: 10000 });
}

test.describe("V2 published blog content", () => {
  test.beforeAll(async ({ baseURL }) => {
    if (!disposable(baseURL)) return;
    projectFixture = ensureProjectFixture(baseURL);
    const body = JSON.stringify({ type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: `Published body ${marker}` }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A published section" }] },
      { type: "paragraph", content: [{ type: "text", text: "The published article stays readable with or without JavaScript." }] },
    ] });
    for (const [state, slug] of Object.entries(slugs)) {
      const document = JSON.parse(body);
      document.content[0].content[0].text = `${state} body ${marker}`;
      sql(baseURL, `INSERT INTO posts(id,slug,title,excerpt,body_json,date,read_time,tags,status,published,published_at,updated_at) VALUES (${literal(slug)},${literal(slug)},${literal(`${state} ${marker}`)},${literal(marker)},${literal(JSON.stringify(document))}::jsonb,'2026-11-21','1 MIN READ',ARRAY['V2 QA'],${literal(state.toUpperCase())}::"PostStatus",${state === "published"},${state === "published" ? "now()" : "NULL"},now());`);
    }
    seeded = true;
  });
  test.afterAll(async ({ baseURL }) => {
    removeProjectFixture(baseURL, projectFixture);
    if (seeded) sql(baseURL, `DELETE FROM posts WHERE id IN (${Object.values(slugs).map(literal).join(",")});`);
  });

  test("drafts and archived posts are absent from V2 lists, details and page HTML", async ({ request, baseURL }) => {
    test.skip(!disposable(baseURL), "Privacy fixtures are written only to the disposable CI database.");
    const response = await request.get(`/v2/api/posts?q=${marker}`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.data.items.map((post: { slug: string }) => post.slug)).toEqual([slugs.published]);
    for (const [state, slug] of [["draft", slugs.draft], ["archived", slugs.archived]]) {
      expect((await request.get(`/v2/api/posts/${slug}`)).status()).toBe(404);
      const page = await request.get(`/v2/blog/${slug}`);
      expect(page.status()).toBe(404);
      expect(await page.text()).not.toContain(`${state} body ${marker}`);
      expect((await request.get(`/v2/blog/${slug}/opengraph-image`)).status()).toBe(404);
    }
  });

  test("Discord can read linked PNG cards from the initial HTML head", async ({ request }) => {
    const [postsResponse, projectsResponse] = await Promise.all([
      request.get("/v2/api/posts"),
      request.get("/v1/api/projects"),
    ]);
    expect(postsResponse.ok()).toBeTruthy();
    expect(projectsResponse.ok()).toBeTruthy();
    const { data: { items: posts } } = await postsResponse.json();
    const projects = await projectsResponse.json();
    expect(posts.length).toBeGreaterThan(0);
    expect(projects.length).toBeGreaterThan(0);

    for (const path of ["/v2", `/v2/blog/${posts[0].slug}`, `/v2/projects/${projects[0].number}`]) {
      const response = await request.get(path, { headers: { "User-Agent": "Discordbot/2.0" } });
      expect(response.ok()).toBeTruthy();
      const head = (await response.text()).split("</head>", 1)[0];
      expect(head).toContain('property="og:title"');
      expect(head).toContain('property="og:description"');
      expect(head).toContain('property="og:image:alt"');
      expect(head).toContain('name="twitter:card" content="summary_large_image"');
      const image = head.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
      expect(image).toBeTruthy();
      const url = new URL(image ?? "");
      expect(url.pathname).toBe(`${path}/opengraph-image`);
      const card = await request.get(url.pathname + url.search);
      expect(card.ok()).toBeTruthy();
      expect(card.headers()["content-type"]).toContain("image/png");
      const png = await card.body();
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    }
  });

  test("published V2 articles retain headings and replay their body reveals", async ({ page, request }) => {
    const posts = (await (await request.get("/v2/api/posts")).json()).data.items;
    const post = posts.find((item: { slug: string }) => item.slug === slugs.published) ?? posts[0];
    expect(post).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/v2/blog/${post.slug}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("main h1")).toHaveText(post.title);
    await expectBlockReplay(page, page.locator("article .article-prose > [data-story-reveal]").first());
    if (post.slug === slugs.published) {
      await expect(page.getByRole("heading", { name: "A published section", exact: true })).toHaveAttribute("id", "a-published-section");
    }
  });

  test("published V2 articles and project links work without JavaScript", async ({ browser, request, baseURL }) => {
    const posts = (await (await request.get("/v2/api/posts")).json()).data.items;
    expect(posts.length).toBeGreaterThan(0);
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, extraHTTPHeaders: { DNT: "1" } });
    try {
      const page = await context.newPage();
      await page.goto(`/v2/blog/${posts[0].slug}`);
      await expect(page.locator("main h1")).toHaveText(posts[0].title);
      await expect(page.locator("article .article-prose")).toBeVisible();
      expect(await page.locator("main h1").evaluate(element => getComputedStyle(element).opacity)).toBe("1");
      await page.goto("/v2/projects");
      const project = page.getByRole("link", { name: /^View project:/ }).first();
      await expect(project).toHaveAttribute("href", /^\/v2\/projects\//);
      // With page scripts disabled, Chromium can stall its actionability RAF
      // after observing the CSS entrance mid-flight. Wait for that finite
      // entrance to finish, then exercise the same native pointer navigation.
      await expect.poll(() => project.evaluate(element =>
        element.closest(".scroll-reveal-content")?.getAnimations().every(animation => animation.playState === "finished") ?? true,
      )).toBe(true);
      await project.click();
      await expect(page).toHaveURL(/\/v2\/projects\//);
      await expect(page.locator("main h1")).toBeVisible();
    } finally { await context.close(); }
  });
});
