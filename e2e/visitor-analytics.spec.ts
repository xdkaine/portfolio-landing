import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { test, expect } from "@playwright/test";

test("visitor analytics filters QA, shows repeat journeys and exports the selected traffic", async ({ page, context, baseURL }) => {
  test.skip(process.env.CI !== "true" || baseURL !== "http://127.0.0.1:18089", "Uses only the disposable CI Compose stack");
  test.setTimeout(60_000);
  const marker = randomUUID();
  const userId = `visitor-ci-${marker}`;
  const path = `/v1/blog/analytics-ci-${marker}`;
  const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const sql = (query: string) => execFileSync("docker", ["compose", "-p", "portfolio-ci", "-f", "docker-compose.test.yml", "exec", "-T", "db", "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "xtomm", "-d", "portfolio"], { input: query, encoding: "utf8", timeout: 10_000 }).trim();
  expect(sql("SELECT current_database();")).toBe("portfolio");
  try {
    sql(`INSERT INTO users(id,email,password,name,role,updated_at) VALUES (${literal(userId)},${literal(userId + "@example.invalid")},'unused-fixture','Analytics fixture','ADMIN',now());`);
    // Public, disposable Compose fixture key; never production authentication.
    const token = await new SignJWT({ userId, role: "ADMIN" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject(userId).setIssuer("portfolio-landing").setAudience("portfolio-admin").setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode("test-jwt-secret-must-be-at-least-32-chars-long"));
    await context.addCookies([{ name: "xtomm-session", value: token, url: baseURL!, httpOnly: true, sameSite: "Lax" }]);
    const visitorToken = randomUUID();
    const capture = async (browser: string, session: string) => {
      const response = await context.request.post("/v1/api/analytics/events", { headers: { Origin: "https://localhost", "User-Agent": `Portfolio analytics fixture Chrome/130.0 ${marker}` }, data: { type: "pageview", path, visitorToken: browser, sessionToken: session, eventId: randomUUID(), clientSequence: 1, occurredAt: Date.now(), campaignSource: "qa", campaignName: `qa-${marker}`, signals: { language: "en-US", screen: "1920x1080" } } });
      expect(response.status()).toBe(204);
    };
    await capture(visitorToken, randomUUID());
    await capture(visitorToken, randomUUID());
    await capture(randomUUID(), randomUUID());
    const browserId = sql(`SELECT visitor_id FROM analytics_sessions WHERE entry_path=${literal(path)} GROUP BY visitor_id HAVING COUNT(*)=2;`);
    expect(browserId).toMatch(/^[a-f0-9]{64}$/);
    await page.goto("/v1/admin?tab=visitors");
    await page.getByLabel("Traffic classification", { exact: true }).selectOption("qa");
    await page.getByRole("textbox", { name: "Search visitors", exact: true }).fill(browserId);
    await page.getByRole("button", { name: browserId.slice(0, 10), exact: true }).click();
    await expect(page.getByRole("heading", { name: /^Session / })).toHaveCount(2);
    await expect(page.getByText(/1 other retained browser profile/)).toBeVisible();
    await expect(page.getByText(/Retained IP history/)).toBeVisible();
    await expect(page.getByText(/Retained fingerprint history/)).toBeVisible();
    await page.getByRole("button", { name: "Mark browser as QA / internal", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remove browser QA override", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Remove browser QA override", exact: true }).click();
    await expect(page.getByRole("button", { name: "Mark browser as QA / internal", exact: true })).toBeEnabled();
    await page.goto("/v1/admin");
    await page.getByLabel("Traffic classification", { exact: true }).selectOption("qa");
    await expect(page.getByText("Returning browser profiles", { exact: true })).toBeVisible();
    const qaResponse = await context.request.get("/v1/api/admin/analytics?days=7&traffic=qa");
    expect(qaResponse.ok()).toBeTruthy();
    const qa = await qaResponse.json();
    expect(qa.pages.find((row: { label: string }) => row.label === path).count).toBe(3);
    expect(qa.audience.returningVisitors).toBeGreaterThanOrEqual(1);
    const publicResponse = await context.request.get("/v1/api/admin/analytics?days=7&traffic=public");
    expect((await publicResponse.json()).pages.some((row: { label: string }) => row.label === path)).toBe(false);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV", exact: true }).click();
    expect((await downloadPromise).suggestedFilename()).toContain("analytics-qa-");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    sql(`DELETE FROM cms_audit_events WHERE entity_id IN (SELECT visitor_id FROM analytics_sessions WHERE entry_path=${literal(path)}); DELETE FROM analytics_visitors WHERE id IN (SELECT visitor_id FROM analytics_sessions WHERE entry_path=${literal(path)}); DELETE FROM analytics_daily WHERE path=${literal(path)}; DELETE FROM users WHERE id=${literal(userId)};`);
  }
});
