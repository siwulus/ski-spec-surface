/**
 * DTO and Command Model Type Definitions
 *
 * This file contains all Data Transfer Object (DTO) types and Command Models
 * used throughout the application's API layer. All types are derived from the
 * database entity definitions in database.types.ts to ensure type safety and
 * consistency between the database layer and API layer.
 *
 * Each type is accompanied by a Zod schema for runtime validation and a
 * compile-time type check using expectTypeOf to ensure schema and type consistency.
 */

import type { Tables, TablesInsert, TablesUpdate } from "@/db/database.types";
import { z } from "zod";
import { expectTypeOf } from "expect-type";

// ============================================================================
// Base Entity Types (derived from database)
// ============================================================================

/**
 * Base ski specification entity from database
 */
export type SkiSpecEntity = Tables<"ski_specs">;
export type SkiSpecInsert = TablesInsert<"ski_specs">;
export type SkiSpecUpdate = TablesUpdate<"ski_specs">;
/**
 * Base ski spec note entity from database
 */
export type SkiSpecNoteEntity = Tables<"ski_spec_notes">;
export type SkiSpecNoteInsert = TablesInsert<"ski_spec_notes">;
export type SkiSpecNoteUpdate = TablesUpdate<"ski_spec_notes">;

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
 * Zod schema for SkiSpecDTO.
 * Validates complete ski specification data including notes count.
 */
export const SkiSpecDTOSchema = z.object({
  id: z.string().uuid("ID must be a valid UUID"),
  user_id: z.string().uuid("User ID must be a valid UUID"),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable(),
  length: z.number().int().min(100).max(250),
  tip: z.number().int().min(50).max(250),
  waist: z.number().int().min(50).max(250),
  tail: z.number().int().min(50).max(250),
  radius: z.number().int().min(1).max(30),
  weight: z.number().int().min(500).max(3000),
  surface_area: z.number().positive("Surface area must be positive"),
  relative_weight: z.number().positive("Relative weight must be positive"),
  algorithm_version: z.string().min(1, "Algorithm version is required"),
  created_at: z.string().datetime("Created at must be a valid ISO datetime"),
  updated_at: z.string().datetime("Updated at must be a valid ISO datetime"),
  notes_count: z.number().int().min(0, "Notes count must be non-negative"),
});

// Compile-time type check to ensure schema matches type
expectTypeOf<z.infer<typeof SkiSpecDTOSchema>>().toMatchTypeOf<SkiSpecDTO>();

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
 * Zod schema for CreateSkiSpecCommand.
 * Validates user input for creating a new ski specification.
 */
export const CreateSkiSpecCommandSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255, "Name must not exceed 255 characters"),
    description: z.string().max(2000, "Description must not exceed 2000 characters").nullable(),
    length: z
      .number()
      .int("Length must be an integer")
      .min(100, "Length must be between 100 and 250 cm")
      .max(250, "Length must be between 100 and 250 cm"),
    tip: z
      .number()
      .int("Tip width must be an integer")
      .min(50, "Tip width must be between 50 and 250 mm")
      .max(250, "Tip width must be between 50 and 250 mm"),
    waist: z
      .number()
      .int("Waist width must be an integer")
      .min(50, "Waist width must be between 50 and 250 mm")
      .max(250, "Waist width must be between 50 and 250 mm"),
    tail: z
      .number()
      .int("Tail width must be an integer")
      .min(50, "Tail width must be between 50 and 250 mm")
      .max(250, "Tail width must be between 50 and 250 mm"),
    radius: z
      .number()
      .int("Radius must be an integer")
      .min(1, "Radius must be between 1 and 30 m")
      .max(30, "Radius must be between 1 and 30 m"),
    weight: z
      .number()
      .int("Weight must be an integer")
      .min(500, "Weight must be between 500 and 3000 g")
      .max(3000, "Weight must be between 500 and 3000 g"),
  })
  .refine((data) => data.tip >= data.waist && data.tail >= data.waist, {
    message: "Waist must be less than or equal to both tip and tail widths",
    path: ["waist"],
  });

// Compile-time type check to ensure schema matches type
expectTypeOf<z.infer<typeof CreateSkiSpecCommandSchema>>().toEqualTypeOf<CreateSkiSpecCommand>();

/**
 * Command model for updating an existing ski specification.
 * Used in: PUT /api/ski-specs/{id}
 *
 * Has the same structure as CreateSkiSpecCommand. All fields are required
 * to ensure complete specification data.
 */
export type UpdateSkiSpecCommand = CreateSkiSpecCommand;

/**
 * Zod schema for UpdateSkiSpecCommand.
 * Reuses CreateSkiSpecCommandSchema as they have identical validation rules.
 */
export const UpdateSkiSpecCommandSchema = CreateSkiSpecCommandSchema;

// Compile-time type check to ensure schema matches type
expectTypeOf<z.infer<typeof UpdateSkiSpecCommandSchema>>().toEqualTypeOf<UpdateSkiSpecCommand>();

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

/**
 * Zod schema for SkiSpecComparisonDTO.
 * Validates ski specification data in comparison responses.
 */
export const SkiSpecComparisonDTOSchema = z.object({
  id: z.string().uuid("ID must be a valid UUID"),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable(),
  length: z.number().int().min(100).max(250),
  tip: z.number().int().min(50).max(250),
  waist: z.number().int().min(50).max(250),
  tail: z.number().int().min(50).max(250),
  radius: z.number().int().min(1).max(30),
  weight: z.number().int().min(500).max(3000),
  surface_area: z.number().positive("Surface area must be positive"),
  relative_weight: z.number().positive("Relative weight must be positive"),
});

// Compile-time type check to ensure schema matches type
expectTypeOf<z.infer<typeof SkiSpecComparisonDTOSchema>>().toEqualTypeOf<SkiSpecComparisonDTO>();

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
 * Zod schema for NoteDTO.
 * Validates complete note data.
 */
export const NoteDTOSchema = z.object({
  id: z.string().uuid("ID must be a valid UUID"),
  ski_spec_id: z.string().uuid("Ski spec ID must be a valid UUID"),
  content: z.string().min(1, "Content is required").max(2000, "Content must be between 1 and 2000 characters"),
  created_at: z.string().datetime("Created at must be a valid ISO datetime"),
  updated_at: z.string().datetime("Updated at must be a valid ISO datetime"),
});

// Compile-time type check to ensure schema matches type
expectTypeOf<z.infer<typeof NoteDTOSchema>>().toEqualTypeOf<NoteDTO>();

/**
 * Command model for creating a new note.
 * Used in: POST /api/ski-specs/{specId}/notes
 *
 * Only requires content. The ski_spec_id comes from the URL path parameter,
 * and other fields (id, timestamps) are auto-generated.
 */
export type CreateNoteCommand = Pick<SkiSpecNoteEntity, "content">;

/**
 * Zod schema for CreateNoteCommand.
 * Validates user input for creating a new note.
 */
export const CreateNoteCommandSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000, "Content must be between 1 and 2000 characters"),
});

// Compile-time type check to ensure schema matches type
expectTypeOf<z.infer<typeof CreateNoteCommandSchema>>().toEqualTypeOf<CreateNoteCommand>();

/**
 * Command model for updating an existing note.
 * Used in: PUT /api/ski-specs/{specId}/notes/{noteId}
 *
 * Same structure as CreateNoteCommand as only content can be modified.
 */
export type UpdateNoteCommand = CreateNoteCommand;

/**
 * Zod schema for UpdateNoteCommand.
 * Reuses CreateNoteCommandSchema as they have identical validation rules.
 */
export const UpdateNoteCommandSchema = CreateNoteCommandSchema;

// Compile-time type check to ensure schema matches type
expectTypeOf<z.infer<typeof UpdateNoteCommandSchema>>().toEqualTypeOf<UpdateNoteCommand>();

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Zod schema for PaginationMeta.
 * Validates pagination metadata in responses.
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().positive("Page must be a positive integer"),
  limit: z.number().int().positive("Limit must be a positive integer").max(100, "Limit must not exceed 100"),
  total: z.number().int().min(0, "Total must be non-negative"),
  total_pages: z.number().int().min(0, "Total pages must be non-negative"),
});

/**
 * Pagination metadata included in list responses.
 * Used in all paginated list endpoints.
 */
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Generic Zod schema factory for PaginatedResponse.
 * Creates a schema for a paginated response with any item type.
 */
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });

/**
 * Generic paginated response wrapper.
 * Used to wrap any list of items with pagination metadata.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Zod schema for SkiSpecListResponse.
 * Validates paginated ski specification list responses.
 */
export const SkiSpecListResponseSchema = createPaginatedResponseSchema(SkiSpecDTOSchema);

/**
 * Paginated list of ski specifications.
 * Used in: GET /api/ski-specs
 */
export type SkiSpecListResponse = z.infer<typeof SkiSpecListResponseSchema>;

/**
 * Zod schema for NoteListResponse.
 * Validates paginated note list responses.
 */
export const NoteListResponseSchema = createPaginatedResponseSchema(NoteDTOSchema);

/**
 * Paginated list of notes.
 * Used in: GET /api/ski-specs/{specId}/notes
 */
export type NoteListResponse = z.infer<typeof NoteListResponseSchema>;

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Zod schema for ListSkiSpecsQuery.
 * Validates query parameters for listing ski specifications.
 */
export const ListSkiSpecsQuerySchema = z.object({
  page: z.number().int("Page must be an integer").positive("Page must be a positive integer").optional().default(1),
  limit: z
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be a positive integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must not exceed 100")
    .optional()
    .default(20),
  sort_by: z.enum(["name", "length", "surface_area", "relative_weight", "created_at"]).optional().default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
});

/**
 * Query parameters for listing ski specifications.
 * Used in: GET /api/ski-specs
 */
export type ListSkiSpecsQuery = z.infer<typeof ListSkiSpecsQuerySchema>;

/**
 * Zod schema for ListNotesQuery.
 * Validates query parameters for listing notes.
 */
export const ListNotesQuerySchema = z.object({
  page: z.number().int("Page must be an integer").positive("Page must be a positive integer").optional().default(1),
  limit: z
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be a positive integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must not exceed 100")
    .optional()
    .default(50),
});

/**
 * Query parameters for listing notes.
 * Used in: GET /api/ski-specs/{specId}/notes
 */
export type ListNotesQuery = z.infer<typeof ListNotesQuerySchema>;

/**
 * Zod schema for CompareSkiSpecsQuery.
 * Validates query parameters for comparing ski specifications.
 * Ensures ids is a comma-separated string of 2-4 valid UUIDs.
 */
export const CompareSkiSpecsQuerySchema = z
  .object({
    ids: z.string().min(1, "IDs parameter is required"),
  })
  .refine(
    (data) => {
      const idArray = data.ids.split(",").map((id) => id.trim());
      return idArray.length >= 2 && idArray.length <= 4;
    },
    {
      message: "Comparison requires between 2 and 4 specification IDs",
      path: ["ids"],
    }
  )
  .refine(
    (data) => {
      const idArray = data.ids.split(",").map((id) => id.trim());
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return idArray.every((id) => uuidRegex.test(id));
    },
    {
      message: "All IDs must be valid UUIDs",
      path: ["ids"],
    }
  );

/**
 * Query parameters for comparing ski specifications.
 * Used in: GET /api/ski-specs/compare
 */
export type CompareSkiSpecsQuery = z.infer<typeof CompareSkiSpecsQuerySchema>;

/**
 * Zod schema for CompareSkiSpecsResponse.
 * Validates comparison response with array of ski specifications.
 */
export const CompareSkiSpecsResponseSchema = z.object({
  specifications: z
    .array(SkiSpecComparisonDTOSchema)
    .min(2, "Response must contain at least 2 specifications")
    .max(4, "Response must contain at most 4 specifications"),
});

/**
 * Response for ski specification comparison.
 * Used in: GET /api/ski-specs/compare
 */
export type CompareSkiSpecsResponse = z.infer<typeof CompareSkiSpecsResponseSchema>;

// ============================================================================
// Import/Export Types
// ============================================================================

/**
 * Zod schema for ImportSummary.
 * Validates import operation summary counts.
 */
export const ImportSummarySchema = z.object({
  total_rows: z.number().int().min(0, "Total rows must be non-negative"),
  successful: z.number().int().min(0, "Successful count must be non-negative"),
  failed: z.number().int().min(0, "Failed count must be non-negative"),
  skipped: z.number().int().min(0, "Skipped count must be non-negative"),
});

/**
 * Summary of import operation results.
 * Used in: POST /api/ski-specs/import
 */
export type ImportSummary = z.infer<typeof ImportSummarySchema>;

/**
 * Zod schema for ImportedItem.
 * Validates successfully imported item details.
 */
export const ImportedItemSchema = z.object({
  row: z.number().int().positive("Row number must be positive"),
  name: z.string().min(1, "Name is required").max(255),
  id: z.string().uuid("ID must be a valid UUID"),
});

/**
 * Details of a successfully imported ski specification.
 * Used in: POST /api/ski-specs/import
 */
export type ImportedItem = z.infer<typeof ImportedItemSchema>;

/**
 * Zod schema for ImportErrorDetail.
 * Validates field-level import error details.
 */
export const ImportErrorDetailSchema = z.object({
  field: z.string().min(1, "Field name is required"),
  message: z.string().min(1, "Error message is required"),
});

/**
 * Field-level validation error in import.
 * Used in: POST /api/ski-specs/import
 */
export type ImportErrorDetail = z.infer<typeof ImportErrorDetailSchema>;

/**
 * Zod schema for ImportError.
 * Validates failed import row details with error array.
 */
export const ImportErrorSchema = z.object({
  row: z.number().int().positive("Row number must be positive"),
  name: z.string().min(1, "Name is required"),
  errors: z.array(ImportErrorDetailSchema).min(1, "At least one error detail is required"),
});

/**
 * Details of a failed import row.
 * Used in: POST /api/ski-specs/import
 */
export type ImportError = z.infer<typeof ImportErrorSchema>;

/**
 * Zod schema for ImportResponse.
 * Validates complete import operation response.
 */
export const ImportResponseSchema = z.object({
  summary: ImportSummarySchema,
  imported: z.array(ImportedItemSchema),
  errors: z.array(ImportErrorSchema),
});

/**
 * Complete response for import operation.
 * Used in: POST /api/ski-specs/import
 */
export type ImportResponse = z.infer<typeof ImportResponseSchema>;

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Zod schema for ValidationErrorDetail.
 * Validates field-level validation error details.
 */
export const ValidationErrorDetailSchema = z.object({
  field: z.string().min(1, "Field name is required"),
  message: z.string().min(1, "Error message is required"),
});

/**
 * Field-level validation error detail.
 * Used in validation error responses.
 */
export type ValidationErrorDetail = z.infer<typeof ValidationErrorDetailSchema>;

/**
 * Zod schema for ApiErrorResponse.
 * Validates standard API error response format.
 */
export const ApiErrorResponseSchema = z.object({
  error: z.string().min(1, "Error message is required"),
  code: z.string().optional(),
  details: z.array(ValidationErrorDetailSchema).optional(),
  timestamp: z.string().datetime("Timestamp must be a valid ISO datetime").optional(),
});

/**
 * Standard API error response format.
 * Used for all error responses across the API.
 */
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
