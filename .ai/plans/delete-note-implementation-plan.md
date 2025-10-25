# API Endpoint Implementation Plan: DELETE Note

## 1. Endpoint Overview

This endpoint deletes a specific note associated with a ski specification. The operation is permanent and cannot be undone. The endpoint verifies that both the ski specification and the note exist, and that the authenticated user owns the ski specification before performing the deletion.

**Business Context**: Allows users to remove outdated or unwanted notes from their ski specifications to maintain organized documentation (US-022).

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/ski-specs/{specId}/notes/{noteId}`
- **Authentication**: Required (Bearer token via Supabase Auth)

### Parameters

#### Required Path Parameters:

- **specId** (string, UUID format)
  - Description: ID of the ski specification that owns the note
  - Validation: Must be a valid UUID format
  - Example: `550e8400-e29b-41d4-a716-446655440000`

- **noteId** (string, UUID format)
  - Description: ID of the note to delete
  - Validation: Must be a valid UUID format
  - Example: `6ba7b810-9dad-11d1-80b4-00c04fd430c8`

#### Request Body:

- None

#### Query Parameters:

- None

## 3. Used Types

### From types.ts:

**Error Response:**

```typescript
ApiErrorResponse {
  error: string;
  code?: string;
  details?: ValidationErrorDetail[];
  timestamp?: string;
}
```

**Internal Types (not exposed in API):**

```typescript
NoteDTO; // Used internally to verify note existence
SkiSpecDTO; // Used internally to verify spec ownership
```

## 4. Response Details

### Success Response (204 No Content)

- **Status Code**: 204
- **Response Body**: Empty (no content)
- **Description**: Note successfully deleted

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": "Invalid UUID format",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

Specific validation messages:

- "Invalid ski specification ID format" (when specId is not a valid UUID)
- "Invalid note ID format" (when noteId is not a valid UUID)

#### 401 Unauthorized - Missing or Invalid Authentication

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 404 Not Found - Resource Not Found

```json
{
  "error": "Note not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

Possible "not found" scenarios:

- Ski specification doesn't exist
- Ski specification exists but belongs to another user
- Note doesn't exist
- Note exists but belongs to different specification

#### 500 Internal Server Error - Server Issues

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

## 5. Data Flow

### Sequence of Operations:

1. **Authentication** (handled by middleware)
   - Extract Bearer token from Authorization header
   - Validate token with Supabase Auth
   - Extract user_id from validated token
   - Reject request with 401 if authentication fails

2. **Path Parameter Extraction**
   - Extract `specId` from URL path
   - Extract `noteId` from URL path

3. **Input Validation** (in endpoint handler)
   - Validate `specId` is a valid UUID format → 400 if invalid
   - Validate `noteId` is a valid UUID format → 400 if invalid

4. **Service Layer Call**
   - Call `skiSpecService.deleteNote(userId, specId, noteId)`

5. **Service Layer Operations**
   - **Verify Ski Specification Ownership**:
     - Query `ski_specs` table for spec with `id = specId` AND `user_id = userId`
     - If not found → throw NotFoundError("Ski specification not found")
   - **Verify Note Existence and Association**:
     - Query `ski_spec_notes` table for note with `id = noteId` AND `ski_spec_id = specId`
     - If not found → throw NotFoundError("Note not found")
   - **Delete Note**:
     - Execute DELETE query on `ski_spec_notes` where `id = noteId`
     - RLS policies provide additional security layer

6. **Response**
   - Return 204 No Content on successful deletion
   - Return appropriate error response if any step fails

### Database Interactions:

```sql
-- Step 1: Verify spec ownership
SELECT id FROM ski_specs
WHERE id = $specId AND user_id = $userId;

-- Step 2: Verify note existence and association
SELECT id FROM ski_spec_notes
WHERE id = $noteId AND ski_spec_id = $specId;

-- Step 3: Delete note (RLS policies enforce ownership)
DELETE FROM ski_spec_notes
WHERE id = $noteId;
```

## 6. Security Considerations

### Authentication & Authorization

- **Authentication**: Required via Supabase JWT Bearer token
- **Authorization**: User must own the ski specification that contains the note
- **Middleware**: Authentication handled by Astro middleware (`src/middleware/index.ts`)

### Ownership Verification

- **Two-step verification**:
  1. Verify user owns the ski specification (prevents access to other users' specs)
  2. Verify note belongs to the specification (prevents cross-spec note deletion)
- **RLS Policies**: Database-level security via Row Level Security provides defense in depth

### Security Threats & Mitigations

| Threat                                  | Mitigation                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| IDOR (Insecure Direct Object Reference) | Verify ownership at service layer; RLS policies as second layer              |
| UUID Enumeration                        | Always verify ownership before revealing existence; consistent 404 responses |
| SQL Injection                           | Use Supabase client with parameterized queries                               |
| Missing Authentication                  | Middleware rejects unauthenticated requests                                  |
| Cross-user Access                       | Service checks user_id matches authenticated user                            |

### Data Privacy

- Don't leak information about resources user doesn't own
- Return generic "Not found" message for both non-existent and unauthorized resources
- Don't differentiate between "spec doesn't exist" and "spec exists but you don't own it"

## 7. Error Handling

### Error Handling Strategy

1. **Validation Errors (400)**
   - Validate UUID formats before database queries
   - Return specific field-level error messages
   - Log validation failures for debugging

2. **Authentication Errors (401)**
   - Handled by middleware
   - Return standard unauthorized response
   - Don't proceed to service layer

3. **Not Found Errors (404)**
   - Generic "Not found" message for security
   - Can be thrown at two points:
     - Ski specification not found or not owned by user
     - Note not found or not associated with specification
   - Log actual reason internally for debugging

4. **Database Errors (500)**
   - Catch all database exceptions
   - Return generic internal error message
   - Log full error details with context (userId, specId, noteId)
   - Never expose database structure or query details to client

### Error Logging Context

For all errors, log:

- Timestamp
- User ID (if available)
- Spec ID
- Note ID
- Error type and message
- Stack trace (for 500 errors)

### Example Error Handler Pattern

```typescript
try {
  await skiSpecService.deleteNote(userId, specId, noteId);
  return new Response(null, { status: 204 });
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error(`Note deletion failed - Not found: userId=${userId}, specId=${specId}, noteId=${noteId}`);
    return new Response(
      JSON.stringify({
        error: error.message,
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      }),
      { status: 404 }
    );
  }

  if (error instanceof ValidationError) {
    console.error(`Note deletion failed - Validation: userId=${userId}, specId=${specId}, noteId=${noteId}`, error);
    return new Response(
      JSON.stringify({
        error: error.message,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
      }),
      { status: 400 }
    );
  }

  // Unexpected errors
  console.error(`Note deletion failed - Internal error: userId=${userId}, specId=${specId}, noteId=${noteId}`, error);
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    }),
    { status: 500 }
  );
}
```

## 9. Implementation Steps

### Step 1: Create Service Method in `src/lib/services/ski-spec.service.ts`

Add the `deleteNote` method to the service class:

```typescript
/**
 * Deletes a note from a ski specification
 * @throws {NotFoundError} If spec not found, not owned by user, or note not found
 */
async deleteNote(userId: string, specId: string, noteId: string): Promise<void> {
  // Verify ski specification exists and belongs to user
  const { data: spec, error: specError } = await this.supabase
    .from('ski_specs')
    .select('id')
    .eq('id', specId)
    .eq('user_id', userId)
    .single();

  if (specError || !spec) {
    throw new NotFoundError('Ski specification not found');
  }

  // Verify note exists and belongs to the specification
  const { data: note, error: noteError } = await this.supabase
    .from('ski_spec_notes')
    .select('id')
    .eq('id', noteId)
    .eq('ski_spec_id', specId)
    .single();

  if (noteError || !note) {
    throw new NotFoundError('Note not found');
  }

  // Delete the note
  const { error: deleteError } = await this.supabase
    .from('ski_spec_notes')
    .delete()
    .eq('id', noteId);

  if (deleteError) {
    throw new Error(`Failed to delete note: ${deleteError.message}`);
  }
}
```

### Step 2: Create Astro API Endpoint File

Create file: `src/pages/api/ski-specs/[specId]/notes/[noteId].ts`

```typescript
import type { APIRoute } from 'astro';
import { SkiSpecService } from '@/lib/services/ski-spec.service';
import { supabase } from '@/db/supabase.client';

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Get authenticated user from locals (set by middleware)
    const user = locals.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract and validate path parameters
    const { specId, noteId } = params;

    if (!specId || !noteId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(specId)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid ski specification ID format',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!uuidRegex.test(noteId)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid note ID format',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call service to delete note
    const skiSpecService = new SkiSpecService(supabase);
    await skiSpecService.deleteNote(user.id, specId, noteId);

    // Return 204 No Content on success
    return new Response(null, { status: 204 });
  } catch (error) {
    // Handle NotFoundError
    if (error instanceof Error && error.name === 'NotFoundError') {
      console.error(`Note deletion failed - Not found:`, error.message);
      return new Response(
        JSON.stringify({
          error: error.message,
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle unexpected errors
    console.error('Note deletion failed - Internal error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Step 3: Create Custom Error Classes (if not exists)

Create/update `src/lib/errors.ts`:

```typescript
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Step 4: Update Middleware (if needed)

Verify that `src/middleware/index.ts` properly sets `locals.user` from the authenticated session.

### Step 5: Test the Endpoint

Create test scenarios covering:

1. **Happy Path**:
   - Delete existing note → 204 No Content

2. **Validation Errors**:
   - Invalid specId UUID → 400 Bad Request
   - Invalid noteId UUID → 400 Bad Request

3. **Authentication Errors**:
   - Missing token → 401 Unauthorized
   - Invalid token → 401 Unauthorized

4. **Not Found Errors**:
   - Spec doesn't exist → 404 Not Found
   - Spec exists but belongs to other user → 404 Not Found
   - Note doesn't exist → 404 Not Found
   - Note exists but belongs to different spec → 404 Not Found

5. **Database Errors**:
   - Database connection failure → 500 Internal Server Error

### Step 6: Update API Documentation

Verify that `public/swagger.yaml` accurately reflects the implementation (already done).

### Step 10: Code Review Checklist

- [ ] UUID validation implemented correctly
- [ ] Ownership verification at both spec and note level
- [ ] Proper error handling with correct status codes
- [ ] Error logging includes sufficient context
- [ ] No information leakage in error messages
- [ ] Service method properly isolated from HTTP concerns
- [ ] TypeScript types used correctly
- [ ] Code follows project conventions
- [ ] API documentation matches implementation
- [ ] Tests cover all scenarios
