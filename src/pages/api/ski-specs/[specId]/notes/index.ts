import type { APIRoute } from "astro";
import { z } from "zod";
import { createNote } from "@/lib/services/ski-spec.service";
import { listNotes } from "@/lib/services/ski-spec-note.service";
import {
  CreateNoteCommandSchema,
  ListNotesQuerySchema,
  type ApiErrorResponse,
  type NoteListResponse,
  type PaginationMeta,
} from "@/types";

export const prerender = false;

/**
 * UUID validation schema for path parameter
 */
const UuidParamSchema = z.object({
  specId: z.string().uuid("Invalid UUID format"),
});

/**
 * GET /api/ski-specs/{specId}/notes
 * Retrieves a paginated list of notes for a specific ski specification.
 *
 * Path parameters: specId (UUID)
 * Query parameters: page, limit (optional with defaults)
 * Response: NoteListResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 * Authorization: User can only view notes for their own specifications
 *
 * Features:
 * - Paginated response (default 50 notes per page, max 100)
 * - Sorted by creation date (newest first)
 * - Returns empty array if no notes exist
 *
 * Security: Returns 404 for both non-existent specs and specs owned by other users
 * to prevent information disclosure (IDOR prevention).
 */
export const GET: APIRoute = async ({ params, url, locals }) => {
  try {
    // Step 1: Get authenticated user ID and Supabase client from middleware
    const { supabase, userId } = locals;

    // Step 2: Extract specId from path parameters
    const { specId } = params;

    if (!specId) {
      return new Response(
        JSON.stringify({
          error: "Ski specification ID is required",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 3: Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(specId)) {
      return new Response(
        JSON.stringify({
          error: "Invalid ski specification ID format",
          code: "VALIDATION_ERROR",
          details: [{ field: "specId", message: "Must be a valid UUID" }],
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 4: Extract query parameters from URL
    const rawQuery = {
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
    };

    // Step 5: Coerce string parameters to appropriate types
    const parsedQuery = {
      page: rawQuery.page ? parseInt(rawQuery.page, 10) : undefined,
      limit: rawQuery.limit ? parseInt(rawQuery.limit, 10) : undefined,
    };

    // Step 6: Validate query parameters with Zod schema
    const validation = ListNotesQuerySchema.safeParse(parsedQuery);

    if (!validation.success) {
      const details = validation.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          details,
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validatedQuery = validation.data;

    // Step 7: Call service layer to retrieve notes
    const result = await listNotes(supabase, userId, specId, validatedQuery);

    // Step 8: Handle not found or unauthorized
    if (result === null) {
      return new Response(
        JSON.stringify({
          error: "Ski specification not found",
          code: "NOT_FOUND",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, total } = result;

    // Step 9: Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedQuery.limit);
    const pagination: PaginationMeta = {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      total,
      total_pages: totalPages,
    };

    // Step 10: Build and return success response
    const response: NoteListResponse = {
      data,
      pagination,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 11: Handle unexpected errors
    console.error("Error in GET /api/ski-specs/{specId}/notes:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: locals.userId,
      specId: params.specId,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred while fetching notes",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

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
          error: "Authentication required",
          code: "UNAUTHORIZED",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 3: Validate path parameter (UUID format)
    const validationResult = UuidParamSchema.safeParse({ specId: params.specId });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid specification ID format",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
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
          error: "Invalid request body",
          code: "INVALID_JSON",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 5: Validate request body against schema
    const commandValidation = CreateNoteCommandSchema.safeParse(body);

    if (!commandValidation.success) {
      const details = commandValidation.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details,
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 6: Create note via service
    try {
      const createdNote = await createNote(supabase, userId, specId, commandValidation.data);

      // Step 7: Return success response (201 Created)
      return new Response(JSON.stringify(createdNote), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      const dbError = error as { message?: string };

      // Handle "Specification not found" (includes unauthorized access)
      if (dbError?.message?.includes("Specification not found")) {
        return new Response(
          JSON.stringify({
            error: "Ski specification not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error("Failed to create note:", {
        userId,
        specId,
        error: dbError?.message || "Unknown error",
      });

      // Handle generic database errors
      return new Response(
        JSON.stringify({
          error: "Failed to create note",
          code: "INTERNAL_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    // Catch-all for unexpected errors
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
