import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("v2 APIs filter, resolve details, reject invalid queries and remain read-only", async ({ request }) => {
  const response = await request.get("/v2/api/projects?q=proxmox&discipline=Infrastructure");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.version).toBe("v2");
  expect(payload.data.items.some((p: { slug: string }) => p.slug === "uma")).toBeTruthy();
  expect((await request.get("/v2/api/projects?discipline=invalid")).status()).toBe(400);
  expect((await request.get("/v2/api/projects/missing")).status()).toBe(404);
  expect((await request.post("/v2/api/projects", { data: { title: "No mutation" } })).status()).toBe(405);
  const study = await request.get("/v2/api/projects/uma/walkthrough");
  expect((await study.json()).data.kind).toBe("illustrated-walkthrough");
});

test("combined discovery and the source-backed console explanation work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/v2");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thomas Phao");
  await page.getByRole("main").getByRole("link", { name: "Projects & writing", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects & writing");
  await expect(page.getByRole("heading", { name: "Projects", exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Writing", exact: true, level: 2 })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search work" }).fill("LDAP");
  await page.getByLabel("Show", { exact: true }).selectOption("projects");
  await page.getByLabel("Discipline").selectOption("Identity & security");
  await page.getByRole("button", { name: "Find", exact: true }).click();
  await expect(page).toHaveURL(/q=LDAP/);
  await expect(page.getByRole("searchbox", { name: "Search work" })).toHaveValue("LDAP");
  await expect(page.getByLabel("Show", { exact: true })).toHaveValue("projects");
  await expect(page.getByLabel("Discipline")).toHaveValue("Identity & security");
  await expect(page.getByRole("heading", { name: "UAR", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "term-ios", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Writing", exact: true, level: 2 })).toHaveCount(0);

  await page.goto("/v2/work/uma");
  await expect(page.getByRole("heading", {
    name: "Check the VM action before issuing a ticket", exact: true, level: 2,
  })).toBeVisible();
  const walkthrough = page.getByRole("region", { name: "Follow a VM console request" });
  await expect(walkthrough.getByLabel("Persona")).toBeDisabled();
  await expect(walkthrough.getByLabel("Operation")).toBeDisabled();
  await expect(walkthrough.getByRole("button", { name: "Reset walkthrough" })).toBeDisabled();
  await expect(walkthrough.getByRole("list", { name: "Default console request" }).getByRole("listitem")).toHaveCount(4);
  await expect(walkthrough.getByRole("heading", { name: "Request a VNC ticket", exact: true })).toBeVisible();
  await expect(walkthrough.getByRole("heading", { name: "Proxy the console connection", exact: true })).toBeVisible();
  await expect(walkthrough).toContainText("VM_CONSOLE_OPEN");
  await expect(walkthrough.getByRole("link", { name: "VNC request route", exact: true })).toHaveAttribute(
    "href", /uma-proxmox-wrapper-public\/blob\/9444cc5.*\/vnc\/route\.ts#L10-L18$/,
  );
  await expect(walkthrough.getByRole("button", { name: "Next step" })).toHaveCount(0);
  await context.close();
});

test("Uma explains the ticket and proxy path, compares the role boundary and supports keyboard reset", async ({ page }) => {
  const errors: string[] = [];
  const v1Requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/v1/api/")) v1Requests.push(request.url());
  });
  await page.goto("/v2/work/uma");
  const walkthrough = page.getByRole("region", { name: "Follow a VM console request" });
  const stages = walkthrough.getByRole("list", { name: "Request stages" });
  const next = walkthrough.getByRole("button", { name: "Next step", exact: true });
  const previous = walkthrough.getByRole("button", { name: "Previous step", exact: true });
  await expect(walkthrough.getByLabel("Operation")).toBeEnabled();
  await expect(stages.getByRole("listitem")).toHaveCount(4);
  await expect(previous).toBeDisabled();
  await expect(walkthrough.getByRole("heading", { name: "Check the session and CSRF token", exact: true })).toBeVisible();

  for (const [title, label, source] of [
    ["Check access to this VM", "VM access", "VM access helper"],
    ["Request a VNC ticket", "VNC ticket", "Ticket and audit code"],
    ["Proxy the console connection", "Console proxy", "WebSocket proxy"],
  ]) {
    await next.click();
    await expect(walkthrough.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(stages.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-current", "step");
    await expect(walkthrough.getByRole("link", { name: source, exact: true })).toHaveAttribute("href", /github\.com\/xdkaine\/uma-proxmox-wrapper-public\/blob\/9444cc5/);
  }
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(walkthrough.getByRole("heading", { name: "Request a VNC ticket", exact: true })).toBeVisible();

  await walkthrough.getByLabel("Operation").selectOption("access");
  await expect(stages.getByRole("listitem")).toHaveCount(2);
  await next.click();
  await expect(next).toBeDisabled();
  await expect(walkthrough).toContainText("Member: stops at the administrative boundary");
  await expect(walkthrough).toContainText("does not model a policy endpoint or database write");
  await walkthrough.getByLabel("Persona").selectOption("administrator");
  await expect(stages.getByRole("listitem")).toHaveCount(2);
  await stages.getByRole("button", { name: "Role boundary", exact: true }).click();
  await expect(walkthrough.getByRole("heading", { name: "Administrative scope", exact: true })).toBeVisible();
  await expect(walkthrough).toContainText("Administrator: passes the administrative boundary");
  await expect(next).toBeDisabled();

  await walkthrough.getByRole("button", { name: "Reset walkthrough" }).click();
  await expect(walkthrough.getByLabel("Persona")).toHaveValue("member");
  await expect(walkthrough.getByLabel("Operation")).toHaveValue("console");
  await expect(previous).toBeDisabled();
  await expect(stages.getByRole("listitem")).toHaveCount(4);
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(walkthrough.getByRole("heading", { name: "Check access to this VM", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(v1Requests).toEqual([]);
});

test("UAR explains existing-account matching and SMTP recovery with its own project images", async ({ page, request }) => {
  const response = await request.get("/v2/api/projects/uar");
  const { data } = await response.json();
  await page.goto("/v2/work/uar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("UAR");
  await expect(page.getByRole("heading", { name: "Match existing accounts before provisioning", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Save verification before sending the notification", exact: true })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("If SMTP fails, the request stays verified");
  await expect(page.getByRole("region", { name: "Follow a VM console request" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: data.evidence[0].alt, exact: true })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/v2\/uar-dashboard\.png$/);
});

for (const width of [320, 390, 1440]) {
  test(`v2 layouts are accessible and fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/v2", "/v2/work", "/v2/work/uma", "/v2/work/uar"]) {
      await page.goto(route);
      if (route === "/v2/work/uma" && width < 800) {
        await expect(page.getByLabel("Operation")).toBeEnabled();
        const explanation = await page.locator("#v2-active-step").boundingBox();
        const chooser = await page.getByRole("list", { name: "Request stages" }).boundingBox();
        expect(explanation).not.toBeNull();
        expect(chooser).not.toBeNull();
        expect(explanation!.y).toBeLessThan(chooser!.y);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
      const scan = await new AxeBuilder({ page }).include(".v2").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(scan.violations).toEqual([]);
    }
  });
}
