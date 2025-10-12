-- =====================================================================
-- Migration: Remove RLS Policies
-- =====================================================================
-- Purpose: Drop all Row Level Security policies from ski_specs and ski_spec_notes tables
-- Tables Affected: ski_specs, ski_spec_notes
-- Note: RLS remains enabled on tables, only policies are removed
-- Date: 2025-10-11
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Drop RLS Policies: ski_specs
-- ---------------------------------------------------------------------
-- Remove all policies that control access to ski specifications

-- Drop policy: Users can insert their own specifications
drop policy if exists "Users can insert own specs" on ski_specs;

-- Drop policy: Users can select their own specifications
drop policy if exists "Users can select own specs" on ski_specs;

-- Drop policy: Users can update their own specifications
drop policy if exists "Users can update own specs" on ski_specs;

-- Drop policy: Users can delete their own specifications
drop policy if exists "Users can delete own specs" on ski_specs;

-- ---------------------------------------------------------------------
-- 2. Drop RLS Policies: ski_spec_notes
-- ---------------------------------------------------------------------
-- Remove all policies that control access to ski specification notes

-- Drop policy: Users can select notes for their own specifications
drop policy if exists "Users can select notes for own specs" on ski_spec_notes;

-- Drop policy: Users can insert notes for their own specifications
drop policy if exists "Users can insert notes for own specs" on ski_spec_notes;

-- Drop policy: Users can update notes for their own specifications
drop policy if exists "Users can update notes for own specs" on ski_spec_notes;

-- Drop policy: Users can delete notes for their own specifications
drop policy if exists "Users can delete notes for own specs" on ski_spec_notes;

-- =====================================================================
-- WARNING: RLS is still enabled on both tables
-- =====================================================================
-- Row Level Security remains enabled on ski_specs and ski_spec_notes.
-- With no policies defined, all access will be denied by default.
-- This effectively locks down both tables to all users including authenticated users.
-- 
-- If you need to disable RLS entirely, run:
--   alter table ski_specs disable row level security;
--   alter table ski_spec_notes disable row level security;
-- =====================================================================

-- =====================================================================
-- End of migration
-- =====================================================================

