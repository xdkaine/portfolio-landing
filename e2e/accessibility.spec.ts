import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES_TO_TEST = [
  '/',
  '/v1/login',
  '/v1/about',
  '/v1/projects',
  '/v1/blog',
  '/v1/contact',
];

test.describe('Accessibility (a11y) Scans', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  for (const colorScheme of ['dark', 'light'] as const) {
  for (const route of ROUTES_TO_TEST) {
    test(`${colorScheme}: no automatically detectable accessibility violations on ${route}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme });
      await page.goto(route);

      // Wait for the main content to load
      await page.waitForLoadState('load');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('nav').first()).toHaveCSS('opacity', '1');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // You can exclude specific known issues here if needed
        // .exclude('.known-violation-class')
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
  }
});
