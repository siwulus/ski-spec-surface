/**
 * API Route: Export Ski Specifications to CSV
 *
 * Endpoint: GET /api/ski-specs/export
 *
 * This endpoint exports the authenticated user's ski specifications to CSV format.
 * It supports filtering by search text and sorting by various fields.
 *
 * Query Parameters:
 * - search?: string - Filter by name or description
 * - sort_by?: string - Field to sort by (default: created_at)
 * - sort_order?: 'asc' | 'desc' - Sort direction (default: desc)
 *
 * Response:
 * - 200: CSV file with Content-Disposition header for download
 * - 400: Invalid query parameters
 * - 401: Not authenticated
 *
 * CSV Format (per PRD 3.5):
 * - Encoding: UTF-8 with BOM
 * - Headers: name,description,length_cm,tip_mm,waist_mm,tail_mm,radius_m,weight_g,surface_area_cm2,relative_weight_g_cm2
 * - Decimal separator: dot (.)
 * - Field separator: comma (,)
 * - Filename: ski-specs-YYYY-MM-DD.csv
 */

import type { APIRoute } from 'astro';
import { Effect, pipe } from 'effect';
import { getUserIdEffect } from '@/lib/utils/auth';
import { parseQueryParams } from '@/lib/utils/zod';
import { catchAllSkiSpecErrors } from '@/lib/utils/error';
import { ExportSkiSpecsQuerySchema } from '@/types/api.types';

/**
 * Coercer function for export query parameters.
 * Converts URLSearchParams to typed object for Zod validation.
 */
const coerceExportQuery = (params: URLSearchParams) => ({
  search: params.get('search') || undefined,
  sort_by: params.get('sort_by') || undefined,
  sort_order: params.get('sort_order') || undefined,
});

/**
 * GET handler for CSV export endpoint.
 *
 * Flow:
 * 1. Validate authentication
 * 2. Parse and validate query parameters
 * 3. Generate CSV using SkiSpecImportExportService
 * 4. Return Response with CSV content and download headers
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const program = pipe(
    // Step 1: Validate authentication
    getUserIdEffect(locals.user),

    // Step 2: Parse query parameters
    Effect.flatMap((userId) =>
      pipe(
        parseQueryParams(url.searchParams, ExportSkiSpecsQuerySchema, coerceExportQuery),
        Effect.map((query) => ({ userId, query }))
      )
    ),

    // Step 3: Generate CSV
    Effect.flatMap(({ userId, query }) => locals.skiSpecImportExportService.exportToCsv(userId, query)),

    // Step 4: Build response with CSV headers
    Effect.map(
      ({ content, filename }) =>
        new Response(content, {
          status: 200,
          headers: {
            // Content type with charset
            'Content-Type': 'text/csv; charset=utf-8',
            // Trigger browser download with filename
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
    ),

    // Step 5: Error handling
    catchAllSkiSpecErrors({
      endpoint: '/api/ski-specs/export',
      method: 'GET',
      userId: locals.user?.id,
    })
  );

  return Effect.runPromise(program);
};
