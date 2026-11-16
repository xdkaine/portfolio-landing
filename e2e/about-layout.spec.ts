import { test, expect } from '@playwright/test';

test('About remains readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/v1/about');
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('About Thomas Phao');
    await expect(page.getByText('Why I build', { exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="My background"] p').first()).toBeVisible();
    await expect(page.locator('[data-about-page]')).not.toContainText('$ cat /etc/profile');
    await expect(page.locator('[data-about-page]')).not.toContainText('AVAILABLE');
  } finally { await context.close(); }
});

for (const width of [1440, 390]) {
  test(`About uses the available width and loads its project imagery at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/v1/about');
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const title = document.querySelector('h1')!.getBoundingClientRect();
      const columns = [...document.querySelector('[aria-label="My background"]')!.children].map(e => e.getBoundingClientRect());
      return { titleCenter: title.x + title.width / 2, viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, left: columns[0].x, right: columns[1].x, firstWidth: columns[0].width, secondWidth: columns[1].width };
    });
    expect(geometry.overflow).toBe(false);
    expect(Math.abs(geometry.titleCenter - width / 2)).toBeLessThan(2);
    if (width >= 768) {
      expect(geometry.right).toBeGreaterThan(width / 2);
      expect(Math.abs(geometry.firstWidth - geometry.secondWidth)).toBeLessThan(2);
    }
    await expect(page.locator('body')).toHaveCSS('cursor', 'auto');
    const images = page.locator('[data-about-page] img');
    await expect(images).toHaveCount(2);
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    await expect(page.getByRole('link', { name: 'Read about Uma, a Proxmox management application' })).toHaveAttribute('href', '/v1/projects/2');
    await expect(page.getByRole('link', { name: 'Read about UAR, an account request application' })).toHaveAttribute('href', '/v1/projects/1');
  });
}
