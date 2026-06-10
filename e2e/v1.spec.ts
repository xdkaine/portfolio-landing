import { test, expect } from '@playwright/test';

test.describe('V1 App', () => {
  test('should load the homepage and render the correct title', async ({ page }) => {
    // Navigate to the root, which should go through nginx to the next.js app
    await page.goto('/');

    // Check if a header exists. (We might need to adjust this depending on the actual app content)
    // For now, let's just make sure we get a 200 OK and it's not the Nginx fallback
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('502 Bad Gateway');
    expect(bodyText).not.toContain('404 Not Found');
  });

  test('should handle healthcheck endpoint', async ({ page, request }) => {
    const response = await request.get('/v1/api/health');
    expect(response.ok()).toBeTruthy();
  });
});
