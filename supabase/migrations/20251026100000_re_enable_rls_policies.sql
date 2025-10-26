-- =====================================================================
-- Migration: Re-enable Row Level Security (RLS)
-- =====================================================================
-- Purpose: Restore RLS policies for ski_specs and ski_spec_notes tables
-- Tables Affected: ski_specs, ski_spec_notes
-- Note: This migration re-enables RLS and restores the original policies
--       that grant access to authenticated users for their own data.
-- Date: 2025-10-26
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Enable Row-Level Security
-- ---------------------------------------------------------------------
-- Re-enable RLS on both tables to enforce data access policies.
-- This was previously disabled in migration 20251011130100_disable_rls.sql.
alter table ski_specs enable row level security;
alter table ski_spec_notes enable row level security;

-- ---------------------------------------------------------------------
-- 2. RLS Policies: ski_specs
-- ---------------------------------------------------------------------
-- Restore policies to ensure users can only access their own ski specifications.

-- Policy: Allow authenticated users to insert their own specifications
create policy "Users can insert own specs" on ski_specs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Allow users to select their own specifications
create policy "Users can select own specs" on ski_specs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Allow users to update their own specifications
create policy "Users can update own specs" on ski_specs
  for update
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Allow users to delete their own specifications
create policy "Users can delete own specs" on ski_specs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3. RLS Policies: ski_spec_notes
-- ---------------------------------------------------------------------
-- Restore policies to ensure users can only access notes for their own ski specs.
-- Ownership is verified through the parent ski_specs table relationship.

-- Policy: Allow users to select notes for their own specifications
create policy "Users can select notes for own specs" on ski_spec_notes
  for select
  to authenticated
  using (
    exists (
      select 1 from ski_specs
      where ski_specs.id = ski_spec_notes.ski_spec_id
      and ski_specs.user_id = auth.uid()
    )
  );

-- Policy: Allow users to insert notes for their own specifications
create policy "Users can insert notes for own specs" on ski_spec_notes
  for insert
  to authenticated
  with check (
    exists (
      select 1 from ski_specs
      where ski_specs.id = ski_spec_notes.ski_spec_id
      and ski_specs.user_id = auth.uid()
    )
  );

-- Policy: Allow users to update notes for their own specifications
create policy "Users can update notes for own specs" on ski_spec_notes
  for update
  to authenticated
  using (
    exists (
      select 1 from ski_specs
      where ski_specs.id = ski_spec_notes.ski_spec_id
      and ski_specs.user_id = auth.uid()
    )
  );

-- Policy: Allow users to delete notes for their own specifications
create policy "Users can delete notes for own specs" on ski_spec_notes
  for delete
  to authenticated
  using (
    exists (
      select 1 from ski_specs
      where ski_specs.id = ski_spec_notes.ski_spec_id
      and ski_specs.user_id = auth.uid()
    )
  );

-- =====================================================================
-- End of migration
-- =====================================================================
