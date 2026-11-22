import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test("V2 exposes the same published catalog through read-only versioned APIs", async ({ request }) => {
  const projects = await (await request.get("/v1/api/projects")).json();
  const posts = await (await request.get("/v1/api/posts")).json();
  const response = await request.get("/v2/api/projects");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toBe("noindex");
  const catalog = await response.json();
  expect(catalog.version).toBe("v2");
  expect(catalog.data.items).toEqual(projects);
  expect(catalog.data.total).toBe(projects.length);
  expect((await (await request.get("/v2/api/posts")).json()).data.items).toEqual(posts);
  const project = await (await request.get(`/v2/api/projects/${projects[0].number}`)).json();
  expect(project.data.title).toBe(projects[0].title);
  expect((await request.get("/v2/api/projects/does-not-exist")).status()).toBe(404);
  for (const path of ["projects", "posts", "about"]) expect((await request.post(`/v2/api/${path}`, { data: {} })).status()).toBe(405);
  const home = (await (await request.get("/v2/api/home")).json()).data;
  expect(home.stats.find((stat: { id: string }) => stat.id === "projects").value).toBe(projects.length);
  expect(home.stats.find((stat: { id: string }) => stat.id === "posts").value).toBe(posts.length);
});

test("V2 public navigation and canonical metadata stay within V2", async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/v2", "/v2/projects", "/v2/blog", "/v2/about", "/v2/contact"]) {
    await page.goto(path);
    await expect(page.locator("main[data-portfolio-v2]")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new URL(path, baseURL).href);
    const links = await page.locator("nav").first().locator("a").evaluateAll(elements => elements.map(link => link.getAttribute("href")));
    expect(links).toContain("/v2");
    expect(links).toContain("/v2/projects");
    expect(links).toContain("/v2/blog");
    expect(links.filter(href => href?.startsWith("/v1/") && href !== "/v1/admin")).toEqual([]);
  }
});

test("V2 stylesheet leaves V1 unchanged when both version styles are loaded", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/v1");
  await page.evaluate(() => document.fonts.ready);
  const state = () => page.locator("body").evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color, cursor: style.cursor, font: style.fontFamily };
  });
  const before = await state();
  await page.addStyleTag({ path: resolve("src/app/v2/v2.css") });
  expect(await state()).toEqual(before);
});

test("old studio bookmarks open their matching current project and blog pages", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/v2/work/uma");
  await expect(page).toHaveURL(/\/v2\/projects\/2$/);
  await expect(page.locator("main h1")).toContainText("Uma");
  await page.goto("/v2/work");
  await expect(page).toHaveURL(/\/v2\/projects$/);
  await page.goto("/v2/writing");
  await expect(page).toHaveURL(/\/v2\/blog$/);
});
