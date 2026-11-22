import { test, expect } from '@playwright/test';

test.describe('Public application', () => {
  test('root and legacy public links open V2', async ({ page }) => {
    // Navigate to the root, which should go through nginx to the next.js app
    await page.goto('/');

    await expect(page).toHaveURL(/\/v2$/);
    await expect(page.locator('main[data-portfolio-v2]')).toHaveCount(1);
    const legacy = await page.request.get('/v1', { maxRedirects: 0 });
    expect(legacy.status()).toBe(307);
    expect(new URL(legacy.headers().location, page.url()).pathname).toBe('/v2');
    await page.goto('/v1/projects');
    await expect(page).toHaveURL(/\/v2\/projects$/);
    await expect(page.locator('main h1')).toHaveText('PROJECTS');

    // Check if a header exists. (We might need to adjust this depending on the actual app content)
    // For now, let's just make sure we get a 200 OK and it's not the Nginx fallback
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('502 Bad Gateway');
    expect(bodyText).not.toContain('404 Not Found');
  });

  test('should handle healthcheck endpoint', async ({ request }) => {
    const response = await request.get('/v1/api/health');
    expect(response.ok()).toBeTruthy();
  });
});
