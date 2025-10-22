import type { APIRoute } from "astro";
import {
  CreateSkiSpecCommandSchema,
  ListSkiSpecsQuerySchema,
  type ApiErrorResponse,
  type SkiSpecListResponse,
  type PaginationMeta,
} from "@/types/api.types";

export const prerender = false;

/**
 * GET /api/ski-specs
 * Retrieves a paginated, sortable, and searchable list of ski specifications for the authenticated user.
 *
 * Query parameters: page, limit, sort_by, sort_order, search (all optional with defaults)
 * Response: SkiSpecListResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Step 1: Get authenticated user ID from middleware
    const { user, skiSpecService } = locals;

    // Step 2: Extract query parameters from URL
    const rawQuery = {
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      sort_by: url.searchParams.get("sort_by"),
      sort_order: url.searchParams.get("sort_order"),
      search: url.searchParams.get("search"),
    };

    // Step 3: Coerce string parameters to appropriate types
    const parsedQuery = {
      page: rawQuery.page ? parseInt(rawQuery.page, 10) : undefined,
      limit: rawQuery.limit ? parseInt(rawQuery.limit, 10) : undefined,
      sort_by: rawQuery.sort_by || undefined,
      sort_order: rawQuery.sort_order || undefined,
      search: rawQuery.search || undefined,
    };

    // Step 4: Validate query parameters with Zod schema
    const validation = ListSkiSpecsQuerySchema.safeParse(parsedQuery);

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

    // Step 5: Call service layer to retrieve ski specifications
    const { data, total } = await skiSpecService.listSkiSpecs(user?.id ?? "", validatedQuery);

    // Step 6: Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedQuery.limit);
    const pagination: PaginationMeta = {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      total,
      total_pages: totalPages,
    };

    // Step 7: Build and return success response
    const response: SkiSpecListResponse = {
      data,
      pagination,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 8: Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/ski-specs:", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: locals.user?.id ?? "",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred while fetching ski specifications",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * POST /api/ski-specs
 * Creates a new ski specification for the authenticated user.
 *
 * Request body: CreateSkiSpecCommand (validated with Zod)
 * Response: SkiSpecDTO (201) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: Handled by middleware (userId provided in locals)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Get authenticated user ID from middleware
    const { user, skiSpecService } = locals;

    // Step 2: Parse request body
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

    // Step 3: Validate input with Zod schema
    const validationResult = CreateSkiSpecCommandSchema.safeParse(body);

    if (!validationResult.success) {
      const details = validationResult.error.issues.map((err) => ({
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

    const command = validationResult.data;

    // Step 4: Create ski specification via service
    try {
      const skiSpec = await skiSpecService.createSkiSpec(user?.id ?? "", command);

      // Step 5: Return success response
      return new Response(JSON.stringify(skiSpec), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      // Handle database errors
      const dbError = error as { code?: string };
      if (dbError?.code === "23505") {
        // UNIQUE constraint violation
        return new Response(
          JSON.stringify({
            error: "Specification with this name already exists",
            code: "DUPLICATE_NAME",
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }

      // Generic database error
      return new Response(
        JSON.stringify({
          error: "Failed to create specification",
          code: "DATABASE_ERROR",
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
