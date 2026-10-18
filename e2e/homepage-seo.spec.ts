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
    const selected = (featured.length > 0 ? featured : projects).slice(0, 4);

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
    await expect(page).toHaveTitle("Thomas Phao — Systems Engineer & Developer");
    await expect(page.getByText(/I'm Thomas Phao, a systems engineer and developer/)).toBeVisible();

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
      await page.goto("/v1", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveTitle(reducedMotion === "reduce"
        ? "Thomas Phao — Systems Engineer & Developer"
        : /\| Thomas Phao — Systems Engineer & Developer/);
      await expect(page.getByRole("link", { name: "CONTACT ME", exact: true })).toBeVisible();
      expect(errors).toEqual([]);
      expect(contentRequests).toEqual([]);

      await page.getByRole("link", { name: "CONTACT ME", exact: true }).click();
      await expect(page).toHaveTitle("Contact | Thomas Phao");
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("homepage title stays synchronized with the visible aliases and stops on other routes", async ({ page }) => {
  await page.clock.install();
  await page.goto("/v1");
  await expect(page).toHaveTitle(/\| Thomas Phao — Systems Engineer & Developer/);
  const samples: string[] = [];
  for (const milliseconds of [350, 800, 2000, 2400, 700]) {
    await page.clock.runFor(milliseconds);
    const sample = await page.evaluate(() => {
      const hero = document.querySelector("main h1 .absolute.inset-0");
      const nav = document.querySelector("nav a .absolute.inset-0");
      const typed = (element: Element | null) => {
        const child = element?.firstChild;
        return child?.nodeType === Node.TEXT_NODE ? child.textContent ?? "" : "";
      };
      return { hero: typed(hero), nav: typed(nav), title: document.title };
    });
    expect(sample.hero).toBe(sample.nav);
    if (sample.hero) expect(sample.title.startsWith(`${sample.hero} | `)).toBeTruthy();
    samples.push(sample.title);
  }
  expect(new Set(samples).size).toBeGreaterThan(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Thomas Phao — Systems Engineer & Developer");
  await page.getByRole("link", { name: "CONTACT ME", exact: true }).click();
  await expect(page).toHaveTitle("Contact | Thomas Phao");
  await page.clock.runFor(6000);
  await expect(page).toHaveTitle("Contact | Thomas Phao");
  await page.getByRole("link", { name: "INDEX", exact: true }).click();
  await expect(page).toHaveTitle(/\| Thomas Phao — Systems Engineer & Developer/);
});

test("homepage and About share profile facts and summaries remain compact on mobile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v1");
  await expect(page.getByText(/I'm Thomas Phao, a systems engineer and developer/)).toBeVisible();
  const summaries = await page.locator("[data-project-teaser]").allTextContents();
  for (const summary of summaries) expect(summary.trim().length).toBeLessThanOrEqual(220);
  const experience = page.getByText("YEARS EXPERIENCE", { exact: true }).locator("../..");
  await expect(experience).toContainText("2");
  await expect(page.locator("main")).not.toContainText("48.8566");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.goto("/v1/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ABOUT THOMAS PHAO");
  await expect(page.getByText("2+ YEARS", { exact: true })).toBeVisible();
  await expect(page.getByText("LOS ANGELES, CA", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
