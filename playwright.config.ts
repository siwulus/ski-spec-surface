import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.e2e') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Maximum time one test can run
  timeout: 30 * 1000,
  // Expect timeout for assertions
  expect: {
    timeout: 10 * 1000,
  },

  // Run tests in files in parallel
  fullyParallel: false,

  forbidOnly: false,

  // Retry on CI only
  retries: 0,

  workers: 3,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Timeout for each Playwright action (fill, click, etc.) - helps with headless mode timing
    actionTimeout: 10 * 1000,

    // Timeout for navigation actions (goto, waitForURL, etc.)
    navigationTimeout: 30 * 1000,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'retain-on-failure',

    // Emulate timezone
    // timezoneId: 'Europe/Warsaw',

    // Emulate locale
    // locale: 'pl-PL',
  },

  // Configure projects for major browsers
  projects: [
    // Global setup project - runs before all tests
    {
      name: 'setup db',
      testDir: './tests/e2e',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup db',
    },
    // Global teardown project - runs after all tests
    {
      name: 'cleanup db',
      testDir: './tests/e2e',
      testMatch: /global\.teardown\.ts/,
    },
    // Main test project - depends on setup
    {
      name: 'chromium',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup db'],
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm dev:e2e',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
});
