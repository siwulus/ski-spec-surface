# API Endpoint Implementation Plan: GET /api/ski-specs/{specId}/notes

## 1. Endpoint Overview

The `GET /api/ski-specs/{specId}/notes` endpoint retrieves a paginated list of notes for a specific ski specification, sorted chronologically with the newest notes first. This endpoint is essential for users to review all observations, test results, and other documentation associated with a particular ski model.

**Key Features:**
- Paginated response with configurable page size
- Fixed sorting by creation date (newest first)
- Authentication and authorization required
- Returns 404 for both non-existent specs and unauthorized access (IDOR prevention)

**Related User Stories:**
- US-020: Przeglądanie listy notatek
- US-018: Wyświetlanie widoku szczegółów specyfikacji

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/ski-specs/{specId}/notes
```

### Path Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `specId` | string | Yes | Valid UUID format | ID of the ski specification |

### Query Parameters

| Parameter | Type | Required | Constraints | Default | Description |
|-----------|------|----------|-------------|---------|-------------|
| `page` | integer | No | Min: 1 | 1 | Page number (1-indexed) |
| `limit` | integer | No | Min: 1, Max: 100 | 50 | Items per page |

### Request Headers
- `Authorization: Bearer <token>` - Supabase JWT token (handled by middleware)
- `Content-Type: application/json` - Expected content type

### Example Requests

**Basic request:**
```
GET /api/ski-specs/550e8400-e29b-41d4-a716-446655440000/notes
```

**With pagination:**
```
GET /api/ski-specs/550e8400-e29b-41d4-a716-446655440000/notes?page=2&limit=25
```

## 3. Used Types

### From `src/types.ts`:

**Request Types:**
- `ListNotesQuery` - Query parameters type
  - `page?: number` (default: 1)
  - `limit?: number` (default: 50)
- `ListNotesQuerySchema` - Zod schema for validation

**Response Types:**
- `NoteDTO` - Individual note data
  - `id: string` (UUID)
  - `ski_spec_id: string` (UUID)
  - `content: string` (1-2000 chars)
  - `created_at: string` (ISO datetime)
  - `updated_at: string` (ISO datetime)

- `NoteListResponse` - Paginated response wrapper
  - `data: NoteDTO[]`
  - `pagination: PaginationMeta`

- `PaginationMeta` - Pagination metadata
  - `page: number`
  - `limit: number`
  - `total: number`
  - `total_pages: number`

**Error Types:**
- `ApiErrorResponse` - Standard error response
  - `error: string`
  - `code?: string`
  - `details?: ValidationErrorDetail[]`
  - `timestamp?: string`

## 4. Response Details

### Success Response (200 OK)

**Content-Type:** `application/json`

**Schema:** `NoteListResponse`

**Example:**
```json
{
  "data": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "ski_spec_id": "550e8400-e29b-41d4-a716-446655440000",
      "content": "Tested in deep powder at Chamonix. Excellent float and maneuverability.",
      "created_at": "2025-01-20T14:30:00Z",
      "updated_at": "2025-01-20T14:30:00Z"
    },
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "ski_spec_id": "550e8400-e29b-41d4-a716-446655440000",
      "content": "Great edge hold on hardpack. Very responsive turns.",
      "created_at": "2025-01-18T10:15:00Z",
      "updated_at": "2025-01-19T08:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "total_pages": 1
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid UUID Format
```json
{
  "error": "Invalid ski specification ID format",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "specId",
      "message": "Must be a valid UUID"
    }
  ],
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 400 Bad Request - Invalid Query Parameters
```json
{
  "error": "Invalid query parameters",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "limit",
      "message": "Limit must not exceed 100"
    }
  ],
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 404 Not Found - Specification Not Found or Unauthorized
```json
{
  "error": "Ski specification not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 500 Internal Server Error
```json
{
  "error": "An unexpected error occurred while fetching notes",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

## 5. Data Flow

### Request Processing Flow

```
1. Incoming Request
   ↓
2. Middleware (Authentication)
   - Extract user ID from JWT token
   - Inject supabase client and userId into locals
   ↓
3. Route Handler (src/pages/api/ski-specs/[specId]/notes/index.ts)
   ↓
4. Extract Path Parameters
   - Parse specId from URL path
   ↓
5. Validate UUID Format
   - Check specId is valid UUID
   - Return 400 if invalid
   ↓
6. Extract Query Parameters
   - Parse page and limit from URL
   - Coerce strings to integers
   ↓
7. Validate Query Parameters
   - Use ListNotesQuerySchema.safeParse()
   - Return 400 if invalid with detailed errors
   ↓
8. Service Layer (src/lib/services/ski-spec-note.service.ts)
   ↓
9. Verify Specification Ownership
   - Query ski_specs table
   - Check if spec exists and belongs to user
   - Return null if not found or unauthorized
   ↓
10. Fetch Notes (if authorized)
   - Query ski_spec_notes table
   - Filter by ski_spec_id
   - Order by created_at DESC
   - Apply pagination (offset, limit)
   - Count total matching records
   ↓
11. Build Response
   - Format notes as NoteDTO[]
   - Calculate pagination metadata
   - Construct NoteListResponse
   ↓
12. Return Response
   - 200 with NoteListResponse
   - 404 if spec not found/unauthorized
   - 500 on database errors
```

### Database Queries

**Query 1: Verify Specification Ownership**
```typescript
const { data: spec } = await supabase
  .from('ski_specs')
  .select('id')
  .eq('id', specId)
  .eq('user_id', userId)
  .single();
```

**Query 2: Fetch Notes with Pagination**
```typescript
const { data, count } = await supabase
  .from('ski_spec_notes')
  .select('*', { count: 'exact' })
  .eq('ski_spec_id', specId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

### RLS Policy Enforcement

The database RLS policies automatically enforce authorization:
- Notes can only be selected if the parent ski_spec belongs to the authenticated user
- Additional application-level check provides better error messages
- Defense in depth security strategy

## 6. Security Considerations

### Authentication
- **Mechanism:** Supabase JWT Bearer token
- **Implementation:** Middleware extracts userId from token and injects into locals
- **Failure Mode:** 401 Unauthorized if token missing or invalid

### Authorization
- **Ownership Verification:** Service layer verifies ski specification belongs to user
- **RLS Policies:** Database enforces ownership through parent ski_specs relationship
- **Defense in Depth:** Both application and database layers enforce authorization

### IDOR Prevention
- **Risk:** User attempts to access notes for specifications they don't own
- **Mitigation 1:** Verify spec ownership before fetching notes
- **Mitigation 2:** Return same 404 error for "not found" and "unauthorized" cases
- **Result:** Attackers cannot determine if a specification exists by trying different IDs

### Input Validation
- **UUID Validation:** Verify specId is valid UUID format before database query
- **Query Parameter Validation:** Use Zod schema to validate and sanitize inputs
- **SQL Injection Prevention:** Supabase client uses parameterized queries

### Rate Limiting
- **Consideration:** Not implemented in MVP
- **Future Enhancement:** Add rate limiting middleware to prevent abuse
- **Recommendation:** Limit to 100 requests per minute per user

## 7. Error Handling

### Error Categories and Handling Strategy

#### 1. Validation Errors (400)

**UUID Format Error:**
```typescript
// Check if specId is valid UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(specId)) {
  return new Response(
    JSON.stringify({
      error: "Invalid ski specification ID format",
      code: "VALIDATION_ERROR",
      details: [{ field: "specId", message: "Must be a valid UUID" }],
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorResponse),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

**Query Parameter Errors:**
```typescript
const validation = ListNotesQuerySchema.safeParse(parsedQuery);
if (!validation.success) {
  const details = validation.error.issues.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  
  return new Response(
    JSON.stringify({
      error: "Invalid query parameters",
      code: "VALIDATION_ERROR",
      details,
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorResponse),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 2. Authorization Errors (404)

**Specification Not Found or Unauthorized:**
```typescript
// Service returns null if spec doesn't exist or user doesn't own it
const result = await listNotes(supabase, userId, specId, validatedQuery);

if (result === null) {
  return new Response(
    JSON.stringify({
      error: "Ski specification not found",
      code: "NOT_FOUND",
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorResponse),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 3. Database Errors (500)

**Unexpected Database Errors:**
```typescript
try {
  const result = await listNotes(supabase, userId, specId, validatedQuery);
  // ... process result
} catch (error) {
  console.error("Error in GET /api/ski-specs/{specId}/notes:", {
    error: error instanceof Error ? error.message : "Unknown error",
    userId,
    specId,
    timestamp: new Date().toISOString(),
  });
  
  return new Response(
    JSON.stringify({
      error: "An unexpected error occurred while fetching notes",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorResponse),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Error Logging

**Structured Logging Format:**
```typescript
console.error("Error in GET /api/ski-specs/{specId}/notes:", {
  error: error instanceof Error ? error.message : "Unknown error",
  stack: error instanceof Error ? error.stack : undefined,
  userId: locals.userId,
  specId: specId,
  query: validatedQuery,
  timestamp: new Date().toISOString(),
});
```

**What to Log:**
- Error message and stack trace
- User ID (for audit trail)
- Specification ID (for debugging)
- Query parameters (for reproducing issue)
- Timestamp (for correlation)

**What NOT to Log:**
- Sensitive user data
- Authentication tokens
- Complete database records

## 8. Performance Considerations

### Database Query Optimization

**Index Usage:**
- Composite index on `(ski_spec_id, created_at DESC)` - Already defined in db-plan.md
- Enables efficient filtering and sorting in single index scan
- Supports pagination with minimal overhead

**Query Patterns:**
```sql
-- Optimized query leverages composite index
SELECT * FROM ski_spec_notes
WHERE ski_spec_id = ? 
ORDER BY created_at DESC
LIMIT ? OFFSET ?
```

### Pagination Strategy

**Offset-Based Pagination:**
- Simple to implement and understand
- Works well for small to medium datasets
- Performance degrades with very large offsets
- Acceptable for MVP given typical usage patterns (users rarely go beyond page 3-5)

**Future Optimization (Post-MVP):**
- Consider cursor-based pagination for large note collections
- Use keyset pagination with created_at + id composite key
- Better performance for deep pagination

### Response Size

**Default Limit (50 notes):**
- Balances data transfer with usability
- Typical note content: 200-500 chars
- Estimated response size: ~10-25 KB
- Well within acceptable range for API responses

**Maximum Limit (100 notes):**
- Prevents excessive data transfer
- Maximum response size: ~50 KB
- Still acceptable for modern networks

### Caching Considerations

**Not Implemented in MVP:**
- Notes are user-specific (no shared cache benefit)
- Data changes frequently (notes can be added/edited)
- Complexity outweighs benefits for MVP

**Future Enhancement:**
- Add ETag headers for conditional requests
- Client-side caching with cache invalidation on mutations
- Consider Redis for frequently accessed note lists

## 9. Implementation Steps

### Step 1: Create Note Service File

**File:** `src/lib/services/ski-spec-note.service.ts`

**Content:**
```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { NoteDTO, ListNotesQuery } from "@/types";

/**
 * Retrieves a paginated list of notes for a specific ski specification.
 *
 * This function:
 * 1. Verifies the specification exists and belongs to the user
 * 2. Fetches notes with pagination
 * 3. Sorts by created_at DESC (newest first)
 * 4. Counts total matching records
 * 5. Returns null if specification not found or user doesn't own it
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification
 * @param query - Validated query parameters (page, limit)
 * @returns Object with notes array and total count, or null if unauthorized
 * @throws Error if database query fails
 */
export async function listNotes(
  supabase: SupabaseClient,
  userId: string,
  specId: string,
  query: ListNotesQuery
): Promise<{ data: NoteDTO[]; total: number } | null> {
  // Step 1: Verify specification exists and user owns it
  const { data: spec, error: specError } = await supabase
    .from("ski_specs")
    .select("id")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  // Handle not found case
  if (specError?.code === "PGRST116" || !spec) {
    return null;
  }

  // Handle other errors
  if (specError) {
    throw specError;
  }

  // Step 2: Calculate offset for pagination
  const offset = (query.page - 1) * query.limit;

  // Step 3: Fetch notes with pagination and count
  const { data, error, count } = await supabase
    .from("ski_spec_notes")
    .select("*", { count: "exact" })
    .eq("ski_spec_id", specId)
    .order("created_at", { ascending: false })
    .range(offset, offset + query.limit - 1);

  // Handle database errors
  if (error) {
    throw error;
  }

  // Step 4: Return data and total count
  return {
    data: (data || []) as NoteDTO[],
    total: count ?? 0,
  };
}
```

### Step 2: Create API Route Directory Structure

Create the directory for the notes endpoint:

```bash
mkdir -p src/pages/api/ski-specs/[specId]/notes
```

### Step 3: Create API Route Handler

**File:** `src/pages/api/ski-specs/[specId]/notes/index.ts`

**Content:**
```typescript
import type { APIRoute } from "astro";
import {
  ListNotesQuerySchema,
  type ApiErrorResponse,
  type NoteListResponse,
  type PaginationMeta,
} from "@/types";
import { listNotes } from "@/lib/services/ski-spec-note.service";

export const prerender = false;

/**
 * GET /api/ski-specs/{specId}/notes
 * Retrieves a paginated list of notes for a specific ski specification.
 *
 * Path parameters: specId (UUID)
 * Query parameters: page, limit (optional with defaults)
 * Response: NoteListResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 */
export const GET: APIRoute = async ({ params, url, locals }) => {
  try {
    // Step 1: Get authenticated user ID from middleware
    const { supabase, userId } = locals;

    // Step 2: Extract specId from path parameters
    const { specId } = params;

    if (!specId) {
      return new Response(
        JSON.stringify({
          error: "Ski specification ID is required",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 3: Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(specId)) {
      return new Response(
        JSON.stringify({
          error: "Invalid ski specification ID format",
          code: "VALIDATION_ERROR",
          details: [{ field: "specId", message: "Must be a valid UUID" }],
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 4: Extract query parameters from URL
    const rawQuery = {
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
    };

    // Step 5: Coerce string parameters to appropriate types
    const parsedQuery = {
      page: rawQuery.page ? parseInt(rawQuery.page, 10) : undefined,
      limit: rawQuery.limit ? parseInt(rawQuery.limit, 10) : undefined,
    };

    // Step 6: Validate query parameters with Zod schema
    const validation = ListNotesQuerySchema.safeParse(parsedQuery);

    if (!validation.success) {
      const details = validation.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          details,
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validatedQuery = validation.data;

    // Step 7: Call service layer to retrieve notes
    const result = await listNotes(supabase, userId, specId, validatedQuery);

    // Step 8: Handle not found or unauthorized
    if (result === null) {
      return new Response(
        JSON.stringify({
          error: "Ski specification not found",
          code: "NOT_FOUND",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, total } = result;

    // Step 9: Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedQuery.limit);
    const pagination: PaginationMeta = {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      total,
      total_pages: totalPages,
    };

    // Step 10: Build and return success response
    const response: NoteListResponse = {
      data,
      pagination,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 11: Handle unexpected errors
    console.error("Error in GET /api/ski-specs/{specId}/notes:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: locals.userId,
      specId: params.specId,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred while fetching notes",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Step 6: Test the Endpoint

**Manual Testing Checklist:**

1. **Valid Request:**
   ```bash
   curl -X GET "http://localhost:3000/api/ski-specs/{valid-spec-id}/notes" \
     -H "Authorization: Bearer {token}"
   ```
   Expected: 200 with note list

2. **With Pagination:**
   ```bash
   curl -X GET "http://localhost:3000/api/ski-specs/{valid-spec-id}/notes?page=1&limit=10" \
     -H "Authorization: Bearer {token}"
   ```
   Expected: 200 with 10 notes max

3. **Invalid UUID:**
   ```bash
   curl -X GET "http://localhost:3000/api/ski-specs/invalid-uuid/notes" \
     -H "Authorization: Bearer {token}"
   ```
   Expected: 400 with validation error

4. **Invalid Query Parameters:**
   ```bash
   curl -X GET "http://localhost:3000/api/ski-specs/{valid-spec-id}/notes?limit=200" \
     -H "Authorization: Bearer {token}"
   ```
   Expected: 400 with validation error

5. **Not Found:**
   ```bash
   curl -X GET "http://localhost:3000/api/ski-specs/{non-existent-id}/notes" \
     -H "Authorization: Bearer {token}"
   ```
   Expected: 404 with not found error

6. **Unauthorized (Different User's Spec):**
   ```bash
   curl -X GET "http://localhost:3000/api/ski-specs/{other-user-spec-id}/notes" \
     -H "Authorization: Bearer {token}"
   ```
   Expected: 404 (same as not found - IDOR prevention)

7. **Empty Notes List:**
   ```bash
   curl -X GET "http://localhost:3000/api/ski-specs/{spec-without-notes}/notes" \
     -H "Authorization: Bearer {token}"
   ```
   Expected: 200 with empty data array and total=0

### Step 7: Verify Database Index

Confirm the composite index exists (from migration):
```sql
CREATE INDEX ski_spec_notes_ski_spec_id_created_at_idx 
  ON ski_spec_notes (ski_spec_id, created_at DESC);
```

If not present, create it before deploying.

### Step 8: Update OpenAPI Documentation

The endpoint is already documented in `swagger.yaml` (lines 444-488). Verify documentation matches implementation:

- ✓ Path parameters
- ✓ Query parameters
- ✓ Response schemas
- ✓ Error responses
- ✓ Status codes

### Step 9: Code Review Checklist

Before merging, verify:

- [ ] Service function follows existing patterns (similar to ski-spec.service.ts)
- [ ] Input validation uses Zod schemas from types.ts
- [ ] Error handling is comprehensive and consistent
- [ ] Security: Ownership verification prevents IDOR
- [ ] Same error for "not found" and "unauthorized" (404)
- [ ] Logging includes all necessary context
- [ ] No sensitive data exposed in error messages
- [ ] TypeScript types are properly used throughout
- [ ] Code follows project style guidelines
- [ ] Comments explain complex logic
- [ ] No console.log statements (only console.error for errors)

---

## Summary

This implementation plan provides comprehensive guidance for developing the `GET /api/ski-specs/{specId}/notes` endpoint. The implementation follows established patterns from the existing codebase, ensures security through proper authorization checks, and provides a robust, maintainable solution for listing ski specification notes.

**Key Implementation Points:**
1. Create new service file for note operations
2. Implement route handler with comprehensive validation
3. Verify specification ownership before returning notes
4. Use consistent error handling and logging
5. Follow existing code patterns and TypeScript practices
6. Ensure IDOR prevention through unified error responses
7. Leverage database indexes for optimal performance

