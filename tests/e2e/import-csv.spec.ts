import { expect, test } from '@playwright/test';

test.describe('CSV Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to ski-specs page (requires authentication)
    await page.goto('/ski-specs');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Ski Specifications' })).toBeVisible();
  });

  test('should open import dialog when Import button is clicked', async ({ page }) => {
    // Click Import button
    await page.getByTestId('import-button').click();

    // Verify dialog opens
    await expect(page.getByRole('dialog', { name: /import specyfikacji/i })).toBeVisible();
    await expect(page.getByText('Zaimportuj specyfikacje nart z pliku CSV (max 10MB)')).toBeVisible();

    // Verify file upload zone is visible
    await expect(
      page.getByRole('button', { name: /przeciągnij plik csv tutaj lub kliknij aby wybrać/i })
    ).toBeVisible();

    // Verify Cancel button is visible
    await expect(page.getByRole('button', { name: /anuluj/i })).toBeVisible();
  });

  test('should import valid CSV file successfully', async ({ page }) => {
    // Create a valid CSV file content
    const csvContent = `name,length_cm,tip_mm,waist_mm,tail_mm,radius_m,weight_g,description
Test Ski 1,180,130,100,120,15.5,1500,Test description for ski 1
Test Ski 2,170,125,95,115,14.0,1400,Test description for ski 2`;

    // Click Import button
    await page.getByTestId('import-button').click();

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible();

    // Upload CSV file
    const fileInput = page.locator('input[type="file"]');

    // Create a temporary file with the CSV content
    const buffer = Buffer.from(csvContent);
    await fileInput.setInputFiles({
      name: 'test-skis.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    });

    // Wait for upload to complete and results to appear
    await expect(page.getByText('Wyniki importu')).toBeVisible({ timeout: 10000 });

    // Verify summary is displayed
    await expect(page.getByText('Zaimportowano')).toBeVisible();
    await expect(page.getByText('Łącznie wierszy')).toBeVisible();

    // Verify tabs are displayed
    await expect(page.getByRole('tab', { name: /zaimportowane/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /błędy/i })).toBeVisible();

    // Verify imported items are shown
    await expect(page.getByText('Test Ski 1')).toBeVisible();
    await expect(page.getByText('Test Ski 2')).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: /zamknij/i }).click();

    // Verify dialog is closed
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify imported specs appear in the list
    await expect(page.getByText('Test Ski 1')).toBeVisible();
    await expect(page.getByText('Test Ski 2')).toBeVisible();
  });

  test('should display validation errors for invalid CSV data', async ({ page }) => {
    // Create a CSV with invalid data (length out of range)
    const csvContent = `name,length_cm,tip_mm,waist_mm,tail_mm,radius_m,weight_g,description
Invalid Ski,50,130,100,120,15.5,1500,This ski has invalid length`;

    // Click Import button
    await page.getByTestId('import-button').click();

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible();

    // Upload CSV file
    const fileInput = page.locator('input[type="file"]');
    const buffer = Buffer.from(csvContent);
    await fileInput.setInputFiles({
      name: 'invalid-ski.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    });

    // Wait for upload to complete
    await expect(page.getByText('Wyniki importu')).toBeVisible({ timeout: 10000 });

    // Verify errors tab is active by default
    await expect(page.getByRole('tab', { name: /błędy/i })).toHaveAttribute('data-state', 'active');

    // Verify error details are displayed
    await expect(page.getByText('Invalid Ski')).toBeVisible();
    await expect(page.getByText(/length/i)).toBeVisible();
  });

  test('should close dialog on Cancel button click', async ({ page }) => {
    // Click Import button
    await page.getByTestId('import-button').click();

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: /anuluj/i }).click();

    // Verify dialog is closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should close dialog on ESC key press', async ({ page }) => {
    // Click Import button
    await page.getByTestId('import-button').click();

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible();

    // Press ESC
    await page.keyboard.press('Escape');

    // Verify dialog is closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should return focus to Import button after closing dialog', async ({ page }) => {
    // Click Import button
    const importButton = page.getByTestId('import-button');
    await importButton.click();

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: /anuluj/i }).click();

    // Verify dialog is closed
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify focus returns to Import button
    await expect(importButton).toBeFocused();
  });
});
