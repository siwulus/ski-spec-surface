import { test as base, type Page } from '@playwright/test';
import { LoginPage } from '../poms/LoginPage';
import { SkiSpecsPage } from '../poms/SkiSpecsPage';
import { getE2ECredentials } from './e2e-credentials';

/**
 * Extended test fixtures for Playwright
 * Add custom fixtures here for common test scenarios
 */

interface TestFixtures {
  authenticatedPage: Page;
  newPage: Page;
  e2eCredentials: { username: string; password: string };
}

export const test = base.extend<TestFixtures>({
  // Test-scoped fixtures below
  // eslint-disable-next-line
  e2eCredentials: async ({}, use) => {
    const { username, password } = getE2ECredentials();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use({ username, password });
  },
  newPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
    await context.close();
  },
  authenticatedPage: async ({ browser }, use) => {
    const { username, password } = getE2ECredentials();
    const context = await browser.newContext();
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    const skiSpecsPage = new SkiSpecsPage(page);

    // Navigate to login page
    await loginPage.goto();
    await loginPage.assertOnPage();

    // Perform login
    await loginPage.login(username, password);

    // Wait for successful redirect to ski-specs
    await skiSpecsPage.assertOnPage();

    // Provide the authenticated page to the test
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);

    await context.close();
    // Note: Cookie cleanup is not needed - each test has its own isolated browser context
    // that is automatically cleaned up by Playwright after the test completes
  },
});

export { expect } from '@playwright/test';
export { getE2ECredentials };
