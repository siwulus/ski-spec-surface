/**
 * Playwright Global Teardown
 *
 * This file runs once after all E2E tests to clean up the test environment.
 * It uses Playwright's project dependencies pattern (Option 1) for better
 * integration with test reports and tracing.
 *
 * Teardown tasks:
 * 1. Authenticate with Supabase using E2E credentials
 * 2. Clean up all test data (ski specs starting with "e2e-")
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 */

import { test as teardown } from '@playwright/test';
import { createAuthenticatedSupabaseClient, deleteTestSkiSpecs } from '../fixtures/supabase-node-client';

teardown('cleanup test database', async () => {
  console.log('\n🧹 Running global teardown...\n');

  // Step 1: Create and authenticate Supabase client
  const supabase = await createAuthenticatedSupabaseClient();

  // Step 2: Clean up all test data
  await deleteTestSkiSpecs(supabase, 'e2e-');

  // Sign out to clean up session
  await supabase.auth.signOut();

  console.log('\n✅ Global teardown completed successfully\n');
});
