# Database Schema Plan – Ski Surface Spec Extension

## 1. Tables

### 1.1 `ski_specs`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY` <br> `DEFAULT uuid_generate_v4()` | Internal identifier |
| `user_id` | `uuid` | `NOT NULL` <br> `REFERENCES auth.users(id) ON DELETE CASCADE` | Owner (Supabase user) |
| `name` | `text` | `NOT NULL` | Specification name (unique per-user) |
| `description` | `text` | `NULL` <br> `CHECK (length(description) <= 2000)` | Optional description (max 2000 chars) |
| `length` | `integer` | `NOT NULL` | Ski length in **mm** |
| `tip` | `integer` | `NOT NULL` | Tip width in **mm** |
| `waist` | `integer` | `NOT NULL` | Waist width in **mm** |
| `tail` | `integer` | `NOT NULL` | Tail width in **mm** |
| `radius` | `integer` | `NOT NULL` | Turning radius in **m** |
| `weight` | `integer` | `NOT NULL` | Weight of one ski in **g** |
| `surface_area` | `numeric(10,2)` | `NOT NULL` | Calculated surface area in **cm²** |
| `relative_weight` | `numeric(10,2)` | `NOT NULL` | Calculated weight per cm² in **g/cm²** |
| `algorithm_version` | `text` | `NOT NULL` | Semantic version of algorithm used |
| `created_at` | `timestamptz` | `NOT NULL` <br> `DEFAULT now()` | Row creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL` <br> `DEFAULT now()` | Row update timestamp |

#### Additional Constraints
- `UNIQUE (user_id, name)` — ensures specification names are unique within a user scope.

### 1.2 `ski_spec_notes`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY` <br> `DEFAULT uuid_generate_v4()` | Internal identifier |
| `ski_spec_id` | `uuid` | `NOT NULL` <br> `REFERENCES ski_specs(id) ON DELETE CASCADE` | Parent specification |
| `content` | `text` | `NOT NULL` <br> `CHECK (length(content) >= 1 AND length(content) <= 2000)` | Note content (1-2000 chars) |
| `created_at` | `timestamptz` | `NOT NULL` <br> `DEFAULT now()` | Note creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL` <br> `DEFAULT now()` | Note last update timestamp |

#### Additional Constraints
- None required beyond foreign keys and check constraints.

#### Design Decision
- **No `user_id` column**: Ownership is established through the parent `ski_specs` table. Notes are always accessed in the context of a specific ski specification, never queried directly by user. This prevents data inconsistencies and simplifies the model.

## 2. Relationships
- **auth.users (1) — (∞) ski_specs** via `user_id` foreign-key.
- **ski_specs (1) — (∞) ski_spec_notes** via `ski_spec_id` foreign-key.

**Note:** Ownership of notes is derived through the parent `ski_specs` relationship. There is no direct `auth.users → ski_spec_notes` foreign key.

## 3. Indexes

### 3.1 `ski_specs` Indexes
| Name | Definition | Purpose |
|------|------------|---------|
| `ski_specs_pkey` | `PRIMARY KEY (id)` | Row lookup |
| `ski_specs_user_name_key` | `UNIQUE (user_id, name)` | Enforce unique names per user |
| `ski_specs_user_id_idx` | `INDEX (user_id)` | Efficient queries for current user |

> Note: The unique constraint automatically creates an index, yet the standalone `user_id` index benefits range scans & ordering by creation time, etc.

### 3.2 `ski_spec_notes` Indexes
| Name | Definition | Purpose |
|------|------------|---------|
| `ski_spec_notes_pkey` | `PRIMARY KEY (id)` | Row lookup |
| `ski_spec_notes_ski_spec_id_created_at_idx` | `INDEX (ski_spec_id, created_at DESC)` | Fast retrieval of notes sorted chronologically |

> Note: The composite index on `(ski_spec_id, created_at DESC)` optimizes the common query pattern of fetching all notes for a specification sorted by newest first. No `user_id` index is needed as notes are never queried directly by user.

## 4. Row-Level Security (RLS)

### 4.1 `ski_specs` RLS Policies
```sql
ALTER TABLE ski_specs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own rows
CREATE POLICY "Users can insert own specs" ON ski_specs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own rows
CREATE POLICY "Users can select own specs" ON ski_specs
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own rows
CREATE POLICY "Users can update own specs" ON ski_specs
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own rows
CREATE POLICY "Users can delete own specs" ON ski_specs
  FOR DELETE USING (auth.uid() = user_id);
```

### 4.2 `ski_spec_notes` RLS Policies
```sql
ALTER TABLE ski_spec_notes ENABLE ROW LEVEL SECURITY;

-- Allow users to select notes for their own specifications
CREATE POLICY "Users can select notes for own specs" ON ski_spec_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ski_specs 
      WHERE ski_specs.id = ski_spec_notes.ski_spec_id 
      AND ski_specs.user_id = auth.uid()
    )
  );

-- Allow users to insert notes for their own specifications
CREATE POLICY "Users can insert notes for own specs" ON ski_spec_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ski_specs 
      WHERE ski_specs.id = ski_spec_notes.ski_spec_id 
      AND ski_specs.user_id = auth.uid()
    )
  );

-- Allow users to update notes for their own specifications
CREATE POLICY "Users can update notes for own specs" ON ski_spec_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ski_specs 
      WHERE ski_specs.id = ski_spec_notes.ski_spec_id 
      AND ski_specs.user_id = auth.uid()
    )
  );

-- Allow users to delete notes for their own specifications
CREATE POLICY "Users can delete notes for own specs" ON ski_spec_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ski_specs 
      WHERE ski_specs.id = ski_spec_notes.ski_spec_id 
      AND ski_specs.user_id = auth.uid()
    )
  );
```

**Design rationale:** All policies verify ownership through the parent `ski_specs` table using EXISTS subqueries. This approach:
- Eliminates data redundancy (no `user_id` column needed in notes)
- Prevents ownership inconsistencies
- Aligns with actual query patterns (notes always accessed via `ski_spec_id`)
- PostgreSQL optimizes EXISTS checks efficiently with proper indexes

## 5. Additional Notes

1. All dimensional values are stored in **base units** (mm, g) for consistency; presentation layer handles conversions.
2. Application logic performs full validation (range checks, tip ≥ waist ≤ tail) before persistence.
3. Hard deletes are used – no soft-delete column.
4. Cascade deletion on notes is used
5. Timestamps: `updated_at` should be kept current via trigger (`ON UPDATE` set new value to `now()`) on all tables that requires it