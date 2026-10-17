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
      await page.goto("/v1", { waitUntil: "networkidle" });
      await expect(page).toHaveTitle("Thomas Phao — Systems Engineer & Developer");
      await expect(page.getByRole("link", { name: "CONTACT ME", exact: true })).toBeVisible();
      expect(errors).toEqual([]);
      expect(contentRequests).toEqual([]);

      await page.getByRole("link", { name: "CONTACT ME", exact: true }).click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveTitle("Contact | Thomas Phao");
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
