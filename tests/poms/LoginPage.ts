import { type Page, type Locator, expect } from '@playwright/test';
import { AbstractPage } from './AbstractPage';

/**
 * Page Object Model for Login Page
 *
 * Encapsulates all interactions with the login page including:
 * - Form elements (email, password, submit button)
 * - Navigation methods
 * - Assertion helpers
 */
export class LoginPage extends AbstractPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page, '/auth/login');
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.loginButton = page.getByTestId('login-submit-button');
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot your password/i });
    this.signUpLink = page.getByRole('link', { name: /sign up/i });
    this.errorAlert = page.locator('[role="alert"]');
  }

  /**
   * Fill in login credentials and submit the form
   * @param email - User email address
   * @param password - User password (optional for validation testing)
   */
  async login(email: string, password: string): Promise<void> {
    await this.assertOnPage();
    await this.fillLoginForm(email, password);
    await this.waitForReadyInput(this.loginButton);
    await this.loginButton.click();
  }

  /**
   * Fill login form without submitting (useful for validation testing)
   * @param email - User email address
   * @param password - User password
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.waitForReadyInput(this.emailInput);
    await this.waitForReadyInput(this.passwordInput);

    // Click to focus before filling
    await this.emailInput.click();
    await this.emailInput.fill(email);
    await expect(this.emailInput).toHaveValue(email);

    await this.passwordInput.click();
    await this.passwordInput.fill(password);
    await expect(this.passwordInput).toHaveValue(password);
  }

  /**
   * Submit the login form (assumes form is already filled)
   */
  async submitForm(): Promise<void> {
    // Ensure React hydration is complete
    await expect(this.loginButton).toBeEnabled();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(300);

    await this.loginButton.click();
  }

  /**
   * Check if the login button is in loading state
   */
  async isLoginButtonLoading(): Promise<boolean> {
    const buttonText = await this.loginButton.textContent();
    return buttonText?.includes('Signing in') ?? false;
  }

  /**
   * Navigate to forgot password page
   */
  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await expect(this.page).toHaveURL('/auth/reset-password');
  }

  /**
   * Navigate to sign up page
   */
  async clickSignUp(): Promise<void> {
    await this.signUpLink.click();
    await this.waitForPageLoaded();
    await expect(this.page).toHaveURL('/auth/register');
  }

  /**
   * Get the redirectTo parameter from the current URL
   */
  getRedirectToParam(): string | null {
    const url = new URL(this.page.url());
    return url.searchParams.get('redirectTo');
  }

  /**
   * Assert that an error alert is visible
   */
  async assertErrorAlertVisible(): Promise<void> {
    await expect(this.errorAlert).toBeVisible();
  }

  /**
   * Assert that the error alert contains specific text
   * @param errorText - Expected error message text
   */
  async assertErrorAlertContains(errorText: string): Promise<void> {
    await expect(this.errorAlert).toContainText(errorText);
  }

  /**
   * Assert that the page has a redirectTo parameter
   * @param expectedPath - Expected redirect path
   */
  async assertHasRedirectTo(expectedPath: string): Promise<void> {
    const redirectTo = this.getRedirectToParam();
    expect(redirectTo).toBe(expectedPath);
  }

  /**
   * Assert that the login page is displayed (all key elements visible)
   */
  async assertPageIsDisplayed(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
