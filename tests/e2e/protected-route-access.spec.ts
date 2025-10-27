import { test } from '../fixtures/test-fixtures';
import { LoginPage } from '../poms/LoginPage';
import { SkiSpecsPage } from '../poms/SkiSpecsPage';

/**
 * E2E-005: Protected Route Access Control
 *
 * Tests that unauthenticated users are redirected when accessing protected routes,
 * and that authenticated users are redirected away from auth pages.
 */
test.describe('Protected Route Access Control', () => {
  test('unauthenticated user is redirected to login when accessing protected route', async ({ newPage }) => {
    const skiSpecsPage = new SkiSpecsPage(newPage);
    const loginPage = new LoginPage(newPage);

    // Step 1: Navigate directly to /ski-specs (protected route)
    await skiSpecsPage.goto();

    // Step 2: Verify redirect to /auth/login?redirectTo=/ski-specs
    await loginPage.assertOnPage();
    await loginPage.assertHasRedirectTo('/ski-specs');
  });

  test('after login, user is redirected to originally requested protected page', async ({
    newPage,
    e2eCredentials,
  }) => {
    const { username, password } = e2eCredentials;
    const skiSpecsPage = new SkiSpecsPage(newPage);
    const loginPage = new LoginPage(newPage);

    // Step 1: Navigate directly to /ski-specs (protected route)
    await skiSpecsPage.goto();

    // Step 2: Verify redirect to login with redirectTo parameter
    await loginPage.assertOnPage();
    await loginPage.assertHasRedirectTo('/ski-specs');

    // Step 3: Login with valid credentials
    await loginPage.login(username, password);

    // Step 4: Verify redirect back to originally requested /ski-specs
    await skiSpecsPage.assertOnPage();
  });

  test('authenticated user is redirected away from login page', async ({ authenticatedPage }) => {
    const loginPage = new LoginPage(authenticatedPage);
    const skiSpecsPage = new SkiSpecsPage(authenticatedPage);

    // Step 1: Navigate to /login (protected route)
    await loginPage.goto();
    // Step 2: Verify redirect to /ski-specs
    await skiSpecsPage.assertOnPage();
  });

  test('authenticated user accessing protected route directly succeeds', async ({ authenticatedPage }) => {
    const skiSpecsPage = new SkiSpecsPage(authenticatedPage);

    // Navigate to protected route as authenticated user
    await skiSpecsPage.goto();

    // Verify user stays on the protected page (no redirect)
    await skiSpecsPage.assertOnPage();
  });

  test('preserves complex redirectTo paths with query parameters', async ({ newPage, e2eCredentials }) => {
    const { username, password } = e2eCredentials;
    const loginPage = new LoginPage(newPage);
    const skiSecPage = new SkiSpecsPage(newPage);

    // Navigate to a protected route with query parameters
    await skiSecPage.goto({ page: '2', sort: 'name' });

    // Verify redirect to login with full path preserved
    await loginPage.assertOnPage();
    await loginPage.assertHasRedirectTo('/ski-specs?page=2&sort=name');

    // Login
    await loginPage.login(username, password);

    // Verify redirect back to the exact URL with query parameters
    await skiSecPage.assertOnPage();
    await skiSecPage.assertQueryParams({ page: '2', sort: 'name' });
  });
});
