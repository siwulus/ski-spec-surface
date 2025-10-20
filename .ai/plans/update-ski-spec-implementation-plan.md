# API Endpoint Implementation Plan: Update Ski Specification

## 1. Endpoint Overview

The `PUT /api/ski-specs/{id}` endpoint updates an existing ski specification owned by the authenticated user. The endpoint recalculates surface area and relative weight if dimensional values change, validates business rules, and ensures name uniqueness within the user's scope.

**Purpose**: Allow users to modify existing ski specifications while maintaining data integrity and automatic calculations.

**Key Features**:

- Updates all specification fields (name, description, dimensions, weight)
- Recalculates surface_area and relative_weight based on new dimensions
- Validates ownership (user can only update their own specifications)
- Ensures name uniqueness per user (excluding current record)
- Validates business rules (waist must be ≤ tip and tail)
- Returns updated specification with notes count

## 2. Request Details

### HTTP Method

`PUT`

### URL Structure

```
/api/ski-specs/{id}
```

### Path Parameters

| Parameter | Type        | Required | Description                            | Validation                |
| --------- | ----------- | -------- | -------------------------------------- | ------------------------- |
| `id`      | UUID string | Yes      | Unique identifier of ski specification | Must be valid UUID format |

### Authentication

- **Required**: Yes
- **Method**: Bearer token (Supabase JWT)
- **Source**: `Authorization` header
- **User extraction**: `context.locals.supabase.auth.getUser()`

### Request Body

Content-Type: `application/json`

Schema: `UpdateSkiSpecCommand` (identical to `CreateSkiSpecCommand`)

```typescript
{
  name: string,              // 1-255 chars, required
  description: string | null, // 0-2000 chars, optional
  length: number,            // 100-250 (cm), integer, required
  tip: number,               // 50-250 (mm), integer, required
  waist: number,             // 50-250 (mm), integer, required
  tail: number,              // 50-250 (mm), integer, required
  radius: number,            // 1-30 (m), integer, required
  weight: number             // 500-3000 (g), integer, required
}
```

### Request Body Validation Rules

**Field-level validation** (via Zod schema):

- `name`: min 1 char, max 255 chars, required
- `description`: max 2000 chars, nullable
- `length`: integer, 100-250, required
- `tip`: integer, 50-250, required
- `waist`: integer, 50-250, required
- `tail`: integer, 50-250, required
- `radius`: integer, 1-30, required
- `weight`: integer, 500-3000, required

**Business rule validation** (via Zod refinement):

- `waist <= tip AND waist <= tail`

**Example Valid Request**:

```json
{
  "name": "Atomic Backland 107 (181cm)",
  "description": "Updated description with test notes",
  "length": 181,
  "tip": 142,
  "waist": 107,
  "tail": 123,
  "radius": 18,
  "weight": 1580
}
```

## 3. Used Types

### DTOs

- **`SkiSpecDTO`** - Complete ski specification including calculated fields and notes count (response)

### Command Models

- **`UpdateSkiSpecCommand`** - User input for updating specification (request body)

### Schemas

- **`UpdateSkiSpecCommandSchema`** - Zod schema for request validation

### Internal Types

- **`SupabaseClient<Database>`** - Typed Supabase client
- **`SkiSpecEntity`** - Database entity type from `Tables<"ski_specs">`

## 4. Response Details

### Success Response - 200 OK

**Content-Type**: `application/json`

**Body**: `SkiSpecDTO`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "name": "Atomic Backland 107 (181cm)",
  "description": "Updated description with test notes",
  "length": 181,
  "tip": 142,
  "waist": 107,
  "tail": 123,
  "radius": 18,
  "weight": 1580,
  "surface_area": 2340.5,
  "relative_weight": 0.675,
  "algorithm_version": "1.0.0",
  "notes_count": 3,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-20T14:45:00Z"
}
```

### Error Responses

#### 400 Bad Request - Invalid Input

**Scenario**: Invalid UUID format or validation errors

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "tip",
      "message": "Tip width must be between 50 and 250 mm"
    },
    {
      "field": "waist",
      "message": "Waist must be less than or equal to tip and tail"
    }
  ],
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 401 Unauthorized

**Scenario**: Missing or invalid authentication token

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 404 Not Found

**Scenario**: Specification doesn't exist or not owned by user

```json
{
  "error": "Ski specification not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 409 Conflict

**Scenario**: New name already exists for this user

```json
{
  "error": "A specification with this name already exists",
  "code": "CONFLICT",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 422 Unprocessable Entity

**Scenario**: Business rule violations

```json
{
  "error": "Business rule violation",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "waist",
      "message": "Waist must be less than or equal to both tip and tail widths"
    }
  ],
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 500 Internal Server Error

**Scenario**: Unexpected server error

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

## 5. Data Flow

### High-Level Flow

```
1. Receive PUT request with id parameter and body
2. Extract authentication token from request
3. Validate user authentication
4. Validate id parameter (UUID format)
5. Parse and validate request body against schema
6. Verify specification exists and user owns it
7. Check name uniqueness (excluding current record)
8. Calculate surface_area and relative_weight
9. Update specification in database
10. Fetch notes count for the specification
11. Return updated SkiSpecDTO
```

### Detailed Data Flow

#### Phase 1: Authentication & Initial Validation

```
Request → Middleware (auth check) → Extract user_id
  ↓
Validate id parameter (UUID format)
  ↓
  If invalid → Return 400 Bad Request
  If valid → Continue
```

#### Phase 2: Request Body Validation

```
Parse request body → Apply UpdateSkiSpecCommandSchema
  ↓
  If validation fails → Return 400 Bad Request with details
  If validation passes → Continue
```

#### Phase 3: Authorization & Ownership Check

```
Query ski_specs WHERE id = {id} AND user_id = {user_id}
  ↓
  If not found → Return 404 Not Found
  If found → Continue with existing record
```

#### Phase 4: Name Uniqueness Check

```
Query ski_specs WHERE user_id = {user_id}
                  AND name = {new_name}
                  AND id != {id}
  ↓
  If exists → Return 409 Conflict
  If not exists → Continue
```

#### Phase 5: Calculations & Update

```
Calculate surface_area using calculateSurfaceArea()
  ↓
Calculate relative_weight using calculateRelativeWeight()
  ↓
Get current algorithm_version
  ↓
Update ski_specs SET
  name, description, length, tip, waist, tail, radius, weight,
  surface_area, relative_weight, algorithm_version, updated_at
WHERE id = {id} AND user_id = {user_id}
  ↓
  If error → Return 500 Internal Server Error
  If success → Fetch updated record
```

#### Phase 6: Enrichment & Response

```
Count notes: SELECT COUNT(*) FROM ski_spec_notes WHERE ski_spec_id = {id}
  ↓
Combine updated_record + notes_count → SkiSpecDTO
  ↓
Return 200 OK with SkiSpecDTO
```

### Database Interactions

1. **Read Operation**: Fetch existing specification for ownership verification

   ```sql
   SELECT * FROM ski_specs
   WHERE id = $1 AND user_id = $2
   ```

2. **Read Operation**: Check name uniqueness

   ```sql
   SELECT id FROM ski_specs
   WHERE user_id = $1 AND name = $2 AND id != $3
   ```

3. **Update Operation**: Update specification

   ```sql
   UPDATE ski_specs
   SET name = $1, description = $2, length = $3, tip = $4,
       waist = $5, tail = $6, radius = $7, weight = $8,
       surface_area = $9, relative_weight = $10,
       algorithm_version = $11, updated_at = NOW()
   WHERE id = $12 AND user_id = $13
   RETURNING *
   ```

4. **Read Operation**: Count associated notes
   ```sql
   SELECT COUNT(*) FROM ski_spec_notes
   WHERE ski_spec_id = $1
   ```

## 6. Security Considerations

### Authentication & Authorization

**Authentication**:

- Verify JWT token from `Authorization: Bearer <token>` header
- Extract user_id from validated token via `supabase.auth.getUser()`
- Reject requests without valid authentication (401)

**Authorization**:

- Verify user owns the specification using `user_id` filter
- Use `WHERE id = {id} AND user_id = {user_id}` to prevent unauthorized access
- Return 404 for specifications owned by other users (don't leak existence)

### Input Validation

**Path Parameter Validation**:

- Validate UUID format using regex or UUID validator
- Reject malformed UUIDs immediately (400)
- Prevent SQL injection through parameterized queries

**Request Body Validation**:

- Apply Zod schema validation before any database operations
- Sanitize string inputs (trim whitespace)
- Validate numeric ranges and types
- Enforce business rules at application level
- Return detailed validation errors for client debugging

**SQL Injection Prevention**:

- Use Supabase client parameterized queries (built-in protection)
- Never concatenate user input into raw SQL
- Validate and sanitize all inputs before database operations

### Data Integrity

**Name Uniqueness**:

- Check name uniqueness within user scope excluding current record
- Use case-sensitive comparison (database default)
- Trim whitespace before comparison

**Calculations**:

- Recalculate derived fields on every update
- Store algorithm version for future compatibility
- Validate calculation results (no zero/negative values)

## 7. Error Handling

### Error Scenarios & Status Codes

| Scenario                | Status Code | Error Code       | Response Action                             |
| ----------------------- | ----------- | ---------------- | ------------------------------------------- |
| Missing auth token      | 401         | UNAUTHORIZED     | Return error message, don't process         |
| Invalid auth token      | 401         | UNAUTHORIZED     | Return error message, don't process         |
| Invalid UUID format     | 400         | VALIDATION_ERROR | Return error with field details             |
| Invalid request body    | 400         | VALIDATION_ERROR | Return error with field details             |
| Business rule violation | 400         | VALIDATION_ERROR | Return error with field details             |
| Specification not found | 404         | NOT_FOUND        | Return error message                        |
| Specification not owned | 404         | NOT_FOUND        | Return error message (don't leak existence) |
| Name already exists     | 409         | CONFLICT         | Return error message                        |
| Database error          | 500         | INTERNAL_ERROR   | Log error, return generic message           |
| Calculation error       | 500         | INTERNAL_ERROR   | Log error, return generic message           |
| Unexpected error        | 500         | INTERNAL_ERROR   | Log error, return generic message           |

### Error Response Format

All errors follow the `ApiErrorResponse` schema:

```typescript
{
  error: string;        // Human-readable message
  code?: string;        // Machine-readable code
  details?: Array<{     // Field-level errors (for validation)
    field: string;
    message: string;
  }>;
  timestamp?: string;   // ISO datetime
}
```

### Error Handling Strategy

**Guard Clause Pattern**:

```typescript
// 1. Check authentication
if (!user) {
  return new Response(
    JSON.stringify({
      error: "Authentication required",
      code: "UNAUTHORIZED",
      timestamp: new Date().toISOString(),
    }),
    { status: 401 }
  );
}

// 2. Validate UUID
if (!isValidUUID(id)) {
  return new Response(
    JSON.stringify({
      error: "Invalid specification ID format",
      code: "VALIDATION_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 400 }
  );
}

// 3. Validate request body
const validation = UpdateSkiSpecCommandSchema.safeParse(body);
if (!validation.success) {
  return new Response(
    JSON.stringify({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: formatZodErrors(validation.error),
      timestamp: new Date().toISOString(),
    }),
    { status: 400 }
  );
}

// 4-N. Continue with other checks...

// Happy path at the end
```

**Database Error Handling**:

```typescript
try {
  const { data, error } = await updateSkiSpec(...);

  if (error) {
    // Check for specific Postgres errors
    if (error.code === '23505') { // Unique constraint violation
      return new Response(JSON.stringify({
        error: "A specification with this name already exists",
        code: "CONFLICT",
        timestamp: new Date().toISOString()
      }), { status: 409 });
    }

    // Generic database error
    console.error("Database error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString()
    }), { status: 500 });
  }
} catch (error) {
  console.error("Unexpected error:", error);
  return new Response(JSON.stringify({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    timestamp: new Date().toISOString()
  }), { status: 500 });
}
```

### Logging Strategy

**Error Logging**:

- Log all 500 errors with full stack trace
- Log authentication failures (potential security threats)
- Log validation errors for monitoring trends
- Include request context (user_id, endpoint, timestamp)

## 9. Implementation Steps

### Step 1: Create Service Function `updateSkiSpec`

**File**: `src/lib/services/ski-spec.service.ts`

**Function Signature**:

```typescript
export async function updateSkiSpec(
  supabase: SupabaseClient<Database>,
  userId: string,
  specId: string,
  command: UpdateSkiSpecCommand
): Promise<SkiSpecDTO>;
```

**Implementation Tasks**:

1. Reuse existing calculation functions (`calculateSurfaceArea`, `calculateRelativeWeight`, `getCurrentAlgorithmVersion`)
2. Verify specification exists and user owns it
3. Check name uniqueness (excluding current record)
4. Calculate derived fields
5. Prepare update data with trimmed strings
6. Execute update query with proper filters
7. Handle Supabase errors (not found, conflict)
8. Fetch notes count using a separate query
9. Return combined SkiSpecDTO

**Pseudo-code**:

```typescript
export async function updateSkiSpec(...) {
  // 1. Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("ski_specs")
    .select()
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    throw new Error("Specification not found");
  }

  // 2. Check name uniqueness (if name changed)
  if (command.name.trim() !== existing.name) {
    const { data: duplicate } = await supabase
      .from("ski_specs")
      .select("id")
      .eq("user_id", userId)
      .eq("name", command.name.trim())
      .neq("id", specId)
      .maybeSingle();

    if (duplicate) {
      throw new Error("Name already exists");
    }
  }

  // 3. Calculate derived fields
  const surfaceArea = calculateSurfaceArea({ ... });
  const relativeWeight = calculateRelativeWeight(command.weight, surfaceArea);
  const algorithmVersion = getCurrentAlgorithmVersion();

  // 4. Prepare update data
  const updateData = {
    name: command.name.trim(),
    description: command.description?.trim() || null,
    length: command.length,
    tip: command.tip,
    waist: command.waist,
    tail: command.tail,
    radius: command.radius,
    weight: command.weight,
    surface_area: surfaceArea,
    relative_weight: relativeWeight,
    algorithm_version: algorithmVersion,
  };

  // 5. Update in database
  const { data, error } = await supabase
    .from("ski_specs")
    .update(updateData)
    .eq("id", specId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error("Update failed");
  }

  // 6. Get notes count
  const { count } = await supabase
    .from("ski_spec_notes")
    .select("*", { count: "exact", head: true })
    .eq("ski_spec_id", specId);

  // 7. Return DTO
  return {
    ...data,
    notes_count: count || 0,
  };
}
```

### Step 2: Create API Endpoint Handler

**File**: `src/pages/api/ski-specs/[id].ts`

**Export Configuration**:

```typescript
export const prerender = false;
```

**Handler Implementation**:

```typescript
import type { APIRoute } from "astro";
import { UpdateSkiSpecCommandSchema } from "@/types";
import { updateSkiSpec } from "@/lib/services/ski-spec.service";

export const PUT: APIRoute = async (context) => {
  // Implementation here
};
```

**Implementation Tasks**:

1. Extract `id` from `context.params`
2. Authenticate user via `context.locals.supabase.auth.getUser()`
3. Validate UUID format for `id`
4. Parse request body as JSON
5. Validate request body against `UpdateSkiSpecCommandSchema`
6. Call `updateSkiSpec` service function
7. Handle all error scenarios with appropriate status codes
8. Return success response with SkiSpecDTO

**Detailed Implementation**:

```typescript
export const PUT: APIRoute = async (context) => {
  try {
    // 1. Extract id parameter
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: "Specification ID is required",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    // 2. Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return new Response(
        JSON.stringify({
          error: "Invalid specification ID format",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    // 3. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Authentication required",
          code: "UNAUTHORIZED",
          timestamp: new Date().toISOString(),
        }),
        { status: 401 }
      );
    }

    // 4. Parse request body
    let body;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    // 5. Validate request body
    const validation = UpdateSkiSpecCommandSchema.safeParse(body);
    if (!validation.success) {
      const details = validation.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    // 6. Update ski specification
    const updatedSpec = await updateSkiSpec(context.locals.supabase, user.id, id, validation.data);

    // 7. Return success response
    return new Response(JSON.stringify(updatedSpec), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    // Handle specific errors
    if (error.message === "Specification not found") {
      return new Response(
        JSON.stringify({
          error: "Ski specification not found",
          code: "NOT_FOUND",
          timestamp: new Date().toISOString(),
        }),
        { status: 404 }
      );
    }

    if (error.message === "Name already exists") {
      return new Response(
        JSON.stringify({
          error: "A specification with this name already exists",
          code: "CONFLICT",
          timestamp: new Date().toISOString(),
        }),
        { status: 409 }
      );
    }

    // Generic error
    console.error("Error updating ski specification:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      }),
      { status: 500 }
    );
  }
};
```

### Step 3: Create or Update Route File Structure

**File**: `src/pages/api/ski-specs/[id].ts`

This file will handle all single-resource operations:

- `GET /api/ski-specs/{id}` - Retrieve single specification (future)
- `PUT /api/ski-specs/{id}` - Update specification (current implementation)
- `DELETE /api/ski-specs/{id}` - Delete specification (future)

For now, only implement the `PUT` handler.

### Step 4: Add Helper Functions for UUID Validation

**Option 1**: Inline validation (shown in Step 2)

**Option 2**: Create utility helper (recommended for reusability)

**File**: `src/lib/utils.ts`

```typescript
/**
 * Validates if a string is a valid UUID v4 format.
 * @param value - String to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
```

Then use in endpoint:

```typescript
import { isValidUUID } from "@/lib/utils";

// In handler
if (!isValidUUID(id)) {
  return new Response(..., { status: 400 });
}
```

### Step 5: Add Error Formatting Helper

**File**: `src/lib/utils.ts`

```typescript
import type { ZodError } from "zod";
import type { ValidationErrorDetail } from "@/types";

/**
 * Formats Zod validation errors into API error detail format.
 * @param error - Zod error object
 * @returns Array of validation error details
 */
export function formatZodErrors(error: ZodError): ValidationErrorDetail[] {
  return error.errors.map((err) => ({
    field: err.path.join(".") || "unknown",
    message: err.message,
  }));
}
```

Then use in endpoint:

```typescript
import { formatZodErrors } from "@/lib/utils";

// In validation error handling
if (!validation.success) {
  return new Response(
    JSON.stringify({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: formatZodErrors(validation.error),
      timestamp: new Date().toISOString(),
    }),
    { status: 400 }
  );
}
```

### Step 6: Testing Checklist

**Manual Testing**:

- [ ] Test with valid data → Expect 200 with updated SkiSpecDTO
- [ ] Test without auth token → Expect 401
- [ ] Test with invalid auth token → Expect 401
- [ ] Test with invalid UUID → Expect 400
- [ ] Test with non-existent ID → Expect 404
- [ ] Test with another user's ID → Expect 404
- [ ] Test with invalid request body → Expect 400 with details
- [ ] Test with waist > tip → Expect 400 with business rule error
- [ ] Test with duplicate name → Expect 409
- [ ] Test updating name to same name → Expect 200 (no conflict)
- [ ] Test with description > 2000 chars → Expect 400
- [ ] Test with null description → Expect 200
- [ ] Test with negative weight → Expect 400
- [ ] Test calculations after update → Verify surface_area and relative_weight
- [ ] Test notes_count is preserved and accurate
- [ ] Test updated_at timestamp is updated

### Step 7: Documentation Updates

- [ ] Update API documentation if needed
- [ ] Add code comments for complex logic
- [ ] Document error codes and responses
- [ ] Update CHANGELOG if applicable

## Related Endpoints

This endpoint is part of the ski specifications resource management:

- `GET /api/ski-specs` - List all specifications
- `POST /api/ski-specs` - Create specification
- `GET /api/ski-specs/{id}` - Get single specification
- **`PUT /api/ski-specs/{id}`** - Update specification (this endpoint)
- `DELETE /api/ski-specs/{id}` - Delete specification

Ensure consistency in:

- Error response format
- Authentication mechanism
- Validation patterns
- Service layer usage
