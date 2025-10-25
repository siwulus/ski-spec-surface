import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Check page for accessibility violations using axe-core
 * @param page - Playwright page object
 * @param options - Axe configuration options
 */
export async function checkA11y(
  page: Page,
  options?: {
    /**
     * Run axe on specific selectors
     */
    include?: string[];
    /**
     * Exclude specific selectors from axe scan
     */
    exclude?: string[];
    /**
     * Disable specific rules
     */
    disabledRules?: string[];
  }
) {
  const axeBuilder = new AxeBuilder({ page });

  // Include specific selectors if provided
  if (options?.include) {
    options.include.forEach((selector) => axeBuilder.include(selector));
  }

  // Exclude specific selectors if provided
  if (options?.exclude) {
    options.exclude.forEach((selector) => axeBuilder.exclude(selector));
  }

  // Disable specific rules if provided
  if (options?.disabledRules) {
    axeBuilder.disableRules(options.disabledRules);
  }

  // Run axe and get results
  const results = await axeBuilder.analyze();

  // Assert no violations
  expect(results.violations).toEqual([]);

  return results;
}

/**
 * Common accessibility test patterns
 */
export const a11yPatterns = {
  /**
   * Check for keyboard navigation
   */
  async checkKeyboardNavigation(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.focus();
    const isFocused = await element.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBeTruthy();
  },

  /**
   * Check for ARIA attributes
   */
  async checkAriaLabel(page: Page, selector: string) {
    const element = page.locator(selector);
    const ariaLabel = await element.getAttribute("aria-label");
    const ariaLabelledBy = await element.getAttribute("aria-labelledby");
    expect(ariaLabel || ariaLabelledBy).toBeTruthy();
  },
};
