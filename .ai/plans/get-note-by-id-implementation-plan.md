# API Endpoint Implementation Plan: Get Note by ID

## 1. Endpoint Overview

**Endpoint**: `GET /api/ski-specs/{specId}/notes/{noteId}`

**Purpose**: Retrieve detailed information about a specific note associated with a ski specification. This endpoint allows users to view individual notes they've created for their ski specifications.

**Business Context**: Supports US-018 (Wyświetlanie widoku szczegółów specyfikacji) and US-020 (Przeglądanie listy notatek) by providing access to individual note details.

**Authentication**: Required - Supabase JWT Bearer token

**Key Behaviors**:
- Returns complete note data including content and timestamps
- Verifies ownership through ski specification relationship
- Ensures note belongs to the specified ski specification
- Returns 404 for non-existent or unauthorized resources (prevents information leakage)

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/ski-specs/{specId}/notes/{noteId}
```

### Path Parameters

#### Required Parameters
| Parameter | Type | Format | Description | Validation |
|-----------|------|--------|-------------|------------|
| `specId` | string | UUID v4 | Unique identifier of the ski specification | Must be valid UUID format |
| `noteId` | string | UUID v4 | Unique identifier of the note | Must be valid UUID format |

### Query Parameters
None

### Request Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with Supabase JWT |
| `Content-Type` | No | Not applicable for GET request |

### Request Body
None (GET request)

## 3. Used Types

### Response Types

#### NoteDTO (Success Response)
```typescript
type NoteDTO = {
  id: string;              // UUID
  ski_spec_id: string;     // UUID
  content: string;         // 1-2000 characters
  created_at: string;      // ISO 8601 datetime
  updated_at: string;      // ISO 8601 datetime
}
```

#### ApiErrorResponse (Error Response)
```typescript
type ApiErrorResponse = {
  error: string;                          // Human-readable error message
  code?: string;                          // Machine-readable error code
  details?: ValidationErrorDetail[];      // Field-level errors (not used in this endpoint)
  timestamp?: string;                     // ISO 8601 datetime
}
```

### Validation Schemas
- `NoteDTOSchema` - Validates response data (from types.ts)
- UUID validation using regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

## 4. Response Details

### Success Response (200 OK)

**Status Code**: `200 OK`

**Response Body**:
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

#### 400 Bad Request - Invalid UUID Format
```json
{
  "error": "Invalid UUID format",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 401 Unauthorized - Missing or Invalid Authentication
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

#### 404 Not Found - Note or Specification Not Found
```json
{
  "error": "Note not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

**Note**: Return the same 404 response whether the spec doesn't exist, the note doesn't exist, or the user doesn't have access. This prevents information leakage about the existence of resources.

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

## 5. Data Flow

### Request Flow Diagram
```
1. Client Request
   ↓
2. Astro Middleware (Authentication)
   ↓
3. Endpoint Handler (/api/ski-specs/[specId]/notes/[noteId].ts)
   ↓
4. Extract & Validate Path Parameters
   ↓
5. Service Layer (ski-spec.service.ts)
   ↓
6. Supabase Query (with RLS)
   ↓
7. Response Formatting
   ↓
8. Client Response
```

### Detailed Data Flow

#### Step 1: Request Reception
- Astro receives GET request to `/api/ski-specs/{specId}/notes/{noteId}`
- Request routed to endpoint handler at `src/pages/api/ski-specs/[specId]/notes/[noteId].ts`

#### Step 2: Authentication & Authorization (Middleware)
- Middleware (`src/middleware/index.ts`) extracts JWT from Authorization header
- Validates token with Supabase
- Extracts `user_id` from validated token
- Attaches user context to request locals
- Returns 401 if authentication fails

#### Step 3: Path Parameter Extraction
- Extract `specId` from path parameter
- Extract `noteId` from path parameter

#### Step 4: Input Validation
- Validate `specId` is valid UUID format
- Validate `noteId` is valid UUID format
- Return 400 if either validation fails

#### Step 5: Service Layer Execution
- Call `SkiSpecService.getNoteById(userId, specId, noteId)`
- Service performs database query via Supabase client

#### Step 6: Database Query
```typescript
const { data, error } = await supabase
  .from('ski_spec_notes')
  .select('*')
  .eq('id', noteId)
  .eq('ski_spec_id', specId)
  .single();
```

**RLS Policy Application**:
- Supabase automatically applies RLS policy "Users can select notes for own specs"
- Policy verifies ownership through ski_specs.user_id relationship
- Returns null if note doesn't exist or user lacks access

#### Step 7: Result Processing
- If error or data is null → throw NotFoundError
- If data exists → validate with NoteDTOSchema
- Return NoteDTO

#### Step 8: Response Formatting
- Endpoint handler wraps result in HTTP response
- Sets appropriate status code (200)
- Sets Content-Type: application/json
- Returns JSON response to client

### Database Interactions

**Tables Accessed**:
- `ski_spec_notes` (direct read)
- `ski_specs` (implicit via RLS policy)


## 6. Security Considerations

### Authentication
- **JWT Validation**: Middleware validates Supabase JWT token before processing
- **User Context**: User ID extracted from validated JWT, not from request parameters
- **Token Expiration**: Expired tokens automatically rejected by Supabase
- **No Token Refresh**: This endpoint doesn't handle token refresh (client responsibility)

### Authorization
- **Row-Level Security**: Supabase RLS policies enforce ownership at database level
- **Implicit Verification**: RLS policy checks ski_specs.user_id = auth.uid()
- **No Direct Ownership Column**: Notes inherit ownership through ski_specs relationship
- **Defense in Depth**: Both service-level and database-level checks

### Input Validation
- **UUID Format Validation**: Strict regex validation prevents injection attacks
- **No SQL Injection Risk**: Parameterized queries via Supabase client
- **Path Parameter Sanitization**: Only valid UUIDs accepted

### Information Disclosure Prevention
- **Uniform 404 Response**: Same error for "not found" and "not authorized"
- **No Existence Hints**: Don't reveal whether spec or note exists
- **Generic Error Messages**: Detailed errors logged server-side only
- **No Stack Traces**: Production errors don't expose system details

### Additional Security Measures
- **Rate Limiting**: Consider implementing at API gateway level (future)
- **CORS Configuration**: Restrict origins in production
- **HTTPS Only**: Enforce TLS for all API communications
- **Audit Logging**: Log access attempts for security monitoring

## 7. Error Handling

### Error Categories and Handling

#### 1. Validation Errors (400 Bad Request)

**Scenario**: Invalid UUID format in path parameters

**Detection**:
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!uuidRegex.test(specId)) {
  // Return 400
}

if (!uuidRegex.test(noteId)) {
  // Return 400
}
```

**Response**:
```json
{
  "error": "Invalid UUID format",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

**Logging**: Log warning with invalid input (sanitized)

#### 2. Authentication Errors (401 Unauthorized)

**Scenario**: Missing, invalid, or expired JWT token

**Detection**: Handled by middleware before reaching endpoint

**Response**:
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

**Logging**: Log authentication failures for security monitoring

#### 3. Not Found Errors (404 Not Found)

**Scenarios**:
1. Ski specification doesn't exist
2. Note doesn't exist
3. Note exists but belongs to different specification
4. Specification or note exists but belongs to different user

**Detection**:
```typescript
// Supabase query returns null due to RLS or non-existence
if (!data || error) {
  throw new NotFoundError('Note not found');
}
```

**Response**:
```json
{
  "error": "Note not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

**Important**: Use same error message for all scenarios to prevent information leakage

**Logging**: Log 404s with full context (user_id, specId, noteId) for debugging

#### 4. Database Errors (500 Internal Server Error)

**Scenarios**:
- Supabase connection timeout
- Database unavailable
- RLS policy execution failure
- Unexpected query errors

**Detection**:
```typescript
try {
  const result = await service.getNoteById(userId, specId, noteId);
  return new Response(JSON.stringify(result), { status: 200 });
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle 404
  }
  // Unhandled errors → 500
  console.error('Database error:', error);
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }),
    { status: 500 }
  );
}
```

**Response**:
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

**Logging**: Log full error details with stack trace for debugging

### Error Handling Best Practices

1. **Consistent Error Format**: All errors follow ApiErrorResponse schema
2. **Timestamp Inclusion**: All errors include ISO 8601 timestamp
3. **Error Codes**: Machine-readable codes for client-side handling
4. **Security First**: Never expose sensitive information in error messages
5. **Comprehensive Logging**: Log all errors with context for debugging
6. **Graceful Degradation**: Handle errors without crashing the server

## 9. Implementation Steps

### Step 1: Create Endpoint Handler File
**File**: `src/pages/api/ski-specs/[specId]/notes/[noteId].ts`

```typescript
import type { APIRoute } from 'astro';
import { SkiSpecService } from '@/lib/services/ski-spec.service';

export const GET: APIRoute = async ({ params, locals }) => {
  // Implementation in next steps
};
```

### Step 2: Extract and Validate Authentication
**Location**: Endpoint handler

```typescript
export const GET: APIRoute = async ({ params, locals }) => {
  // User context attached by middleware
  const userId = locals.user?.id;
  
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Continue to next step
};
```

### Step 3: Extract and Validate Path Parameters
**Location**: Endpoint handler

```typescript
const { specId, noteId } = params;

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!specId || !uuidRegex.test(specId)) {
  return new Response(
    JSON.stringify({
      error: 'Invalid ski specification ID format',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
    }),
    { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

if (!noteId || !uuidRegex.test(noteId)) {
  return new Response(
    JSON.stringify({
      error: 'Invalid note ID format',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
    }),
    { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

### Step 4: Implement Service Method
**File**: `src/lib/services/ski-spec.service.ts`

Add new method to SkiSpecService class:

```typescript
/**
 * Retrieves a specific note by ID for a given ski specification
 * @param userId - User ID from authenticated session
 * @param specId - Ski specification UUID
 * @param noteId - Note UUID
 * @returns NoteDTO
 * @throws NotFoundError if note doesn't exist or user lacks access
 */
async getNoteById(
  userId: string,
  specId: string,
  noteId: string
): Promise<NoteDTO> {
  const { data, error } = await this.supabase
    .from('ski_spec_notes')
    .select('*')
    .eq('id', noteId)
    .eq('ski_spec_id', specId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Note not found');
  }

  // Validate response against schema
  const validatedData = NoteDTOSchema.parse(data);
  
  return validatedData;
}
```

### Step 5: Define Custom Error Classes
**File**: `src/lib/errors.ts` (create if doesn't exist)

```typescript
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

### Step 6: Implement Error Handling in Endpoint
**Location**: Endpoint handler

```typescript
try {
  const service = new SkiSpecService(locals.supabase);
  const note = await service.getNoteById(userId, specId, noteId);
  
  return new Response(
    JSON.stringify(note),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
} catch (error) {
  if (error instanceof NotFoundError) {
    return new Response(
      JSON.stringify({
        error: 'Note not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Log unexpected errors
  console.error('Error fetching note:', error);
  
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    }),
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

### Step 7: Add Response Validation (Optional)
**Location**: Service method

```typescript
// Already included in Step 4
const validatedData = NoteDTOSchema.parse(data);
```

This ensures the response from Supabase matches the expected schema before returning.

### Step 9: Create Tests
**File**: `src/pages/api/ski-specs/[specId]/notes/[noteId].test.ts`

```typescript
describe('GET /api/ski-specs/{specId}/notes/{noteId}', () => {
  it('should return 401 when not authenticated', async () => {
    // Test implementation
  });
  
  it('should return 400 for invalid specId UUID', async () => {
    // Test implementation
  });
  
  it('should return 400 for invalid noteId UUID', async () => {
    // Test implementation
  });
  
  it('should return 404 when note does not exist', async () => {
    // Test implementation
  });
  
  it('should return 404 when note belongs to different spec', async () => {
    // Test implementation
  });
  
  it('should return 404 when user does not own the spec', async () => {
    // Test implementation
  });
  
  it('should return 200 with note data when successful', async () => {
    // Test implementation
  });
});
```

### Step 10: Update API Documentation
**File**: `public/swagger.yaml`

Verify the endpoint documentation is complete (already present in provided swagger.yaml).

### Step 11: Integration Testing
1. Test with valid authentication and existing note
2. Test with invalid UUIDs
3. Test with non-existent note
4. Test with note from different user (should return 404)
5. Test with note from different spec (should return 404)
6. Test without authentication

### Step 14: Documentation and Deployment
1. Update API documentation if needed
2. Add endpoint to API reference
3. Deploy to staging environment
4. Conduct user acceptance testing
5. Deploy to production

---

## Summary

This implementation plan provides a comprehensive guide for implementing the `GET /api/ski-specs/{specId}/notes/{noteId}` endpoint. The endpoint retrieves a specific note with proper authentication, authorization, validation, and error handling. It leverages Supabase RLS for security and follows REST API best practices with appropriate status codes and error responses.

**Key Implementation Points**:
- UUID validation for both path parameters
- RLS-based ownership verification
- Uniform 404 responses to prevent information leakage
- Proper error handling with clear status codes
- Minimal database queries for optimal performance
- Comprehensive security measures at multiple layers

