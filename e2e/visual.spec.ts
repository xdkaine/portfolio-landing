import { test, expect } from '@playwright/test';

test.describe('Visual Regression Testing', () => {
  test('homepage matches visual baseline', async ({ page }) => {
    await page.goto('/');
    
    // Wait for animations or dynamic content to settle
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // To account for slight rendering differences across environments (like CI vs local),
    // we use a maxDiffPixelRatio.
    await expect(page).toHaveScreenshot('homepage.png', { maxDiffPixelRatio: 0.05 });
  });

  test('login page matches visual baseline', async ({ page }) => {
    await page.goto('/v1/login');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Mask out the turnstile iframe since its content can change and cause flaky visual diffs
    const turnstileLocator = page.locator('iframe');
    
    await expect(page).toHaveScreenshot('login-page.png', { 
      maxDiffPixelRatio: 0.05,
      mask: [turnstileLocator]
    });
  });
});
