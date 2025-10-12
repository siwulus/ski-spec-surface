/**
 * DTO and Command Model Type Definitions
 *
 * This file contains all Data Transfer Object (DTO) types and Command Models
 * used throughout the application's API layer. All types are derived from the
 * database entity definitions in database.types.ts to ensure type safety and
 * consistency between the database layer and API layer.
 */

import type { Tables } from "@/db/database.types";

// ============================================================================
// Base Entity Types (derived from database)
// ============================================================================

/**
 * Base ski specification entity from database
 */
export type SkiSpecEntity = Tables<"ski_specs">;

/**
 * Base ski spec note entity from database
 */
export type SkiSpecNoteEntity = Tables<"ski_spec_notes">;

// ============================================================================
// Ski Specification DTOs
// ============================================================================

/**
 * Complete ski specification DTO including notes count.
 * Used in: List, Get, Create response, Update response
 * Extends the base entity with aggregated data (notes_count)
 */
export type SkiSpecDTO = SkiSpecEntity & {
  notes_count: number;
};

/**
 * Command model for creating a new ski specification.
 * Used in: POST /api/ski-specs
 *
 * Contains only user-provided fields. Calculated fields (surface_area,
 * relative_weight, algorithm_version) and auto-generated fields (id, user_id,
 * timestamps) are excluded as they're set by the system.
 */
export type CreateSkiSpecCommand = Pick<
  SkiSpecEntity,
  "name" | "description" | "length" | "tip" | "waist" | "tail" | "radius" | "weight"
>;

/**
 * Command model for updating an existing ski specification.
 * Used in: PUT /api/ski-specs/{id}
 *
 * Has the same structure as CreateSkiSpecCommand. All fields are required
 * to ensure complete specification data.
 */
export type UpdateSkiSpecCommand = CreateSkiSpecCommand;

/**
 * Simplified ski specification DTO for comparison view.
 * Used in: GET /api/ski-specs/compare
 *
 * Excludes metadata fields (user_id, algorithm_version, notes_count, timestamps)
 * to focus on the technical specifications being compared.
 */
export type SkiSpecComparisonDTO = Pick<
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

// ============================================================================
// Note DTOs
// ============================================================================

/**
 * Complete note DTO.
 * Used in: List, Get, Create response, Update response
 * Directly maps to the database entity as no additional data is needed.
 */
export type NoteDTO = SkiSpecNoteEntity;

/**
 * Command model for creating a new note.
 * Used in: POST /api/ski-specs/{specId}/notes
 *
 * Only requires content. The ski_spec_id comes from the URL path parameter,
 * and other fields (id, timestamps) are auto-generated.
 */
export type CreateNoteCommand = Pick<SkiSpecNoteEntity, "content">;

/**
 * Command model for updating an existing note.
 * Used in: PUT /api/ski-specs/{specId}/notes/{noteId}
 *
 * Same structure as CreateNoteCommand as only content can be modified.
 */
export type UpdateNoteCommand = CreateNoteCommand;

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination metadata included in list responses.
 * Used in all paginated list endpoints.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper.
 * Used to wrap any list of items with pagination metadata.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Paginated list of ski specifications.
 * Used in: GET /api/ski-specs
 */
export type SkiSpecListResponse = PaginatedResponse<SkiSpecDTO>;

/**
 * Paginated list of notes.
 * Used in: GET /api/ski-specs/{specId}/notes
 */
export type NoteListResponse = PaginatedResponse<NoteDTO>;

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Query parameters for listing ski specifications.
 * Used in: GET /api/ski-specs
 */
export interface ListSkiSpecsQuery {
  page?: number;
  limit?: number;
  sort_by?: "name" | "length" | "surface_area" | "relative_weight" | "created_at";
  sort_order?: "asc" | "desc";
  search?: string;
}

/**
 * Query parameters for listing notes.
 * Used in: GET /api/ski-specs/{specId}/notes
 */
export interface ListNotesQuery {
  page?: number;
  limit?: number;
}

/**
 * Query parameters for comparing ski specifications.
 * Used in: GET /api/ski-specs/compare
 */
export interface CompareSkiSpecsQuery {
  ids: string; // Comma-separated UUIDs (2-4 items)
}

/**
 * Response for ski specification comparison.
 * Used in: GET /api/ski-specs/compare
 */
export interface CompareSkiSpecsResponse {
  specifications: SkiSpecComparisonDTO[];
}

// ============================================================================
// Import/Export Types
// ============================================================================

/**
 * Summary of import operation results.
 * Used in: POST /api/ski-specs/import
 */
export interface ImportSummary {
  total_rows: number;
  successful: number;
  failed: number;
  skipped: number;
}

/**
 * Details of a successfully imported ski specification.
 * Used in: POST /api/ski-specs/import
 */
export interface ImportedItem {
  row: number;
  name: string;
  id: string;
}

/**
 * Field-level validation error in import.
 * Used in: POST /api/ski-specs/import
 */
export interface ImportErrorDetail {
  field: string;
  message: string;
}

/**
 * Details of a failed import row.
 * Used in: POST /api/ski-specs/import
 */
export interface ImportError {
  row: number;
  name: string;
  errors: ImportErrorDetail[];
}

/**
 * Complete response for import operation.
 * Used in: POST /api/ski-specs/import
 */
export interface ImportResponse {
  summary: ImportSummary;
  imported: ImportedItem[];
  errors: ImportError[];
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Field-level validation error detail.
 * Used in validation error responses.
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Standard API error response format.
 * Used for all error responses across the API.
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: ValidationErrorDetail[];
  timestamp?: string;
}
