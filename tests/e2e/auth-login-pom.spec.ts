import { test } from '../fixtures/test-fixtures';
import { HomePage } from '../poms/HomePage';
import { LoginPage } from '../poms/LoginPage';
import { SkiSpecsPage } from '../poms/SkiSpecsPage';

test.describe('Login Flow with POM', () => {
  test('should allow a user to log in and see the ski specs page', async ({ newPage, e2eCredentials }) => {
    const { username, password } = e2eCredentials;
    const homePage = new HomePage(newPage);
    const loginPage = new LoginPage(newPage);
    const skiSpecsPage = new SkiSpecsPage(newPage);

    // 1. User opens the main page and verifies it
    await homePage.goto();
    await homePage.assertOnPage();

    // 2. User clicks the login button and verifies navigation to the login page
    await homePage.clickSignIn();
    await loginPage.assertOnPage();

    // 3. Perform the successful login
    await loginPage.login(username, password);

    // 4. See and verify the ski-specs page
    await newPage.waitForTimeout(1000);
    await skiSpecsPage.assertOnPage();
  });
});
