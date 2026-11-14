import { test, expect } from '@playwright/test';

test.describe('Homepage design baselines', () => {
  for (const colorScheme of ['dark', 'light'] as const) {
    for (const width of [1280, 390]) {
      test(`${colorScheme} homepage at ${width}px matches the reviewed introduction`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme });
        await page.goto('/v1');
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('nav').first()).toHaveCSS('opacity', '1');
        // The introduction is independent of changing CMS project/post records.
        await expect(page.locator('main header').first()).toHaveScreenshot(`homepage-hero-${colorScheme}-${width}.png`, {
          animations: 'disabled', maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});

test('login page matches visual baseline', async ({ page }) => {
  await page.goto('/v1/login');
  await page.waitForLoadState('load');
  await page.waitForTimeout(1000);
  await expect(page).toHaveScreenshot('login-page.png', {
    maxDiffPixelRatio: 0.05, mask: [page.locator('iframe')],
  });
});
