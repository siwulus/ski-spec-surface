/**
 * Supabase Node.js Client Helper for E2E Tests
 *
 * Provides utilities for interacting with Supabase in Node.js context
 * (global setup/teardown) where SSR client is not available.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';
import { getE2ECredentials } from './e2e-credentials';

/**
 * Creates and authenticates a Supabase client for E2E testing
 * Uses credentials from environment variables (E2E_USERNAME, E2E_PASSWORD)
 *
 * @returns Authenticated Supabase client
 * @throws Error if authentication fails
 */
export async function createAuthenticatedSupabaseClient(): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
  }

  // Create Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Authenticate with E2E credentials
  const { username, password } = getE2ECredentials();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: username,
    password: password,
  });

  if (error || !data.user) {
    throw new Error(`Failed to authenticate E2E user: ${error?.message || 'Unknown error'}`);
  }

  console.log(`✓ Authenticated as: ${data.user.email}`);

  return supabase;
}

/**
 * Deletes all ski specs where name starts with the given prefix
 *
 * @param supabase - Authenticated Supabase client
 * @param namePrefix - Prefix to match (e.g., "e2e-")
 * @returns Number of deleted records
 */
export async function deleteTestSkiSpecs(supabase: SupabaseClient<Database>, namePrefix: string): Promise<number> {
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    throw new Error('User not authenticated');
  }

  // Query ski specs that match the prefix
  const { data: specs, error: queryError } = await supabase
    .from('ski_specs')
    .select('id, name')
    .eq('user_id', user.user.id)
    .like('name', `${namePrefix}%`);

  if (queryError) {
    throw new Error(`Failed to query ski specs: ${queryError.message}`);
  }

  if (!specs || specs.length === 0) {
    console.log(`✓ No ski specs found with prefix "${namePrefix}"`);
    return 0;
  }

  // Delete matching specs
  const { error: deleteError } = await supabase
    .from('ski_specs')
    .delete()
    .eq('user_id', user.user.id)
    .like('name', `${namePrefix}%`);

  if (deleteError) {
    throw new Error(`Failed to delete ski specs: ${deleteError.message}`);
  }

  console.log(`✓ Deleted ${specs.length} ski spec(s) with prefix "${namePrefix}"`);
  return specs.length;
}

/**
 * Creates a test ski spec with predefined data
 *
 * @param supabase - Authenticated Supabase client
 * @param name - Name for the ski spec
 * @returns Created ski spec ID
 */
export async function createTestSkiSpec(supabase: SupabaseClient<Database>, name: string): Promise<string> {
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    throw new Error('User not authenticated');
  }

  // Test data matching CreateSkiSpecCommand schema
  // Surface area and relative weight will be calculated by the database
  const testData = {
    user_id: user.user.id,
    name: name,
    description: 'Test ski spec for E2E testing',
    length: 180, // cm
    tip: 135, // mm
    waist: 105, // mm
    tail: 125, // mm
    radius: 18.5, // m
    weight: 1800, // g
    // Calculated fields (will be computed by database triggers or service layer)
    surface_area: (180 * ((135 + 105 + 125) / 3)) / 10, // ~2190 cm²
    relative_weight: 1800 / ((180 * ((135 + 105 + 125) / 3)) / 10), // ~0.82 g/cm²
    algorithm_version: '1.0.0',
  };

  const { data, error } = await supabase.from('ski_specs').insert(testData).select('id').single();

  if (error || !data) {
    throw new Error(`Failed to create test ski spec: ${error?.message || 'Unknown error'}`);
  }

  console.info(`✓ Created ski spec "${name}" with ID: ${data.id}`);
  return data.id;
}
