import { test, expect } from "@playwright/test";
import { checkA11y } from "../fixtures/accessibility";

/**
 * E2E tests for the homepage
 *
 * Tests navigation, accessibility, and basic functionality
 * of the landing page.
 */
test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto("/");
  });

  test("has correct title and heading", async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Ski Surface Spec/i);

    // Check for main heading
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });

  test("displays navigation menu", async ({ page }) => {
    // Check for navigation element
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
  });

  test("has working navigation to login page", async ({ page }) => {
    // Find and click login link
    const loginLink = page.getByRole("link", { name: /login/i });
    await loginLink.click();

    // Verify navigation to login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("has working navigation to register page", async ({ page }) => {
    // Find and click register link
    const registerLink = page.getByRole("link", { name: /register|sign up/i });
    await registerLink.click();

    // Verify navigation to register page
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test("passes accessibility checks", async ({ page }) => {
    // Run axe accessibility scan
    await checkA11y(page);
  });

  test("is responsive on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that page is still usable
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();

    // Navigation should still be accessible (possibly in a menu)
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
  });
});
