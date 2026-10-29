import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("v2 APIs filter, resolve details, reject invalid queries and remain read-only", async ({
  request,
}) => {
  const response = await request.get(
    "/v2/api/projects?q=proxmox&discipline=Infrastructure",
  );
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.version).toBe("v2");
  expect(
    payload.data.items.some((p: { slug: string }) => p.slug === "uma"),
  ).toBeTruthy();
  expect(
    (await request.get("/v2/api/projects?discipline=invalid")).status(),
  ).toBe(400);
  expect((await request.get("/v2/api/projects/missing")).status()).toBe(404);
  expect(
    (
      await request.post("/v2/api/projects", { data: { title: "No mutation" } })
    ).status(),
  ).toBe(405);
  const study = await request.get("/v2/api/projects/uma/walkthrough");
  expect((await study.json()).data.kind).toBe("illustrated-walkthrough");
});

test("homepage and project discovery are complete without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const page = await context.newPage();
  await page.goto("/v2");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Useful systems",
  );
  await page
    .getByRole("link", { name: "Explore the work", exact: true })
    .click();
  await page.getByRole("searchbox", { name: "Search projects" }).fill("LDAP");
  await page.getByRole("button", { name: "Find projects" }).click();
  await expect(
    page.getByRole("heading", { name: "UAR", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "term-ios", exact: true }),
  ).toHaveCount(0);
  await page.goto("/v2/work/uma");
  await expect(
    page.getByRole("heading", { name: "How the pieces fit together" }),
  ).toBeVisible();
  await context.close();
});

test("Uma walkthrough changes scenarios, explains authorization and supports reset", async ({
  page,
}) => {
  const errors: string[] = [];
  const v1Requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/v1/api/"))
      v1Requests.push(request.url());
  });
  await page.goto("/v2/work/uma");
  await page.getByLabel("Operation").selectOption("access");
  await expect(page.getByRole("status")).toContainText(
    "stops at authorization",
  );
  await page.getByLabel("Persona").selectOption("administrator");
  await expect(page.getByRole("status")).toContainText("continues");
  await page.getByRole("button", { name: /Next step/ }).click();
  await expect(
    page.getByRole("heading", { name: "Check the policy", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset walkthrough" }).click();
  await expect(page.getByLabel("Persona")).toHaveValue("member");
  await expect(page.getByLabel("Operation")).toHaveValue("console");
  await page.getByRole("button", { name: "Next step", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Check the policy", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(v1Requests).toEqual([]);
});

for (const width of [390, 1440]) {
  test(`v2 layouts are accessible and fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/v2", "/v2/work", "/v2/work/uma"]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
      const scan = await new AxeBuilder({ page })
        .include(".v2")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
  });
}
