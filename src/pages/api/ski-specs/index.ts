import type { APIRoute } from "astro";
import { Effect, pipe } from "effect";
import {
  CreateSkiSpecCommandSchema,
  ListSkiSpecsQuerySchema,
  type SkiSpecListResponse,
  type PaginationMeta,
} from "@/types/api.types";
import { parseQueryParams, parseJsonBody, type QueryCoercer } from "@/lib/utils/zod";
import { catchAllSkiSpecErrors } from "@/lib/utils/error";
import { AuthenticationError, ConflictError, DatabaseError } from "@/types/error.types";

export const prerender = false;

// ============================================================================
// Local Helpers
// ============================================================================

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
 * Coercion function for list query parameters.
 * Converts string query params to appropriate types for Zod validation.
 */
const coerceListQuery: QueryCoercer = (params) => {
  const page = params.get("page");
  const limit = params.get("limit");

  return {
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    sort_by: params.get("sort_by") || undefined,
    sort_order: params.get("sort_order") || undefined,
    search: params.get("search") || undefined,
  };
};

// ============================================================================
// API Route Handlers
// ============================================================================

/**
 * GET /api/ski-specs
 * Retrieves a paginated, sortable, and searchable list of ski specifications for the authenticated user.
 *
 * Query parameters: page, limit, sort_by, sort_order, search (all optional with defaults)
 * Response: SkiSpecListResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated (validated via getUserIdEffect)
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),
    // Step 2: Parse and validate query parameters
    Effect.flatMap((userId) =>
      pipe(
        parseQueryParams(url.searchParams, ListSkiSpecsQuerySchema, coerceListQuery),
        Effect.map((query) => ({ userId, query }))
      )
    ),

    // Step 3: Fetch ski specifications from service layer
    Effect.flatMap(({ userId, query }) =>
      pipe(
        Effect.tryPromise({
          try: () => skiSpecService.listSkiSpecs(userId, query),
          catch: (error) =>
            new DatabaseError("Failed to fetch ski specifications", {
              cause: error instanceof Error ? error : undefined,
              operation: "listSkiSpecs",
              table: "ski_specs",
            }),
        }),
        Effect.map((result) => ({ ...result, query }))
      )
    ),

    // Step 4: Build success response with pagination metadata
    Effect.map(({ data, total, query }) => {
      const totalPages = Math.ceil(total / query.limit);
      const pagination: PaginationMeta = {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: totalPages,
      };

      const response: SkiSpecListResponse = {
        data,
        pagination,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),

    // Step 5: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: "/api/ski-specs",
      method: "GET",
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};

/**
 * POST /api/ski-specs
 * Creates a new ski specification for the authenticated user.
 *
 * Request body: CreateSkiSpecCommand (validated with Zod)
 * Response: SkiSpecDTO (201) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated (validated via getUserIdEffect)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Parse and validate JSON request body
    Effect.flatMap((userId) =>
      pipe(
        parseJsonBody(request, CreateSkiSpecCommandSchema),
        Effect.map((command) => ({ userId, command }))
      )
    ),

    // Step 3: Create ski specification via service layer
    Effect.flatMap(({ userId, command }) =>
      Effect.tryPromise({
        try: () => skiSpecService.createSkiSpec(userId, command),
        catch: (error: unknown) => {
          // Transform specific database errors to appropriate SkiSpecError types
          const dbError = error as { code?: string };

          // UNIQUE constraint violation (duplicate name)
          if (dbError?.code === "23505") {
            return new ConflictError("Specification with this name already exists", {
              code: "DUPLICATE_NAME",
              conflictingField: "name",
              resourceType: "ski_spec",
            });
          }

          // Generic database error
          return new DatabaseError("Failed to create specification", {
            cause: error instanceof Error ? error : undefined,
            operation: "createSkiSpec",
            table: "ski_specs",
          });
        },
      })
    ),

    // Step 4: Build success response
    Effect.map((skiSpec) => {
      return new Response(JSON.stringify(skiSpec), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }),

    // Step 5: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: "/api/ski-specs",
      method: "POST",
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};
