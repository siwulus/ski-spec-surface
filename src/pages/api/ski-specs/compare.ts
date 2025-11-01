import { getUserIdEffect } from '@/lib/utils/auth';
import { catchAllSkiSpecErrors } from '@/lib/utils/error';
import { parseQueryParams, type QueryCoercer } from '@/lib/utils/zod';
import { CompareSkiSpecsQuerySchema, type CompareSkiSpecsResponse } from '@/types/api.types';
import type { APIRoute } from 'astro';
import { Effect, pipe } from 'effect';

export const prerender = false;

// ============================================================================
// Local Helpers
// ============================================================================

/**
 * Coercion function for compare query parameters.
 * No coercion needed as 'ids' is already a string, but included for consistency.
 */
const coerceCompareQuery: QueryCoercer = (params) => {
  return {
    ids: params.get('ids') || undefined,
  };
};

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * GET /api/ski-specs/compare
 * Compares 2-4 ski specifications for the authenticated user.
 *
 * Query parameters:
 *  - ids (required): Comma-separated list of 2-4 specification UUIDs
 *
 * Response: CompareSkiSpecsResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated
 * Security: Verifies ownership of all specifications (IDOR prevention)
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Parse and validate query parameters
    Effect.flatMap((userId) =>
      pipe(
        parseQueryParams(url.searchParams, CompareSkiSpecsQuerySchema, coerceCompareQuery),
        Effect.map((query) => ({ userId, query }))
      )
    ),

    // Step 3: Split comma-separated IDs into array
    Effect.map(({ userId, query }) => {
      const specIds = query.ids.split(',').map((id) => id.trim());
      return { userId, specIds };
    }),

    // Step 4: Fetch and compare specifications from service layer
    Effect.flatMap(({ userId, specIds }) => skiSpecService.compareSkiSpecs(userId, specIds)),

    // Step 5: Build success response
    Effect.map((specifications) => {
      const response: CompareSkiSpecsResponse = {
        specifications,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),

    // Step 6: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: '/api/ski-specs/compare',
      method: 'GET',
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};
