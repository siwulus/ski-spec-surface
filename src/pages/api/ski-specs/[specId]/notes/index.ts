import type { APIRoute } from "astro";
import { Effect, pipe } from "effect";
import { z } from "zod";
import {
  CreateNoteCommandSchema,
  ListNotesQuerySchema,
  type NoteListResponse,
  type PaginationMeta,
} from "@/types/api.types";
import { parseWithSchema, parseJsonBody, parseQueryParams, type QueryCoercer } from "@/lib/utils/zod";
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
  specId: z.string().uuid("Invalid UUID format"),
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
 * @param specId - Path parameter to validate
 * @returns Effect that succeeds with validated UUID or fails with ValidationError
 */
const validateSpecIdParam = (specId: string | undefined) =>
  parseWithSchema(UuidParamSchema, { specId }).pipe(Effect.map((validated) => validated.specId));

/**
 * Coercion function for list notes query parameters.
 * Converts string query params to appropriate types for Zod validation.
 */
const coerceListNotesQuery: QueryCoercer = (params) => {
  const page = params.get("page");
  const limit = params.get("limit");

  return {
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  };
};

// ============================================================================
// API Route Handlers
// ============================================================================

/**
 * GET /api/ski-specs/{specId}/notes
 * Retrieves a paginated list of notes for a specific ski specification.
 *
 * Path parameters: specId (UUID)
 * Query parameters: page, limit (optional with defaults)
 * Response: NoteListResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated (validated via getUserIdEffect)
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
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Validate UUID path parameter and parse query params
    Effect.flatMap((userId) =>
      pipe(
        Effect.all([
          validateSpecIdParam(params.specId),
          parseQueryParams(url.searchParams, ListNotesQuerySchema, coerceListNotesQuery),
        ]),
        Effect.map(([specId, query]) => ({ userId, specId, query }))
      )
    ),

    // Step 3: Fetch notes from service layer
    Effect.flatMap(({ userId, specId, query }) =>
      pipe(
        skiSpecService.listNotes(userId, specId, query),
        Effect.map((result) => ({ data: result.data, total: result.total, query }))
      )
    ),

    // Step 5: Build success response with pagination metadata
    Effect.map(({ data, total, query }) => {
      const totalPages = Math.ceil(total / query.limit);
      const pagination: PaginationMeta = {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: totalPages,
      };

      const response: NoteListResponse = {
        data,
        pagination,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),

    // Step 6: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: "/api/ski-specs/:specId/notes",
      method: "GET",
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};

/**
 * POST /api/ski-specs/{specId}/notes
 * Creates a new note for a ski specification.
 *
 * Path params: specId (UUID)
 * Request body: CreateNoteCommand (validated with Zod)
 * Response: NoteDTO (201) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated (validated via getUserIdEffect)
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
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Validate UUID path parameter and parse JSON body
    Effect.flatMap((userId) =>
      pipe(
        Effect.all([validateSpecIdParam(params.specId), parseJsonBody(request, CreateNoteCommandSchema)]),
        Effect.map(([specId, command]) => ({ userId, specId, command }))
      )
    ),

    // Step 3: Create note via service layer
    Effect.flatMap(({ userId, specId, command }) => skiSpecService.createNote(userId, specId, command)),

    // Step 4: Build success response (201 Created)
    Effect.map((createdNote) => {
      return new Response(JSON.stringify(createdNote), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }),

    // Step 5: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: "/api/ski-specs/:specId/notes",
      method: "POST",
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};
