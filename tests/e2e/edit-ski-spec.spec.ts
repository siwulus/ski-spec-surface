import { test, expect } from '../fixtures/test-fixtures';
import { SkiSpecsPage } from '../poms/SkiSpecsPage';

test.describe('E2E-009: Edit Existing Specification', () => {
  test('should allow user to edit an existing ski specification', async ({ authenticatedPage }) => {
    const skiSpecsPage = new SkiSpecsPage(authenticatedPage);

    // Use worker-scoped testSkiSpec fixture (created once per worker)
    // Initial values: length=180, tip=135, waist=105, tail=125, radius=18.5, weight=1800
    const specName = 'e2e-for-edition';
    const updatedData = {
      weight: 2050, // Changed from 1800g to 2050g (matching scenario)
      description: 'Updated description for E2E edit test',
    };

    // Step 1: Navigate to /ski-specs
    await skiSpecsPage.goto();
    await skiSpecsPage.assertOnPage();

    // Step 2: Click edit button on existing specification
    await skiSpecsPage.clickEditSpecification(specName);

    // Step 3: Verify URL changes to /ski-specs?action=edit&id={uuid}
    // The URL should contain action=edit (we can't predict the UUID)
    await expect(authenticatedPage).toHaveURL(/\/ski-specs\?action=edit&id=[a-f0-9-]+/);

    // Step 4: Verify dialog opens with title "Edit Specification"
    await skiSpecsPage.assertFormDialogIsOpen();
    await skiSpecsPage.assertFormDialogTitleIs('Edit Specification');

    // Step 5: Verify form is pre-filled with current values
    await expect(skiSpecsPage.formNameInput).toHaveValue(specName);
    expect(await skiSpecsPage.getFormFieldValue('description')).toBe('Test ski spec for E2E testing');
    expect(await skiSpecsPage.getFormFieldValue('length')).toBe('180');
    expect(await skiSpecsPage.getFormFieldValue('tip')).toBe('135');
    expect(await skiSpecsPage.getFormFieldValue('waist')).toBe('105');
    expect(await skiSpecsPage.getFormFieldValue('tail')).toBe('125');
    expect(await skiSpecsPage.getFormFieldValue('radius')).toBe('18.5');
    expect(await skiSpecsPage.getFormFieldValue('weight')).toBe('1800');

    // Step 6: Modify weight from 1800g to 2050g
    await skiSpecsPage.formWeightInput.clear();
    await skiSpecsPage.formWeightInput.fill(updatedData.weight.toString());

    // Step 7: Add/modify description
    await skiSpecsPage.formDescriptionInput.clear();
    await skiSpecsPage.formDescriptionInput.fill(updatedData.description);

    // Step 8: Click "Save" button
    await skiSpecsPage.submitForm();

    // Expected Results:
    // - Modal closes and URL returns to /ski-specs
    await skiSpecsPage.assertFormDialogIsClosed();
    await expect(authenticatedPage).toHaveURL(/\/ski-specs$/);

    // - Updated specification appears in list
    await skiSpecsPage.assertSkiSpecVisible(specName);

    // Verify the card is still present and visible
    const card = skiSpecsPage.getSkiSpecCardByName(specName);
    await expect(card).toBeVisible();

    // Note: We could add more detailed assertions here to verify the weight
    // is displayed as 2050g in the card, but that would require additional
    // locators for the weight value within the card.
  });

  test('should preserve unchanged fields when editing', async ({ authenticatedPage }) => {
    const skiSpecsPage = new SkiSpecsPage(authenticatedPage);

    // Create a unique spec for this test to ensure isolation from other tests
    const testSpecName = `e2e-test-preserve-${Date.now()}`;
    const testSpecData = {
      name: testSpecName,
      description: 'Original description for preserve test',
      length: 180,
      tip: 135,
      waist: 105,
      tail: 125,
      radius: 18.5,
      weight: 1800,
    };

    // Navigate to ski-specs page
    await skiSpecsPage.goto();
    await skiSpecsPage.assertOnPage();

    // Create the test spec
    await skiSpecsPage.clickAddSpecification();
    await skiSpecsPage.assertFormDialogIsOpen();
    await skiSpecsPage.fillSkiSpecForm(testSpecData);
    await skiSpecsPage.submitForm();
    await skiSpecsPage.assertFormDialogIsClosed();
    await skiSpecsPage.assertSkiSpecVisible(testSpecName);

    // Now test editing - open edit dialog for our newly created spec
    await skiSpecsPage.clickEditSpecification(testSpecName);

    // Verify dialog is open
    await skiSpecsPage.assertFormDialogIsOpen();
    await skiSpecsPage.assertFormDialogTitleIs('Edit Specification');

    // Only modify the description, leave all other fields unchanged
    const newDescription = `Modified at ${Date.now()}`;
    await skiSpecsPage.formDescriptionInput.clear();
    await skiSpecsPage.formDescriptionInput.fill(newDescription);

    // Submit the form
    await skiSpecsPage.submitForm();

    // Verify changes were saved
    await skiSpecsPage.assertFormDialogIsClosed();
    await expect(authenticatedPage).toHaveURL(/\/ski-specs$/);

    // Re-open the edit dialog to verify the description was updated
    // and other fields remained unchanged
    await skiSpecsPage.clickEditSpecification(testSpecName);
    await skiSpecsPage.assertFormDialogIsOpen();

    // Verify description was updated
    expect(await skiSpecsPage.getFormFieldValue('description')).toBe(newDescription);

    // Verify other fields remained unchanged
    expect(await skiSpecsPage.getFormFieldValue('length')).toBe('180');
    expect(await skiSpecsPage.getFormFieldValue('tip')).toBe('135');
    expect(await skiSpecsPage.getFormFieldValue('waist')).toBe('105');
    expect(await skiSpecsPage.getFormFieldValue('tail')).toBe('125');
    expect(await skiSpecsPage.getFormFieldValue('radius')).toBe('18.5');
    expect(await skiSpecsPage.getFormFieldValue('weight')).toBe('1800');

    // Close the dialog
    await skiSpecsPage.cancelForm();
  });
});
