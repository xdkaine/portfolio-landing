import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test, expect, type Page, type Cookie } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expectBlockReplay } from "./scroll-helpers";

const credentials = { email: `editorial-${randomUUID()}@example.invalid`, password: randomBytes(24).toString("hex") };
const createdProjects: string[] = [];
const createdPosts: string[] = [];
let bootstrapped = false;
let sessionCookies: Cookie[] = [];

function authorizedFixture(baseURL: string | undefined) {
  return process.env.CI === "true" && baseURL === "https://127.0.0.1:18089" || process.env.EDITORIAL_PREVIEW_FIXTURES === "true" && baseURL === "http://127.0.0.1:18090";
}
async function login(page: Page) {
  if (sessionCookies.length) {
    await page.context().addCookies(sessionCookies);
    await page.goto("/v1/admin");
    await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
    return;
  }
  await page.goto("/v1/login");
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);
  const captcha = page.locator('input[name="cf-turnstile-response"]');
  if (process.env.EDITORIAL_PREVIEW_FIXTURES !== "true") await expect.poll(() => captcha.inputValue()).not.toBe("");
  await expect(page.getByRole("button", { name: /authenticate/i })).toBeEnabled();
  const authenticated = page.waitForResponse(response => response.url().endsWith("/v1/api/auth/login") && response.request().method() === "POST");
  await page.getByRole("button", { name: /authenticate/i }).click();
  expect((await authenticated).ok()).toBeTruthy();
  sessionCookies = await page.context().cookies();
  await page.waitForURL(/\/v1\/admin/);
  await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
}
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");
async function addLayout(page: Page, layout: "right" | "wide", count = 1) {
  await page.getByRole("button", { name: "+ Image / layout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Images & layouts", exact: true })).toBeVisible();
  await page.locator(".content-panel select").selectOption(layout);
  await page.locator('.content-panel input[type="file"]').setInputFiles(Array.from({ length: count }, (_, i) => ({ name: `fixture-${i}.png`, mimeType: "image/png", buffer: png })));
  const descriptions = page.getByRole("textbox", { name: "Image description", exact: true });
  await expect(descriptions).toHaveCount(count);
  for (let i = 0; i < count; i++) await descriptions.nth(i).fill(`Synthetic editorial image ${i + 1}`);
  await page.getByRole("button", { name: count > 1 ? "Insert carousel" : "Insert layout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Images & layouts" })).toHaveCount(0);
}

test.describe("Content authoring in the disposable stack", () => {
  test.describe.configure({ mode: "default" });
  test.use({ contextOptions: { reducedMotion: "reduce", extraHTTPHeaders: { DNT: "1" } } });
  test.beforeAll(async ({ baseURL }) => {
    if (!authorizedFixture(baseURL)) return;
    if (process.env.EDITORIAL_PREVIEW_FIXTURES === "true") {
      Object.assign(credentials, JSON.parse(readFileSync(process.env.EDITORIAL_CREDENTIALS_FILE!, "utf8")));
      return;
    }
    execFileSync("docker", ["compose", "-p", "portfolio-ci", "-f", "docker-compose.test.yml", "run", "--rm", "--no-deps", "-e", "ALLOW_ADMIN_BOOTSTRAP=true", "-e", "ALLOW_DEMO_SEED=false", "-e", `BOOTSTRAP_ADMIN_EMAIL=${credentials.email}`, "-e", "BOOTSTRAP_ADMIN_PASSWORD", "db-setup", "npx", "tsx", "prisma/seed.ts"], { env: { ...process.env, BOOTSTRAP_ADMIN_PASSWORD: credentials.password }, stdio: "pipe", timeout: 60000 });
    bootstrapped = true;
  });

  test("create and revise a project with a split story, images and a carousel", async ({ page, baseURL }) => {
    test.skip(!authorizedFixture(baseURL), "CMS writes are limited to the guarded disposable stack.");
    test.setTimeout(180000);
    await login(page);
    await page.getByRole("button", { name: /^Projects(?:\s|$)/ }).click();
    await page.getByRole("button", { name: /NEW PROJECT/ }).click();
    const title = `Editorial project ${randomUUID().slice(0, 8)}`;
    await page.getByLabel("Project title", { exact: true }).fill(title);
    await page.getByRole("textbox", { name: "Page content", exact: true }).fill("The opening paragraph explains what I built.");
    await addLayout(page, "right");
    const splitCopy = page.locator('[data-media-text] .story-split-copy');
    await splitCopy.click(); await page.keyboard.type("This text belongs beside the project image.");
    await page.getByRole("textbox", { name: "Page content", exact: true }).press("Control+End");
    await addLayout(page, "wide", 2);
    const saved = page.waitForResponse(response => response.url().endsWith("/v1/api/projects") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Save project", exact: true }).click();
    const response = await saved; expect(response.ok()).toBeTruthy();
    await expect(page.getByText("Project saved.", { exact: true })).toBeVisible();
    // Verify the user-facing save confirmation and the persisted catalog record.
    const catalog = await page.request.get("/v1/api/projects");
    expect(catalog.ok()).toBeTruthy();
    const project = (await catalog.json()).find((item: { title: string }) => item.title === title);
    expect(project).toBeTruthy(); createdProjects.push(project.id);
    expect(project.number).toMatch(/^\d+$/);
    await page.goto(`/v2/projects/${project.number}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".story-split")).toHaveAttribute("data-image-side", "right");
    await expect(page.locator(".story-split-copy")).toContainText("belongs beside");
    await expect(page.locator(".story-carousel")).toHaveCount(1);
    await page.getByRole("button", { name: "Next image gallery", exact: true }).click();
    await expect(page.locator(".story-carousel-controls")).toContainText("2 / 2");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const stale = await page.request.put(`/v1/api/projects/${project.id}`, { data: { title: title + " first", version: project.version } });
    expect(stale.ok()).toBeTruthy();
    const conflict = await page.request.put(`/v1/api/projects/${project.id}`, { data: { title: "stale overwrite", version: project.version } });
    expect(conflict.status()).toBe(409);
  });

  test("legacy table content survives metadata saves and visual editing", async ({ page, baseURL }) => {
    test.skip(!authorizedFixture(baseURL), "CMS writes are limited to the guarded disposable stack.");
    test.setTimeout(120000); await login(page);
    const title = `Legacy table ${randomUUID().slice(0, 8)}`;
    const result = await page.request.post("/v1/api/projects", { data: { title, description: "A legacy write-up.", caseStudy: { writeupMarkdown: "Before\n\n| Keep me | Preserve me |\n| --- | --- |\n| One | Two |\n\nAfter", gallery: [] } } });
    expect(result.ok()).toBeTruthy(); const project = await result.json(); createdProjects.push(project.id);
    await page.goto("/v1/admin?tab=projects");
    const row = page.locator("div.group").filter({ has: page.getByText(title, { exact: true }) });
    await row.getByRole("button", { name: /edit/i }).click();
    await page.getByLabel("Project title", { exact: true }).fill(title + " edited");
    await page.getByRole("button", { name: "Save project", exact: true }).click();
    await expect(page.getByText("Project saved.", { exact: true })).toBeVisible();
    const unchanged = await (await page.request.get(`/v1/api/projects/${project.number}`)).json();
    expect(unchanged.caseStudy.bodyJson).toBeUndefined();
    await page.goto(`/v2/projects/${project.number}`);
    await expect(page.getByRole("cell", { name: "One", exact: true })).toBeVisible();
    await page.goto("/v1/admin?tab=projects");
    await page.locator("div.group").filter({ has: page.getByText(title + " edited", { exact: true }) }).getByRole("button", { name: /edit/i }).click();
    await page.getByRole("textbox", { name: "Page content", exact: true }).press("Control+End"); await page.keyboard.type(" Added in the visual editor.");
    await page.getByRole("button", { name: "Save project", exact: true }).click();
    await expect(page.getByText("Project saved.", { exact: true })).toBeVisible();
    await page.goto(`/v2/projects/${project.number}`);
    await expect(page.getByRole("cell", { name: "One", exact: true })).toBeVisible();
    await expect(page.locator(".article-prose")).toContainText("Added in the visual editor");
  });

  test("write, preview, publish and archive a post without filling technical metadata", async ({ page, baseURL }) => {
    test.skip(!authorizedFixture(baseURL), "CMS writes are limited to the guarded disposable stack.");
    test.setTimeout(180000); await login(page);
    await page.getByRole("button", { name: /^Posts(?:\s|$)/ }).click();
    await page.getByRole("button", { name: /New blog post/ }).click();
    await expect(page.getByRole("heading", { name: "Write a blog post" })).toBeVisible();
    const id = page.url().split("/").at(-1)!; createdPosts.push(id);
    const title = `Editorial post ${randomUUID().slice(0, 8)}`;
    await page.getByRole("textbox", { name: "Post title", exact: true }).fill(title);
    await page.getByRole("textbox", { name: "Page content", exact: true }).fill("This opening text becomes the summary automatically.");
    await addLayout(page, "wide");
    await page.getByRole("button", { name: "SAVE NOW", exact: true }).click();
    await expect(page.getByText("SAVED", { exact: true })).toBeVisible();
    const draft = await (await page.request.get(`/v1/api/admin/posts/${id}`)).json();
    await page.goto(`/v1/admin/posts/${id}/preview`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator('figure[data-layout="wide"] img')).toHaveAttribute("alt", "Synthetic editorial image 1");
    await expect(page.locator('[data-story-reveal]')).toHaveCount(0);
    expect((await page.request.get(`/v1/api/posts/${draft.slug}`)).status()).toBe(404);
    expect((await page.request.get(`/v2/api/posts/${draft.slug}`)).status()).toBe(404);
    await page.goto(`/v1/admin/posts/${id}`);
    await page.getByRole("button", { name: "PUBLISH", exact: true }).click();
    await expect(page.getByText("Blog post published.", { exact: true })).toBeVisible();
    const published = await (await page.request.get(`/v1/api/posts/${draft.slug}`)).json();
    expect(published.excerpt).toContain("opening text");
    await page.goto(`/v2/blog/${draft.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expectBlockReplay(page, page.locator('article .article-prose > [data-story-reveal]').first());
    await page.emulateMedia({ reducedMotion: "reduce" });
    const scan = await new AxeBuilder({ page }).analyze(); expect(scan.violations).toEqual([]);
    await page.goto(`/v1/admin/posts/${id}`);
    await page.getByRole("button", { name: "ARCHIVE", exact: true }).click();
    await expect(page.getByText("Blog post archived.", { exact: true })).toBeVisible();
    expect((await page.request.get(`/v1/api/posts/${draft.slug}`)).status()).toBe(404);
    expect((await page.request.get(`/v2/api/posts/${draft.slug}`)).status()).toBe(404);
  });

  test("About saves editable content, protects newer versions and remains usable on mobile", async ({ page, baseURL }) => {
    test.skip(!authorizedFixture(baseURL), "CMS writes are limited to the guarded disposable stack.");
    test.setTimeout(120000); await login(page);
    const original = await (await page.request.get("/v1/api/about")).json();
    try {
      await page.getByRole("button", { name: /^About(?:\s|$)/ }).click();
      await page.getByRole("textbox", { name: "Page title", exact: true }).fill("ABOUT EDITORIAL QA");
      await page.getByRole("textbox", { name: /Current role/ }).fill("Builder and developer");
      page.once("dialog", dialog => dialog.dismiss());
      await page.getByRole("button", { name: /^Projects(?:\s|$)/ }).click();
      await expect(page.getByRole("heading", { name: "Edit About", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Save About", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("About saved");
      const activity = await (await page.request.get("/v1/api/admin/activity")).json();
      expect(activity.some((item: { entity: string; summary: string }) => item.entity === "about" && item.summary === "ABOUT EDITORIAL QA")).toBe(true);
      const conflict = await page.request.put("/v1/api/about", { data: { ...original, content: { ...original.content, title: "STALE ABOUT" } } });
      expect(conflict.status()).toBe(409);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      const scan = await new AxeBuilder({ page }).analyze(); expect(scan.violations).toEqual([]);
      await page.goto("/v2/about"); await expect(page.getByRole("heading", { level: 1 })).toHaveText("ABOUT EDITORIAL QA");
      await page.goto("/v2"); await expect(page.getByText("Builder and developer", { exact: true })).toBeVisible();
    } finally {
      const latest = await (await page.request.get("/v1/api/about")).json();
      expect((await page.request.put("/v1/api/about", { data: { content: original.content, version: latest.version } })).ok()).toBeTruthy();
    }
  });

  test.afterAll(async ({ browser, baseURL }) => {
    if (!authorizedFixture(baseURL)) return;
    const page = await browser.newPage({ baseURL });
    try {
      if (sessionCookies.length) await page.context().addCookies(sessionCookies);
      else if (createdPosts.length || createdProjects.length) await login(page);
      for (const id of createdPosts) {
        const record = await (await page.request.get(`/v1/api/admin/posts/${id}`)).json();
        expect((await page.request.delete(`/v1/api/admin/posts/${id}`, { data: { version: record.version } })).ok()).toBeTruthy();
      }
      for (const id of createdProjects) {
        const record = await (await page.request.get(`/v1/api/projects/${id}`)).json();
        expect((await page.request.delete(`/v1/api/projects/${id}`, { data: { version: record.version } })).ok()).toBeTruthy();
      }
    } finally { await page.close(); }
    if (bootstrapped) {
      // Main's DELETE moves projects to recoverable trash. Purge only our own
      // disposable records after exercising that API so their unique numbers
      // do not block the later navigation fixtures. Never run in a live preview.
      const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
      const projectIds = createdProjects.map(literal).join(",") || "NULL";
      execFileSync("docker", ["compose", "-p", "portfolio-ci", "-f", "docker-compose.test.yml", "exec", "-T", "db", "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "xtomm", "-d", "portfolio"], {
        input: `BEGIN;
          DELETE FROM site_settings WHERE key IN (SELECT 'project_case_' || number FROM projects WHERE id IN (${projectIds}));
          DELETE FROM projects WHERE id IN (${projectIds});
          DELETE FROM users WHERE email=${literal(credentials.email)};
          COMMIT;`,
        encoding: "utf8", timeout: 10000,
      });
    }
  });
});
