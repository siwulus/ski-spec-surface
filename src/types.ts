import type { Database } from "./db/database.types";

// =============================================================================
// DATABASE ENTITY TYPES
// =============================================================================

/**
 * Ski specification entity from database
 */
export type SkiSpecEntity = Database["public"]["Tables"]["ski_specs"]["Row"];

/**
 * Ski specification insert type for database operations
 */
export type SkiSpecInsert = Database["public"]["Tables"]["ski_specs"]["Insert"];

/**
 * Ski specification update type for database operations
 */
export type SkiSpecUpdate = Database["public"]["Tables"]["ski_specs"]["Update"];

/**
 * Note entity from database
 */
export type NoteEntity = Database["public"]["Tables"]["ski_spec_notes"]["Row"];

/**
 * Note insert type for database operations
 */
export type NoteInsert = Database["public"]["Tables"]["ski_spec_notes"]["Insert"];

/**
 * Note update type for database operations
 */
export type NoteUpdate = Database["public"]["Tables"]["ski_spec_notes"]["Update"];

// =============================================================================
// SKI SPECIFICATION DTOs
// =============================================================================

/**
 * Complete ski specification DTO returned by API endpoints.
 * Extends database entity with additional computed field (notes_count).
 */
export type SkiSpecDTO = SkiSpecEntity & {
  notes_count: number;
};

/**
 * Simplified ski specification DTO for comparison endpoint.
 * Omits user_id, timestamps, algorithm_version, and notes_count.
 */
export type SkiSpecCompareDTO = Pick<
  SkiSpecEntity,
  | "id"
  | "name"
  | "description"
  | "length"
  | "tip"
  | "waist"
  | "tail"
  | "radius"
  | "weight"
  | "surface_area"
  | "relative_weight"
>;

/**
 * Query parameters for listing ski specifications
 */
export interface SkiSpecListQueryParams {
  page?: number;
  limit?: number;
  sort_by?: "name" | "length" | "surface_area" | "relative_weight" | "created_at";
  sort_order?: "asc" | "desc";
  search?: string;
}

/**
 * Query parameters for comparing ski specifications
 */
export interface SkiSpecCompareQueryParams {
  ids: string; // Comma-separated UUIDs (2-4 items)
}

/**
 * Query parameters for exporting ski specifications
 */
export interface SkiSpecExportQueryParams {
  format?: "csv";
}

// =============================================================================
// SKI SPECIFICATION COMMAND MODELS
// =============================================================================

/**
 * Command model for creating a new ski specification.
 * Includes only user-provided fields. Calculated fields (surface_area, relative_weight, algorithm_version)
 * and system fields (id, user_id, timestamps) are omitted.
 */
export type CreateSkiSpecCommand = Pick<
  SkiSpecEntity,
  "name" | "description" | "length" | "tip" | "waist" | "tail" | "radius" | "weight"
>;

/**
 * Command model for updating a ski specification.
 * Same fields as CreateSkiSpecCommand - all user-editable fields are required.
 */
export type UpdateSkiSpecCommand = CreateSkiSpecCommand;

// =============================================================================
// SKI SPECIFICATION IMPORT/EXPORT DTOs
// =============================================================================

/**
 * Summary statistics for import operation
 */
export interface ImportSummary {
  total_rows: number;
  successful: number;
  failed: number;
  skipped: number;
}

/**
 * Successfully imported row information
 */
export interface ImportedRow {
  row: number;
  name: string;
  id: string;
}

/**
 * Failed row import information with validation errors
 */
export interface ImportErrorRow {
  row: number;
  name: string;
  errors: ValidationError[];
}

/**
 * Complete import result DTO
 */
export interface ImportSkiSpecResultDTO {
  summary: ImportSummary;
  imported: ImportedRow[];
  errors: ImportErrorRow[];
}

// =============================================================================
// NOTE DTOs
// =============================================================================

/**
 * Note DTO returned by API endpoints.
 * Identical to database entity - no additional fields needed.
 */
export type NoteDTO = NoteEntity;

/**
 * Query parameters for listing notes
 */
export interface NotesListQueryParams {
  page?: number;
  limit?: number;
}

// =============================================================================
// NOTE COMMAND MODELS
// =============================================================================

/**
 * Command model for creating a new note.
 * Only includes content field - ski_spec_id comes from URL path parameter.
 */
export type CreateNoteCommand = Pick<NoteEntity, "content">;

/**
 * Command model for updating a note.
 * Same as CreateNoteCommand - only content is editable.
 */
export type UpdateNoteCommand = CreateNoteCommand;

// =============================================================================
// PAGINATION TYPES
// =============================================================================

/**
 * Generic pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Pagination metadata included in paginated responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Paginated list of ski specifications
 */
export type PaginatedSkiSpecsResponse = PaginatedResponse<SkiSpecDTO>;

/**
 * Paginated list of notes
 */
export type PaginatedNotesResponse = PaginatedResponse<NoteDTO>;

// =============================================================================
// COMPARISON RESPONSE TYPES
// =============================================================================

/**
 * Response for ski specification comparison endpoint
 */
export interface SkiSpecCompareResponse {
  specifications: SkiSpecCompareDTO[];
}

// =============================================================================
// ERROR RESPONSE TYPES
// =============================================================================

/**
 * Field-specific validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Error codes used throughout the API
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: ValidationError[];
  timestamp: string;
}

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

/**
 * Health check response
 */
export interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  version: string;
}
