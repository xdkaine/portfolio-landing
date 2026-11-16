import { test, expect } from '@playwright/test';

test('the restored About profile is readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, extraHTTPHeaders: { DNT: '1' } });
  try {
    const page = await context.newPage();
    await page.goto('/v1/about');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ABOUT THOMAS PHAO');
    await expect(page.getByText('$ cat /etc/profile', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TECH STACK', exact: true })).toBeVisible();
    await expect(page.locator('[data-about-page]')).toContainText('Having people rely on things I build');
  } finally { await context.close(); }
});

for (const width of [1440, 390]) {
  test(`About retains its terminal profile and tech tree at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/v1/about');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ABOUT THOMAS PHAO');
    await expect(page.getByText('$ cat /etc/profile', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TECH STACK', exact: true })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('cursor', 'auto');
    await expect(page.locator('[data-about-page] img')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
