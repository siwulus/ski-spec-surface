# API Endpoint Implementation Plan: DELETE /api/ski-specs/{id}

## 1. Endpoint Overview

The DELETE `/api/ski-specs/{id}` endpoint removes a ski specification and all its associated notes from the database. This endpoint implements a hard delete with cascade, meaning all related data (notes) are automatically removed when the specification is deleted.

**Key characteristics:**

- Requires authentication (user must be logged in) => This is handled in middleware
- Requires authorization (user can only delete their own specifications)
- Returns 204 No Content on success (no response body)
- Cascade deletes all associated notes automatically
- Irreversible operation (no soft delete)

## 2. Request Details

**HTTP Method:** DELETE

**URL Structure:** `/api/ski-specs/{id}`

**Path Parameters:**

- **Required:**
  - `id` (string, UUID format) - The unique identifier of the ski specification to delete
    - Must be a valid UUID v4 format
    - Example: `550e8400-e29b-41d4-a716-446655440000`

**Query Parameters:** None

**Request Headers:**

- `Authorization: Bearer <token>` - Supabase JWT token (validated by middleware)
- `Content-Type: application/json` (not required, but standard)

**Request Body:** None

## 3. Used Types

### Input Validation:

```typescript
// UUID validation schema (to be added)
const UuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});
```

### Error Response:

```typescript
// Already defined in types.ts
ApiErrorResponse {
  error: string;
  code?: string;
  details?: ValidationErrorDetail[];
  timestamp?: string;
}
```

### Service Function Signature:

```typescript
// To be added to ski-spec.service.ts
async function deleteSkiSpec(supabase: SupabaseClient<Database>, userId: string, specId: string): Promise<void>;
```

## 4. Response Details

### Success Response (204 No Content)

```
HTTP/1.1 204 No Content
```

- No response body
- Indicates successful deletion
- All associated notes are also deleted (cascade)

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": "Invalid UUID format",
  "code": "INVALID_UUID",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 401 Unauthorized - Missing/Invalid Authentication

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

_Note: This is handled by middleware before reaching the endpoint handler_

#### 404 Not Found - Specification Not Found or Unauthorized

```json
{
  "error": "Ski specification not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

_Security Note: This response is returned both when the spec doesn't exist AND when the user doesn't own it, preventing information disclosure_

#### 500 Internal Server Error - Database/Unexpected Errors

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 5. Data Flow

```
1. Client sends DELETE /api/ski-specs/{id}
   ↓
2. Middleware validates authentication (context.locals.userId)
   ↓
3. API Route Handler
   - Extract {id} from URL params
   - Validate UUID format with Zod
   ↓
4. Service Layer (deleteSkiSpec)
   - Query: SELECT id FROM ski_specs WHERE id = {id} AND user_id = {userId}
   - If not found → throw error (404)
   - DELETE FROM ski_specs WHERE id = {id} AND user_id = {userId}
   - Notes are cascade deleted automatically (DB constraint)
   ↓
5. Return Response
   - Success: 204 No Content
   - Error: Appropriate error response
```

**Database Interaction:**

1. **Validation Query**: Check if spec exists and belongs to user
   ```sql
   SELECT id FROM ski_specs
   WHERE id = $1 AND user_id = $2
   LIMIT 1
   ```
2. **Delete Query**: Remove the specification

   ```sql
   DELETE FROM ski_specs
   WHERE id = $1 AND user_id = $2
   ```

   - The `ON DELETE CASCADE` constraint on `ski_spec_notes.ski_spec_id` automatically deletes related notes

## 6. Security Considerations

### Authentication

- **Handled by middleware**: The `context.locals.userId` is set by the middleware after validating the JWT token
- Unauthenticated requests are blocked before reaching the endpoint handler

### Authorization (CRITICAL)

- **Owner verification**: The service MUST verify that the specification belongs to the authenticated user
- **Implementation**: Use `WHERE id = {id} AND user_id = {userId}` in the query
- **Security pattern**: Return 404 for both "doesn't exist" and "not authorized" to prevent information disclosure

### IDOR Prevention

- **Threat**: Insecure Direct Object Reference - user attempts to delete another user's specification
- **Mitigation**: Always include `user_id` in the WHERE clause of the DELETE query
- **Verification**: Check ownership before deletion

### Input Validation

- **UUID validation**: Validate format before querying database to prevent injection attempts
- **Zod schema**: Use strict UUID validation with error messages

### Information Disclosure Prevention

- **Don't differentiate**: Return same 404 error whether spec doesn't exist or user doesn't own it
- **Prevents enumeration**: Attackers cannot determine which specifications exist in the system

## 7. Error Handling

### Error Handling Strategy

Follow the early return pattern established in existing endpoints:

```typescript
try {
  // 1. Extract and validate params
  // 2. Call service
  // 3. Return success response
} catch (error) {
  // Handle specific errors
} finally {
  // Catch-all for unexpected errors
}
```

### Specific Error Cases

#### 1. Invalid UUID Format (400)

- **When**: Path parameter `id` is not a valid UUID
- **Detection**: Zod validation fails
- **Response**: 400 with "INVALID_UUID" code
- **Example**: `/api/ski-specs/invalid-id-123`

#### 2. Authentication Required (401)

- **When**: No valid JWT token provided
- **Detection**: Middleware blocks request
- **Response**: 401 with "UNAUTHORIZED" code
- **Note**: Handled by middleware, not endpoint

#### 3. Specification Not Found (404)

- **When**:
  - Spec doesn't exist in database, OR
  - Spec exists but belongs to another user
- **Detection**: Query returns no rows
- **Response**: 404 with "NOT_FOUND" code
- **Security**: Don't reveal which case it is

#### 4. Database Error (500)

- **When**: Database connection fails, query error, etc.
- **Detection**: Supabase client throws error
- **Response**: 500 with "DATABASE_ERROR" or "INTERNAL_ERROR" code
- **Logging**: Log full error details for debugging

#### 5. Unexpected Error (500)

- **When**: Any unhandled exception
- **Detection**: Outer try-catch
- **Response**: 500 with "INTERNAL_ERROR" code
- **Logging**: Log full error for investigation

### Error Handling Implementation

```typescript
// 1. Validate UUID format
const validationResult = UuidParamSchema.safeParse({ id: params.id });
if (!validationResult.success) {
  return new Response(
    JSON.stringify({
      error: 'Invalid UUID format',
      code: 'INVALID_UUID',
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorResponse),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

// 2. Try to delete via service
try {
  await deleteSkiSpec(supabase, userId, validationResult.data.id);
  return new Response(null, { status: 204 });
} catch (error) {
  // Service throws error if not found or not owned
  const dbError = error as { message?: string };
  if (dbError?.message?.includes('not found')) {
    return new Response(
      JSON.stringify({
        error: 'Ski specification not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Generic database error
  return new Response(
    JSON.stringify({
      error: 'Failed to delete specification',
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorResponse),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

## 9. Implementation Steps

### Step 1: Create API Route File

**File:** `src/pages/api/ski-specs/[id].ts`

**Purpose:** Handle DELETE requests for individual ski specifications

**Initial structure:**

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { deleteSkiSpec } from '@/lib/services/ski-spec.service';
import type { ApiErrorResponse } from '@/types';

export const prerender = false;

// UUID validation schema
const UuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

/**
 * DELETE /api/ski-specs/{id}
 * Deletes a ski specification and all associated notes (cascade).
 *
 * Path params: id (UUID)
 * Response: 204 No Content or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 * Authorization: User can only delete their own specifications
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  // Implementation here
};
```

### Step 2: Implement DELETE Handler

**Location:** Same file as Step 1

**Implementation:**

1. Extract `supabase` and `userId` from `locals`
2. Extract `id` from `params`
3. Validate UUID format with Zod
4. Call `deleteSkiSpec` service function
5. Handle errors with appropriate status codes
6. Return 204 on success

**Code structure:**

```typescript
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Get authenticated user ID from middleware
    const { supabase, userId } = locals;

    // Step 2: Extract and validate path parameter
    const validationResult = UuidParamSchema.safeParse({ id: params.id });

    if (!validationResult.success) {
      // Return 400 for invalid UUID format
    }

    const { id } = validationResult.data;

    // Step 3: Delete via service
    try {
      await deleteSkiSpec(supabase, userId, id);

      // Step 4: Return success response (204 No Content)
      return new Response(null, { status: 204 });
    } catch (error: unknown) {
      // Handle specific service errors (404)
      // Handle generic database errors (500)
    }
  } catch {
    // Catch-all for unexpected errors
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

### Step 3: Implement Service Function

**File:** `src/lib/services/ski-spec.service.ts`

**Purpose:** Handle business logic for deleting ski specifications

**Function to add:**

```typescript
/**
 * Deletes a ski specification and all associated notes (cascade).
 *
 * This function:
 * 1. Verifies the specification exists and belongs to the user
 * 2. Deletes the specification from the database
 * 3. Notes are automatically deleted via cascade constraint
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - ID of the ski specification to delete
 * @throws Error if specification not found or not owned by user
 */
export async function deleteSkiSpec(supabase: SupabaseClient<Database>, userId: string, specId: string): Promise<void> {
  // Step 1: Verify spec exists and belongs to user
  const { data: existingSpec, error: fetchError } = await supabase
    .from('ski_specs')
    .select('id')
    .eq('id', specId)
    .eq('user_id', userId)
    .single();

  // Step 2: Handle not found case
  if (fetchError || !existingSpec) {
    throw new Error('Ski specification not found');
  }

  // Step 3: Delete the specification
  const { error: deleteError } = await supabase.from('ski_specs').delete().eq('id', specId).eq('user_id', userId);

  // Step 4: Handle deletion errors
  if (deleteError) {
    throw deleteError;
  }
}
```

**Alternative approach (single query):**

```typescript
export async function deleteSkiSpec(supabase: SupabaseClient<Database>, userId: string, specId: string): Promise<void> {
  // Delete and check affected rows in single operation
  const { error, count } = await supabase
    .from('ski_specs')
    .delete({ count: 'exact' })
    .eq('id', specId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  // If no rows affected, spec doesn't exist or user doesn't own it
  if (count === 0) {
    throw new Error('Ski specification not found');
  }
}
```

### Step 4: Add Error Handling

**Location:** Route handler in `[id].ts`

**Implementation:**

1. Wrap service call in try-catch
2. Check for "not found" error message
3. Return 404 with appropriate error response
4. Handle generic database errors with 500
5. Add outer catch-all for unexpected errors

**Error handling pattern:**

```typescript
try {
  await deleteSkiSpec(supabase, userId, id);
  return new Response(null, { status: 204 });
} catch (error: unknown) {
  const dbError = error as { message?: string };

  if (dbError?.message?.includes('not found')) {
    return new Response(
      JSON.stringify({
        error: 'Ski specification not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      error: 'Failed to delete specification',
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorResponse),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Step 5: Test Implementation

**Test scenarios:**

1. **Happy path - Successful deletion:**
   - Given: Valid UUID, authenticated user, spec exists and belongs to user
   - When: DELETE /api/ski-specs/{id}
   - Then: Returns 204, spec and notes are deleted

2. **Invalid UUID format:**
   - Given: Invalid UUID string
   - When: DELETE /api/ski-specs/invalid-uuid
   - Then: Returns 400 with INVALID_UUID code

3. **Specification not found:**
   - Given: Valid UUID but spec doesn't exist
   - When: DELETE /api/ski-specs/{non-existent-id}
   - Then: Returns 404 with NOT_FOUND code

4. **Unauthorized deletion attempt:**
   - Given: Valid UUID but spec belongs to another user
   - When: DELETE /api/ski-specs/{other-user-spec-id}
   - Then: Returns 404 with NOT_FOUND code (not 403)

5. **Missing authentication:**
   - Given: No JWT token in request
   - When: DELETE /api/ski-specs/{id}
   - Then: Returns 401 (handled by middleware)

6. **Cascade delete verification:**
   - Given: Spec with multiple notes
   - When: DELETE /api/ski-specs/{id}
   - Then: Spec and all notes are deleted

**Testing tools:**

- Use `curl` or Postman for manual testing

### Step 6: Update API Documentation

**Files to update:**

- `public/swagger.yaml` - Already defined, verify implementation matches
- README or API documentation - Add usage examples
- Update CHANGELOG if applicable

**Verification:**

- Endpoint behavior matches OpenAPI specification
- Error codes and messages match documentation
- Status codes are correct per specification

## 10. Additional Considerations

### Cascade Delete Behavior

- The database schema already has `ON DELETE CASCADE` for `ski_spec_notes`
- No additional code needed for cascade delete
- Verify in migration: `20251011120000_create_ski_surface_schema.sql`

### Idempotency

- DELETE operations are inherently idempotent
- Calling DELETE twice on same ID should return 404 on second call
- This is acceptable REST behavior

### Transaction Handling

- Single DELETE operation doesn't require explicit transaction
- Database handles cascade atomically

## 11. Dependencies and Prerequisites

### Required Files

- `src/pages/api/ski-specs/[id].ts` - New file to create
- `src/lib/services/ski-spec.service.ts` - Existing, add new function
- `src/types.ts` - Existing, already has ApiErrorResponse
- `src/middleware/index.ts` - Existing, provides authentication

### Required Types

- All types already defined in `src/types.ts`
- No new type definitions needed

### Database Requirements

- Table `ski_specs` exists
- Table `ski_spec_notes` exists with CASCADE constraint
- Migrations already applied

### External Dependencies

- Supabase client (already configured)
- Zod for validation (already installed)
- Astro framework (already configured)
