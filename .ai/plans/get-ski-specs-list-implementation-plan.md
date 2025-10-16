# API Endpoint Implementation Plan: GET /api/ski-specs

## 1. Endpoint Overview

This endpoint retrieves a paginated, sortable, and searchable list of ski specifications for the authenticated user. Each specification includes calculated metrics (surface area, relative weight) and an aggregated count of associated notes. The endpoint supports flexible querying through optional parameters for pagination control, sorting, and full-text search.

**Purpose**: Enable users to view and browse their saved ski specifications with efficient pagination and search capabilities.

**Business Context**: Implements User Story US-008 (Przeglądanie listy specyfikacji) from the PRD.

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
GET /api/ski-specs
```

### Authentication
- **Required**: Yes (Bearer token - Supabase JWT)
- **Source**: Authorization header
- **Validation**: Via Astro middleware (context.locals.supabase)

### Query Parameters

| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `page` | integer | No | 1 | min: 1 | Page number (1-indexed) |
| `limit` | integer | No | 20 | min: 1, max: 100 | Items per page |
| `sort_by` | string | No | "created_at" | enum: name, length, surface_area, relative_weight, created_at | Field to sort by |
| `sort_order` | string | No | "desc" | enum: asc, desc | Sort order |
| `search` | string | No | - | - | Search term for name and description fields |

### Query Parameter Parsing

Query parameters arrive as strings and must be coerced to appropriate types:

```typescript
const rawQuery = {
  page: url.searchParams.get('page'),
  limit: url.searchParams.get('limit'),
  sort_by: url.searchParams.get('sort_by'),
  sort_order: url.searchParams.get('sort_order'),
  search: url.searchParams.get('search'),
};

// Coerce to proper types
const parsedQuery = {
  page: rawQuery.page ? parseInt(rawQuery.page, 10) : undefined,
  limit: rawQuery.limit ? parseInt(rawQuery.limit, 10) : undefined,
  sort_by: rawQuery.sort_by,
  sort_order: rawQuery.sort_order,
  search: rawQuery.search || undefined,
};
```

### Request Body
None (GET request)

## 3. Used Types

### Import Required Types from `src/types.ts`

```typescript
import type {
  ListSkiSpecsQuery,
  SkiSpecDTO,
  SkiSpecListResponse,
  PaginationMeta,
  ApiErrorResponse,
} from "@/types";

import {
  ListSkiSpecsQuerySchema,
  SkiSpecDTOSchema,
} from "@/types";
```

### Type Descriptions

**ListSkiSpecsQuery**: Query parameters type with validation schema
- Used for: Validating and typing incoming query parameters
- Schema: `ListSkiSpecsQuerySchema` (Zod schema with defaults and validation)

**SkiSpecDTO**: Complete ski specification data transfer object
- Includes: All ski_specs table columns + notes_count aggregate
- Used for: Individual items in the response array

**SkiSpecListResponse**: Paginated response wrapper
- Structure: `{ data: SkiSpecDTO[], pagination: PaginationMeta }`
- Used for: The endpoint's successful response

**PaginationMeta**: Pagination metadata
- Fields: page, limit, total, total_pages
- Used for: Providing pagination information to clients

**ApiErrorResponse**: Standard error response format
- Fields: error, code (optional), details (optional), timestamp (optional)
- Used for: All error responses (400, 401, 500)

## 4. Response Details

### Success Response (200 OK)

**Content-Type**: `application/json`

**Body Structure**:
```typescript
{
  data: SkiSpecDTO[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    total_pages: number
  }
}
```

**Example**:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Atomic Backland 107",
      "description": "All-mountain freeride ski for powder",
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
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### Error Responses

#### 400 Bad Request
Invalid query parameters (validation failure)

```json
{
  "error": "Invalid query parameters",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "page",
      "message": "Page must be a positive integer"
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 401 Unauthorized
Missing or invalid authentication token

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 500 Internal Server Error
Database or server error

```json
{
  "error": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 5. Data Flow

### High-Level Flow

```
1. Client Request
   ↓
2. Astro Middleware (Authentication)
   ↓
3. API Endpoint Handler (src/pages/api/ski-specs/index.ts)
   ├─ Extract & coerce query parameters
   ├─ Validate with Zod schema
   ├─ Get authenticated user from session
   └─ Call Service Layer
      ↓
4. Service Layer (src/lib/services/ski-spec.service.ts)
   ├─ Build Supabase query
   │  ├─ Filter by user_id
   │  ├─ Apply search filter (if provided)
   │  ├─ Count total matching records
   │  ├─ Apply sorting
   │  ├─ Apply pagination (offset/limit)
   │  └─ Join/aggregate notes count
   ├─ Execute query
   └─ Return results + total count
      ↓
5. API Endpoint Handler
   ├─ Transform to SkiSpecDTO[]
   ├─ Calculate pagination metadata
   ├─ Build SkiSpecListResponse
   └─ Return 200 with JSON response
      ↓
6. Client receives paginated list
```

### Detailed Database Query Flow

**Query Building Steps** (in service layer):

1. **Start with base query**:
   ```typescript
   let query = supabase
     .from('ski_specs')
     .select('*, notes:ski_spec_notes(count)', { count: 'exact' })
     .eq('user_id', userId);
   ```

2. **Apply search filter** (if search parameter provided):
   ```typescript
   if (search) {
     query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
   }
   ```

3. **Get total count** (for pagination):
   - Use `count: 'exact'` option in select
   - Extract count from response

4. **Apply sorting**:
   ```typescript
   query = query.order(sort_by, { ascending: sort_order === 'asc' });
   ```

5. **Apply pagination**:
   ```typescript
   const offset = (page - 1) * limit;
   query = query.range(offset, offset + limit - 1);
   ```

6. **Execute query and handle response**

### Data Transformation

**Database Result → SkiSpecDTO**:
- Map ski_specs row to SkiSpecDTO
- Extract notes_count from aggregated notes array
- Ensure all numeric fields are properly typed
- Handle null description field

## 6. Security Considerations

### Authentication

1. **Middleware Enforcement**:
   - Authentication is handled by Astro middleware
   - User session is attached to `context.locals.supabase`
   - Endpoint must verify session exists

### Authorization

1. **User Data Isolation**:
   - Always filter queries by authenticated user's ID
   - Use `eq('user_id', user.id)` in all Supabase queries
   - Never expose other users' data

2. **Row-Level Security** (Supabase):
   - Although RLS is disabled per migration files, application-level filtering is mandatory
   - Service layer must enforce user_id filtering

### Input Validation

1. **Query Parameter Validation**:
   - Use Zod schema (`ListSkiSpecsQuerySchema.safeParse()`)
   - Validate all parameters before database query
   - Return 400 with details on validation failure

2. **SQL Injection Prevention**:
   - Use Supabase's parameterized queries (built-in protection)
   - Never concatenate user input into raw SQL
   - Search parameter is passed through Supabase's `.ilike()` method

3. **Search Input Sanitization**:
   - While Supabase handles SQL injection, consider limiting search string length
   - Trim whitespace from search input
   - Consider escaping special ILIKE characters (%, _) if needed

## 7. Performance Considerations

### Database Performance

2. **Query Optimization**:
   - Use `select('*')` with explicit count option instead of separate count query
   - Limit selected fields if payload size becomes concern
   - Use `range()` for efficient pagination (LIMIT/OFFSET)

3. **Notes Count Aggregation**:
   - Use Supabase's built-in aggregation for notes count
   - Alternative: Use LEFT JOIN with COUNT() if aggregation not available
   - Consider caching notes_count in ski_specs table if performance issues arise

### Response Size Optimization

1. **Pagination**:
   - Default limit of 20 items is reasonable
   - Maximum limit of 100 prevents excessive payload sizes
   - Encourage clients to use appropriate page sizes

2. **Field Selection**:
   - Currently returns all fields (as per SkiSpecDTO)
   - Consider sparse fieldsets in future if needed
   - Avoid over-fetching in service layer

## 8. Error Handling

### Error Handling Strategy

Follow the coding practices from implementation rules:
- Handle errors at the beginning of functions
- Use early returns for error conditions
- Avoid deeply nested if statements
- Implement proper error logging

wqd### Error Scenarios

#### 1. Query Parameter Validation Failure

**Trigger**: Invalid query parameters (e.g., page < 1, limit > 100, invalid sort_by)

**Handling**:
```typescript
const validation = ListSkiSpecsQuerySchema.safeParse(parsedQuery);

if (!validation.success) {
  const details = validation.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  
  return new Response(
    JSON.stringify({
      error: "Invalid query parameters",
      code: "VALIDATION_ERROR",
      details,
      timestamp: new Date().toISOString(),
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

**Status Code**: 400

#### 2. Authentication Failure

**Trigger**: Missing, expired, or invalid JWT token

**Handling**:
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
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

**Status Code**: 401

#### 3. Database Query Error

**Trigger**: Supabase query failure, connection error, timeout

**Handling**:
```typescript
const { data, error, count } = await query;

if (error) {
  console.error('Database error in listSkiSpecs:', error);
  
  return new Response(
    JSON.stringify({
      error: "An unexpected error occurred while fetching ski specifications",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

**Status Code**: 500

**Logging**: Log full error details to console/logging service for debugging

#### 4. Empty Results

**Trigger**: No ski specifications match the query

**Handling**:
- Not an error condition
- Return 200 with empty data array
- Pagination total = 0, total_pages = 0

```typescript
const response: SkiSpecListResponse = {
  data: [],
  pagination: {
    page: validatedQuery.page,
    limit: validatedQuery.limit,
    total: 0,
    total_pages: 0,
  },
};

return new Response(
  JSON.stringify(response),
  { status: 200, headers: { "Content-Type": "application/json" } }
);
```

**Status Code**: 200

### Error Response Format

All errors follow the `ApiErrorResponse` type:

```typescript
interface ApiErrorResponse {
  error: string;              // Human-readable error message
  code?: string;              // Machine-readable error code
  details?: Array<{           // Field-level validation errors
    field: string;
    message: string;
  }>;
  timestamp?: string;         // ISO 8601 timestamp
}
```

### Error Logging

For all server errors (500):
- Log to console with `console.error()`
- Include: error message, stack trace, user ID, query parameters
- Consider structured logging in production

Example:
```typescript
console.error('Database error in GET /api/ski-specs:', {
  error: error.message,
  userId: user.id,
  queryParams: validatedQuery,
  timestamp: new Date().toISOString(),
});
```

## 9. Implementation Steps

### Step 1: Create Service Layer Method

**File**: `src/lib/services/ski-spec.service.ts`

**Task**: Implement `listSkiSpecs` method

```typescript
export async function listSkiSpecs(
  supabase: SupabaseClient,
  userId: string,
  query: ListSkiSpecsQuery
): Promise<{ data: SkiSpecDTO[]; total: number }> {
  // Build base query with notes count aggregation
  let dbQuery = supabase
    .from('ski_specs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  // Apply search filter if provided
  if (query.search) {
    const searchTerm = query.search.trim();
    dbQuery = dbQuery.or(
      `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
    );
  }

  // Apply sorting
  dbQuery = dbQuery.order(query.sort_by, { 
    ascending: query.sort_order === 'asc' 
  });

  // Apply pagination
  const offset = (query.page - 1) * query.limit;
  dbQuery = dbQuery.range(offset, offset + query.limit - 1);

  // Execute query
  const { data, error, count } = await dbQuery;

  if (error) {
    throw error;
  }

  // Get notes count for each spec (separate query for now)
  // TODO: Optimize this with a single query using aggregation
  const specsWithNotes = await Promise.all(
    (data || []).map(async (spec) => {
      const { count: notesCount } = await supabase
        .from('ski_spec_notes')
        .select('*', { count: 'exact', head: true })
        .eq('ski_spec_id', spec.id);

      return {
        ...spec,
        notes_count: notesCount || 0,
      } as SkiSpecDTO;
    })
  );

  return {
    data: specsWithNotes,
    total: count || 0,
  };
}
```

**Notes**:
- Handle notes_count aggregation (may need optimization)
- Use proper error handling with try-catch
- Consider adding JSDoc comments

### Step 2: Create API Endpoint Handler

**File**: `src/pages/api/ski-specs/index.ts`

**Task**: Implement GET handler

```typescript
export const prerender = false;

import type { APIRoute } from 'astro';
import type {
  ListSkiSpecsQuery,
  SkiSpecListResponse,
  ApiErrorResponse,
  PaginationMeta,
} from '@/types';
import { ListSkiSpecsQuerySchema } from '@/types';
import { listSkiSpecs } from '@/lib/services/ski-spec.service';

export const GET: APIRoute = async ({ url, locals }) => {
  const supabase = locals.supabase;

  // Step 1: Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ApiErrorResponse = {
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString(),
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Step 2: Extract and coerce query parameters
  const rawQuery = {
    page: url.searchParams.get('page'),
    limit: url.searchParams.get('limit'),
    sort_by: url.searchParams.get('sort_by'),
    sort_order: url.searchParams.get('sort_order'),
    search: url.searchParams.get('search'),
  };

  const parsedQuery = {
    page: rawQuery.page ? parseInt(rawQuery.page, 10) : undefined,
    limit: rawQuery.limit ? parseInt(rawQuery.limit, 10) : undefined,
    sort_by: rawQuery.sort_by || undefined,
    sort_order: rawQuery.sort_order || undefined,
    search: rawQuery.search || undefined,
  };

  // Step 3: Validate query parameters
  const validation = ListSkiSpecsQuerySchema.safeParse(parsedQuery);

  if (!validation.success) {
    const details = validation.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    const errorResponse: ApiErrorResponse = {
      error: 'Invalid query parameters',
      code: 'VALIDATION_ERROR',
      details,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validatedQuery = validation.data;

  // Step 4: Call service layer
  try {
    const { data, total } = await listSkiSpecs(
      supabase,
      user.id,
      validatedQuery
    );

    // Step 5: Build pagination metadata
    const totalPages = Math.ceil(total / validatedQuery.limit);
    const pagination: PaginationMeta = {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      total,
      total_pages: totalPages,
    };

    // Step 6: Build and return response
    const response: SkiSpecListResponse = {
      data,
      pagination,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Step 7: Handle unexpected errors
    console.error('Error in GET /api/ski-specs:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user.id,
      queryParams: validatedQuery,
      timestamp: new Date().toISOString(),
    });

    const errorResponse: ApiErrorResponse = {
      error: 'An unexpected error occurred while fetching ski specifications',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### Step 3: Update Middleware (if needed)

**File**: `src/middleware/index.ts`

**Task**: Ensure Supabase client is properly attached to context.locals

Verify that middleware:
- Creates Supabase client from request cookies
- Attaches client to `context.locals.supabase`
- Handles session refresh if needed

### Step 4: Test Query Parameter Coercion

**Task**: Verify that query parameters are properly coerced from strings

Test cases:
- `?page=2&limit=50` → `{ page: 2, limit: 50 }`
- `?sort_by=name&sort_order=asc` → `{ sort_by: 'name', sort_order: 'asc' }`
- `?search=atomic` → `{ search: 'atomic' }`
- Missing parameters use defaults
- Invalid values trigger validation errors

### Step 5: Optimize Notes Count Query

**Task**: Refactor service to get notes_count in single query

**Options**:

**Option A**: Use Supabase aggregation (preferred if available)
```typescript
.select('*, notes:ski_spec_notes(count)')
```

**Option B**: Use raw SQL with LEFT JOIN and COUNT()
```sql
SELECT 
  ski_specs.*,
  COUNT(ski_spec_notes.id) as notes_count
FROM ski_specs
LEFT JOIN ski_spec_notes ON ski_specs.id = ski_spec_notes.ski_spec_id
WHERE ski_specs.user_id = $1
GROUP BY ski_specs.id
```

**Option C**: Accept N+1 for MVP if list sizes are small, optimize later

Choose based on Supabase capabilities and performance requirements.

### Step 8: Manual Testing

**Task**: Test endpoint with various scenarios

Use tools like Postman, curl, or Thunder Client:

```bash
# Get first page with defaults
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/ski-specs

# Get second page with custom limit
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/ski-specs?page=2&limit=10"

# Sort by name ascending
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/ski-specs?sort_by=name&sort_order=asc"

# Search for "atomic"
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/ski-specs?search=atomic"

# Test validation errors
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/ski-specs?page=0"  # Should return 400

# Test without auth
curl http://localhost:3000/api/ski-specs  # Should return 401
```

### Step 9: Documentation

**Task**: Update project documentation

1. **API Documentation**: Ensure swagger.yaml is accurate (already done)
2. **Service Documentation**: Add JSDoc comments to service methods
3. **README**: Update with endpoint examples if needed
4. **Type Documentation**: Ensure types.ts has comprehensive comments (already done)
