# API Endpoint Implementation Plan: Create Ski Specification

## 1. Endpoint Overview

**Endpoint**: `POST /api/ski-specs`

**Purpose**: Creates a new ski specification for the authenticated user. The endpoint accepts basic ski dimensions and automatically calculates derived metrics (surface area and relative weight) using a standardized algorithm. Each specification is scoped to the user and must have a unique name within that user's collection.

**Key Features**:
- Automatic calculation of `surface_area` and `relative_weight`
- User-scoped specification management
- Comprehensive input validation with field-level error reporting
- Business rule enforcement (dimensional relationships)

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
`/api/ski-specs`

### Authentication
**Required**: Bearer token (Supabase Auth)
- Token must be provided in Authorization header
- User session must be active
- User ID extracted from authenticated session

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <supabase_access_token>
```

### Request Body

```json
{
  "name": "Atomic Backland 107",
  "description": "All-mountain freeride ski for powder and mixed conditions",
  "length": 181,
  "tip": 142,
  "waist": 107,
  "tail": 123,
  "radius": 18,
  "weight": 1580
}
```

### Parameters

#### Required Parameters
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | string | 1-255 chars, unique per user | Ski specification name |
| `length` | integer | 100-250 | Ski length in cm |
| `tip` | integer | 50-250 | Tip width in mm |
| `waist` | integer | 50-250 | Waist width in mm |
| `tail` | integer | 50-250 | Tail width in mm |
| `radius` | integer | 1-30 | Turning radius in m |
| `weight` | integer | 500-3000 | Weight of one ski in g |

#### Optional Parameters
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `description` | string | max 2000 chars, nullable | Optional ski description |

#### Business Rules
- `tip >= waist` - Tip width must be greater than or equal to waist width
- `tail >= waist` - Tail width must be greater than or equal to waist width
- Name must be unique per user (enforced by database UNIQUE constraint)

## 3. Used Types

### Request Types
- **CreateSkiSpecCommand** - Type for validated input data
- **CreateSkiSpecCommandSchema** - Zod schema for request validation

### Response Types
- **SkiSpecDTO** - Type for successful response
- **SkiSpecDTOSchema** - Zod schema for response validation
- **ApiErrorResponse** - Type for error responses
- **ValidationErrorDetail** - Type for field-level validation errors

All types are defined in `src/types.ts`.

## 4. Response Details

### Success Response (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Atomic Backland 107",
  "description": "All-mountain freeride ski for powder and mixed conditions",
  "length": 181,
  "tip": 142,
  "waist": 107,
  "tail": 123,
  "radius": 18,
  "weight": 1580,
  "surface_area": 2340.50,
  "relative_weight": 0.675,
  "algorithm_version": "1.0.0",
  "notes_count": 0,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

**Response Structure**:
- All input fields are returned
- Calculated fields: `surface_area`, `relative_weight`, `algorithm_version`
- System fields: `id`, `user_id`, `created_at`, `updated_at`
- Aggregated fields: `notes_count` (always 0 for new specs)

### Error Responses

#### 401 Unauthorized
**Scenario**: Missing or invalid authentication token

```json
{
  "error": "Unauthorized",
  "code": "AUTH_REQUIRED",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 400 Bad Request
**Scenario**: Invalid input data (validation errors)

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
      "field": "name",
      "message": "Name is required"
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 422 Unprocessable Entity
**Scenario**: Business rule violation

```json
{
  "error": "Business rule violation",
  "code": "BUSINESS_RULE_VIOLATION",
  "details": [
    {
      "field": "waist",
      "message": "Waist must be less than or equal to both tip and tail widths"
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 409 Conflict
**Scenario**: Specification name already exists for user

```json
{
  "error": "Specification with this name already exists",
  "code": "DUPLICATE_NAME",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 500 Internal Server Error
**Scenario**: Unexpected server error

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 5. Data Flow

```
1. Client Request
   ↓
2. Astro Middleware (attach Supabase client to context.locals)
   ↓
3. API Route Handler (/src/pages/api/ski-specs/index.ts)
   ↓
4. Authentication Check (verify user session)
   ↓
5. Request Body Parsing (parse JSON)
   ↓
6. Input Validation (Zod schema validation)
   ↓
7. Business Logic (Service Layer)
   │  a. Calculate surface_area
   │  b. Calculate relative_weight
   │  c. Get algorithm version
   │  d. Prepare data for insertion
   ↓
8. Database Operation (Supabase)
   │  a. Insert ski_spec record
   │  b. Handle UNIQUE constraint (duplicate name check)
   ↓
9. Response Construction
   │  a. Add notes_count: 0
   │  b. Format timestamps
   │  c. Validate response with SkiSpecDTOSchema
   ↓
10. Return Response (201 Created with SkiSpecDTO)
```

### Database Interactions

**Table**: `ski_specs`

**Operation**: INSERT

**Fields Set**:
- User-provided: `name`, `description`, `length`, `tip`, `waist`, `tail`, `radius`, `weight`
- Calculated: `surface_area`, `relative_weight`, `algorithm_version`
- Auto-generated: `id` (UUID), `user_id` (from session), `created_at`, `updated_at` (timestamps)

### Service Layer Operations

**Service**: `SkiSpecService` (`src/lib/services/ski-spec.service.ts`)

**Methods**:
1. `calculateSurfaceArea(dimensions: { length, tip, waist, tail, radius }): number`
   - Implements surface area calculation algorithm
   - Returns area in cm²

2. `calculateRelativeWeight(weight: number, surfaceArea: number): number`
   - Calculates weight per cm²
   - Returns g/cm²

3. `getCurrentAlgorithmVersion(): string`
   - Returns current algorithm version ("1.0.0")

4. `createSkiSpec(supabase: SupabaseClient, userId: string, command: SkiSpecInsert): Promise<SkiSpecEntity>`
   - Orchestrates the creation process
   - Calls calculation methods
   - Performs database insert
   - Handles errors and transforms database response

5. Build `SkiSpecDTO` based on  `SkiSpecEntity` `notes_count` are in this case always `0`

## 6. Security Considerations

### Authentication & Authorization

1. **Authentication Verification**
   - Verify Supabase session exists before processing request
   - Extract user ID from authenticated session
   - Return 401 if session is missing or invalid

2. **Authorization**
   - Always use authenticated user's ID for `user_id` field
   - Never trust user_id from request body
   - Ensures users can only create specs for themselves

3. **Session Security**
   - Use Supabase's built-in token validation
   - Tokens are validated on each request
   - No manual JWT verification needed

### Input Validation

1. **Schema Validation**
   - Use Zod schema to validate all input fields
   - Validate data types (string, number, integer)
   - Validate ranges for numeric fields
   - Validate string lengths

2. **Sanitization**
   - Trim whitespace from string fields (name, description)
   - Handle null description appropriately
   - Prevent SQL injection via parameterized queries (handled by Supabase SDK)

3. **Business Rule Validation**
   - Validate tip/waist/tail relationships in Zod schema
   - Return 422 for business rule violations with clear error messages

### Data Integrity

1. **Unique Constraint**
   - Database enforces UNIQUE(user_id, name)
   - Catch constraint violation and return 409 Conflict
   - Provide clear error message for duplicate names

2. **Type Safety**
   - Use TypeScript types throughout
   - Validate response with SkiSpecDTOSchema before returning

## 7. Error Handling

### Error Handling Strategy

1. **Handle errors at the beginning of functions** (guard clauses)
2. **Use early returns** for error conditions
3. **Provide user-friendly error messages**
4. **Log errors** for debugging (development) and monitoring (production)
5. **Return consistent error format** (ApiErrorResponse)

### Error Scenarios

| Scenario | HTTP Status | Error Code | Details |
|----------|-------------|------------|---------|
| No session/invalid token | 401 | AUTH_REQUIRED | "Unauthorized" |
| Invalid JSON body | 400 | INVALID_JSON | "Invalid request body" |
| Missing required field | 400 | VALIDATION_ERROR | Field-level error details |
| Invalid data type | 400 | VALIDATION_ERROR | Field-level error details |
| Value out of range | 400 | VALIDATION_ERROR | Field-level error details |
| String too long | 400 | VALIDATION_ERROR | Field-level error details |
| Business rule violation | 422 | BUSINESS_RULE_VIOLATION | "Waist must be less than or equal to both tip and tail widths" |
| Duplicate name | 409 | DUPLICATE_NAME | "Specification with this name already exists" |
| Database error | 500 | DATABASE_ERROR | "Failed to create specification" |
| Calculation error | 500 | CALCULATION_ERROR | "Failed to calculate derived fields" |
| Unknown error | 500 | INTERNAL_ERROR | "Internal server error" |

### Error Response Construction

```typescript
function createErrorResponse(
  error: string,
  code: string,
  details?: ValidationErrorDetail[]
): ApiErrorResponse {
  return {
    error,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}
```

### Zod Validation Error Transformation

```typescript
// Transform Zod errors to ValidationErrorDetail[]
if (error instanceof z.ZodError) {
  const details: ValidationErrorDetail[] = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  return createErrorResponse('Validation failed', 'VALIDATION_ERROR', details);
}
```

### Database Error Handling

```typescript
// Handle Supabase/PostgreSQL errors
if (error.code === '23505') { // UNIQUE constraint violation
  return createErrorResponse(
    'Specification with this name already exists',
    'DUPLICATE_NAME'
  );
}
```

## 9. Implementation Steps

### Step 1: Create Service Layer

**File**: `src/lib/services/ski-spec.service.ts`

**Implementation**:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';
import type { CreateSkiSpecCommand, SkiSpecDTO } from '@/types';

/**
 * Calculates the surface area of a ski based on its dimensions.
 * 
 * @param dimensions - Ski dimensions
 * @returns Surface area in cm²
 */
export function calculateSurfaceArea(dimensions: {
  length: number;
  tip: number;
  waist: number;
  tail: number;
  radius: number;
}): number {
  // TODO: Implement actual surface area calculation algorithm
  // Placeholder calculation for now
  const avgWidth = (dimensions.tip + dimensions.waist + dimensions.tail) / 3;
  const surfaceArea = (dimensions.length * avgWidth) / 100; // Convert to cm²
  return Math.round(surfaceArea * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculates the relative weight (weight per unit area).
 * 
 * @param weight - Ski weight in grams
 * @param surfaceArea - Ski surface area in cm²
 * @returns Relative weight in g/cm²
 */
export function calculateRelativeWeight(weight: number, surfaceArea: number): number {
  const relativeWeight = weight / surfaceArea;
  return Math.round(relativeWeight * 100) / 100; // Round to 2 decimal places
}

/**
 * Returns the current version of the calculation algorithm.
 * 
 * @returns Algorithm version string (semantic versioning)
 */
export function getCurrentAlgorithmVersion(): string {
  return '1.0.0';
}

/**
 * Creates a new ski specification in the database.
 * 
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param command - Validated ski specification data
 * @returns Created ski specification with calculated fields
 * @throws Error if creation fails
 */
export async function createSkiSpec(
  supabase: SupabaseClient<Database>,
  userId: string,
  command: CreateSkiSpecCommand
): Promise<SkiSpecDTO> {
  // Calculate derived fields
  const surfaceArea = calculateSurfaceArea({
    length: command.length,
    tip: command.tip,
    waist: command.waist,
    tail: command.tail,
    radius: command.radius,
  });

  const relativeWeight = calculateRelativeWeight(command.weight, surfaceArea);
  const algorithmVersion = getCurrentAlgorithmVersion();

  // Prepare data for insertion
  const insertData = {
    user_id: userId,
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

  // Insert into database
  const { data, error } = await supabase
    .from('ski_specs')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create ski specification');
  }

  // Return DTO with notes_count
  return {
    ...data,
    notes_count: 0,
  };
}
```

### Step 2: Create API Route Handler

**File**: `src/pages/api/ski-specs/index.ts`

**Implementation**:

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { CreateSkiSpecCommandSchema, type ApiErrorResponse } from '@/types';
import { createSkiSpec } from '@/lib/services/ski-spec.service';

export const prerender = false;

/**
 * POST /api/ski-specs
 * Creates a new ski specification for the authenticated user.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Authentication check
    const supabase = locals.supabase;
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.user.id;

    // Step 2: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          code: 'INVALID_JSON',
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Validate input with Zod schema
    const validationResult = CreateSkiSpecCommandSchema.safeParse(body);

    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details,
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const command = validationResult.data;

    // Step 4: Create ski specification via service
    try {
      const skiSpec = await createSkiSpec(supabase, userId, command);

      // Step 5: Return success response
      return new Response(JSON.stringify(skiSpec), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      // Handle database errors
      if (error?.code === '23505') {
        // UNIQUE constraint violation
        return new Response(
          JSON.stringify({
            error: 'Specification with this name already exists',
            code: 'DUPLICATE_NAME',
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Log error for debugging
      console.error('Error creating ski specification:', error);

      // Generic database error
      return new Response(
        JSON.stringify({
          error: 'Failed to create specification',
          code: 'DATABASE_ERROR',
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error in POST /api/ski-specs:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Step 3: Update Middleware (if needed)

**File**: `src/middleware/index.ts`

**Current Implementation**: Already attaches Supabase client to `context.locals`

**Action**: Verify that the middleware is functioning correctly. No changes needed if it's already attaching the Supabase client.

### Step 4: Create Unit Tests

**File**: `src/lib/services/ski-spec.service.test.ts`

**Test Cases**:

1. **calculateSurfaceArea()**
   - Test with typical dimensions
   - Test with minimum dimensions
   - Test with maximum dimensions
   - Verify rounding to 2 decimal places

2. **calculateRelativeWeight()**
   - Test with typical values
   - Test with edge cases
   - Verify rounding to 2 decimal places

3. **getCurrentAlgorithmVersion()**
   - Verify returns "1.0.0"

4. **createSkiSpec()**
   - Test successful creation
   - Test duplicate name error
   - Test database error handling
   - Verify calculated fields are correct
   - Verify notes_count is 0

### Step 5: Create Integration Tests

**File**: `tests/api/ski-specs/create.test.ts`

**Test Cases**:

1. **Authentication Tests**
   - 401 when no token provided
   - 401 when invalid token provided
   - 401 when expired token provided

2. **Validation Tests**
   - 400 when required fields missing
   - 400 when field types are incorrect
   - 400 when values out of range
   - 400 when strings exceed max length
   - 422 when tip < waist
   - 422 when tail < waist

3. **Success Tests**
   - 201 with valid data
   - Verify all fields in response
   - Verify calculated fields are correct
   - Verify notes_count is 0

4. **Conflict Tests**
   - 409 when creating duplicate name for same user
   - Success when creating same name for different user

5. **Error Handling Tests**
   - 500 when database is unavailable
   - 400 when invalid JSON in body

### Step 6: Manual Testing Checklist

1. **Authentication Flow**
   - [ ] Test with valid token
   - [ ] Test with missing token
   - [ ] Test with invalid token
   - [ ] Test with expired token

2. **Happy Path**
   - [ ] Create spec with all fields
   - [ ] Create spec without description
   - [ ] Verify response has all fields
   - [ ] Verify calculated fields are accurate
   - [ ] Verify notes_count is 0

3. **Validation**
   - [ ] Test each field with invalid values
   - [ ] Test boundary values (min/max)
   - [ ] Test business rules (tip/waist/tail)
   - [ ] Test string length limits

4. **Error Cases**
   - [ ] Test duplicate name
   - [ ] Test invalid JSON
   - [ ] Test malformed request

5. **Database Verification**
   - [ ] Verify record created in database
   - [ ] Verify UNIQUE constraint enforced
   - [ ] Verify timestamps are set correctly
   - [ ] Verify user_id matches authenticated user

### Step 7: Documentation Updates

1. **Update API documentation** (if separate from spec)
2. **Update README** with endpoint usage examples
3. **Add JSDoc comments** to service functions (done in Step 1)
4. **Document algorithm version** and calculation formulas

