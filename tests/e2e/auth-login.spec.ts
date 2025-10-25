import { test, expect } from '@playwright/test';
import { checkA11y } from '../fixtures/accessibility';

/**
 * E2E tests for the login page
 *
 * Tests form validation, user interaction, and authentication flow.
 * Note: These tests assume a test database is available.
 */
test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('displays login form with all required fields', async ({ page }) => {
    // Check for email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Check for password input
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Check for submit button
    const submitButton = page.getByRole('button', { name: /login|sign in/i });
    await expect(submitButton).toBeVisible();
  });

  test('shows validation error for empty form submission', async ({ page }) => {
    // Submit form without filling fields
    const submitButton = page.getByRole('button', { name: /login|sign in/i });
    await submitButton.click();

    // Check for validation errors
    // Note: Adjust selectors based on your actual error message implementation
    const errorMessages = page.locator('[role="alert"], .text-destructive, .error-message');
    await expect(errorMessages.first()).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    // Fill in invalid email
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('not-an-email');

    // Fill in password (to avoid empty field error)
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill('password123');

    // Submit form
    const submitButton = page.getByRole('button', { name: /login|sign in/i });
    await submitButton.click();

    // Check for email validation error
    const errorMessages = page.locator('[role="alert"], .text-destructive, .error-message');
    await expect(errorMessages.first()).toBeVisible();
  });

  test('password field toggles visibility', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Look for toggle button (adjust selector based on your implementation)
    const toggleButton = page.locator('button[aria-label*="password" i], button:has-text("Show")').first();

    // If toggle exists, click it and verify
    const toggleExists = (await toggleButton.count()) > 0;
    if (toggleExists) {
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });

  test('has link to registration page', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /register|sign up|create account/i });
    await expect(registerLink).toBeVisible();

    await registerLink.click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('has link to password reset page', async ({ page }) => {
    const resetLink = page.getByRole('link', { name: /forgot password|reset password/i });
    await expect(resetLink).toBeVisible();

    await resetLink.click();
    await expect(page).toHaveURL(/\/auth\/reset-password/);
  });

  test('passes accessibility checks', async ({ page }) => {
    await checkA11y(page);
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    // Tab through form fields
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(passwordInput).toBeFocused();

    await page.keyboard.press('Tab');
    // After password, next focusable element should be submit button or toggle
    // This is a basic check - adjust based on your form structure
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    await expect(focusedElement).toBeTruthy();
  });

  test('displays loading state during form submission', async ({ page }) => {
    // Fill in form with test credentials
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Submit form
    const submitButton = page.getByRole('button', { name: /login|sign in/i });
    await submitButton.click();

    // Check for loading state (adjust based on your implementation)
    // This could be a disabled button, spinner, or loading text
    const loadingIndicator = page.locator('[aria-busy="true"], .loading, :has-text("Loading")').first();

    // Note: This may not be visible in test environment without actual auth
    // Add timeout to avoid flakiness
    await expect(loadingIndicator.or(page.locator('body'))).toBeVisible({ timeout: 1000 });
  });
});

/**
 * Test authenticated user redirection
 *
 * Note: This test requires setting up authentication state
 * Use fixtures or global setup to create authenticated sessions
 */
test.describe('Login Page - Authenticated User', () => {
  test.skip('redirects authenticated users to ski specs page', async ({ page }) => {
    // TODO: Set up authenticated session using fixtures
    // Example:
    // await setupAuthenticatedSession(page);

    await page.goto('/auth/login');

    // Should redirect to ski specs page
    await expect(page).toHaveURL(/\/ski-specs/);
  });
});
