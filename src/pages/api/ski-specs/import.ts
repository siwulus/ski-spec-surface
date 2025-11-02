/**
 * API Route: Import Ski Specifications from CSV
 *
 * Endpoint: POST /api/ski-specs/import
 *
 * This endpoint imports ski specifications from a CSV file upload.
 * It implements partial success pattern - valid rows are imported even if some fail.
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Body field: file (CSV file)
 *
 * Response:
 * - 200: ImportResponse JSON with summary and details
 * - 400: Invalid file or missing file
 * - 401: Not authenticated
 * - 413: File too large (>10MB)
 * - 415: Invalid file type (not CSV)
 *
 * CSV Format Requirements (per PRD 3.5):
 * - Encoding: UTF-8
 * - Headers: name,length_cm,tip_mm,waist_mm,tail_mm,radius_m,weight_g (required)
 * - Optional headers: description
 * - Field separator: comma (,) or semicolon (;)
 * - Decimal separator: dot (.) or comma (,) - will be normalized
 * - Max file size: 10MB
 */

import type { APIRoute } from 'astro';
import { Effect, pipe } from 'effect';
import { getUserIdEffect } from '@/lib/utils/auth';
import { parseMultipartFile, readFileContent, validateFileType, ALLOWED_CSV_TYPES } from '@/lib/utils/file';
import { catchAllSkiSpecErrors } from '@/lib/utils/error';

/**
 * POST handler for CSV import endpoint.
 *
 * Flow:
 * 1. Validate authentication
 * 2. Extract file from multipart/form-data
 * 3. Validate file type (must be CSV)
 * 4. Read file content (max 10MB)
 * 5. Import CSV using SkiSpecImportExportService
 * 6. Return JSON response with import summary
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const program = pipe(
    // Step 1: Validate authentication
    getUserIdEffect(locals.user),

    // Step 2: Extract file from FormData
    Effect.flatMap((userId) =>
      pipe(
        parseMultipartFile(request, 'file'),
        Effect.map((file) => ({ userId, file }))
      )
    ),

    // Step 3: Validate file type
    Effect.flatMap(({ userId, file }) =>
      pipe(
        validateFileType(file, ALLOWED_CSV_TYPES),
        Effect.map(() => ({ userId, file }))
      )
    ),

    // Step 4: Read file content (max 10MB)
    Effect.flatMap(({ userId, file }) =>
      pipe(
        readFileContent(file, 10), // 10MB maximum
        Effect.map((content) => ({ userId, content }))
      )
    ),

    // Step 5: Import CSV
    Effect.flatMap(({ userId, content }) => locals.skiSpecImportExportService.importFromCsv(userId, content)),

    // Step 6: Build JSON response
    Effect.map(
      (result) =>
        new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        })
    ),

    // Step 7: Error handling
    catchAllSkiSpecErrors({
      endpoint: '/api/ski-specs/import',
      method: 'POST',
      userId: locals.user?.id,
    })
  );

  return Effect.runPromise(program);
};
