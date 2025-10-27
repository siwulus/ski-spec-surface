import { type Page, type Locator, expect } from '@playwright/test';
import { AbstractPage } from './AbstractPage';

/**
 * Page Object Model for Ski Specifications Page
 *
 * Encapsulates all interactions with the ski specs page including:
 * - Page elements and navigation
 * - Assertion helpers
 * - Wait strategies
 * - Form dialog interactions
 */
export class SkiSpecsPage extends AbstractPage {
  readonly header: Locator;
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly skiSpecCards: Locator;

  // Form dialog elements
  readonly formDialog: Locator;
  readonly formDialogTitle: Locator;
  readonly formNameInput: Locator;
  readonly formDescriptionInput: Locator;
  readonly formLengthInput: Locator;
  readonly formTipInput: Locator;
  readonly formWaistInput: Locator;
  readonly formTailInput: Locator;
  readonly formRadiusInput: Locator;
  readonly formWeightInput: Locator;
  readonly formSaveButton: Locator;
  readonly formCancelButton: Locator;

  constructor(page: Page) {
    super(page, '/ski-specs');
    this.header = page.getByTestId('ski-spec-grid-header');
    this.addButton = page.getByRole('button', { name: /add/i }).first();
    this.searchInput = page.getByRole('searchbox');
    this.skiSpecCards = page.locator('[data-testid*="ski-spec-card"]');

    // Form dialog locators
    this.formDialog = page.getByRole('dialog');
    this.formDialogTitle = page
      .getByRole('dialog')
      .getByRole('heading', { name: /Add New Specification|Edit Specification/i });
    this.formNameInput = page.getByTestId('ski-spec-form-name');
    this.formDescriptionInput = page.getByTestId('ski-spec-form-description');
    this.formLengthInput = page.getByTestId('ski-spec-form-length');
    this.formTipInput = page.getByTestId('ski-spec-form-tip');
    this.formWaistInput = page.getByTestId('ski-spec-form-waist');
    this.formTailInput = page.getByTestId('ski-spec-form-tail');
    this.formRadiusInput = page.getByTestId('ski-spec-form-radius');
    this.formWeightInput = page.getByTestId('ski-spec-form-weight');
    this.formSaveButton = page.getByTestId('ski-spec-form-submit');
    this.formCancelButton = page.getByTestId('ski-spec-form-cancel');
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

  /**
   * Click the "Add Specification" button
   */
  async clickAddSpecification(): Promise<void> {
    await this.addButton.click();
  }

  /**
   * Click the edit button for a specific ski specification
   * @param name - The name of the ski specification to edit
   */
  async clickEditSpecification(name: string): Promise<void> {
    const card = this.getSkiSpecCardByName(name);
    const editButton = card.getByTestId('ski-spec-card-edit-button');
    await editButton.click();
  }

  /**
   * Assert that the form dialog is open
   */
  async assertFormDialogIsOpen(): Promise<void> {
    await expect(this.formDialog).toBeVisible();
    await expect(this.formDialogTitle).toBeVisible();
  }

  /**
   * Assert that the form dialog is closed
   */
  async assertFormDialogIsClosed(): Promise<void> {
    await expect(this.formDialog).not.toBeVisible();
  }

  /**
   * Assert that the form dialog title matches the expected text
   * @param expectedTitle - The expected dialog title (e.g., 'Add New Specification' or 'Edit Specification')
   */
  async assertFormDialogTitleIs(expectedTitle: string): Promise<void> {
    await expect(this.formDialogTitle).toHaveText(expectedTitle);
  }

  /**
   * Fill the ski specification form
   * @param data - Form data to fill
   */
  async fillSkiSpecForm(data: {
    name: string;
    description?: string;
    length: number;
    tip: number;
    waist: number;
    tail: number;
    radius: number;
    weight: number;
  }): Promise<void> {
    await this.formNameInput.fill(data.name);

    if (data.description) {
      await this.formDescriptionInput.fill(data.description);
    }

    await this.formLengthInput.fill(data.length.toString());
    await this.formTipInput.fill(data.tip.toString());
    await this.formWaistInput.fill(data.waist.toString());
    await this.formTailInput.fill(data.tail.toString());
    await this.formRadiusInput.fill(data.radius.toString());
    await this.formWeightInput.fill(data.weight.toString());
  }

  /**
   * Submit the ski specification form
   */
  async submitForm(): Promise<void> {
    await this.formSaveButton.click();
  }

  /**
   * Cancel the ski specification form
   */
  async cancelForm(): Promise<void> {
    await this.formCancelButton.click();
  }

  /**
   * Get the current value of a form field
   * @param fieldName - The name of the field (e.g., 'name', 'weight', 'length')
   * @returns The current input value
   */
  async getFormFieldValue(fieldName: string): Promise<string> {
    const fieldLocatorMap: Record<string, Locator> = {
      name: this.formNameInput,
      description: this.formDescriptionInput,
      length: this.formLengthInput,
      tip: this.formTipInput,
      waist: this.formWaistInput,
      tail: this.formTailInput,
      radius: this.formRadiusInput,
      weight: this.formWeightInput,
    };

    const locator = fieldLocatorMap[fieldName];
    if (!locator) {
      throw new Error(`Unknown field name: ${fieldName}`);
    }

    return (await locator.inputValue()) || '';
  }

  /**
   * Find a ski specification card by name
   * @param name - The name of the ski specification to find
   */
  getSkiSpecCardByName(name: string): Locator {
    return this.page.locator(`[data-testid*="ski-spec-card"]:has-text("${name}")`);
  }

  /**
   * Assert that a ski specification with the given name is visible
   * @param name - The name of the ski specification
   */
  async assertSkiSpecVisible(name: string): Promise<void> {
    await expect(this.getSkiSpecCardByName(name)).toBeVisible();
  }
}
