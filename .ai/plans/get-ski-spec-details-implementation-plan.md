# API Endpoint Implementation Plan: GET /api/ski-specs/{id}

## 1. Endpoint Overview

This endpoint retrieves detailed information about a specific ski specification, including all technical parameters and an aggregated count of associated notes. The endpoint is authenticated and ensures users can only access their own ski specifications.

**Key Features:**
- Returns complete ski specification data with calculated metrics (surface area, relative weight)
- Includes count of associated notes without loading full note data
- Enforces user ownership validation
- Validates UUID format before database query

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/ski-specs/{id}`
- **Authentication**: Required (Bearer token via Supabase Auth)

### Parameters

**Path Parameters (Required):**
- `id` (string, UUID format): Unique identifier of the ski specification to retrieve

**Query Parameters:**
- None

**Request Body:**
- None (GET request)

### Request Examples

```http
GET /api/ski-specs/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer <supabase-jwt-token>
```

## 3. Used Types

### DTOs (from `src/types.ts`)

**Response Type:**
```typescript
type SkiSpecDTO = SkiSpecEntity & {
  notes_count: number;
};
```

The `SkiSpecDTO` extends `SkiSpecEntity` with an additional aggregated field:
- All fields from `ski_specs` table
- `notes_count`: Number of associated notes (integer, minimum 0)

**Validation Schema:**
```typescript
SkiSpecDTOSchema // Already defined in types.ts (lines 51-68)
```

### Database Types (from `src/db/database.types.ts`)
- `SkiSpecEntity`: Base type from `Tables<"ski_specs">`
- `Database`: Supabase database type definition

### Input Validation Type
```typescript
// Path parameter validation schema
const PathParamsSchema = z.object({
  id: z.string().uuid("Invalid specification ID format")
});
```

## 4. Response Details

### Success Response (200 OK)

**Content-Type**: `application/json`

**Body Structure:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "2be2c57e-3845-4579-9a60-c872cbfb9886",
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
  "notes_count": 3,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### Error Responses

#### 400 Bad Request - Invalid UUID Format
```json
{
  "error": "Invalid specification ID format",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 401 Unauthorized - Missing or Invalid Authentication
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 404 Not Found - Specification Not Found or Not Owned by User
```json
{
  "error": "Ski specification not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 500 Internal Server Error - Database or Server Error
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 5. Data Flow

```
Client Request
    ↓
[1] Astro API Route Handler (/api/ski-specs/[id].ts)
    ↓
[2] Middleware (Authentication & Supabase injection)
    ↓
[3] Path Parameter Extraction (context.params.id)
    ↓
[4] UUID Format Validation (Zod schema)
    ↓ (if valid)
[5] Authentication Check (context.locals.userId)
    ↓ (if authenticated)
[6] Service Layer Call (getSkiSpec)
    ↓
[7] Supabase Query:
    - SELECT from ski_specs WHERE id = $1 AND user_id = $2
    - LEFT JOIN to count ski_spec_notes
    ↓ (if found)
[8] Transform to SkiSpecDTO
    ↓
[9] Return 200 with SkiSpecDTO
    ↓
Client Response
```

### Detailed Query Strategy

The service function will use a supabase clinet and axecute single efficient query:
```typescript
// Query with count using Supabase's query builder
const { data, error, count } = await supabase
  .from('ski_specs')
  .select('*, notes:ski_spec_notes(count)', { count: 'exact' })
  .eq('id', specId)
  .eq('user_id', userId)
  .single();
```

## 6. Security Considerations

### Authentication
- **Requirement**: User must be authenticated via Supabase JWT token
- **Implementation**: Check `context.locals.userId` from middleware
- **Error Handling**: Return 401 if `userId` is undefined or null
- **Token Validation**: Handled by Supabase middleware (JWT verification)

### Authorization
- **Requirement**: Users can only access their own ski specifications
- **Implementation**: Database query includes `user_id` filter
- **Prevention**: Prevents unauthorized access by using composite filter (id AND user_id)
- **Security Benefit**: Even if attacker guesses valid UUIDs, they cannot access other users' data

### Input Validation
- **UUID Validation**: Validate format before database query
- **Benefits**: 
  - Prevents malformed input from reaching database
  - Reduces potential SQL injection vectors
  - Provides clear error messages for invalid input
- **Implementation**: Use Zod schema with UUID validation

### Data Sanitization
- **Error Messages**: Sanitize error messages to prevent information leakage
- **Logging**: Log detailed errors server-side, return generic messages to client
- **User Data**: No user input in this endpoint (only UUID from path)

## 7. Error Handling

### Error Handling Strategy

Follow the clean code guidelines: handle errors early with guard clauses, use early returns.

#### 1. Invalid UUID Format (400)
```typescript
const result = PathParamsSchema.safeParse({ id: context.params.id });
if (!result.success) {
  return new Response(
    JSON.stringify({
      error: "Invalid specification ID format",
      code: "VALIDATION_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 2. Missing Authentication (401)
```typescript
const userId = context.locals.userId;
if (!userId) {
  return new Response(
    JSON.stringify({
      error: "Authentication required",
      code: "UNAUTHORIZED",
      timestamp: new Date().toISOString(),
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 3. Specification Not Found (404)
```typescript
// In service layer: return null if not found
// In route handler:
if (!skiSpec) {
  return new Response(
    JSON.stringify({
      error: "Ski specification not found",
      code: "NOT_FOUND",
      timestamp: new Date().toISOString(),
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 4. Database Errors (500)
```typescript
try {
  // ... database operations
} catch (error) {
  console.error("Failed to retrieve ski specification:", {
    userId,
    specId,
    error: error instanceof Error ? error.message : "Unknown error",
  });
  
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Error Logging Best Practices
- Log error context (userId, specId) for debugging
- Use console.error for server-side logging
- Don't expose sensitive information in client responses
- Include timestamp for error correlation

### Database Connection Pooling
- Supabase client handles connection pooling automatically
- No additional configuration needed

## 9. Implementation Steps

### Step 1: Create Service Function
**File**: `src/lib/services/ski-spec.service.ts`

Add the `getSkiSpec` function:

```typescript
/**
 * Retrieves a ski specification by ID for a specific user.
 *
 * This function:
 * 1. Queries the ski_specs table with filters for id and user_id
 * 2. Counts associated notes from ski_spec_notes table
 * 3. Returns the specification as a DTO with notes_count
 * 4. Returns null if not found or user doesn't own the specification
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification to retrieve
 * @returns Ski specification with notes count, or null if not found
 * @throws Error if database query fails
 */
export async function getSkiSpec(
  supabase: SupabaseClient<Database>,
  userId: string,
  specId: string
): Promise<SkiSpecDTO | null> {
  // Query ski_specs with notes count
  const { data: spec, error: specError } = await supabase
    .from("ski_specs")
    .select("*")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  // Handle not found case
  if (specError?.code === "PGRST116") {
    return null;
  }

  // Handle other errors
  if (specError) {
    throw specError;
  }

  // Query notes count separately
  const { count, error: countError } = await supabase
    .from("ski_spec_notes")
    .select("*", { count: "exact", head: true })
    .eq("ski_spec_id", specId);

  if (countError) {
    throw countError;
  }

  // Return DTO with notes_count
  return {
    ...spec,
    notes_count: count ?? 0,
  };
}
```

### Step 2: Create API Route Handler
**File**: `src/pages/api/ski-specs/[id].ts`

Create the endpoint file:

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { getSkiSpec } from "@/lib/services/ski-spec.service";

// Disable prerendering for this API route
export const prerender = false;

// Path parameter validation schema
const PathParamsSchema = z.object({
  id: z.string().uuid("Invalid specification ID format"),
});

/**
 * GET /api/ski-specs/{id}
 * Retrieves a specific ski specification by ID
 */
export const GET: APIRoute = async (context) => {
  // Step 1: Validate path parameter (UUID format)
  const paramsResult = PathParamsSchema.safeParse({ id: context.params.id });
  if (!paramsResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid specification ID format",
        code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Step 2: Check authentication
  const userId = context.locals.userId;
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "UNAUTHORIZED",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Step 3: Get Supabase client from context
  const supabase = context.locals.supabase;

  // Step 4: Retrieve ski specification
  try {
    const specId = paramsResult.data.id;
    const skiSpec = await getSkiSpec(supabase, userId, specId);

    // Step 5: Handle not found
    if (!skiSpec) {
      return new Response(
        JSON.stringify({
          error: "Ski specification not found",
          code: "NOT_FOUND",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Return successful response
    return new Response(JSON.stringify(skiSpec), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 7: Handle unexpected errors
    console.error("Failed to retrieve ski specification:", {
      userId,
      specId: paramsResult.data.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Step 3: Update Service File Exports
Ensure the new `getSkiSpec` function is exported from the service file.

### Step 4: Test the Endpoint

**Manual Testing Checklist:**
1. ✅ Test with valid UUID and authenticated user → expect 200
2. ✅ Test with invalid UUID format → expect 400
3. ✅ Test without authentication token → expect 401
4. ✅ Test with non-existent UUID → expect 404
5. ✅ Test with UUID belonging to another user → expect 404
6. ✅ Verify notes_count is accurate (test with 0, 1, and multiple notes)
7. ✅ Verify all fields are returned correctly
8. ✅ Verify timestamps are in ISO format

**Test with cURL:**
```bash
# Valid request
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/ski-specs/550e8400-e29b-41d4-a716-446655440000

# Invalid UUID
curl http://localhost:3000/api/ski-specs/invalid-uuid

# Without authentication (if middleware enforces it)
curl http://localhost:3000/api/ski-specs/550e8400-e29b-41d4-a716-446655440000
```

### Step 6: Documentation
1. ✅ API documented in swagger.yaml (already complete)
2. Update any API documentation site if applicable
3. Add code comments for maintainability

## 10. Additional Considerations

### Type Safety
- Use TypeScript strictly throughout
- Leverage Supabase generated types from `database.types.ts`
- Validate response shape with Zod schema if needed
