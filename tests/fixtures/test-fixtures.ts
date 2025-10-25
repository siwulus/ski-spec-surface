import { test as base } from '@playwright/test';

/**
 * Extended test fixtures for Playwright
 * Add custom fixtures here for common test scenarios
 */

//ignore empty interface
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TestFixtures {
  // Add custom fixtures here
  // Example: authenticatedPage: Page;
}

export const test = base.extend<TestFixtures>({
  // Example fixture: authenticated page
  // authenticatedPage: async ({ page }, use) => {
  //   // Navigate to login page
  //   await page.goto('/auth/login');
  //
  //   // Fill in credentials
  //   await page.fill('input[name="email"]', 'test@example.com');
  //   await page.fill('input[name="password"]', 'password123');
  //
  //   // Submit form
  //   await page.click('button[type="submit"]');
  //
  //   // Wait for navigation to complete
  //   await page.waitForURL('/ski-specs');
  //
  //   await use(page);
  // },
});

export { expect } from '@playwright/test';
