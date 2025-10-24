import type { APIRoute } from "astro";
import { Effect, pipe } from "effect";
import { z } from "zod";
import { UpdateSkiSpecCommandSchema } from "@/types/api.types";
import { parseWithSchema, parseJsonBody } from "@/lib/utils/zod";
import { catchAllSkiSpecErrors } from "@/lib/utils/error";
import { AuthenticationError } from "@/types/error.types";

export const prerender = false;

// ============================================================================
// Local Helpers
// ============================================================================

/**
 * UUID validation schema for path parameter
 */
const UuidParamSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

/**
 * Validates and extracts user ID from locals.
 * Transitional helper - will be refactored to use Effect.Option later.
 *
 * @param user - User object from middleware (can be nullish)
 * @returns Effect that succeeds with user ID or fails with AuthenticationError
 */
const getUserIdEffect = (user: { id: string } | null | undefined): Effect.Effect<string, AuthenticationError> =>
  user?.id ? Effect.succeed(user.id) : Effect.fail(new AuthenticationError("User not authenticated"));

/**
 * Validates UUID path parameter.
 *
 * @param id - Path parameter to validate
 * @returns Effect that succeeds with validated UUID or fails with ValidationError
 */
const validateUuidParam = (id: string | undefined) =>
  parseWithSchema(UuidParamSchema, { id }).pipe(Effect.map((validated) => validated.id));

// ============================================================================
// API Route Handlers
// ============================================================================

/**
 * GET /api/ski-specs/{id}
 * Retrieves a specific ski specification by ID with notes count.
 *
 * Path params: id (UUID)
 * Response: SkiSpecDTO (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated (validated via getUserIdEffect)
 * Authorization: User can only retrieve their own specifications
 *
 * Security: Returns 404 for both non-existent specs and specs owned by other users
 * to prevent information disclosure (IDOR prevention).
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Validate UUID path parameter
    Effect.flatMap((userId) =>
      pipe(
        validateUuidParam(params.id),
        Effect.map((specId) => ({ userId, specId }))
      )
    ),

    // Step 3: Fetch ski specification from service layer
    Effect.flatMap(({ userId, specId }) => skiSpecService.getSkiSpec(userId, specId)),

    // Step 4: Build success response
    Effect.map((skiSpec) => {
      return new Response(JSON.stringify(skiSpec), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),

    // Step 6: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: "/api/ski-specs/:id",
      method: "GET",
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};

/**
 * PUT /api/ski-specs/{id}
 * Updates an existing ski specification for the authenticated user.
 *
 * Path params: id (UUID)
 * Request body: UpdateSkiSpecCommand (validated with Zod)
 * Response: SkiSpecDTO (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated (validated via getUserIdEffect)
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
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Validate UUID path parameter and parse JSON body in parallel
    Effect.flatMap((userId) =>
      pipe(
        Effect.all([validateUuidParam(params.id), parseJsonBody(request, UpdateSkiSpecCommandSchema)]),
        Effect.map(([specId, command]) => ({ userId, specId, command }))
      )
    ),

    // Step 3: Update ski specification via service layer
    Effect.flatMap(({ userId, specId, command }) => skiSpecService.updateSkiSpec(userId, specId, command)),

    // Step 4: Build success response
    Effect.map((updatedSpec) => {
      return new Response(JSON.stringify(updatedSpec), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),

    // Step 5: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: "/api/ski-specs/:id",
      method: "PUT",
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};

/**
 * DELETE /api/ski-specs/{id}
 * Deletes a ski specification and all associated notes (cascade).
 *
 * Path params: id (UUID)
 * Response: 204 No Content or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated (validated via getUserIdEffect)
 * Authorization: User can only delete their own specifications
 *
 * Security: Returns 404 for both non-existent specs and specs owned by other users
 * to prevent information disclosure (IDOR prevention).
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Validate UUID path parameter
    Effect.flatMap((userId) =>
      pipe(
        validateUuidParam(params.id),
        Effect.map((specId) => ({ userId, specId }))
      )
    ),

    // Step 3: Delete ski specification via service layer
    Effect.flatMap(({ userId, specId }) => skiSpecService.deleteSkiSpec(userId, specId)),

    // Step 4: Build success response (204 No Content)
    Effect.map(() => new Response(null, { status: 204 })),

    // Step 5: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: "/api/ski-specs/:id",
      method: "DELETE",
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};
