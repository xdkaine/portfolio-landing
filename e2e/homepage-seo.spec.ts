import { test, expect } from "@playwright/test";

test.describe("Homepage first render", () => {
  test.use({ javaScriptEnabled: false });

  test("renders project and post links without JavaScript", async ({ page, request }) => {
    const [projectsResponse, postsResponse] = await Promise.all([
      request.get("/v1/api/projects"),
      request.get("/v1/api/posts"),
    ]);
    expect(projectsResponse.ok()).toBeTruthy();
    expect(postsResponse.ok()).toBeTruthy();

    const projects = await projectsResponse.json() as {
      number: string;
      title: string;
      featured: boolean;
    }[];
    const posts = await postsResponse.json() as { slug: string; title: string }[];
    const featured = projects.filter((project) => project.featured);
    const selected = (featured.length > 0 ? featured : projects).slice(0, 3);

    const response = await page.goto("/v1");
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('main a[href^="/v1/projects/"]')).toHaveCount(selected.length);
    await expect(page.locator('main a[href^="/v1/blog/"]')).toHaveCount(Math.min(posts.length, 4));

    for (const project of selected) {
      const link = page.locator(`main a[href="/v1/projects/${project.number}"]`);
      await expect(link).toBeVisible();
      await expect(link).toContainText(project.title);
    }
    for (const post of posts.slice(0, 4)) {
      const link = page.locator(`main a[href="/v1/blog/${post.slug}"]`);
      await expect(link).toBeVisible();
      await expect(link).toContainText(post.title);
    }
    if (selected.length === 0) {
      await expect(page.getByText("New project write-ups are on the way.")).toBeVisible();
    }
    if (posts.length === 0) {
      await expect(page.getByText("New notes from the build are on the way.")).toBeVisible();
    }
    if (selected.length > 0) {
      const project = selected[0];
      await page.locator(`main a[href="/v1/projects/${project.number}"]`).click();
      await expect(page).toHaveTitle(`${project.title} | Projects | Thomas Phao`);
    }
  });

  test("provides an introduction, working actions, and social metadata", async ({ page, request }) => {
    await page.goto("/v1");
    await expect(page).toHaveTitle("Thomas Phao — Builder & Developer");
    await expect(page.locator("main h1 .absolute.inset-0")).toContainText("Tommy");
    await expect(page.locator("[data-home-introduction] .absolute.inset-0")).toContainText("Tommy");
    await expect(page.locator("[data-home-introduction]")).toContainText("a builder and developer");

    const projects = page.getByRole("link", { name: "VIEW PROJECTS", exact: true });
    await expect(projects).toHaveAttribute("href", "/v1/projects");
    const contact = page.getByRole("link", { name: "CONTACT ME", exact: true });
    await expect(contact).toHaveAttribute("href", "/v1/contact");

    const socialImage = page.locator('meta[property="og:image"]').first();
    await expect(socialImage).toHaveAttribute("content", /\/v1\/opengraph-image/);
    const imageResponse = await request.get("/v1/opengraph-image");
    expect(imageResponse.ok()).toBeTruthy();
    expect(imageResponse.headers()["content-type"]).toContain("image/png");

    await contact.click();
    await expect(page).toHaveURL(/\/v1\/contact$/);
    await expect(page).toHaveTitle("Contact | Thomas Phao");
  });
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`hydrates with ${reducedMotion} motion and preserves page titles`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, reducedMotion });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      const contentRequests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (/\/v1\/api\/(projects|posts)(?:\?|$)/.test(request.url())) {
          contentRequests.push(request.url());
        }
      });
      await page.goto("/v1");
      await expect(page.locator("nav").first()).toHaveCSS("opacity", "1");
      await expect(page).toHaveTitle(reducedMotion === "reduce"
        ? "Thomas Phao — Builder & Developer"
        : /\| Thomas Phao — Builder & Developer/);
      await expect(page.getByRole("link", { name: "CONTACT ME", exact: true })).toBeVisible();
      expect(errors).toEqual([]);
      expect(contentRequests).toEqual([]);

      await page.getByRole("link", { name: "CONTACT ME", exact: true }).click();
      await expect(page).toHaveURL(/\/v1\/contact$/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("CONTACT");
      await expect(page).toHaveTitle("Contact | Thomas Phao");
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("homepage title stays synchronized with the visible aliases and stops on other routes", async ({ page }) => {
  await page.goto("/v1");
  await expect(page).toHaveTitle(/\| Thomas Phao — Builder & Developer/);
  const samples: string[] = [];
  const activeAliases = new Set<string>();
  // Sample the running animation; native route transitions use real animation frames too.
  for (const milliseconds of [800, 2000, 800, 800, 2000, 800, 800, 2000]) {
    await page.waitForTimeout(milliseconds);
    const sample = await page.evaluate(() => {
      const hero = document.querySelector("main h1 .absolute.inset-0");
      const nav = document.querySelector("nav a .absolute.inset-0");
      const introduction = document.querySelector("[data-home-introduction] .absolute.inset-0");
      const typed = (element: Element | null) => {
        const child = element?.firstChild;
        return child?.nodeType === Node.TEXT_NODE ? child.textContent ?? "" : "";
      };
      const activeAlias = document.querySelector("main h1 .relative .sr-only")?.textContent;
      return { hero: typed(hero), nav: typed(nav), introduction: typed(introduction), title: document.title, activeAlias };
    });
    expect(sample.hero).toBe(sample.nav);
    expect(sample.hero).toBe(sample.introduction);
    expect(["Tommy", "Kaine"]).toContain(sample.activeAlias);
    activeAliases.add(sample.activeAlias!);
    if (sample.hero) expect(sample.title.startsWith(`${sample.hero} | `)).toBeTruthy();
    samples.push(sample.title);
  }
  expect(new Set(samples).size).toBeGreaterThan(1);
  expect([...activeAliases].sort()).toEqual(["Kaine", "Tommy"]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Thomas Phao — Builder & Developer");
  await page.getByRole("link", { name: "CONTACT ME", exact: true }).click();
  await expect(page).toHaveURL(/\/v1\/contact$/);
  await expect(page).toHaveTitle("Contact | Thomas Phao");
  await page.waitForTimeout(6000);
  await expect(page).toHaveTitle("Contact | Thomas Phao");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveTitle(/\| Thomas Phao — Builder & Developer/);
});

test("profile context and compact summaries remain readable on mobile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v1");
  await expect(page.locator("[data-home-introduction]")).toContainText("a builder and developer");
  const summaries = await page.locator("[data-project-teaser]").allTextContents();
  for (const summary of summaries) expect(summary.trim().length).toBeLessThanOrEqual(220);
  await expect(page.getByRole("link", { name: "Technology Risk Consultant", exact: true })).toHaveAttribute("href", "https://linkedin.com/in/thomasphao");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await expect(page.locator("main header")).not.toContainText("LOS ANGELES, CA");
  await expect(page.locator("main")).not.toContainText("48.8566");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.goto("/v1/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("About Thomas Phao");
  await expect(page.getByText("2+ YEARS", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Los Angeles, CA", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
