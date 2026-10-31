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
    "Thomas Phao",
  );
  await page
    .getByRole("link", { name: "All projects", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
  await page.getByRole("searchbox", { name: "Search projects" }).fill("LDAP");
  await page.getByLabel("Discipline").selectOption("Identity & security");
  await page.getByRole("button", { name: "Find projects" }).click();
  await expect(page).toHaveURL(/q=LDAP/);
  await expect(page.getByRole("searchbox", { name: "Search projects" })).toHaveValue("LDAP");
  await expect(page.getByLabel("Discipline")).toHaveValue("Identity & security");
  await expect(
    page.getByRole("heading", { name: "UAR", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "term-ios", exact: true }),
  ).toHaveCount(0);
  await page.goto("/v2/work/uma");
  await expect(
    page.getByRole("heading", { name: "Implementation", exact: true }),
  ).toBeVisible();
  const walkthrough = page.getByRole("region", { name: "Follow a VM console request" });
  await expect(walkthrough.getByLabel("Persona")).toBeDisabled();
  await expect(walkthrough.getByLabel("Operation")).toBeDisabled();
  await expect(walkthrough.getByRole("button", { name: "Reset walkthrough" })).toBeDisabled();
  await expect(walkthrough.getByRole("list", { name: "Default console request" }).getByRole("listitem")).toHaveCount(6);
  await expect(walkthrough.getByRole("heading", { name: "Connect the browser console", exact: true })).toBeVisible();
  await expect(walkthrough.getByRole("heading", { name: "Review the oversight layer", exact: true })).toBeVisible();
  await expect(walkthrough.getByRole("button", { name: "Next step" })).toHaveCount(0);
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
  const walkthrough = page.getByRole("region", { name: "Follow a VM console request" });
  const stages = walkthrough.getByRole("list", { name: "Request stages" });
  const next = walkthrough.getByRole("button", { name: "Next step", exact: true });
  const previous = walkthrough.getByRole("button", { name: "Previous step", exact: true });
  await expect(walkthrough.getByLabel("Operation")).toBeEnabled();
  await expect(stages.getByRole("listitem")).toHaveCount(6);
  await expect(previous).toBeDisabled();
  for (const title of [
    "Check role and scope",
    "Open the console workflow",
    "Use the Proxmox integration",
    "Connect the browser console",
    "Review the oversight layer",
  ]) {
    await next.click();
    await expect(walkthrough.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(stages.locator('[aria-current="step"]')).toContainText(title);
  }
  await expect(next).toBeDisabled();
  await expect(walkthrough).toContainText("This is not an audit record");
  await previous.click();
  await expect(walkthrough.getByRole("heading", { name: "Connect the browser console", exact: true })).toBeVisible();

  await walkthrough.getByLabel("Operation").selectOption("access");
  await expect(walkthrough.getByRole("status")).toContainText(
    "stops at authorization",
  );
  await expect(stages.getByRole("listitem")).toHaveCount(2);
  await next.click();
  await expect(next).toBeDisabled();
  await expect(walkthrough).toContainText("The member cannot change access policies");
  await walkthrough.getByLabel("Persona").selectOption("administrator");
  await expect(walkthrough.getByRole("status")).toContainText("continues");
  await expect(stages.getByRole("listitem")).toHaveCount(4);
  await stages.getByRole("button", { name: /Open access administration/ }).click();
  await expect(
    walkthrough.getByRole("heading", { name: "Open access administration", exact: true }),
  ).toBeVisible();
  await next.click();
  await expect(next).toBeDisabled();
  await walkthrough.getByRole("button", { name: "Reset walkthrough" }).click();
  await expect(walkthrough.getByLabel("Persona")).toHaveValue("member");
  await expect(walkthrough.getByLabel("Operation")).toHaveValue("console");
  await expect(previous).toBeDisabled();
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(
    walkthrough.getByRole("heading", { name: "Check role and scope", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(v1Requests).toEqual([]);
});

test("UAR has its own project detail and sharing image", async ({ page, request }) => {
  const response = await request.get("/v2/api/projects/uar");
  const { data } = await response.json();
  await page.goto("/v2/work/uar");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(data.title);
  await expect(page.getByText(data.summary, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Implementation", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Follow a VM console request" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: data.evidence[0].alt, exact: true })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/v2\/uar-dashboard\.png$/);
});

for (const width of [320, 390, 1440]) {
  test(`v2 layouts are accessible and fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/v2", "/v2/work", "/v2/work/uma", "/v2/work/uar"]) {
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
