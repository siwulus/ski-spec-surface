# REST API Plan - Ski Surface Spec Extension

## 1. Resources

### 1.1 Core Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| `ski-specs` | `ski_specs` | Ski specifications with technical parameters and calculated metrics |
| `notes` | `ski_spec_notes` | Notes associated with ski specifications |

### 1.2 Resource Relationships

- Each `ski-spec` belongs to one authenticated user (via `user_id`)
- Each `ski-spec` can have zero or many `notes`
- Each `note` belongs to one `ski-spec`
- Notes ownership is derived through the parent `ski-spec` relationship

## 2. Endpoints

### 2.1 Ski Specifications

#### 2.1.1 List Ski Specifications

**GET** `/api/ski-specs`

Lists all ski specifications for the authenticated user with pagination and optional filtering.

**Authentication:** Required (Bearer token)

**Query Parameters:**
```typescript
{
  page?: number;           // Page number (default: 1)
  limit?: number;          // Items per page (default: 20, max: 100)
  sort_by?: string;        // Field to sort by: name | length | surface_area | relative_weight | created_at (default: created_at)
  sort_order?: string;     // Sort order: asc | desc (default: desc)
  search?: string;         // Search in name and description fields
}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
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
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `400 Bad Request` - Invalid query parameters

---

#### 2.1.2 Get Ski Specification Details

**GET** `/api/ski-specs/{id}`

Retrieves detailed information about a specific ski specification including associated notes count.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id` - UUID of the ski specification

**Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
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

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Ski specification not found or not owned by user
- `400 Bad Request` - Invalid UUID format

---

#### 2.1.3 Create Ski Specification

**POST** `/api/ski-specs`

Creates a new ski specification. The system automatically calculates `surface_area` and `relative_weight` based on provided dimensions.

**Authentication:** Required (Bearer token)

**Request Body:**
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

**Field Specifications:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | Max 255 chars, unique per user |
| `description` | string | No | Max 2000 chars |
| `length` | integer | Yes | 100-250 (cm) |
| `tip` | integer | Yes | 50-250 (mm) |
| `waist` | integer | Yes | 50-250 (mm) |
| `tail` | integer | Yes | 50-250 (mm) |
| `radius` | integer | Yes | 1-30 (m) |
| `weight` | integer | Yes | 500-3000 (g) |

**Business Rules:**
- `tip >= waist <= tail` (tip must be >= waist, tail must be >= waist)
- Name must be unique per user

**Response (201 Created):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
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

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `400 Bad Request` - Validation errors (with detailed field-level error messages)
- `409 Conflict` - Specification name already exists for this user
- `422 Unprocessable Entity` - Business rule violations (e.g., tip/waist/tail relationship)

**Example Error Response (400):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "tip",
      "message": "Tip width must be between 50 and 250 mm"
    },
    {
      "field": "waist",
      "message": "Waist must be less than or equal to tip and tail"
    }
  ]
}
```

---

#### 2.1.4 Update Ski Specification

**PUT** `/api/ski-specs/{id}`

Updates an existing ski specification. Recalculates `surface_area` and `relative_weight` if dimensional values change.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id` - UUID of the ski specification

**Request Body:**
```json
{
  "name": "Atomic Backland 107 (181cm)",
  "description": "Updated description with test notes",
  "length": 181,
  "tip": 142,
  "waist": 107,
  "tail": 123,
  "radius": 18,
  "weight": 1580
}
```

**Field Specifications:** Same as Create endpoint

**Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Atomic Backland 107 (181cm)",
  "description": "Updated description with test notes",
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
  "updated_at": "2025-01-15T12:45:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Ski specification not found or not owned by user
- `400 Bad Request` - Validation errors
- `409 Conflict` - New name already exists for this user
- `422 Unprocessable Entity` - Business rule violations

---

#### 2.1.5 Delete Ski Specification

**DELETE** `/api/ski-specs/{id}`

Deletes a ski specification and all associated notes (cascade delete).

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id` - UUID of the ski specification

**Response (204 No Content):**
No response body

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Ski specification not found or not owned by user
- `400 Bad Request` - Invalid UUID format

---

#### 2.1.6 Compare Ski Specifications

**GET** `/api/ski-specs/compare`

Compares 2-4 ski specifications owned by the authenticated user. Returns full specifications with calculated differences.

**Authentication:** Required (Bearer token)

**Query Parameters:**
```typescript
{
  ids: string;  // Comma-separated UUIDs (2-4 items, e.g., "uuid1,uuid2,uuid3")
}
```

**Response (200 OK):**
```json
{
  "specifications": [
    {
      "id": "uuid1",
      "name": "Atomic Backland 107",
      "description": "All-mountain freeride ski",
      "length": 181,
      "tip": 142,
      "waist": 107,
      "tail": 123,
      "radius": 18,
      "weight": 1580,
      "surface_area": 2340.50,
      "relative_weight": 0.675
    },
    {
      "id": "uuid2",
      "name": "DPS Wailer 112",
      "description": "Powder ski",
      "length": 184,
      "tip": 145,
      "waist": 112,
      "tail": 128,
      "radius": 20,
      "weight": 1650,
      "surface_area": 2520.75,
      "relative_weight": 0.655
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `400 Bad Request` - Invalid query parameters (wrong number of IDs, invalid UUIDs)
- `404 Not Found` - One or more specifications not found or not owned by user

---

#### 2.1.7 Export Ski Specifications

**GET** `/api/ski-specs/export`

Exports all ski specifications for the authenticated user to CSV format.

**Authentication:** Required (Bearer token)

**Query Parameters:**
```typescript
{
  format?: string;  // Export format: csv (default: csv, future: json, xlsx)
}
```

**Response (200 OK):**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="ski-specs-YYYY-MM-DD.csv"`

**CSV Structure:**
```csv
name,description,length_cm,tip_mm,waist_mm,tail_mm,radius_m,weight_g,surface_area_cm2,relative_weight_g_cm2
"Atomic Backland 107","All-mountain freeride ski for powder",181,142,107,123,18,1580,2340.50,0.675
```

**Notes on CSV Format:**
- Descriptions with commas, quotes, or newlines are properly escaped
- Empty descriptions are represented as empty fields
- All numeric values use dot (.) as decimal separator
- UTF-8 encoding for special characters

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token

---

#### 2.1.8 Import Ski Specifications

**POST** `/api/ski-specs/import`

Imports ski specifications from CSV file. Validates all entries and provides detailed import summary.

**Authentication:** Required (Bearer token)

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with file field named `file`

**CSV Requirements:**
- Must include header row with expected column names
- Required columns: name, length_cm, tip_mm, waist_mm, tail_mm, radius_m, weight_g
- Optional columns: description
- Supports both comma (`,`) and semicolon (`;`) as field separators
- Supports both dot (`.`) and comma (`,`) as decimal separators

**Response (200 OK):**
```json
{
  "summary": {
    "total_rows": 10,
    "successful": 8,
    "failed": 2,
    "skipped": 0
  },
  "imported": [
    {
      "row": 2,
      "name": "Atomic Backland 107",
      "id": "uuid"
    }
  ],
  "errors": [
    {
      "row": 5,
      "name": "Invalid Ski",
      "errors": [
        {
          "field": "waist",
          "message": "Waist must be less than or equal to tip and tail"
        }
      ]
    },
    {
      "row": 8,
      "name": "Duplicate Ski",
      "errors": [
        {
          "field": "name",
          "message": "Specification with this name already exists"
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `400 Bad Request` - Invalid file format, missing file, or corrupted CSV
- `413 Payload Too Large` - File size exceeds limit (e.g., 5MB)
- `415 Unsupported Media Type` - File is not CSV

---

### 2.2 Notes

#### 2.2.1 List Notes for Specification

**GET** `/api/ski-specs/{specId}/notes`

Lists all notes for a specific ski specification, sorted chronologically (newest first).

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `specId` - UUID of the ski specification

**Query Parameters:**
```typescript
{
  page?: number;      // Page number (default: 1)
  limit?: number;     // Items per page (default: 50, max: 100)
}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "ski_spec_id": "uuid",
      "content": "Tested in deep powder at Chamonix. Excellent float and maneuverability.",
      "created_at": "2025-01-20T14:30:00Z",
      "updated_at": "2025-01-20T14:30:00Z"
    },
    {
      "id": "uuid",
      "ski_spec_id": "uuid",
      "content": "Mounted with Marker Kingpin bindings at -2cm from center.",
      "created_at": "2025-01-18T09:15:00Z",
      "updated_at": "2025-01-19T10:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "total_pages": 1
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Ski specification not found or not owned by user
- `400 Bad Request` - Invalid UUID format or query parameters

---

#### 2.2.2 Get Note Details

**GET** `/api/ski-specs/{specId}/notes/{noteId}`

Retrieves a specific note.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `specId` - UUID of the ski specification
- `noteId` - UUID of the note

**Response (200 OK):**
```json
{
  "id": "uuid",
  "ski_spec_id": "uuid",
  "content": "Tested in deep powder at Chamonix. Excellent float and maneuverability.",
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-20T14:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Note or specification not found or not owned by user
- `400 Bad Request` - Invalid UUID format

---

#### 2.2.3 Create Note

**POST** `/api/ski-specs/{specId}/notes`

Creates a new note for a ski specification.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `specId` - UUID of the ski specification

**Request Body:**
```json
{
  "content": "Tested in deep powder at Chamonix. Excellent float and maneuverability."
}
```

**Field Specifications:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `content` | string | Yes | 1-2000 characters |

**Response (201 Created):**
```json
{
  "id": "uuid",
  "ski_spec_id": "uuid",
  "content": "Tested in deep powder at Chamonix. Excellent float and maneuverability.",
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-20T14:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Ski specification not found or not owned by user
- `400 Bad Request` - Validation errors (content length)

---

#### 2.2.4 Update Note

**PUT** `/api/ski-specs/{specId}/notes/{noteId}`

Updates an existing note. Automatically updates the `updated_at` timestamp.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `specId` - UUID of the ski specification
- `noteId` - UUID of the note

**Request Body:**
```json
{
  "content": "Updated content with additional observations from the test session."
}
```

**Field Specifications:** Same as Create endpoint

**Response (200 OK):**
```json
{
  "id": "uuid",
  "ski_spec_id": "uuid",
  "content": "Updated content with additional observations from the test session.",
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-20T16:45:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Note or specification not found or not owned by user
- `400 Bad Request` - Validation errors

---

#### 2.2.5 Delete Note

**DELETE** `/api/ski-specs/{specId}/notes/{noteId}`

Deletes a note.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `specId` - UUID of the ski specification
- `noteId` - UUID of the note

**Response (204 No Content):**
No response body

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Note or specification not found or not owned by user
- `400 Bad Request` - Invalid UUID format

---

### 2.3 Health & Status

#### 2.3.1 Health Check

**GET** `/api/health`

Returns API health status. No authentication required.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:00Z",
  "version": "1.0.0"
}
```

## 3. Validation and Business Logic

### 3.1 Ski Specifications Validation

#### Field-Level Validation:

| Field | Validation Rules | Error Messages |
|-------|-----------------|----------------|
| `name` | Required, max 255 chars, unique per user | "Name is required", "Name must not exceed 255 characters", "Specification name already exists" |
| `description` | Optional, max 2000 chars | "Description must not exceed 2000 characters" |
| `length` | Required, integer, 100-250 | "Length is required", "Length must be between 100 and 250 cm" |
| `tip` | Required, integer, 50-250 | "Tip width is required", "Tip width must be between 50 and 250 mm" |
| `waist` | Required, integer, 50-250 | "Waist width is required", "Waist width must be between 50 and 250 mm" |
| `tail` | Required, integer, 50-250 | "Tail width is required", "Tail width must be between 50 and 250 mm" |
| `radius` | Required, integer, 1-30 | "Radius is required", "Radius must be between 1 and 30 m" |
| `weight` | Required, integer, 500-3000 | "Weight is required", "Weight must be between 500 and 3000 g" |

#### Business Rule Validation:

1. **Width Relationship:**
   - Rule: `tip >= waist AND tail >= waist`
   - Error: "Waist must be less than or equal to both tip and tail widths"
   - Validation timing: Before database insert/update

2. **Name Uniqueness:**
   - Rule: Name must be unique per user (enforced by UNIQUE constraint)
   - Error: "A specification with this name already exists"
   - Validation timing: Before database insert/update
   - HTTP Status: 409 Conflict

#### Calculated Fields:

- `surface_area`: Calculated automatically using the surface area algorithm
- `relative_weight`: Calculated as `weight / surface_area`
- `algorithm_version`: Set by system (e.g., "1.0.0")
- `user_id`: Extracted from JWT token
- `created_at`: Set automatically on creation
- `updated_at`: Updated automatically on modification

### 4.2 Notes Validation

#### Field-Level Validation:

| Field | Validation Rules | Error Messages |
|-------|-----------------|----------------|
| `content` | Required, 1-2000 chars | "Content is required", "Content must be between 1 and 2000 characters" |
| `ski_spec_id` | Must reference existing spec owned by user | "Ski specification not found" |

### 4.3 Import/Export Validation

#### CSV Import Validation:

1. **File-Level Validation:**
   - File format must be CSV (text/csv or application/vnd.ms-excel)
   - File size must not exceed 5MB
   - Must contain header row with expected column names
   - Character encoding: UTF-8 (with BOM support)

2. **Row-Level Validation:**
   - Each row must pass all field-level validations for ski specifications
   - Each row must pass business rule validation (tip/waist/tail relationship)
   - Duplicate names within the same file are rejected
   - Empty required fields are rejected
   - Invalid numeric formats are rejected

3. **Import Behavior:**
   - **Partial Success:** Valid rows are imported even if some rows fail
   - **Atomic Rows:** Each row is inserted as a single transaction (all or nothing)
   - **Error Reporting:** Detailed errors with row numbers and field-specific messages
   - **Name Conflicts:** Rows with names that already exist for the user are rejected

#### CSV Export Format:

1. **Column Order:**
   - name, description, length_cm, tip_mm, waist_mm, tail_mm, radius_m, weight_g, surface_area_cm2, relative_weight_g_cm2

2. **Data Formatting:**
   - Decimal separator: dot (.)
   - Text fields: enclosed in quotes if they contain commas, quotes, or newlines
   - Empty descriptions: empty field (no quotes)
   - Numeric precision: 2 decimal places for calculated fields

### 4.4 Comparison Business Logic

#### Validation Rules:

1. **ID Count:** Must provide 2-4 specification IDs
   - Error: "Comparison requires between 2 and 4 specifications"
   - HTTP Status: 400 Bad Request

2. **ID Validity:** All IDs must be valid UUIDs
   - Error: "Invalid specification ID format"
   - HTTP Status: 400 Bad Request

3. **Ownership:** All specifications must be owned by the authenticated user
   - Error: "One or more specifications not found"
   - HTTP Status: 404 Not Found

4. **Existence:** All IDs must reference existing specifications
   - Error: "One or more specifications not found"
   - HTTP Status: 404 Not Found

#### Response Format:

- Returns array of complete specification objects
- Frontend handles difference calculations and highlighting
- No server-side sorting (allows flexible client-side implementation)

### 4.5 Pagination

#### Standard Pagination Parameters:

- `page`: Page number (1-indexed, default: 1)
- `limit`: Items per page (default: 20, max: 100)

#### Pagination Response Format:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

#### Validation:

- `page` must be positive integer
- `limit` must be positive integer between 1 and 100
- Invalid pagination parameters return 400 Bad Request

### 4.6 Error Response Format

All API errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "field_name",
      "message": "Field-specific error message"
    }
  ],
  "timestamp": "2025-01-20T10:30:00Z"
}
```

**Common Error Codes:**

- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required or failed
- `FORBIDDEN` - Insufficient permissions
- `CONFLICT` - Resource conflict (e.g., duplicate name)
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Unexpected server error
