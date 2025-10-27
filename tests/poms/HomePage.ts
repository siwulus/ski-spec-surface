import { type Page, type Locator, expect } from '@playwright/test';
import { AbstractPage } from './AbstractPage';

export class HomePage extends AbstractPage {
  readonly signInButton: Locator;
  readonly header: Locator;

  constructor(page: Page) {
    super(page, '/');
    this.signInButton = page.getByTestId('signin-button');
    this.header = page.getByTestId('header');
  }

  async assertPageIsDisplayed(): Promise<void> {
    await expect(this.header).toBeVisible();
  }

  async clickSignIn() {
    await this.signInButton.click();
  }
}
