import { expect, type Page } from '@playwright/test';

/**
 * Abstract base class for Page Object Models (POMs)
 * Provides common navigation and assertion methods for all page objects
 */
export abstract class AbstractPage {
  readonly page: Page;
  readonly pageUrl: string;

  /**
   * Constructor for the AbstractPage class
   * @param page - The Playwright page object
   * @param pageUrl - The URL of the page
   */
  constructor(page: Page, pageUrl: string) {
    this.page = page;
    this.pageUrl = pageUrl;
  }

  /**
   * Navigate to the page
   */
  async goto(queryParams?: Record<string, string>): Promise<void> {
    let url = this.pageUrl;
    if (queryParams) {
      const searchParams = new URLSearchParams(queryParams);
      url = `${this.pageUrl}?${searchParams.toString()}`;
    }
    await this.page.goto(url);
  }

  /**
   * Assert that the page is displayed and the page URL is correct
   */
  async assertOnPage(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(this.pageUrl));
    await this.assertPageIsDisplayed();
  }

  /**
   * Abstract method to assert that the page is displayed
   */
  abstract assertPageIsDisplayed(): Promise<void>;

  /**
   * Assert that the page has specific query parameters
   * @param queryParams - Expected query parameters
   */
  async assertQueryParams(queryParams: Record<string, string>): Promise<void> {
    const url = new URL(this.page.url());
    for (const [key, value] of Object.entries(queryParams)) {
      expect(url.searchParams.get(key)).toBe(value);
    }
  }
}
