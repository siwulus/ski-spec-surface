import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Test directory
  testDir: "./tests/e2e",

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Global setup/teardown
  // globalSetup: require.resolve('./tests/e2e/global-setup'),
  // globalTeardown: require.resolve('./tests/e2e/global-teardown'),

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on first retry
    video: "retain-on-failure",

    // Emulate timezone
    // timezoneId: 'Europe/Warsaw',

    // Emulate locale
    // locale: 'pl-PL',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Output directory for test artifacts
  outputDir: "test-results/",
});
