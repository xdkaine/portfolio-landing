import { test, expect } from "@playwright/test";

test("V2 pageviews omit private URL data and the privacy preference stops tracking", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const events: Record<string, unknown>[] = [];
  // Observe browser payloads without persisting test visits or contacts.
  await page.route("**/v1/api/analytics/**", async route => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' });
  });
  await page.goto("/v2/privacy?token=private-test-value#analytics-preferences");
  await expect.poll(() => events.some(event => event.type === "pageview" && event.path === "/v2/privacy")).toBe(true);
  expect(JSON.stringify(events)).not.toContain("private-test-value");
  await page.getByRole("checkbox", { name: "Stop visitor analytics on this browser" }).check();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("phao.analytics.preference"))).toBe("off");
  expect(await page.evaluate(() => [localStorage.getItem("phao.analytics.visitor.v1"), sessionStorage.getItem("phao.analytics.session.v1")])).toEqual([null, null]);
  events.length = 0;
  await page.goto("/v2/projects");
  await expect(page.locator("main h1")).toHaveText("PROJECTS");
  // Allow route effects and an immediate pageview/beacon fallback to run.
  await page.waitForTimeout(500);
  expect(events).toEqual([]);
});
