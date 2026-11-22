import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function position(page: Page, target: Locator, fraction: number) {
  const top = await target.evaluate(element => element.getBoundingClientRect().top + scrollY);
  await page.evaluate(({ top, fraction }) => scrollTo({ top: top - innerHeight * fraction, behavior: "instant" }), { top, fraction });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
}
const face = (page: Page) => page.locator('[data-home-stat="projects"] [data-stat-face]');
async function faceState(page: Page) {
  return face(page).evaluate(element => ({ y: new DOMMatrix(getComputedStyle(element).transform).m42, clip: getComputedStyle(element).clipPath, blur: getComputedStyle(element).filter }));
}

test("Home metrics match the full public catalog", async ({ page, request }) => {
  const projects = await (await request.get("/v1/api/projects")).json();
  const posts = await (await request.get("/v1/api/posts")).json();
  await page.goto("/v2");
  const expected = { projects: projects.length, live: projects.filter((p: { status: string }) => p.status === "LIVE").length, technologies: new Set(projects.flatMap((p: { tags: string[] }) => p.tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))).size, posts: posts.length };
  for (const [id, count] of Object.entries(expected)) await expect(page.locator(`[data-home-stat="${id}"] [data-stat-value]`)).toHaveText(String(count));
});

test("number wipes pause and reverse with scrolling; words fill in sequence", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/v2"); await page.evaluate(() => document.fonts.ready);
  const stat = page.locator('[data-home-stat="projects"]');
  await position(page, stat, 0.78);
  const partial = await faceState(page);
  expect(partial.clip).not.toBe("inset(0px 0px 0% 0px)");
  expect(partial.y).toBeLessThan(-1);
  await page.waitForTimeout(250);
  expect(await faceState(page)).toEqual(partial);
  await position(page, stat, 0.35);
  expect((await faceState(page)).y).toBe(0);
  await position(page, stat, 0.78);
  expect((await faceState(page)).y).toBeLessThan(-1);
  const headline = page.locator('[data-motion-text]');
  await position(page, headline, 0.64);
  const words = page.locator('[data-word-fill]');
  const clips = await words.evaluateAll(elements => elements.map(element => getComputedStyle(element).clipPath));
  expect(clips[0]).not.toEqual(clips[3]);
  await position(page, headline, 0.15);
  const finished = await words.evaluateAll(elements => elements.map(element => getComputedStyle(element).clipPath));
  expect(new Set(finished).size).toBe(1);
});

test("new Home motion stays visible with reduced motion and fits narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/v2");
  await expect(page.getByRole("heading", { name: "BUILDING ANYTHING & EVERYTHING.", exact: true })).toBeAttached();
  await page.locator('[data-home-motion]').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await faceState(page)).y).toBe(0);
  expect((await faceState(page)).blur).toBe("blur(0px)");
});

test("Home numbers and headline are readable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage(); await page.goto("/v2");
    await expect(page.getByRole("heading", { name: "BUILDING ANYTHING & EVERYTHING.", exact: true })).toBeAttached();
    expect((await faceState(page)).y).toBe(0);
    expect((await faceState(page)).blur).toBe("blur(0px)");
  } finally { await context.close(); }
});

for (const colorScheme of ["light", "dark"] as const) test(`motion band is accessible in ${colorScheme} mode`, async ({ page }) => {
  await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
  await page.goto("/v2");
  await page.locator('[data-home-motion]').scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).include('[data-home-motion]').analyze()).violations).toEqual([]);
});
