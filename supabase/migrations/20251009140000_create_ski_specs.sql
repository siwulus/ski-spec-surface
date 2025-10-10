-- ============================================================================
-- Migration: Create ski_specs table
-- Created: 2025-10-09 14:00:00 UTC
-- 
-- Purpose:
--   Create the core ski_specs table to store user ski specifications with
--   calculated surface area and relative weight metrics.
--
-- Affected Objects:
--   - Tables: ski_specs (new)
--   - Indexes: ski_specs_pkey, ski_specs_user_name_key, ski_specs_user_id_idx
--   - Triggers: update_ski_specs_updated_at
--   - Functions: update_updated_at_column
--   - RLS Policies: 4 policies for authenticated user access control
--
-- Special Considerations:
--   - All dimensional values stored in base units (mm for length/width, g for weight)
--   - Surface area in cm², relative weight in g/cm²
--   - RLS enabled to ensure users can only access their own specifications
--   - Automatic updated_at timestamp via trigger
-- ============================================================================

-- ============================================================================
-- 1. Create ski_specs table
-- ============================================================================

-- The ski_specs table stores user-owned ski specifications with measured
-- dimensions and calculated performance metrics. Each specification is unique
-- per user (enforced via unique constraint on user_id + name).
create table ski_specs (
  -- Primary identifier
  id uuid primary key default uuid_generate_v4(),
  
  -- Owner reference (cascade delete when user is removed)
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Specification metadata
  name text not null,
  
  -- Physical dimensions (all in millimeters)
  length integer not null,
  tip integer not null,
  waist integer not null,
  tail integer not null,
  
  -- Performance characteristics
  radius integer not null,  -- turning radius in meters
  weight integer not null,  -- weight of one ski in grams
  
  -- Calculated metrics
  surface_area numeric(10,2) not null,      -- in cm²
  relative_weight numeric(10,2) not null,   -- in g/cm²
  
  -- Algorithm versioning for future recalculations
  algorithm_version text not null,
  
  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure specification names are unique within each user's scope
  constraint ski_specs_user_name_unique unique (user_id, name)
);

-- ============================================================================
-- 2. Create indexes
-- ============================================================================

-- Create an index on user_id to optimize queries filtering by current user.
-- While the unique constraint on (user_id, name) creates an index, this
-- standalone index on user_id alone is more efficient for user-scoped queries,
-- range scans, and ordering operations.
create index ski_specs_user_id_idx on ski_specs(user_id);

-- ============================================================================
-- 3. Create updated_at trigger
-- ============================================================================

-- Reusable function to automatically update the updated_at column.
-- This function can be reused by multiple tables if needed in the future.
create or replace function update_updated_at_column()
returns trigger as $$
begin
  -- Set updated_at to the current timestamp whenever a row is updated
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update the updated_at timestamp on row updates.
-- This ensures updated_at always reflects the last modification time without
-- requiring application-level management.
create trigger update_ski_specs_updated_at
  before update on ski_specs
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- 4. Enable Row Level Security
-- ============================================================================

-- Enable RLS to ensure users can only access their own ski specifications.
-- All policies below enforce that auth.uid() matches the row's user_id.
alter table ski_specs enable row level security;

-- ============================================================================
-- 5. Create RLS Policies
-- ============================================================================

-- Policy: Allow authenticated users to insert their own specifications
-- Rationale: Users must be authenticated and can only create specs for themselves.
-- The WITH CHECK clause ensures the user_id in the inserted row matches the
-- authenticated user's ID.
create policy "Users can insert own specs" on ski_specs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Allow authenticated users to select their own specifications
-- Rationale: Users can only view specifications they own. This policy filters
-- all SELECT queries to return only rows where user_id matches the authenticated
-- user's ID.
create policy "Users can select own specs" on ski_specs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Allow authenticated users to update their own specifications
-- Rationale: Users can only modify specifications they own. The USING clause
-- restricts which existing rows can be updated based on ownership.
create policy "Users can update own specs" on ski_specs
  for update
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Allow authenticated users to delete their own specifications
-- Rationale: Users can only delete specifications they own. This is a hard
-- delete (no soft-delete column) as per design requirements.
create policy "Users can delete own specs" on ski_specs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- End of migration
-- ============================================================================

