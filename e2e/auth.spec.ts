import { test, expect } from '@playwright/test';

test.describe('Authentication & Turnstile', () => {
  test('should render the login form and Turnstile widget', async ({ page }) => {
    await page.goto('/v1/login');

    // The login form should be visible
    await expect(page.locator('h1', { hasText: 'ACCESS' })).toBeVisible();

    // The Turnstile widget label should be rendered
    await expect(page.locator('text=VERIFICATION')).toBeVisible();
  });

  test('should show an error on invalid credentials with passing Turnstile', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    await page.goto('/v1/login');

    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword123');

    // Wait for the Turnstile widget to initialize and auto-pass in the background
    await page.waitForFunction(() => {
      const input = document.querySelector('input[name="cf-turnstile-response"]');
      return input && (input as HTMLInputElement).value.length > 0;
    }, { timeout: 10000 });

    // With the test Turnstile keys (1x...AA), Turnstile auto-passes instantly in the background.
    // We can just click submit.
    await page.getByRole('button', { name: /authenticate/i }).click();

    // We should see an error message indicating invalid credentials, meaning Turnstile PASSED
    // and the server processed the login attempt and rejected the bad password.
    await expect(page.locator('text=ERROR:')).toBeVisible({ timeout: 5000 });
  });
});
