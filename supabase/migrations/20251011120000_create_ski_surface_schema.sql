-- =====================================================================
-- Migration: Create Ski Surface Specification Schema
-- =====================================================================
-- Purpose: Initialize complete database schema for ski specifications
-- Tables: ski_specs, ski_spec_notes
-- Features: RLS policies, indexes, triggers for updated_at
-- Date: 2025-10-11
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------
-- Ensure uuid generation is available
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 2. Table: ski_specs
-- ---------------------------------------------------------------------
-- Stores ski specifications with dimensional data and calculated metrics
create table ski_specs (
  -- Primary identifier
  id uuid primary key default uuid_generate_v4(),
  
  -- Ownership: references Supabase auth.users
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Specification metadata
  name text not null,
  description text check (length(description) >= 1 and length(description) <= 2000),
  
  -- Dimensional data (stored in base units)
  length integer not null,  -- ski length in cm
  tip integer not null,     -- tip width in mm
  waist integer not null,   -- waist width in mm
  tail integer not null,    -- tail width in mm
  radius numeric(10,2) not null,  -- turning radius in m
  weight integer not null,  -- weight of one ski in g
  
  -- Calculated metrics
  surface_area numeric(10,2) not null,      -- calculated surface area in cm²
  relative_weight numeric(10,2) not null,   -- calculated weight per cm² in g/cm²
  
  -- Algorithm tracking
  algorithm_version text not null,  -- semantic version of calculation algorithm
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints: ensure specification names are unique per user
  constraint ski_specs_user_name_unique unique (user_id, name)
);

-- Add helpful comment to table
comment on table ski_specs is 'Stores ski specifications with dimensional data and calculated surface metrics';

-- Add column comments for clarity
comment on column ski_specs.length is 'Ski length in millimeters';
comment on column ski_specs.tip is 'Tip width in millimeters';
comment on column ski_specs.waist is 'Waist width in millimeters';
comment on column ski_specs.tail is 'Tail width in millimeters';
comment on column ski_specs.radius is 'Turning radius in meters';
comment on column ski_specs.weight is 'Weight of one ski in grams';
comment on column ski_specs.surface_area is 'Calculated surface area in square centimeters';
comment on column ski_specs.relative_weight is 'Calculated weight per square centimeter in g/cm²';
comment on column ski_specs.algorithm_version is 'Semantic version of the calculation algorithm used';

-- ---------------------------------------------------------------------
-- 3. Indexes: ski_specs
-- ---------------------------------------------------------------------
-- Index for efficient user-scoped queries
create index ski_specs_user_id_idx on ski_specs(user_id);

-- Note: The unique constraint on (user_id, name) automatically creates an index
-- but we add a standalone user_id index to optimize range scans and ordering

-- ---------------------------------------------------------------------
-- 4. Table: ski_spec_notes
-- ---------------------------------------------------------------------
-- Stores notes associated with ski specifications
-- Ownership is derived through parent ski_specs relationship
create table ski_spec_notes (
  -- Primary identifier
  id uuid primary key default uuid_generate_v4(),
  
  -- Parent specification reference
  ski_spec_id uuid not null references ski_specs(id) on delete cascade,
  
  -- Note content with length constraints
  content text not null check (length(content) >= 1 and length(content) <= 2000),
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add helpful comment to table
comment on table ski_spec_notes is 'Stores notes associated with ski specifications. Ownership derived through parent ski_specs table';

-- Add column comments
comment on column ski_spec_notes.content is 'Note content (1-2000 characters)';

-- ---------------------------------------------------------------------
-- 5. Indexes: ski_spec_notes
-- ---------------------------------------------------------------------
-- Composite index optimizes common query pattern: fetch notes for a spec, sorted by newest first
create index ski_spec_notes_ski_spec_id_created_at_idx on ski_spec_notes(ski_spec_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. Row-Level Security: Enable RLS
-- ---------------------------------------------------------------------
-- Enable RLS on both tables to enforce data access policies
alter table ski_specs enable row level security;
alter table ski_spec_notes enable row level security;

-- ---------------------------------------------------------------------
-- 7. RLS Policies: ski_specs
-- ---------------------------------------------------------------------
-- Users can only access their own ski specifications

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
-- 8. RLS Policies: ski_spec_notes
-- ---------------------------------------------------------------------
-- Users can only access notes for their own ski specifications
-- Ownership is verified through parent ski_specs table relationship

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

-- ---------------------------------------------------------------------
-- 9. Triggers: Automatic updated_at management
-- ---------------------------------------------------------------------
-- Create a reusable function to update the updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to ski_specs table
-- This ensures updated_at is automatically set whenever a row is modified
create trigger update_ski_specs_updated_at
  before update on ski_specs
  for each row
  execute function update_updated_at_column();

-- Apply trigger to ski_spec_notes table
-- This ensures updated_at is automatically set whenever a note is modified
create trigger update_ski_spec_notes_updated_at
  before update on ski_spec_notes
  for each row
  execute function update_updated_at_column();

-- =====================================================================
-- End of migration
-- =====================================================================

