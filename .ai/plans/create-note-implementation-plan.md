# API Endpoint Implementation Plan: POST /api/ski-specs/{specId}/notes

## 1. Endpoint Overview

This endpoint creates a new note for a specific ski specification. Notes allow users to record observations, test results, and personal comments about their ski specifications. The endpoint validates that the parent ski specification exists and belongs to the authenticated user before creating the note.

**Key Features:**

- Creates a new note attached to a ski specification
- Automatically generates note ID and timestamps
- Validates content length (1-2000 characters)
- Enforces ownership verification (user can only add notes to their own specs)
- Returns complete note details in response

## 2. Request Details

### HTTP Method

`POST`

### URL Structure

```
/api/ski-specs/{specId}/notes
```

### Path Parameters

- **specId** (required): UUID of the ski specification to attach the note to
  - Type: string (UUID format)
  - Validation: Must be a valid UUID format
  - Example: `550e8400-e29b-41d4-a716-446655440000`

### Request Headers

- **Content-Type**: `application/json` (required)
- **Authorization**: `Bearer <token>` (required, handled by middleware)

### Request Body

```json
{
  "content": "Tested in deep powder at Chamonix. Excellent float and maneuverability."
}
```

**Schema:** `CreateNoteCommand`

- **content** (required): Note content
  - Type: string
  - Constraints:
    - Minimum length: 1 character
    - Maximum length: 2000 characters
  - Will be trimmed before storage

## 3. Used Types

### Request Types

- **CreateNoteCommand**: Command model for creating a note
  ```typescript
  type CreateNoteCommand = {
    content: string; // min 1 char, max 2000 chars
  };
  ```
- **CreateNoteCommandSchema**: Zod validation schema for request body

### Response Types

- **NoteDTO**: Complete note data transfer object
  ```typescript
  type NoteDTO = {
    id: string; // UUID
    ski_spec_id: string; // UUID
    content: string; // 1-2000 chars
    created_at: string; // ISO datetime
    updated_at: string; // ISO datetime
  };
  ```
- **NoteDTOSchema**: Zod validation schema for response

### Error Types

- **ApiErrorResponse**: Standard error response format
  ```typescript
  type ApiErrorResponse = {
    error: string; // Human-readable message
    code?: string; // Machine-readable code
    details?: ValidationErrorDetail[]; // Field-level errors
    timestamp?: string; // ISO datetime
  };
  ```

### Validation Schemas

- **UuidParamSchema**: Validates path parameter UUID format
  ```typescript
  const UuidParamSchema = z.object({
    specId: z.string().uuid('Invalid UUID format'),
  });
  ```

## 4. Response Details

### Success Response (201 Created)

```json
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "ski_spec_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Tested in deep powder at Chamonix. Excellent float and maneuverability.",
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-20T14:30:00Z"
}
```

### Error Responses

#### 400 Bad Request - Invalid UUID

```json
{
  "error": "Invalid specification ID format",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

#### 400 Bad Request - Invalid JSON

```json
{
  "error": "Invalid request body",
  "code": "INVALID_JSON",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

#### 400 Bad Request - Validation Failed

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "content",
      "message": "Content must be between 1 and 2000 characters"
    }
  ],
  "timestamp": "2025-01-20T14:30:00Z"
}
```

#### 401 Unauthorized

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

#### 404 Not Found

```json
{
  "error": "Ski specification not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

## 5. Data Flow

### Request Flow

1. **Middleware Processing**
   - Astro middleware extracts JWT token from Authorization header
   - Validates token with Supabase Auth
   - Injects `userId` and `supabase` client into `locals`

2. **Path Parameter Validation**
   - Extract `specId` from URL path params
   - Validate UUID format using `UuidParamSchema`
   - Return 400 if invalid format

3. **Request Body Parsing**
   - Parse JSON body from request
   - Return 400 with INVALID_JSON if parsing fails

4. **Request Body Validation**
   - Validate parsed body against `CreateNoteCommandSchema`
   - Check content field presence and length constraints
   - Return 400 with validation details if validation fails

5. **Authorization Check**
   - Service layer verifies ski specification exists
   - Service layer verifies specification belongs to authenticated user
   - Return 404 if spec not found or user doesn't own it (IDOR prevention)

6. **Note Creation**
   - Trim content before insertion
   - Insert note into `ski_spec_notes` table with:
     - Auto-generated UUID for `id`
     - Provided `specId` as `ski_spec_id`
     - Trimmed `content`
     - Auto-generated `created_at` timestamp
     - Auto-generated `updated_at` timestamp (same as created_at initially)
   - Database enforces foreign key constraint to `ski_specs`
   - RLS policies verify ownership through parent spec

7. **Response Formation**
   - Convert database row to `NoteDTO`
   - Return 201 Created with note data

### Database Interactions

1. **Ownership Verification Query**

   ```sql
   SELECT id FROM ski_specs
   WHERE id = $specId AND user_id = $userId
   LIMIT 1
   ```

2. **Note Insertion Query**
   ```sql
   INSERT INTO ski_spec_notes (ski_spec_id, content)
   VALUES ($specId, $trimmedContent)
   RETURNING *
   ```

### Service Layer Design

Create new service function in `src/lib/services/ski-spec.service.ts`:

```typescript
/**
 * Creates a new note for a ski specification.
 *
 * This function:
 * 1. Verifies the ski specification exists and user owns it
 * 2. Inserts the note into the database
 * 3. Returns the created note as a DTO
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification
 * @param command - Validated note creation data
 * @returns Created note with all fields populated
 * @throws Error with "Specification not found" if spec doesn't exist or user doesn't own it
 * @throws Error for database errors
 */
export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  specId: string,
  command: CreateNoteCommand
): Promise<NoteDTO> {
  // Implementation details in step 8
}
```

## 6. Security Considerations

### Authentication

- **Requirement**: Valid Supabase JWT token in Authorization header
- **Enforcement**: Astro middleware validates token and injects userId into locals
- **Error Handling**: Return 401 if userId is missing (token invalid/expired)

### Authorization (IDOR Prevention)

- **Threat**: User attempts to add notes to another user's ski specification
- **Mitigation Strategy**:
  1. Verify ski specification exists before creating note
  2. Verify specification belongs to authenticated user (userId match)
  3. Return 404 (not 403) for both "not found" and "unauthorized" cases
  4. This prevents attackers from enumerating which spec IDs exist
- **Implementation**: Service layer checks `ski_specs` ownership before insert

### Input Validation

- **UUID Format**: Validate specId is valid UUID to prevent injection
- **Content Length**: Enforce 1-2000 character limit to prevent DoS
- **Content Trimming**: Trim whitespace to prevent padding attacks
- **JSON Parsing**: Safe parsing with try-catch for malformed JSON

### Database Security

- **RLS Policies**: Row-Level Security on `ski_spec_notes` table verifies ownership through parent `ski_specs` table
- **Foreign Key Constraint**: Ensures note can only be created for existing ski specifications
- **Parameterized Queries**: Supabase SDK uses parameterized queries preventing SQL injection

### Data Privacy

- **No Information Disclosure**: Return same 404 error for "not found" and "unauthorized"
- **Error Logging**: Log errors server-side only, don't expose internal details to client
- **User Isolation**: Each user can only create notes for their own specifications

## 7. Error Handling

### Error Scenarios

| Scenario                     | Detection                     | Status Code | Error Code       | Response Message                                | Logging      |
| ---------------------------- | ----------------------------- | ----------- | ---------------- | ----------------------------------------------- | ------------ |
| Invalid UUID format          | Zod validation on path param  | 400         | VALIDATION_ERROR | "Invalid specification ID format"               | None         |
| Malformed JSON body          | JSON.parse() exception        | 400         | INVALID_JSON     | "Invalid request body"                          | None         |
| Missing content field        | Zod validation on body        | 400         | VALIDATION_ERROR | "Content is required"                           | None         |
| Content too short            | Zod validation on body        | 400         | VALIDATION_ERROR | "Content is required"                           | None         |
| Content too long             | Zod validation on body        | 400         | VALIDATION_ERROR | "Content must be between 1 and 2000 characters" | None         |
| Missing auth (no userId)     | Check locals.userId           | 401         | UNAUTHORIZED     | "Authentication required"                       | None         |
| Spec not found               | Service query returns null    | 404         | NOT_FOUND        | "Ski specification not found"                   | None         |
| Spec owned by different user | Service ownership check fails | 404         | NOT_FOUND        | "Ski specification not found"                   | None         |
| Foreign key violation        | Database constraint error     | 404         | NOT_FOUND        | "Ski specification not found"                   | Yes (server) |
| Database connection error    | Supabase client error         | 500         | INTERNAL_ERROR   | "Internal server error"                         | Yes (server) |
| Unexpected error             | Catch-all exception           | 500         | INTERNAL_ERROR   | "Internal server error"                         | Yes (server) |

### Error Handling Implementation Pattern

```typescript
try {
  // Main logic
} catch (error: unknown) {
  const dbError = error as { message?: string; code?: string };

  // Handle specific error cases
  if (dbError?.message?.includes('Specification not found')) {
    return new Response(
      JSON.stringify({
        error: 'Ski specification not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Log unexpected errors
  console.error('Failed to create note:', {
    userId,
    specId,
    error: dbError?.message || 'Unknown error',
  });

  // Generic error response
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Validation Error Response Format

When Zod validation fails, format errors as:

```typescript
const details = validationError.issues.map((err) => ({
  field: err.path.join('.'),
  message: err.message,
}));

return new Response(
  JSON.stringify({
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details,
    timestamp: new Date().toISOString(),
  }),
  { status: 400, headers: { 'Content-Type': 'application/json' } }
);
```

## 9. Implementation Steps

### Step 1: Create Service Function

**File**: `src/lib/services/ski-spec.service.ts`

Add the following function at the end of the file:

```typescript
/**
 * Creates a new note for a ski specification.
 *
 * This function:
 * 1. Verifies the ski specification exists and user owns it
 * 2. Inserts the note into the database
 * 3. Returns the created note as a DTO
 *
 * Security: Verifies specification ownership before creation to prevent IDOR attacks.
 * Returns "Specification not found" for both non-existent specs and unauthorized access
 * to prevent information disclosure.
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification
 * @param command - Validated note creation data
 * @returns Created note with all fields populated
 * @throws Error with "Specification not found" if spec doesn't exist or user doesn't own it
 * @throws Error for database errors
 */
export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  specId: string,
  command: CreateNoteCommand
): Promise<NoteDTO> {
  // Step 1: Verify specification exists and user owns it
  const { data: spec, error: specError } = await supabase
    .from('ski_specs')
    .select('id')
    .eq('id', specId)
    .eq('user_id', userId)
    .single();

  // Handle not found (PGRST116) or other fetch errors
  if (specError?.code === 'PGRST116' || !spec) {
    throw new Error('Specification not found');
  }

  if (specError) {
    throw specError;
  }

  // Step 2: Prepare note data for insertion
  const noteData = {
    ski_spec_id: specId,
    content: command.content.trim(),
  };

  // Step 3: Insert note into database
  const { data, error } = await supabase.from('ski_spec_notes').insert(noteData).select().single();

  // Step 4: Handle errors
  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create note');
  }

  // Step 5: Return created note as DTO
  return data as NoteDTO;
}
```

**Update imports** at the top of the file:

```typescript
import type { CreateNoteCommand, NoteDTO } from '@/types';
```

### Step 2: Create API Endpoint File

**File**: `src/pages/api/ski-specs/[specId]/notes/index.ts`

Create the directory structure if it doesn't exist:

```bash
mkdir -p src/pages/api/ski-specs/[specId]/notes
```

Create the file with the following content:

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createNote } from '@/lib/services/ski-spec.service';
import { CreateNoteCommandSchema, type ApiErrorResponse } from '@/types';

export const prerender = false;

/**
 * UUID validation schema for path parameter
 */
const UuidParamSchema = z.object({
  specId: z.string().uuid('Invalid UUID format'),
});

/**
 * POST /api/ski-specs/{specId}/notes
 * Creates a new note for a ski specification.
 *
 * Path params: specId (UUID)
 * Request body: CreateNoteCommand (validated with Zod)
 * Response: NoteDTO (201) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 * Authorization: User can only add notes to their own specifications
 *
 * Features:
 * - Validates note content (1-2000 characters)
 * - Automatically generates note ID and timestamps
 * - Verifies specification ownership before creation
 *
 * Security: Returns 404 for both non-existent specs and specs owned by other users
 * to prevent information disclosure (IDOR prevention).
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Get authenticated user ID and Supabase client from middleware
    const { supabase, userId } = locals;

    // Step 2: Check authentication
    if (!userId) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Validate path parameter (UUID format)
    const validationResult = UuidParamSchema.safeParse({ specId: params.specId });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid specification ID format',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { specId } = validationResult.data;

    // Step 4: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          code: 'INVALID_JSON',
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Validate request body against schema
    const commandValidation = CreateNoteCommandSchema.safeParse(body);

    if (!commandValidation.success) {
      const details = commandValidation.error.issues.map((err) => ({
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

    // Step 6: Create note via service
    try {
      const createdNote = await createNote(supabase, userId, specId, commandValidation.data);

      // Step 7: Return success response (201 Created)
      return new Response(JSON.stringify(createdNote), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      const dbError = error as { message?: string };

      // Handle "Specification not found" (includes unauthorized access)
      if (dbError?.message?.includes('Specification not found')) {
        return new Response(
          JSON.stringify({
            error: 'Ski specification not found',
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error('Failed to create note:', {
        userId,
        specId,
        error: dbError?.message || 'Unknown error',
      });

      // Handle generic database errors
      return new Response(
        JSON.stringify({
          error: 'Failed to create note',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
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

### Step 3: Update Type Imports (if needed)

**File**: `src/types.ts`

Verify the following types are exported (they should already exist):

- `CreateNoteCommand`
- `CreateNoteCommandSchema`
- `NoteDTO`
- `NoteDTOSchema`
- `ApiErrorResponse`

### Step 4: Testing Checklist

Create manual test cases to verify:

#### Valid Requests

- [ ] Create note with valid content (1-2000 chars) → Returns 201 with NoteDTO
- [ ] Create note with minimum content (1 char) → Returns 201
- [ ] Create note with maximum content (2000 chars) → Returns 201
- [ ] Create note with whitespace that gets trimmed → Returns 201 with trimmed content
- [ ] Verify created_at and updated_at are set correctly
- [ ] Verify ski_spec_id matches the path parameter

#### Invalid Path Parameters

- [ ] Invalid UUID format → Returns 400 with "Invalid specification ID format"
- [ ] Non-existent spec UUID → Returns 404 with "Ski specification not found"
- [ ] Spec owned by different user → Returns 404 with "Ski specification not found"

#### Invalid Request Bodies

- [ ] Malformed JSON → Returns 400 with "Invalid request body"
- [ ] Missing content field → Returns 400 with validation details
- [ ] Empty content → Returns 400 with validation details
- [ ] Content > 2000 chars → Returns 400 with validation details
- [ ] Content is null → Returns 400 with validation details
- [ ] Content is not a string → Returns 400 with validation details

#### Authentication/Authorization

- [ ] Missing auth token → Returns 401 with "Authentication required"
- [ ] Invalid auth token → Returns 401 (handled by middleware)
- [ ] Expired auth token → Returns 401 (handled by middleware)

#### Database/System Errors

- [ ] Simulate database connection error → Returns 500 with "Internal server error"
- [ ] Verify error logging includes userId, specId, and error details

### Step 5: Update API Documentation (if needed)

**File**: `public/swagger.yaml`

Verify the POST /api/ski-specs/{specId}/notes endpoint documentation is accurate and matches implementation. The swagger.yaml should already contain the correct specification based on the initial review.

---

## Implementation Notes

### Directory Structure

```
src/
├── lib/
│   └── services/
│       └── ski-spec.service.ts  (add createNote function)
├── pages/
│   └── api/
│       └── ski-specs/
│           └── [specId]/
│               └── notes/
│                   └── index.ts  (new file - POST endpoint)
└── types.ts  (existing types, no changes needed)
```

### Key Design Decisions

1. **Service Layer Separation**: Note creation logic is in the service layer for reusability and testability.

2. **IDOR Prevention**: Same 404 response for "not found" and "unauthorized" prevents information disclosure.

3. **Content Trimming**: Content is trimmed before storage to remove leading/trailing whitespace, preventing padding attacks and saving storage.

4. **Error Handling**: Comprehensive error handling with specific error codes and messages for different failure scenarios.

5. **Type Safety**: Full TypeScript typing with Zod validation ensures runtime safety.

6. **Security-First Approach**: Ownership verification happens before any database modifications.
