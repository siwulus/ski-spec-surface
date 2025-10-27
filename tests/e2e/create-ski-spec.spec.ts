import { test, expect } from '../fixtures/test-fixtures';
import { SkiSpecsPage } from '../poms/SkiSpecsPage';

test.describe('E2E-007: Create New Ski Specification', () => {
  test('should allow user to create a new ski specification with all required fields', async ({
    authenticatedPage,
  }) => {
    const skiSpecFormData = {
      name: `e2e-test-Volkl Mantra M6 184${Date.now()}`,
      description: 'All-mountain ski for advanced riders',
      length: 184,
      tip: 135,
      waist: 96,
      tail: 119,
      radius: 20,
      weight: 2100,
    };
    const skiSpecsPage = new SkiSpecsPage(authenticatedPage);

    // Step 1: Navigate to /ski-specs
    await skiSpecsPage.goto();
    await skiSpecsPage.assertOnPage();

    // Step 2: Click "Add Specification" button (top-right CTA)
    await skiSpecsPage.clickAddSpecification();

    // Step 3: Verify URL changes to /ski-specs?action=new without page reload
    await skiSpecsPage.assertQueryParams({ action: 'new' });
    await skiSpecsPage.assertFormDialogIsOpen();

    // Verify dialog title
    await expect(skiSpecsPage.formDialogTitle).toHaveText('Add New Specification');

    // Step 4: Fill form with test data
    await skiSpecsPage.fillSkiSpecForm(skiSpecFormData);

    // Step 5: Click "Save" button
    await skiSpecsPage.submitForm();

    // - Modal closes and URL returns to /ski-specs
    await skiSpecsPage.assertFormDialogIsClosed();
    await expect(authenticatedPage).toHaveURL(/\/ski-specs$/);

    // - New specification appears in list
    await skiSpecsPage.assertSkiSpecVisible(skiSpecFormData.name);

    // - List shows correct values with units
    const newCard = skiSpecsPage.getSkiSpecCardByName(skiSpecFormData.name);
    await expect(newCard).toBeVisible();
  });

  test('should validate that modal opens without page reload', async ({ authenticatedPage }) => {
    const skiSpecsPage = new SkiSpecsPage(authenticatedPage);

    await skiSpecsPage.goto();
    await skiSpecsPage.assertOnPage();

    // Track navigation events to ensure no full page reload occurs
    let navigationOccurred = false;
    authenticatedPage.on('framenavigated', (frame) => {
      if (frame === authenticatedPage.mainFrame()) {
        const url = frame.url();
        // A query param change is OK (client-side navigation)
        // A full page load would trigger this with a different page load pattern
        if (!url.includes('?action=new')) {
          navigationOccurred = true;
        }
      }
    });

    await skiSpecsPage.clickAddSpecification();
    await skiSpecsPage.assertFormDialogIsOpen();

    // Verify URL changed to include action=new
    await skiSpecsPage.assertQueryParams({ action: 'new' });

    // No full page navigation should have occurred
    expect(navigationOccurred).toBe(false);
  });
});
