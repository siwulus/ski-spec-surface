-- ============================================================================
-- Migration: Disable RLS and remove policies for ski_specs table
-- Created: 2025-10-09 19:42:28 UTC
-- 
-- Purpose:
--   Disable Row Level Security and remove all policies on the ski_specs table
--   to allow unrestricted access to all ski specifications data.
--
-- Affected Objects:
--   - Table: ski_specs (RLS disabled)
--   - Policies: All 4 RLS policies removed
--     * "Users can insert own specs"
--     * "Users can select own specs" 
--     * "Users can update own specs"
--     * "Users can delete own specs"
--
-- Special Considerations:
--   - RLS is completely disabled, allowing unrestricted access
--   - All policies are removed from the database
--   - This removes all security controls on the ski_specs table
--   - Policies will need to be recreated if security is needed again
-- ============================================================================

-- ============================================================================
-- 1. Remove all RLS policies on ski_specs table
-- ============================================================================

-- Remove the insert policy for authenticated users
-- This policy previously restricted inserts to only allow users to create
-- specifications for themselves (auth.uid() = user_id)
drop policy if exists "Users can insert own specs" on ski_specs;

-- Remove the select policy for authenticated users  
-- This policy previously restricted selects to only return specifications
-- owned by the authenticated user (auth.uid() = user_id)
drop policy if exists "Users can select own specs" on ski_specs;

-- Remove the update policy for authenticated users
-- This policy previously restricted updates to only allow users to modify
-- specifications they own (auth.uid() = user_id)
drop policy if exists "Users can update own specs" on ski_specs;

-- Remove the delete policy for authenticated users
-- This policy previously restricted deletes to only allow users to remove
-- specifications they own (auth.uid() = user_id)
drop policy if exists "Users can delete own specs" on ski_specs;

-- ============================================================================
-- 2. Disable Row Level Security on ski_specs table
-- ============================================================================

-- Disable RLS to allow unrestricted access to the ski_specs table
-- This removes all access restrictions and allows any user to perform
-- any operation (select, insert, update, delete) on the table
alter table ski_specs disable row level security;

-- ============================================================================
-- End of migration
-- ============================================================================
