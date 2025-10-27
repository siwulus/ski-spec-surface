/**
 * Playwright Global Setup
 *
 * This file runs once before all E2E tests to prepare the test environment.
 * It uses Playwright's project dependencies pattern (Option 1) for better
 * integration with test reports and tracing.
 *
 * Setup tasks:
 * 1. Authenticate with Supabase using E2E credentials
 * 2. Clean up any existing test data (ski specs starting with "e2e-")
 * 3. Create a fresh test ski spec named "e2e-for-edition"
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 */

import { test as setup } from '@playwright/test';
import {
  createAuthenticatedSupabaseClient,
  deleteTestSkiSpecs,
  createTestSkiSpec,
} from '../fixtures/supabase-node-client';

setup('prepare test database', async () => {
  console.log('\n🔧 Running global setup...\n');

  // Step 1: Create and authenticate Supabase client
  const supabase = await createAuthenticatedSupabaseClient();

  // Step 2: Clean up existing test data
  await deleteTestSkiSpecs(supabase, 'e2e-');

  // Step 3: Create test ski spec for edition tests
  await createTestSkiSpec(supabase, 'e2e-for-edition');

  // Sign out to clean up session
  await supabase.auth.signOut();

  console.log('\n✅ Global setup completed successfully\n');
});
