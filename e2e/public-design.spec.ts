import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { expectBlockReplay } from "./scroll-helpers";

const fixtureId = `public-design-${randomUUID()}`;
// Keep the catalog marker short; the title is the intentional long-content fixture.
const fixtureNumber = fixtureId.slice(-8);
let fixturesCreated = false;
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

function disposableSql(baseURL: string | undefined, sql: string) {
  if (process.env.CI !== "true" || baseURL !== "https://127.0.0.1:18089") {
    throw new Error("Design fixtures require the exact disposable CI Compose stack.");
  }
  return execFileSync("docker", [
    "compose", "-p", "portfolio-ci", "-f", "docker-compose.test.yml",
    "exec", "-T", "db", "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "xtomm", "-d", "portfolio",
  ], { input: sql, encoding: "utf8", timeout: 10000 });
}

interface PublicProject {
  number: string;
  title: string;
  caseStudy?: { gallery?: { image: string }[] };
}

test.describe("Public portfolio interactions", () => {
  test.describe.configure({ mode: "default" });
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeAll(async ({ baseURL }) => {
    if (process.env.CI !== "true" || baseURL !== "https://127.0.0.1:18089") return;
    const study = JSON.stringify({
      subtitle: "A disposable project for checking long titles and image inspection.",
      gallery: [{ title: "Interface", caption: "Disposable gallery fixture.", alt: "A project interface", image: "https://example.invalid/design-fixture.svg" }],
    });
    disposableSql(baseURL,
      `INSERT INTO projects(id,number,title,description,tags,year,status,sort_order,updated_at) VALUES (` +
      `${literal(fixtureId)},${literal(fixtureNumber)},'tools.republicofgaming.xyz','A disposable project fixture.',ARRAY['TypeScript'],'2026','IN_PROGRESS',10000,now());` +
      `INSERT INTO site_settings(key,value,updated_at) VALUES (${literal(`project_case_${fixtureNumber}`)},${literal(study)},now());`);
    fixturesCreated = true;
  });

  test.afterAll(async ({ baseURL }) => {
    if (!fixturesCreated) return;
    disposableSql(baseURL, `DELETE FROM site_settings WHERE key=${literal(`project_case_${fixtureNumber}`)}; DELETE FROM projects WHERE id=${literal(fixtureId)};`);
  });

  test("project write-up blocks replay their scroll reveal", async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const projects = await (await request.get("/v1/api/projects")).json() as PublicProject[];
    const project = projects.find(item => item.number === fixtureNumber) ?? projects[0];
    expect(project).toBeTruthy();
    await page.goto(`/v2/projects/${project.number}`);
    await page.evaluate(() => document.fonts.ready);
    await expectBlockReplay(page, page.locator('[aria-label="Project story"] .article-prose > [data-story-reveal]').first());
  });

  test("mobile navigation closes with Escape and returns focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/v2/projects");
    await expect(page.locator("nav").first()).toHaveCSS("opacity", "1");
    const toggle = page.locator('button[aria-label="Toggle navigation menu"]');
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await toggle.click();
    const dialog = page.getByRole("dialog", { name: "Site navigation" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBeTruthy();
    }
    await page.getByRole("button", { name: "Close navigation" }).click();
    await expect(toggle).toBeFocused();
  });

  test("long project titles fit narrow viewports without clipped text", async ({ page, request }) => {
    const response = await request.get("/v1/api/projects");
    expect(response.ok()).toBeTruthy();
    const projects = await response.json() as PublicProject[];
    const project = projects.find(p => p.number === fixtureNumber)
      ?? projects.find(p => p.title.includes(".") && p.title.length > 20);
    expect(project, "A long-domain project must be available for the layout check").toBeTruthy();
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/v2/projects/${project!.number}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const heading = await page.locator("main h1").evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return { width: innerWidth, rects: [...range.getClientRects()].map(r => ({ left: r.left, right: r.right })) };
      });
      for (const rect of heading.rects) {
        expect(rect.left).toBeGreaterThanOrEqual(0);
        expect(rect.right).toBeLessThanOrEqual(heading.width);
      }
    }
  });

  test("image inspection contains focus and restores the thumbnail", async ({ page, request }) => {
    const response = await request.get("/v1/api/projects");
    const projects = await response.json() as PublicProject[];
    const project = projects.find(p => p.number === fixtureNumber)
      ?? projects.find(p => p.caseStudy?.gallery?.length);
    expect(project, "A gallery project must be available for the inspection check").toBeTruthy();
    await page.route("https://example.invalid/design-fixture.svg", route => route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#ddd"/></svg>',
    }));
    await page.goto(`/v2/projects/${project!.number}`);
    await expect(page.locator("nav").first()).toHaveCSS("opacity", "1");
    const thumbnail = page.getByRole("button", { name: /^Enlarge image:/ }).first();
    await thumbnail.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBeTruthy();
    for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
      const intercepted = await dialog.evaluate((el, modifier) => {
        const event = new KeyboardEvent("keydown", { key: "+", [modifier]: true, bubbles: true, cancelable: true });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      }, modifier);
      expect(intercepted, `${modifier} browser shortcuts must remain available`).toBeFalsy();
    }
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBeTruthy();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reset zoom" })).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(thumbnail).toBeFocused();
  });

  test("ordinary links retain the native browser context menu", async ({ page }) => {
    await page.goto("/v2");
    await expect(page.locator("nav").first()).toHaveCSS("opacity", "1");
    const prevented = await page.getByRole("link", { name: "VIEW PROJECTS", exact: true }).evaluate(el => {
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBeFalsy();
  });
});
