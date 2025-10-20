# API Endpoint Implementation Plan: Update Note

## 1. Endpoint Overview

The `PUT /api/ski-specs/{specId}/notes/{noteId}` endpoint updates an existing note associated with a ski specification. This endpoint allows authenticated users to modify the content of their notes while automatically updating the modification timestamp. The endpoint enforces ownership verification through the parent ski specification relationship and validates all input data according to business rules.

**Key Features:**

- Update note content for existing notes
- Automatic `updated_at` timestamp update
- Ownership verification via parent ski specification
- Content validation (1-2000 characters)
- Returns complete updated note data

## 2. Request Details

### HTTP Method

`PUT`

### URL Structure

```
/api/ski-specs/{specId}/notes/{noteId}
```

### Path Parameters

| Parameter | Type          | Required | Validation        | Description              |
| --------- | ------------- | -------- | ----------------- | ------------------------ |
| `specId`  | string (UUID) | Yes      | Valid UUID format | The ski specification ID |
| `noteId`  | string (UUID) | Yes      | Valid UUID format | The note ID to update    |

### Request Headers

```
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Request Body

```typescript
{
  content: string; // 1-2000 characters
}
```

**Schema:** `UpdateNoteCommandSchema` from `@/types`

**Validation Rules:**

- `content`: Required, minimum 1 character, maximum 2000 characters
- Trim leading/trailing whitespace before validation

**Example:**

```json
{
  "content": "Updated content with additional observations from the test session."
}
```

## 3. Used Types

### Request Types

- **UpdateNoteCommand** (`@/types`)
  ```typescript
  {
    content: string; // 1-2000 chars
  }
  ```

### Response Types

- **NoteDTO** (`@/types`) - Success response (200)

  ```typescript
  {
    id: string; // UUID
    ski_spec_id: string; // UUID
    content: string; // 1-2000 chars
    created_at: string; // ISO datetime
    updated_at: string; // ISO datetime (automatically updated)
  }
  ```

- **ApiErrorResponse** (`@/types`) - Error responses
  ```typescript
  {
    error: string;
    code?: string;
    details?: ValidationErrorDetail[];
    timestamp?: string;
  }
  ```

### Internal Types

- **SkiSpecNoteUpdate** (`@/db/database.types`) - Database update type
- User ID from JWT token (string UUID)

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "ski_spec_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Updated content with additional observations from the test session.",
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-20T16:45:00Z"
}
```

### Error Responses

#### 400 Bad Request - Invalid Input

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
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 400 Bad Request - Invalid UUID

```json
{
  "error": "Invalid UUID format",
  "code": "VALIDATION_ERROR",
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

#### 404 Not Found

```json
{
  "error": "Note or specification not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

## 5. Data Flow

### High-Level Flow

1. **Request Reception** → Astro endpoint receives PUT request
2. **Authentication** → Middleware validates JWT token, extracts user ID
3. **Path Validation** → Validate UUID formats for specId and noteId
4. **Body Validation** → Validate request body against UpdateNoteCommandSchema
5. **Service Call** → Call service layer to update note
6. **Ownership Check** → Service verifies user owns parent ski spec (via Supabase RLS)
7. **Database Update** → Update note content, updated_at timestamp auto-set by trigger
8. **Response** → Return updated NoteDTO with 200 status

### Detailed Data Flow

```
Client Request
    ↓
Astro Middleware (Authentication)
    ↓ [user_id extracted from JWT]
Endpoint Handler (/api/ski-specs/[specId]/notes/[noteId].ts)
    ↓
1. Extract path params (specId, noteId)
    ↓
2. Validate UUID formats
    ↓
3. Parse & validate request body (UpdateNoteCommandSchema)
    ↓
4. Call service: updateNote(userId, specId, noteId, updateData)
    ↓
Service Layer (ski-spec.service.ts)
    ↓
5. Verify ski spec ownership:
   - Query ski_specs WHERE id = specId AND user_id = userId
   - If not found → throw NotFoundError
    ↓
6. Update note:
   - Query: UPDATE ski_spec_notes
     SET content = ?, updated_at = NOW()
     WHERE id = noteId AND ski_spec_id = specId
   - RLS automatically enforces ownership
   - If rowCount = 0 → throw NotFoundError
    ↓
7. Fetch updated note
    ↓
8. Return NoteDTO
    ↓
Endpoint Handler
    ↓
9. Return Response(200, noteDTO)
    ↓
Client Response
```

### Database Interactions

1. **Ownership Verification Query:**

   ```sql
   SELECT id FROM ski_specs
   WHERE id = $specId AND user_id = $userId
   ```

2. **Update Note Query:**

   ```sql
   UPDATE ski_spec_notes
   SET content = $content, updated_at = NOW()
   WHERE id = $noteId AND ski_spec_id = $specId
   RETURNING *
   ```

3. **RLS Policy Applied:**
   - `Users can update notes for own specs` policy automatically checks ownership via EXISTS subquery

## 6. Security Considerations

### Authentication

- **Requirement:** Valid Supabase JWT token in Authorization header
- **Implementation:** Astro middleware extracts and validates token
- **User Context:** Extract `user_id` from `auth.uid()` in Supabase client

### Authorization

- **Ownership Verification:**
  - Two-step verification: First check ski spec ownership, then update note
  - Supabase RLS policies provide additional layer via EXISTS check on ski_specs
  - Return 404 for both non-existent and unauthorized resources (prevent enumeration)

### Input Validation

1. **Path Parameters:**
   - Validate UUID format using regex or UUID library
   - Reject invalid UUIDs with 400 Bad Request

2. **Request Body:**
   - Use Zod schema validation (UpdateNoteCommandSchema)
   - Sanitize input: trim whitespace
   - Enforce length constraints (1-2000 chars)

3. **Content Security:**
   - Store raw content (no server-side sanitization)
   - Frontend responsible for XSS prevention during display
   - Database handles SQL injection via parameterized queries

### Data Protection

- **RLS Enforcement:** Enabled on ski_spec_notes table
- **Cascade Protection:** Notes inherit ownership from parent ski_specs
- **No Direct Access:** Notes accessible only via parent ski spec context

### Threat Mitigation

| Threat               | Mitigation                                        |
| -------------------- | ------------------------------------------------- |
| Unauthorized Access  | JWT validation + RLS policies + ownership checks  |
| Resource Enumeration | Return 404 for both non-existent and unauthorized |
| SQL Injection        | Parameterized queries via Supabase client         |
| XSS                  | Store raw content, sanitize on frontend           |
| CSRF                 | Not applicable (stateless API with JWT)           |
| Rate Limiting        | Consider implementing (future enhancement)        |

## 7. Error Handling

### Error Scenarios and Responses

| Scenario                   | Status Code | Error Code       | Message                                     | Details                                                                  |
| -------------------------- | ----------- | ---------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Missing auth token         | 401         | UNAUTHORIZED     | "Authentication required"                   | -                                                                        |
| Invalid/expired token      | 401         | UNAUTHORIZED     | "Authentication required"                   | -                                                                        |
| Invalid specId UUID        | 400         | VALIDATION_ERROR | "Invalid UUID format"                       | -                                                                        |
| Invalid noteId UUID        | 400         | VALIDATION_ERROR | "Invalid UUID format"                       | -                                                                        |
| Missing content            | 400         | VALIDATION_ERROR | "Validation failed"                         | field: content                                                           |
| Content too short          | 400         | VALIDATION_ERROR | "Validation failed"                         | field: content, message: "Content is required"                           |
| Content too long           | 400         | VALIDATION_ERROR | "Validation failed"                         | field: content, message: "Content must be between 1 and 2000 characters" |
| Malformed JSON             | 400         | VALIDATION_ERROR | "Invalid request body"                      | -                                                                        |
| Ski spec not found         | 404         | NOT_FOUND        | "Note or specification not found"           | -                                                                        |
| Note not found             | 404         | NOT_FOUND        | "Note or specification not found"           | -                                                                        |
| Note belongs to other user | 404         | NOT_FOUND        | "Note or specification not found"           | -                                                                        |
| Database error             | 500         | INTERNAL_ERROR   | "An error occurred while updating the note" | -                                                                        |

### Error Handling Strategy

1. **Validation Errors (400):**
   - Use Zod parse with safeParse to catch validation errors
   - Transform Zod errors to ValidationErrorDetail[] format
   - Return structured error response with field-level details

2. **Authentication Errors (401):**
   - Handled by middleware
   - Return generic message (don't reveal token details)

3. **Not Found Errors (404):**
   - Check ski spec existence first
   - Combine note not found and unauthorized into single 404
   - Prevents leaking information about note existence

4. **Server Errors (500):**
   - Log full error details server-side
   - Return generic message to client
   - Include timestamp for error tracking

### Error Response Format

All errors follow ApiErrorResponse schema:

```typescript
{
  error: string;              // Human-readable message
  code?: string;             // Machine-readable code
  details?: Array<{          // Field-level errors (validation only)
    field: string;
    message: string;
  }>;
  timestamp?: string;        // ISO datetime
}
```

## 9. Implementation Steps

### Step 1: Create Endpoint File

**File:** `src/pages/api/ski-specs/[specId]/notes/[noteId].ts`

```typescript
import type { APIRoute } from "astro";

export const PUT: APIRoute = async ({ params, request, locals }) => {
  // Implementation follows in subsequent steps
};
```

### Step 2: Extract and Validate Path Parameters

```typescript
const { specId, noteId } = params;

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!specId || !uuidRegex.test(specId)) {
  return new Response(
    JSON.stringify({
      error: "Invalid UUID format",
      code: "VALIDATION_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}

if (!noteId || !uuidRegex.test(noteId)) {
  return new Response(
    JSON.stringify({
      error: "Invalid UUID format",
      code: "VALIDATION_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

### Step 3: Validate Authentication

```typescript
const userId = locals.user?.id;

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

### Step 4: Parse and Validate Request Body

```typescript
import { UpdateNoteCommandSchema } from "@/types";

let requestBody;
try {
  requestBody = await request.json();
} catch (error) {
  return new Response(
    JSON.stringify({
      error: "Invalid request body",
      code: "VALIDATION_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}

const validation = UpdateNoteCommandSchema.safeParse(requestBody);

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
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}

const updateData = validation.data;
```

### Step 5: Add Service Method (ski-spec.service.ts)

```typescript
/**
 * Updates an existing note for a ski specification
 * @throws NotFoundError if ski spec or note doesn't exist or user doesn't own the ski spec
 */
export async function updateNote(
  userId: string,
  specId: string,
  noteId: string,
  data: UpdateNoteCommand
): Promise<NoteDTO> {
  const supabase = createSupabaseClient();

  // Step 1: Verify ski spec ownership
  const { data: skiSpec, error: specError } = await supabase
    .from("ski_specs")
    .select("id")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  if (specError || !skiSpec) {
    throw new Error("NOT_FOUND");
  }

  // Step 2: Update note (RLS will verify it belongs to this ski spec)
  const { data: updatedNote, error: updateError } = await supabase
    .from("ski_spec_notes")
    .update({
      content: data.content,
      updated_at: new Date().toISOString(), // Explicitly set if no trigger
    })
    .eq("id", noteId)
    .eq("ski_spec_id", specId)
    .select()
    .single();

  if (updateError || !updatedNote) {
    throw new Error("NOT_FOUND");
  }

  return updatedNote;
}
```

### Step 6: Call Service from Endpoint

```typescript
import { updateNote } from "@/lib/services/ski-spec.service";

try {
  const note = await updateNote(userId, specId, noteId, updateData);

  return new Response(JSON.stringify(note), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} catch (error) {
  if (error instanceof Error && error.message === "NOT_FOUND") {
    return new Response(
      JSON.stringify({
        error: "Note or specification not found",
        code: "NOT_FOUND",
        timestamp: new Date().toISOString(),
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  console.error("Error updating note:", error);
  return new Response(
    JSON.stringify({
      error: "An error occurred while updating the note",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Step 8: Testing Checklist

**Integration Tests:**

- [ ] PUT request with valid data returns 200 and updated note
- [ ] PUT request with invalid specId UUID returns 400
- [ ] PUT request with invalid noteId UUID returns 400
- [ ] PUT request with missing content returns 400
- [ ] PUT request with content too long returns 400
- [ ] PUT request without auth token returns 401
- [ ] PUT request with invalid token returns 401
- [ ] PUT request for non-existent ski spec returns 404
- [ ] PUT request for non-existent note returns 404
- [ ] PUT request for another user's note returns 404
- [ ] Verify updated_at timestamp is updated
- [ ] Verify created_at timestamp remains unchanged

**Edge Cases:**

- [ ] Content with exactly 1 character
- [ ] Content with exactly 2000 characters
- [ ] Content with special characters and Unicode
- [ ] Content with newlines and whitespace
- [ ] Concurrent updates to same note

### Step 9: Documentation Updates

- [ ] Update API documentation (if separate from swagger.yaml)
- [ ] Add inline code comments
- [ ] Update service layer documentation
- [ ] Add example requests/responses to README

### Step 10: Deployment Checklist

- [ ] Code review completed
- [ ] All tests passing
- [ ] No linter errors
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Performance benchmarks met
- [ ] Error logging configured
- [ ] Monitoring alerts set up
