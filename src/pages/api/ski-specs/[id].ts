import type { APIRoute } from "astro";
import { z } from "zod";
import { deleteSkiSpec, getSkiSpec, updateSkiSpec } from "@/lib/services/ski-spec.service";
import { UpdateSkiSpecCommandSchema, type ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * UUID validation schema for path parameter
 */
const UuidParamSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

/**
 * GET /api/ski-specs/{id}
 * Retrieves a specific ski specification by ID with notes count.
 *
 * Path params: id (UUID)
 * Response: SkiSpecDTO (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 * Authorization: User can only retrieve their own specifications
 *
 * Security: Returns 404 for both non-existent specs and specs owned by other users
 * to prevent information disclosure (IDOR prevention).
 */
export const GET: APIRoute = async ({ params, locals }) => {
  // Step 1: Validate path parameter (UUID format)
  const validationResult = UuidParamSchema.safeParse({ id: params.id });

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid specification ID format",
        code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Step 2: Check authentication
  const { userId, supabase } = locals;

  if (!userId) {
    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "UNAUTHORIZED",
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Step 3: Retrieve ski specification
  try {
    const specId = validationResult.data.id;
    const skiSpec = await getSkiSpec(supabase, userId, specId);

    // Step 4: Handle not found
    if (!skiSpec) {
      return new Response(
        JSON.stringify({
          error: "Ski specification not found",
          code: "NOT_FOUND",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return successful response
    return new Response(JSON.stringify(skiSpec), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 6: Handle unexpected errors
    // Log error details server-side for debugging
    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error("Failed to retrieve ski specification:", {
        userId,
        specId: validationResult.data.id,
        error: error.message,
      });
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * PUT /api/ski-specs/{id}
 * Updates an existing ski specification for the authenticated user.
 *
 * Path params: id (UUID)
 * Request body: UpdateSkiSpecCommand (validated with Zod)
 * Response: SkiSpecDTO (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 * Authorization: User can only update their own specifications
 *
 * Features:
 * - Recalculates surface_area and relative_weight based on new dimensions
 * - Validates name uniqueness within user's specifications (excluding current)
 * - Returns updated specification with notes_count
 *
 * Security: Returns 404 for both non-existent specs and specs owned by other users
 * to prevent information disclosure (IDOR prevention).
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Get authenticated user ID and Supabase client from middleware
    const { supabase, userId } = locals;

    // Step 2: Validate path parameter (UUID format)
    const validationResult = UuidParamSchema.safeParse({ id: params.id });

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

    const { id } = validationResult.data;

    // Step 3: Parse request body
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

    // Step 4: Validate request body against schema
    const commandValidation = UpdateSkiSpecCommandSchema.safeParse(body);

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

    // Step 5: Update ski specification via service
    try {
      const updatedSpec = await updateSkiSpec(supabase, userId, id, commandValidation.data);

      // Step 6: Return success response
      return new Response(JSON.stringify(updatedSpec), {
        status: 200,
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

      // Handle "Name already exists" conflict
      if (dbError?.message?.includes("Name already exists")) {
        return new Response(
          JSON.stringify({
            error: "A specification with this name already exists",
            code: "CONFLICT",
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }

      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error("Failed to update ski specification:", {
        userId,
        specId: id,
        error: dbError?.message || "Unknown error",
      });

      // Handle generic database errors
      return new Response(
        JSON.stringify({
          error: "Failed to update specification",
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
 * DELETE /api/ski-specs/{id}
 * Deletes a ski specification and all associated notes (cascade).
 *
 * Path params: id (UUID)
 * Response: 204 No Content or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 * Authorization: User can only delete their own specifications
 *
 * Security: Returns 404 for both non-existent specs and specs owned by other users
 * to prevent information disclosure (IDOR prevention).
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Get authenticated user ID and Supabase client from middleware
    const { supabase, userId } = locals;

    // Step 2: Extract and validate path parameter
    const validationResult = UuidParamSchema.safeParse({ id: params.id });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid UUID format",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { id } = validationResult.data;

    // Step 3: Delete via service (includes ownership verification)
    try {
      await deleteSkiSpec(supabase, userId, id);

      // Step 4: Return success response (204 No Content)
      return new Response(null, { status: 204 });
    } catch (error: unknown) {
      const dbError = error as { message?: string };

      // Handle "not found" case (includes unauthorized access)
      if (dbError?.message?.includes("not found")) {
        return new Response(
          JSON.stringify({
            error: "Ski specification not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Handle generic database errors
      return new Response(
        JSON.stringify({
          error: "Failed to delete specification",
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
