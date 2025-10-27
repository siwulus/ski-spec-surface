import { type Page, type Locator, expect } from '@playwright/test';
import { AbstractPage } from './AbstractPage';

/**
 * Page Object Model for Ski Specifications Page
 *
 * Encapsulates all interactions with the ski specs page including:
 * - Page elements and navigation
 * - Assertion helpers
 * - Wait strategies
 */
export class SkiSpecsPage extends AbstractPage {
  readonly header: Locator;
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly skiSpecCards: Locator;

  constructor(page: Page) {
    super(page, '/ski-specs');
    this.header = page.getByTestId('ski-spec-grid-header');
    this.addButton = page.getByRole('button', { name: /add/i }).first();
    this.searchInput = page.getByRole('searchbox');
    this.skiSpecCards = page.locator('[data-testid*="ski-spec-card"]');
  }

  /**
   * Assert that the page is displayed with correct header
   */
  async assertPageIsDisplayed(): Promise<void> {
    await expect(this.header).toBeVisible();
    await expect(this.header).toHaveText('Ski Specifications');
  }

  /**
   * Get the count of visible ski spec cards
   */
  async getSkiSpecCount(): Promise<number> {
    return await this.skiSpecCards.count();
  }

  /**
   * Check if the page is in empty state (no ski specs)
   */
  async isEmptyState(): Promise<boolean> {
    const count = await this.getSkiSpecCount();
    return count === 0;
  }
}
