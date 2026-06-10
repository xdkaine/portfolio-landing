import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  test('homepage should load and become interactive within acceptable thresholds', async ({ page }) => {
    await page.goto('/');

    // Wait for the network to be idle to ensure all resources loaded
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    // Evaluate basic performance metrics using the browser's Performance API
    const metrics = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domInteractive: timing.domInteractive,
        loadEventEnd: timing.loadEventEnd,
      };
    });

    // Note: These thresholds are generous to account for CI/CD runner variability.
    // In an enterprise setting, you would tune these to your SLA.
    // Ensure DOM is interactive in under 3000ms
    expect(metrics.domInteractive).toBeLessThan(3000);
    
    // Ensure total load time is under 5000ms
    expect(metrics.loadEventEnd).toBeLessThan(5000);
  });
});
