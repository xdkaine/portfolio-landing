import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html'],
    [
      'monocart-coverage-reports',
      {
        name: 'V8 Coverage Report',
        outputDir: './coverage-reports',
        coverageFilter: (v8Mapping: { url: string }) => {
          if (v8Mapping.url.includes('node_modules')) {
            return false;
          }
          if (v8Mapping.url.includes('webpack')) {
            return false;
          }
          if (v8Mapping.url.includes('/.next/')) {
            // Keep app code
            return true;
          }
          if (v8Mapping.url.includes('src/')) {
            return true;
          }
          return false;
        },
      },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:80',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // We stick to Chromium for now if relying entirely on V8 Coverage,
    // as Firefox and Webkit do not emit native V8 coverage.
  ],
});
