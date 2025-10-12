-- =====================================================================
-- Migration: Disable Row Level Security
-- =====================================================================
-- Purpose: Completely disable RLS on ski_specs and ski_spec_notes tables
-- Tables Affected: ski_specs, ski_spec_notes
-- Warning: This removes all row-level access control
-- Date: 2025-10-11
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Disable RLS: ski_specs
-- ---------------------------------------------------------------------
-- DESTRUCTIVE: This removes all row-level security from ski_specs table
-- After this change, any authenticated or anonymous user with database access
-- can read, insert, update, or delete any row in the ski_specs table
alter table ski_specs disable row level security;

-- ---------------------------------------------------------------------
-- 2. Disable RLS: ski_spec_notes
-- ---------------------------------------------------------------------
-- DESTRUCTIVE: This removes all row-level security from ski_spec_notes table
-- After this change, any authenticated or anonymous user with database access
-- can read, insert, update, or delete any row in the ski_spec_notes table
alter table ski_spec_notes disable row level security;

-- =====================================================================
-- Security Notice
-- =====================================================================
-- Row Level Security has been completely disabled on both tables.
-- Access control must now be managed at the application level.
-- Ensure proper authentication and authorization checks are implemented
-- in your application code before allowing any database operations.
-- =====================================================================

-- =====================================================================
-- End of migration
-- =====================================================================

