import type { APIRoute } from "astro";
import { z } from "zod";
import { deleteNote } from "@/lib/services/ski-spec.service";
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
