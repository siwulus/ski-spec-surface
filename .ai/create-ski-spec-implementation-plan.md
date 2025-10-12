# API Endpoint Implementation Plan: Create Ski Specification

## 1. Endpoint Overview

**Purpose:** Creates a new ski specification for an authenticated user with automatic calculation of surface area and relative weight metrics.

**Key Responsibilities:**
- Validates user authentication via Supabase Auth (Bearer token)
- Validates input parameters against defined constraints
- Enforces business rules (tip/waist/tail relationship, name uniqueness)
- Calculates surface area using the surface area algorithm
- Calculates relative weight (weight per cm²)
- Persists data to the `ski_specs` table
- Returns the complete specification including calculated fields

**Technology Stack:**
- Astro 5 Server Endpoints
- TypeScript 5
- Zod for validation
- Supabase for authentication and database
- PostgreSQL database (via Supabase)

---

## 2. Request Details

**HTTP Method:** POST  
**URL Structure:** `/api/ski-specs`  
**Content-Type:** `application/json`

### Path Parameters:
None

### Query Parameters:
None

### Request Headers:
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token from Supabase Auth (format: `Bearer <token>`) |
| `Content-Type` | Yes | Must be `application/json` |

### Request Body:
```typescript
{
  name: string;           // Required, max 255 chars, unique per user
  description?: string;   // Optional, max 2000 chars
  length: number;         // Required, 100-250 (cm)
  tip: number;           // Required, 50-250 (mm)
  waist: number;         // Required, 50-250 (mm)
  tail: number;          // Required, 50-250 (mm)
  radius: number;        // Required, 1-30 (m)
  weight: number;        // Required, 500-3000 (g)
}
```

### Field Validation Rules:

| Field | Type | Required | Constraints | Error Message |
|-------|------|----------|-------------|---------------|
| `name` | string | Yes | Min 1 char, max 255 chars | "Name is required" / "Name must not exceed 255 characters" |
| `description` | string | No | Max 2000 chars | "Description must not exceed 2000 characters" |
| `length` | integer | Yes | 100-250 | "Length is required" / "Length must be between 100 and 250 cm" |
| `tip` | integer | Yes | 50-250 | "Tip width is required" / "Tip width must be between 50 and 250 mm" |
| `waist` | integer | Yes | 50-250 | "Waist width is required" / "Waist width must be between 50 and 250 mm" |
| `tail` | integer | Yes | 50-250 | "Tail width is required" / "Tail width must be between 50 and 250 mm" |
| `radius` | integer | Yes | 1-30 | "Radius is required" / "Radius must be between 1 and 30 m" |
| `weight` | integer | Yes | 500-3000 | "Weight is required" / "Weight must be between 500 and 3000 g" |

### Business Rules:
1. **Width Relationship:** `tip >= waist AND tail >= waist`
   - Error: "Waist must be less than or equal to both tip and tail widths"
   - Status: 422 Unprocessable Entity

2. **Name Uniqueness:** Name must be unique per user
   - Error: "A specification with this name already exists"
   - Status: 409 Conflict

---

## 3. Used Types

### 3.1 Input DTO (Request Validation)
```typescript
// src/types.ts or inline with endpoint

import { z } from 'zod';

export const CreateSkiSpecSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters')
    .trim(),
  description: z.string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),
  length: z.number()
    .int('Length must be an integer')
    .min(100, 'Length must be between 100 and 250 cm')
    .max(250, 'Length must be between 100 and 250 cm'),
  tip: z.number()
    .int('Tip width must be an integer')
    .min(50, 'Tip width must be between 50 and 250 mm')
    .max(250, 'Tip width must be between 50 and 250 mm'),
  waist: z.number()
    .int('Waist width must be an integer')
    .min(50, 'Waist width must be between 50 and 250 mm')
    .max(250, 'Waist width must be between 50 and 250 mm'),
  tail: z.number()
    .int('Tail width must be an integer')
    .min(50, 'Tail width must be between 50 and 250 mm')
    .max(250, 'Tail width must be between 50 and 250 mm'),
  radius: z.number()
    .int('Radius must be an integer')
    .min(1, 'Radius must be between 1 and 30 m')
    .max(30, 'Radius must be between 1 and 30 m'),
  weight: z.number()
    .int('Weight must be an integer')
    .min(500, 'Weight must be between 500 and 3000 g')
    .max(3000, 'Weight must be between 500 and 3000 g'),
}).refine(
  (data) => data.tip >= data.waist && data.tail >= data.waist,
  {
    message: 'Waist must be less than or equal to both tip and tail widths',
    path: ['waist'],
  }
);

export type CreateSkiSpecDTO = z.infer<typeof CreateSkiSpecSchema>;
```

### 3.2 Command Model (Service Layer)
```typescript
// src/lib/services/ski-spec.service.ts

export interface CreateSkiSpecCommand {
  userId: string;
  name: string;
  description?: string;
  length: number;
  tip: number;
  waist: number;
  tail: number;
  radius: number;
  weight: number;
}

export interface CalculatedMetrics {
  surfaceArea: number;      // in cm²
  relativeWeight: number;   // in g/cm²
  algorithmVersion: string;
}
```

### 3.3 Entity (Database Response)
```typescript
// src/types.ts

export interface SkiSpecEntity {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  length: number;
  tip: number;
  waist: number;
  tail: number;
  radius: number;
  weight: number;
  surface_area: number;
  relative_weight: number;
  algorithm_version: string;
  notes_count: number;
  created_at: string;
  updated_at: string;
}
```

### 3.4 Response DTO
```typescript
// src/types.ts

export interface SkiSpecResponseDTO {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  length: number;
  tip: number;
  waist: number;
  tail: number;
  radius: number;
  weight: number;
  surface_area: number;
  relative_weight: number;
  algorithm_version: string;
  notes_count: number;
  created_at: string;
  updated_at: string;
}
```

### 3.5 Error Response Types
```typescript
// src/types.ts

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  details?: ValidationErrorDetail[];
}
```

---

## 4. Response Details

### Success Response (201 Created)

**Headers:**
- `Content-Type: application/json`
- `Location: /api/ski-specs/{id}` (optional, points to the created resource)

**Body:**
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
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

### Error Responses

#### 400 Bad Request - Validation Errors
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "tip",
      "message": "Tip width must be between 50 and 250 mm"
    },
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

#### 401 Unauthorized - Authentication Required
```json
{
  "error": "Authentication required"
}
```

#### 409 Conflict - Duplicate Name
```json
{
  "error": "A specification with this name already exists"
}
```

#### 422 Unprocessable Entity - Business Rule Violation
```json
{
  "error": "Business rule violation",
  "details": [
    {
      "field": "waist",
      "message": "Waist must be less than or equal to both tip and tail widths"
    }
  ]
}
```

#### 500 Internal Server Error - Server Error
```json
{
  "error": "An unexpected error occurred"
}
```

---

## 5. Data Flow

### High-Level Flow Diagram

```
Client Request
      ↓
[1] Astro Middleware (context.locals.supabase)
      ↓
[2] Endpoint Handler (/api/ski-specs.ts - POST)
      ↓
[3] Authentication Check (Extract user from JWT)
      ↓ (if valid)
[4] Request Body Validation (Zod Schema)
      ↓ (if valid)
[5] Business Rule Validation (tip/waist/tail)
      ↓ (if valid)
[6] SkiSpecService.createSkiSpec()
      ↓
[7] Calculate Surface Area (CalculationService)
      ↓
[8] Calculate Relative Weight
      ↓
[9] Check Name Uniqueness (Supabase query)
      ↓ (if unique)
[10] Insert into ski_specs table
      ↓
[11] Fetch created record with notes_count
      ↓
[12] Return 201 Created with SkiSpecResponseDTO
```

### Detailed Step-by-Step Flow

#### Step 1: Authentication (Middleware)
- Astro middleware provides `context.locals.supabase` with authenticated client
- JWT token is validated by Supabase Auth
- User information is available via `supabase.auth.getUser()`

#### Step 2: Request Handling
- Endpoint receives POST request
- Extracts request body
- Validates Content-Type is `application/json`

#### Step 3: User Extraction
```typescript
const { data: { user }, error } = await context.locals.supabase.auth.getUser();
if (!user || error) {
  return new Response(
    JSON.stringify({ error: 'Authentication required' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### Step 4: Input Validation
```typescript
const validationResult = CreateSkiSpecSchema.safeParse(requestBody);
if (!validationResult.success) {
  const errors = validationResult.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  return new Response(
    JSON.stringify({ error: 'Validation failed', details: errors }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### Step 5: Service Layer Processing
```typescript
const skiSpecService = new SkiSpecService(context.locals.supabase);
const result = await skiSpecService.createSkiSpec({
  userId: user.id,
  ...validationResult.data
});
```

#### Step 6-8: Calculation Logic (in SkiSpecService)
```typescript
// Calculate surface area using algorithm
const surfaceArea = calculateSurfaceArea({
  length: command.length,
  tip: command.tip,
  waist: command.waist,
  tail: command.tail
});

// Calculate relative weight
const relativeWeight = command.weight / surfaceArea;

// Set algorithm version
const algorithmVersion = '1.0.0';
```

#### Step 9: Uniqueness Check
```typescript
const { data: existingSpec } = await supabase
  .from('ski_specs')
  .select('id')
  .eq('user_id', command.userId)
  .eq('name', command.name)
  .single();

if (existingSpec) {
  throw new ConflictError('A specification with this name already exists');
}
```

#### Step 10: Database Insert
```typescript
const { data, error } = await supabase
  .from('ski_specs')
  .insert({
    user_id: command.userId,
    name: command.name,
    description: command.description || null,
    length: command.length,
    tip: command.tip,
    waist: command.waist,
    tail: command.tail,
    radius: command.radius,
    weight: command.weight,
    surface_area: surfaceArea,
    relative_weight: relativeWeight,
    algorithm_version: algorithmVersion
  })
  .select(`
    *,
    notes_count: ski_spec_notes(count)
  `)
  .single();
```

#### Step 11: Response Formation
```typescript
return new Response(
  JSON.stringify(data),
  { 
    status: 201,
    headers: { 
      'Content-Type': 'application/json',
      'Location': `/api/ski-specs/${data.id}`
    } 
  }
);
```

### External Dependencies

1. **Supabase Auth**
   - Purpose: JWT token validation and user authentication
   - Failure mode: Returns 401 if token is invalid or missing

2. **PostgreSQL Database (via Supabase)**
   - Purpose: Data persistence and retrieval
   - Failure mode: Returns 500 on database errors
   - Note: RLS is disabled based on migrations

3. **Surface Area Calculation Algorithm**
   - Purpose: Calculate ski surface area from dimensions
   - Failure mode: Should not fail with valid inputs; log and return 500 if it does

---

## 6. Security Considerations

### 6.1 Authentication
- **Requirement:** Valid JWT token from Supabase Auth
- **Implementation:** Use `context.locals.supabase.auth.getUser()`
- **Validation:** Check user exists and token is not expired
- **Error handling:** Return 401 Unauthorized if authentication fails

### 6.2 Authorization
- **User Ownership:** Automatically enforced by setting `user_id` from authenticated user
- **Data Isolation:** User can only create specifications for themselves
- **Implementation:** Extract `user_id` from JWT token, not from request body

### 6.3 Input Validation
- **SQL Injection:** Mitigated by Supabase client parameterized queries
- **XSS Prevention:** Validate and sanitize all string inputs
- **Type Safety:** Use Zod schema to enforce types and constraints
- **Business Rules:** Validate tip/waist/tail relationship before database insert

### 6.4 Rate Limiting
- **Recommendation:** Implement rate limiting to prevent abuse
- **Approach:** Use Astro middleware or external service (e.g., Cloudflare)
- **Limits:** Consider 100 requests per user per hour for creation endpoints

### 6.5 Data Privacy
- **User Isolation:** Ensure users can only access their own data
- **No PII Logging:** Avoid logging sensitive user information
- **Error Messages:** Don't expose internal system details in error messages

### 6.6 CORS (if applicable)
- **Configuration:** Set appropriate CORS headers if frontend is on different domain
- **Allowed Origins:** Whitelist specific domains, avoid wildcard in production

### 6.7 Content-Type Validation
- **Check:** Verify `Content-Type: application/json` header
- **Error:** Return 415 Unsupported Media Type if incorrect

---

## 7. Error Handling

### 7.1 Error Categories and Status Codes

| Error Category | HTTP Status | Example Scenario | Response Format |
|---------------|-------------|------------------|-----------------|
| Authentication Error | 401 | Missing or invalid token | `{ error: string }` |
| Validation Error | 400 | Invalid field values | `{ error: string, details: array }` |
| Business Rule Violation | 422 | tip < waist | `{ error: string, details: array }` |
| Conflict Error | 409 | Duplicate name | `{ error: string }` |
| Not Found | 404 | N/A for this endpoint | N/A |
| Server Error | 500 | Database failure | `{ error: string }` |

### 7.2 Detailed Error Scenarios

#### Authentication Errors (401)
**Scenarios:**
- Missing Authorization header
- Invalid JWT token format
- Expired JWT token
- Revoked user session

**Handler:**
```typescript
if (!user || error) {
  return new Response(
    JSON.stringify({ error: 'Authentication required' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### Validation Errors (400)
**Scenarios:**
- Missing required fields
- Invalid field types (string instead of number)
- Out-of-range values (length = 300)
- Invalid field formats

**Handler:**
```typescript
if (!validationResult.success) {
  const details = validationResult.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  return new Response(
    JSON.stringify({ error: 'Validation failed', details }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### Business Rule Violations (422)
**Scenarios:**
- tip < waist
- tail < waist
- Both conditions violated

**Handler:**
```typescript
// Handled by Zod refinement
.refine(
  (data) => data.tip >= data.waist && data.tail >= data.waist,
  {
    message: 'Waist must be less than or equal to both tip and tail widths',
    path: ['waist'],
  }
);
```

#### Conflict Errors (409)
**Scenarios:**
- Specification name already exists for user

**Handler:**
```typescript
// In service layer
const existing = await checkNameUniqueness(userId, name);
if (existing) {
  throw new ConflictError('A specification with this name already exists');
}

// In endpoint
catch (error) {
  if (error instanceof ConflictError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

#### Server Errors (500)
**Scenarios:**
- Database connection failure
- Database insert failure
- Calculation algorithm failure
- Unexpected runtime errors

**Handler:**
```typescript
catch (error) {
  console.error('Unexpected error creating ski spec:', error);
  return new Response(
    JSON.stringify({ error: 'An unexpected error occurred' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 7.3 Error Logging Strategy

**What to Log:**
- Timestamp of error
- User ID (if available)
- Error type and message
- Stack trace (for 500 errors)
- Request details (method, path, body - excluding sensitive data)

**What NOT to Log:**
- Authentication tokens
- Passwords (not applicable here)
- Full user objects

**Implementation:**
```typescript
console.error({
  timestamp: new Date().toISOString(),
  userId: user?.id,
  error: error.message,
  stack: error.stack,
  endpoint: 'POST /api/ski-specs'
});
```

### 7.4 Error Response Consistency

All error responses should follow this structure:
```typescript
interface ErrorResponse {
  error: string;                    // Human-readable error message
  details?: Array<{                 // Optional field-level errors
    field: string;
    message: string;
  }>;
}
```

---

## 8. Performance Considerations

### 8.1 Potential Bottlenecks

1. **Database Insert Operation**
   - Impact: Low (single row insert is fast)
   - Mitigation: None needed

2. **Name Uniqueness Check**
   - Impact: Low (indexed query on user_id + name)
   - Mitigation: Ensure index exists: `UNIQUE (user_id, name)`

3. **Surface Area Calculation**
   - Impact: Very low (simple mathematical operation)
   - Mitigation: None needed

4. **Notes Count Aggregation**
   - Impact: Low for new records (always 0)
   - Optimization: Return hardcoded 0 instead of querying

### 8.2 Optimization Strategies

#### Database Query Optimization
```typescript
// Efficient: Use single query with select specific fields
const { data, error } = await supabase
  .from('ski_specs')
  .insert({ ... })
  .select()  // Only fetch what we need
  .single();

// Add notes_count as 0 manually for new records
const response = { ...data, notes_count: 0 };
```

#### Caching Considerations
- **Not applicable:** Create operations should never be cached
- **Algorithm version:** Could be stored as constant instead of database field

#### Connection Pooling
- **Implementation:** Handled by Supabase SDK
- **Configuration:** No custom configuration needed

### 8.3 Scalability Considerations

1. **Request Volume**
   - Expected: Low to medium (user-initiated creation)
   - Scaling: Horizontal scaling of Astro instances

2. **Database Load**
   - Expected: Low (simple insert operations)
   - Scaling: Supabase handles automatically

3. **Computation**
   - Expected: Negligible (simple math operations)
   - Scaling: No concerns

### 8.4 Response Time Goals

| Operation | Target Time | Acceptable Time |
|-----------|-------------|-----------------|
| Full request processing | < 100ms | < 300ms |
| Input validation | < 5ms | < 10ms |
| Calculation | < 1ms | < 5ms |
| Database insert | < 50ms | < 200ms |

---

## 9. Implementation Steps

### Phase 1: Type Definitions and Schemas

**Step 1.1: Define Zod validation schema**
- Location: `src/types.ts` or inline in endpoint file
- Create `CreateSkiSpecSchema` with all field validations
- Add refine method for business rule (tip/waist/tail)
- Export `CreateSkiSpecDTO` type

**Step 1.2: Define entity and response types**
- Location: `src/types.ts`
- Create `SkiSpecEntity` interface
- Create `SkiSpecResponseDTO` interface
- Create `ValidationErrorDetail` and `ErrorResponse` interfaces

**Deliverable:** Complete type definitions in `src/types.ts`

---

### Phase 2: Calculation Service

**Step 2.1: Create calculation utilities**
- Location: `src/lib/services/calculation.service.ts`
- Implement `calculateSurfaceArea()` function
  ```typescript
  export function calculateSurfaceArea(params: {
    length: number;
    tip: number;
    waist: number;
    tail: number;
  }): number {
    // Implement surface area algorithm
    // Return value in cm²
  }
  ```
- Implement `calculateRelativeWeight()` function
  ```typescript
  export function calculateRelativeWeight(
    weight: number,
    surfaceArea: number
  ): number {
    return weight / surfaceArea;
  }
  ```
- Add algorithm version constant
  ```typescript
  export const ALGORITHM_VERSION = '1.0.0';
  ```

**Step 2.2: Add unit tests**
- Test surface area calculation with known values
- Test relative weight calculation
- Test edge cases (minimum/maximum dimensions)

**Deliverable:** `src/lib/services/calculation.service.ts` with tested functions

---

### Phase 3: Ski Specification Service

**Step 3.1: Create service class**
- Location: `src/lib/services/ski-spec.service.ts`
- Create `SkiSpecService` class
- Constructor accepts `SupabaseClient`
- Implement `createSkiSpec()` method

**Step 3.2: Implement createSkiSpec method**
```typescript
export class SkiSpecService {
  constructor(private supabase: SupabaseClient) {}

  async createSkiSpec(
    command: CreateSkiSpecCommand
  ): Promise<SkiSpecEntity> {
    // 1. Check name uniqueness
    // 2. Calculate metrics
    // 3. Insert into database
    // 4. Return created entity
  }
}
```

**Step 3.3: Implement name uniqueness check**
```typescript
private async checkNameUniqueness(
  userId: string,
  name: string
): Promise<boolean> {
  const { data } = await this.supabase
    .from('ski_specs')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .maybeSingle();
  
  return data !== null;
}
```

**Step 3.4: Implement database insert**
```typescript
const { data, error } = await this.supabase
  .from('ski_specs')
  .insert({
    user_id: command.userId,
    name: command.name,
    description: command.description || null,
    length: command.length,
    tip: command.tip,
    waist: command.waist,
    tail: command.tail,
    radius: command.radius,
    weight: command.weight,
    surface_area: surfaceArea,
    relative_weight: relativeWeight,
    algorithm_version: ALGORITHM_VERSION
  })
  .select()
  .single();

if (error) {
  throw new Error(`Database error: ${error.message}`);
}
```

**Deliverable:** `src/lib/services/ski-spec.service.ts` with complete implementation

---

### Phase 4: API Endpoint Implementation

**Step 4.1: Create endpoint file**
- Location: `src/pages/api/ski-specs.ts`
- Add `export const prerender = false;`
- Import necessary types and services

**Step 4.2: Implement POST handler**
```typescript
import type { APIRoute } from 'astro';
import { CreateSkiSpecSchema } from '../../types';
import { SkiSpecService } from '../../lib/services/ski-spec.service';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // Implementation here
};
```

**Step 4.3: Add authentication check**
```typescript
const { data: { user }, error: authError } = 
  await context.locals.supabase.auth.getUser();

if (!user || authError) {
  return new Response(
    JSON.stringify({ error: 'Authentication required' }),
    { 
      status: 401, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}
```

**Step 4.4: Add request body parsing**
```typescript
let requestBody;
try {
  requestBody = await context.request.json();
} catch (error) {
  return new Response(
    JSON.stringify({ error: 'Invalid JSON in request body' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Step 4.5: Add input validation**
```typescript
const validationResult = CreateSkiSpecSchema.safeParse(requestBody);
if (!validationResult.success) {
  const details = validationResult.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  return new Response(
    JSON.stringify({ error: 'Validation failed', details }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Step 4.6: Add service layer call**
```typescript
try {
  const skiSpecService = new SkiSpecService(context.locals.supabase);
  const result = await skiSpecService.createSkiSpec({
    userId: user.id,
    ...validationResult.data
  });

  return new Response(
    JSON.stringify(result),
    { 
      status: 201,
      headers: { 
        'Content-Type': 'application/json',
        'Location': `/api/ski-specs/${result.id}`
      } 
    }
  );
} catch (error) {
  // Error handling in next step
}
```

**Step 4.7: Add comprehensive error handling**
```typescript
catch (error) {
  console.error('Error creating ski spec:', {
    timestamp: new Date().toISOString(),
    userId: user.id,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });

  // Check for conflict error (duplicate name)
  if (error instanceof Error && error.message.includes('already exists')) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Generic error response
  return new Response(
    JSON.stringify({ error: 'An unexpected error occurred' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Deliverable:** Complete `src/pages/api/ski-specs.ts` endpoint

---

### Phase 5: Error Handling Enhancement

**Step 5.1: Create custom error classes**
- Location: `src/lib/errors.ts`
```typescript
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

**Step 5.2: Update service to use custom errors**
```typescript
if (await this.checkNameUniqueness(command.userId, command.name)) {
  throw new ConflictError('A specification with this name already exists');
}
```

**Step 5.3: Update endpoint error handling**
```typescript
catch (error) {
  if (error instanceof ConflictError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({ error: error.message, details: error.details }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // ... other error handling
}
```

**Deliverable:** `src/lib/errors.ts` with custom error classes

---

### Phase 6: Testing

**Step 6.1: Manual testing with valid data**
- Test with curl or Postman
- Verify 201 response
- Verify all fields in response
- Verify calculations are correct

**Step 6.2: Test validation errors**
- Test missing required fields
- Test out-of-range values
- Test business rule violations (tip < waist)
- Verify 400 response with details

**Step 6.3: Test authentication**
- Test without Authorization header
- Test with invalid token
- Verify 401 response

**Step 6.4: Test conflict scenarios**
- Create specification with unique name
- Try to create again with same name
- Verify 409 response

**Step 6.5: Test edge cases**
- Test with minimum valid values
- Test with maximum valid values
- Test with optional description missing
- Test with empty description string

**Deliverable:** Test results documentation

---

### Phase 7: Documentation and Cleanup

**Step 7.1: Add code comments**
- Document complex calculations
- Document business rules
- Add JSDoc comments to public functions

**Step 7.2: Update API documentation**
- Document any deviations from original plan
- Add example requests and responses
- Document error scenarios

**Step 7.3: Code review checklist**
- [ ] All types properly defined
- [ ] Input validation comprehensive
- [ ] Error handling complete
- [ ] Authentication properly implemented
- [ ] Database queries optimized
- [ ] Logging implemented
- [ ] No console.log in production code
- [ ] Code follows project style guide
- [ ] No hardcoded values (use constants)
- [ ] All edge cases handled

**Deliverable:** Production-ready code with documentation

---

## 10. Testing Checklist

### Unit Testing
- [ ] Surface area calculation function
- [ ] Relative weight calculation function
- [ ] Zod schema validation (valid inputs)
- [ ] Zod schema validation (invalid inputs)
- [ ] Business rule validation (tip/waist/tail)

### Integration Testing
- [ ] Successful creation with valid data
- [ ] Authentication failure scenarios
- [ ] Validation error scenarios
- [ ] Duplicate name conflict
- [ ] Database error handling

### Manual Testing
- [ ] Test with curl/Postman
- [ ] Verify response structure
- [ ] Verify calculations
- [ ] Test all error scenarios
- [ ] Test with different user accounts

### Security Testing
- [ ] Test without authentication token
- [ ] Test with expired token
- [ ] Test with another user's token
- [ ] Test SQL injection attempts in name field
- [ ] Test XSS attempts in description field

---

## 11. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database indexes verified
- [ ] Environment variables configured
- [ ] Logging properly configured

### Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Monitor error logs
- [ ] Deploy to production
- [ ] Verify endpoint is accessible

### Post-Deployment
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Verify calculations are correct
- [ ] Check database for orphaned records
- [ ] Collect user feedback

---

## 12. Future Enhancements

### Potential Improvements
1. **Batch Creation:** Support creating multiple specifications in one request
2. **Duplicate Detection:** Suggest similar existing specifications before creation
3. **Validation Warnings:** Warn user about unusual but valid values
4. **Rich Validation:** Validate against known ski models database
5. **Webhooks:** Notify external systems on specification creation
6. **Audit Trail:** Track who created what and when
7. **Soft Delete:** Instead of hard delete, mark as deleted
8. **Version History:** Track changes to specifications over time

### Monitoring Recommendations
1. **Metrics to Track:**
   - Request rate
   - Error rate by type
   - Response time percentiles (p50, p95, p99)
   - Validation failure rate by field
   - Conflict error rate

2. **Alerts to Set Up:**
   - Error rate > 5%
   - Response time > 1 second
   - Authentication failure spike
   - Database connection failures

---

## Appendix A: Example Requests

### Valid Creation Request
```bash
curl -X POST https://api.example.com/api/ski-specs \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Atomic Backland 107",
    "description": "All-mountain freeride ski for powder and mixed conditions",
    "length": 181,
    "tip": 142,
    "waist": 107,
    "tail": 123,
    "radius": 18,
    "weight": 1580
  }'
```

### Invalid Request (Missing Field)
```bash
curl -X POST https://api.example.com/api/ski-specs \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Atomic Backland 107",
    "length": 181,
    "tip": 142,
    "waist": 107
  }'
```

### Invalid Request (Business Rule Violation)
```bash
curl -X POST https://api.example.com/api/ski-specs \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Ski",
    "length": 181,
    "tip": 100,
    "waist": 120,
    "tail": 105,
    "radius": 18,
    "weight": 1580
  }'
```

---

## Appendix B: Database Queries Reference

### Check Name Uniqueness
```sql
SELECT id 
FROM ski_specs 
WHERE user_id = $1 
  AND name = $2
LIMIT 1;
```

### Insert Ski Specification
```sql
INSERT INTO ski_specs (
  user_id,
  name,
  description,
  length,
  tip,
  waist,
  tail,
  radius,
  weight,
  surface_area,
  relative_weight,
  algorithm_version
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
)
RETURNING *;
```

### Get Created Specification with Notes Count
```sql
SELECT 
  s.*,
  COUNT(n.id) as notes_count
FROM ski_specs s
LEFT JOIN ski_spec_notes n ON s.id = n.ski_spec_id
WHERE s.id = $1
GROUP BY s.id;
```

---

**End of Implementation Plan**

