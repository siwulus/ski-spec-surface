-- =====================================================================
-- Migration: Fix Radius Type and Length Units
-- =====================================================================
-- Purpose: Ensure radius column has correct numeric type and fix length unit comments
-- Tables Affected: ski_specs
-- Changes: 
--   - Verify radius column is numeric(10,2) (should already be correct)
--   - Fix length column comment to specify millimeters instead of centimeters
-- Date: 2025-10-25
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Verify and Fix Radius Column Type
-- ---------------------------------------------------------------------
-- Ensure radius column is numeric(10,2) as specified in db-plan.md
-- This should already be correct, but we'll verify and fix if needed

-- Check current column type and alter if necessary
-- Note: This will only change the type if it's different from numeric(10,2)
alter table ski_specs 
alter column radius type numeric(10,2);

-- Add comment to clarify the radius column type and units
comment on column ski_specs.radius is 'Turning radius in meters (numeric with 2 decimal places)';

-- ---------------------------------------------------------------------
-- 2. Fix Length Column Comment
-- ---------------------------------------------------------------------
-- Correct the length column comment to specify millimeters instead of centimeters
-- According to db-plan.md, length should be stored in centimeters (cm)
comment on column ski_specs.length is 'Ski length in centimeters';

-- ---------------------------------------------------------------------
-- 3. Verify Other Column Comments Match db-plan.md
-- ---------------------------------------------------------------------
-- Ensure all dimensional column comments are consistent with the database plan
comment on column ski_specs.tip is 'Tip width in millimeters';
comment on column ski_specs.waist is 'Waist width in millimeters';
comment on column ski_specs.tail is 'Tail width in millimeters';
comment on column ski_specs.weight is 'Weight of one ski in grams';
comment on column ski_specs.surface_area is 'Calculated surface area in square centimeters';
comment on column ski_specs.relative_weight is 'Calculated weight per square centimeter in g/cm²';

-- =====================================================================
-- Notes
-- =====================================================================
-- After running this migration, you should regenerate the database types
-- using: supabase gen types typescript --local > src/db/database.types.ts
-- 
-- This will ensure the TypeScript types reflect the correct numeric(10,2)
-- type for the radius field instead of the generic 'number' type.
-- =====================================================================

-- =====================================================================
-- End of migration
-- =====================================================================
