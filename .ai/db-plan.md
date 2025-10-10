# Database Schema Plan – Ski Surface Spec Extension

## 1. Tables

### 1.1 `ski_specs`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY` <br> `DEFAULT uuid_generate_v4()` | Internal identifier |
| `user_id` | `uuid` | `NOT NULL` <br> `REFERENCES auth.users(id) ON DELETE CASCADE` | Owner (Supabase user) |
| `name` | `text` | `NOT NULL` | Specification name (unique per-user) |
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

## 2. Relationships
- **auth.users (1) — (∞) ski_specs** via `user_id` foreign-key.

## 3. Indexes
| Name | Definition | Purpose |
|------|------------|---------|
| `ski_specs_pkey` | `PRIMARY KEY (id)` | Row lookup |
| `ski_specs_user_name_key` | `UNIQUE (user_id, name)` | Enforce unique names per user |
| `ski_specs_user_id_idx` | `INDEX (user_id)` | Efficient queries for current user |

> Note: The unique constraint automatically creates an index, yet the standalone `user_id` index benefits range scans & ordering by creation time, etc.

## 4. Row-Level Security (RLS)
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

## 5. Additional Notes
1. All dimensional values are stored in **base units** (mm, g) for consistency; presentation layer handles conversions.
2. Application logic performs full validation (range checks, tip ≥ waist ≤ tail) before persistence.
3. Hard deletes are used – no soft-delete column.
4. Timestamps: `updated_at` should be kept current via trigger (`ON UPDATE` set new value to `now()`).
5. Future expansion (outside MVP) can introduce tables such as `algorithms`, shared specs, or activity logs without impacting current design.
