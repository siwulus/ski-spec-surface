import type { APIRoute } from "astro";
import { z } from "zod";
import { getNoteById, updateNote, deleteNote } from "@/lib/services/ski-spec.service";
import { UpdateNoteCommandSchema } from "@/types";
import type { ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * UUID validation schema for path parameters
 */
const UuidParamsSchema = z.object({
  specId: z.string().uuid("Invalid ski specification ID format"),
  noteId: z.string().uuid("Invalid note ID format"),
});

/**
 * GET /api/ski-specs/{specId}/notes/{noteId}
 * Retrieves a specific note by ID for a given ski specification.
 *
 * Path params:
 * - specId (UUID): Ski specification ID
 * - noteId (UUID): Note ID
 *
 * Response: NoteDTO (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 * Authorization: User can only access notes for their own specifications
 *
 * Security: Returns 404 for both non-existent resources and unauthorized access
 * to prevent information disclosure (IDOR prevention).
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Step 2: Extract and validate authentication
    const { userId } = locals;

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

    // Step 3: Extract and validate path parameters
    const validationResult = UuidParamsSchema.safeParse({
      specId: params.specId,
      noteId: params.noteId,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return new Response(
        JSON.stringify({
          error: firstError?.message || "Invalid UUID format",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { specId, noteId } = validationResult.data;

    // Step 4-6: Call service method and handle errors
    try {
      const { supabase } = locals;
      const note = await getNoteById(supabase, userId, specId, noteId);

      // Step 7: Return success response (200 OK)
      return new Response(JSON.stringify(note), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      const dbError = error as { message?: string };

      // Handle "Note not found" (includes unauthorized access)
      if (dbError?.message?.includes("Note not found")) {
        return new Response(
          JSON.stringify({
            error: "Note not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error("Failed to fetch note:", {
        userId,
        specId,
        noteId,
        error: dbError?.message || "Unknown error",
      });

      // Handle generic database errors
      return new Response(
        JSON.stringify({
          error: "Failed to fetch note",
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

/**
 * PUT /api/ski-specs/{specId}/notes/{noteId}
 * Updates an existing note for a ski specification.
 *
 * Path params:
 *   - specId (UUID): ID of the ski specification
 *   - noteId (UUID): ID of the note to update
 * Request body: UpdateNoteCommand (content: string)
 * Response: NoteDTO (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 * Authorization: User can only update notes from their own specifications
 *
 * Features:
 * - Two-level security verification:
 *   1. Verifies user owns the ski specification
 *   2. Verifies note belongs to the specification
 * - Validates UUID formats before database queries
 * - Validates content (1-2000 characters)
 * - Automatically updates the updated_at timestamp
 * - Returns generic 404 for security (IDOR prevention)
 *
 * Security: Returns 404 for all "not found" scenarios:
 * - Specification doesn't exist
 * - Specification exists but belongs to another user
 * - Note doesn't exist
 * - Note exists but belongs to different specification
 *
 * This prevents information disclosure by not revealing whether resources
 * exist when the user doesn't have access to them.
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
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

    // Step 3: Validate path parameters (UUID formats)
    const validationResult = UuidParamsSchema.safeParse({
      specId: params.specId,
      noteId: params.noteId,
    });

    if (!validationResult.success) {
      // Extract first validation error for cleaner error message
      const firstError = validationResult.error.issues[0];

      return new Response(
        JSON.stringify({
          error: firstError.message,
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { specId, noteId } = validationResult.data;

    // Step 4: Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const bodyValidation = UpdateNoteCommandSchema.safeParse(requestBody);

    if (!bodyValidation.success) {
      // Transform Zod errors to ValidationErrorDetail format
      const details = bodyValidation.error.issues.map((err) => ({
        field: err.path.join(".") || "content",
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

    const updateData = bodyValidation.data;

    // Step 5: Update note via service
    try {
      const updatedNote = await updateNote(supabase, userId, specId, noteId, updateData);

      // Step 6: Return success response (200 OK)
      return new Response(JSON.stringify(updatedNote), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      const dbError = error as { message?: string };

      // Handle "Note not found" (includes spec not found, unauthorized access)
      if (dbError?.message?.includes("Note not found")) {
        return new Response(
          JSON.stringify({
            error: "Note or specification not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error("Failed to update note:", {
        userId,
        specId,
        noteId,
        error: dbError?.message || "Unknown error",
      });

      // Handle generic database errors
      return new Response(
        JSON.stringify({
          error: "An error occurred while updating the note",
          code: "INTERNAL_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    // Catch-all for unexpected errors (e.g., JSON parsing, middleware issues)
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

/**
 * DELETE /api/ski-specs/{specId}/notes/{noteId}
 * Deletes a specific note from a ski specification.
 *
 * Path params:
 *   - specId (UUID): ID of the ski specification
 *   - noteId (UUID): ID of the note to delete
 * Request body: None
 * Response: 204 No Content (success) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 * Authorization: User can only delete notes from their own specifications
 *
 * Features:
 * - Two-level security verification:
 *   1. Verifies user owns the ski specification
 *   2. Verifies note belongs to the specification
 * - Validates UUID formats before database queries
 * - Returns generic 404 for security (IDOR prevention)
 * - Permanent deletion (cannot be undone)
 *
 * Security: Returns 404 for all "not found" scenarios:
 * - Specification doesn't exist
 * - Specification exists but belongs to another user
 * - Note doesn't exist
 * - Note exists but belongs to different specification
 *
 * This prevents information disclosure by not revealing whether resources
 * exist when the user doesn't have access to them.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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

    // Step 3: Validate path parameters (UUID formats)
    const validationResult = UuidParamsSchema.safeParse({
      specId: params.specId,
      noteId: params.noteId,
    });

    if (!validationResult.success) {
      // Extract first validation error for cleaner error message
      const firstError = validationResult.error.issues[0];

      return new Response(
        JSON.stringify({
          error: firstError.message,
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { specId, noteId } = validationResult.data;

    // Step 4: Delete note via service
    try {
      await deleteNote(supabase, userId, specId, noteId);

      // Step 5: Return 204 No Content on successful deletion
      return new Response(null, { status: 204 });
    } catch (error: unknown) {
      const dbError = error as { message?: string };

      // Handle "Note not found" (includes spec not found, unauthorized access)
      if (dbError?.message?.includes("Note not found")) {
        return new Response(
          JSON.stringify({
            error: "Note not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error("Failed to delete note:", {
        userId,
        specId,
        noteId,
        error: dbError?.message || "Unknown error",
      });

      // Handle generic database errors
      return new Response(
        JSON.stringify({
          error: "Failed to delete note",
          code: "INTERNAL_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    // Catch-all for unexpected errors (e.g., JSON parsing, middleware issues)
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
