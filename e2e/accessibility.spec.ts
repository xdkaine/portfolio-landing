import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES_TO_TEST = [
  '/',
  '/v1/login',
  '/v1/about',
  // Add other critical routes here
];

test.describe('Accessibility (a11y) Scans', () => {
  for (const route of ROUTES_TO_TEST) {
    test(`should not have any automatically detectable accessibility violations on ${route}`, async ({ page }) => {
      await page.goto(route);

      // Wait for the main content to load
      await page.waitForLoadState('load');
      await page.waitForTimeout(500);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules(['color-contrast'])
        // You can exclude specific known issues here if needed
        // .exclude('.known-violation-class')
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
