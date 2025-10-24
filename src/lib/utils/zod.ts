/**
 * Effect-based Zod Validation Utilities
 *
 * This module provides Effect wrappers for Zod schema validation, enabling
 * composable, type-safe validation that integrates with the application's
 * Effect-based error handling system.
 *
 * Architecture:
 * - Layer 1: Internal utilities for error transformation
 * - Layer 2: Core validation functions (parseWithSchema)
 * - Layer 3: Specialized parsers (parseJsonBody, parseQueryParams)
 *
 * Benefits:
 * - Eliminates boilerplate error transformation code
 * - Enables composable validation with Effect's pipe
 * - Consistent error handling across all API routes
 * - Type-safe validation pipeline
 */

import { Effect, pipe } from "effect";
import type { z } from "zod";
import { ValidationError, InvalidJsonError } from "@/types/error.types";
import type { ValidationErrorDetail } from "@/types/api.types";

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * Converts ZodError issues to ValidationErrorDetail array.
 * Joins path segments with dots for nested field errors.
 *
 * @param issues - ZodError issues array from Zod validation
 * @returns Array of ValidationErrorDetail with field paths as strings
 *
 * @example
 * ```typescript
 * // ZodError with nested field error
 * issues: [{ path: ["address", "city"], message: "City is required" }]
 * // Becomes
 * [{ field: "address.city", message: "City is required" }]
 * ```
 */
const zodIssuesToDetails = (issues: z.core.$ZodIssue[]): ValidationErrorDetail[] => {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
  }));
};

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Parses data with a Zod schema and returns an Effect.
 * This is the core validation utility that all other parsers build upon.
 *
 * @param schema - Zod schema to validate against
 * @param data - Unknown data to validate
 * @returns Effect that succeeds with validated data or fails with ValidationError
 *
 * @example
 * ```typescript
 * // Basic usage
 * const program = pipe(
 *   parseWithSchema(CreateSkiSpecCommandSchema, requestBody),
 *   Effect.flatMap((command) => service.createSkiSpec(userId, command)),
 *   Effect.map((spec) => new Response(JSON.stringify(spec), { status: 201 })),
 *   catchAllSkiSpecErrors({ endpoint: "/api/ski-specs", method: "POST" })
 * );
 * ```
 */
export const parseWithSchema = <T>(schema: z.ZodSchema<T>, data: unknown): Effect.Effect<T, ValidationError> => {
  const result = schema.safeParse(data);

  if (result.success) {
    return Effect.succeed(result.data);
  }

  const details = zodIssuesToDetails(result.error.issues);
  const error = new ValidationError(
    result.error.issues.length === 1
      ? result.error.issues.map((issue) => issue.message).join(", ")
      : "Validation failed",
    details
  );

  return Effect.fail(error);
};

// ============================================================================
// Specialized Parsing Functions
// ============================================================================

/**
 * Parses JSON request body with Zod validation.
 * Handles both JSON parsing errors and validation errors.
 *
 * @param request - Request object containing JSON body
 * @param schema - Zod schema to validate against
 * @returns Effect that succeeds with validated data or fails with InvalidJsonError | ValidationError
 *
 * Error handling:
 * - InvalidJsonError: If request.json() fails (malformed JSON)
 * - ValidationError: If Zod validation fails (invalid data structure/values)
 *
 * @example
 * ```typescript
 * export const POST: APIRoute = async ({ request, locals }) => {
 *   const program = pipe(
 *     parseJsonBody(request, CreateSkiSpecCommandSchema),
 *     Effect.flatMap((command) =>
 *       locals.skiSpecService.createSkiSpec(locals.user?.id ?? "", command)
 *     ),
 *     Effect.map((spec) =>
 *       new Response(JSON.stringify(spec), {
 *         status: 201,
 *         headers: { "Content-Type": "application/json" },
 *       })
 *     ),
 *     catchAllSkiSpecErrors({ endpoint: "/api/ski-specs", method: "POST" })
 *   );
 *
 *   return Effect.runPromise(program);
 * };
 * ```
 */
export const parseJsonBody = <T>(
  request: Request,
  schema: z.ZodSchema<T>
): Effect.Effect<T, InvalidJsonError | ValidationError> => {
  return pipe(
    Effect.tryPromise({
      try: () => request.json() as Promise<unknown>,
      catch: (error) =>
        new InvalidJsonError("Invalid request body", {
          cause: error instanceof Error ? error : undefined,
        }),
    }),
    Effect.flatMap((body) => parseWithSchema(schema, body))
  );
};

/**
 * Type for query parameter coercion function.
 * Converts string-based query params to appropriate types (numbers, booleans, etc.).
 *
 * @param params - URLSearchParams from request URL
 * @returns Object with coerced values ready for Zod validation
 */
export type QueryCoercer = (params: URLSearchParams) => Record<string, unknown>;

/**
 * Parses URL query parameters with Zod validation.
 * Supports optional coercion function for type conversion (string -> number, etc.).
 *
 * @param searchParams - URLSearchParams from request URL
 * @param schema - Zod schema to validate against
 * @param coerce - Optional function to coerce string params to appropriate types
 * @returns Effect that succeeds with validated data or fails with ValidationError
 *
 * Query Parameter Coercion:
 * By default, all query parameters are strings. Use the `coerce` function to convert
 * them to appropriate types before Zod validation (e.g., "42" -> 42).
 *
 * @example
 * ```typescript
 * // Define coercion function for list query
 * const coerceListQuery = (params: URLSearchParams) => ({
 *   page: params.get("page") ? parseInt(params.get("page")!, 10) : undefined,
 *   limit: params.get("limit") ? parseInt(params.get("limit")!, 10) : undefined,
 *   sort_by: params.get("sort_by") || undefined,
 *   sort_order: params.get("sort_order") || undefined,
 *   search: params.get("search") || undefined,
 * });
 *
 * // Use in API route
 * export const GET: APIRoute = async ({ url, locals }) => {
 *   const program = pipe(
 *     parseQueryParams(url.searchParams, ListSkiSpecsQuerySchema, coerceListQuery),
 *     Effect.flatMap((query) =>
 *       locals.skiSpecService.listSkiSpecs(locals.user?.id ?? "", query)
 *     ),
 *     Effect.map(({ data, total }) => {
 *       const totalPages = Math.ceil(total / query.limit);
 *       const response: SkiSpecListResponse = {
 *         data,
 *         pagination: { page: query.page, limit: query.limit, total, total_pages: totalPages },
 *       };
 *       return new Response(JSON.stringify(response), {
 *         status: 200,
 *         headers: { "Content-Type": "application/json" },
 *       });
 *     }),
 *     catchAllSkiSpecErrors({ endpoint: "/api/ski-specs", method: "GET" })
 *   );
 *
 *   return Effect.runPromise(program);
 * };
 * ```
 */
export const parseQueryParams = <T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
  coerce?: QueryCoercer
): Effect.Effect<T, ValidationError> => {
  const rawData = coerce ? coerce(searchParams) : Object.fromEntries(searchParams.entries());

  return parseWithSchema(schema, rawData);
};
