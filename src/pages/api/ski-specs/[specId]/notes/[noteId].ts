import { getUserIdEffect } from '@/lib/utils/auth';
import { catchAllSkiSpecErrors } from '@/lib/utils/error';
import { parseJsonBody, parseWithSchema } from '@/lib/utils/zod';
import { UpdateNoteCommandSchema } from '@/types/api.types';
import type { APIRoute } from 'astro';
import { Effect, pipe } from 'effect';
import { z } from 'zod';

export const prerender = false;

// ============================================================================
// Local Helpers
// ============================================================================

/**
 * UUID validation schema for path parameters
 */
const UuidParamsSchema = z.object({
  specId: z.string().uuid('Invalid ski specification ID format'),
  noteId: z.string().uuid('Invalid note ID format'),
});

/**
 * Validates UUID path parameters for specId and noteId.
 *
 * @param specId - Ski specification path parameter
 * @param noteId - Note path parameter
 * @returns Effect that succeeds with validated UUIDs or fails with ValidationError
 */
const validateNoteParams = (specId: string | undefined, noteId: string | undefined) =>
  parseWithSchema(UuidParamsSchema, { specId, noteId });

// ============================================================================
// API Route Handlers
// ============================================================================

/**
 * GET /api/ski-specs/{specId}/notes/{noteId}
 * Retrieves a specific note by ID for a given ski specification.
 *
 * Path params:
 * - specId (UUID): Ski specification ID
 * - noteId (UUID): Note ID
 *
 * Response: NoteDTO (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated
 * Authorization: User can only access notes for their own specifications
 *
 * Security: Returns 404 for both non-existent resources and unauthorized access
 * to prevent information disclosure (IDOR prevention).
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Validate UUID path parameters
    Effect.flatMap((userId) =>
      pipe(
        validateNoteParams(params.specId, params.noteId),
        Effect.map((validated) => ({ userId, specId: validated.specId, noteId: validated.noteId }))
      )
    ),

    // Step 3: Fetch note from service layer
    Effect.flatMap(({ userId, specId, noteId }) => skiSpecService.getNoteById(userId, specId, noteId)),

    // Step 4: Build success response
    Effect.map((note) => {
      return new Response(JSON.stringify(note), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),

    // Step 5: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: '/api/ski-specs/:specId/notes/:noteId',
      method: 'GET',
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};

/**
 * PUT /api/ski-specs/{specId}/notes/{noteId}
 * Updates an existing note for a ski specification.
 *
 * Path params:
 *   - specId (UUID): ID of the ski specification
 *   - noteId (UUID): ID of the note to update
 * Request body: UpdateNoteCommand (content: string)
 * Response: NoteDTO (200) or ApiErrorResponse (4xx/5xx)
 *
 * Authentication: User must be authenticated
 * Authorization: User can only update notes from their own specifications
 *
 * Features:
 * - Two-level security verification:
 *   1. Verifies user owns the ski specification
 *   2. Verifies note belongs to the specification
 * - Validates UUID formats before database queries
 * - Validates content (1-2000 characters)
 * - Automatically updates the updated_at timestamp
 * - Returns generic 404 for security (IDOR prevention)
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
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Validate UUID path parameters and parse JSON body in parallel
    Effect.flatMap((userId) =>
      pipe(
        Effect.all([validateNoteParams(params.specId, params.noteId), parseJsonBody(request, UpdateNoteCommandSchema)]),
        Effect.map(([validated, command]) => ({
          userId,
          specId: validated.specId,
          noteId: validated.noteId,
          command,
        }))
      )
    ),

    // Step 3: Update note via service layer
    Effect.flatMap(({ userId, specId, noteId, command }) => skiSpecService.updateNote(userId, specId, noteId, command)),

    // Step 4: Build success response
    Effect.map((updatedNote) => {
      return new Response(JSON.stringify(updatedNote), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),

    // Step 5: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: '/api/ski-specs/:specId/notes/:noteId',
      method: 'PUT',
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};

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
 * Authentication: User must be authenticated
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
  const { user, skiSpecService } = locals;

  const program = pipe(
    // Step 1: Validate user authentication
    getUserIdEffect(user),

    // Step 2: Validate UUID path parameters
    Effect.flatMap((userId) =>
      pipe(
        validateNoteParams(params.specId, params.noteId),
        Effect.map((validated) => ({ userId, specId: validated.specId, noteId: validated.noteId }))
      )
    ),

    // Step 3: Delete note via service layer
    Effect.flatMap(({ userId, specId, noteId }) => skiSpecService.deleteNote(userId, specId, noteId)),

    // Step 4: Build success response (204 No Content)
    Effect.map(() => new Response(null, { status: 204 })),

    // Step 5: Handle all errors consistently with structured logging
    catchAllSkiSpecErrors({
      endpoint: '/api/ski-specs/:specId/notes/:noteId',
      method: 'DELETE',
      userId: user?.id,
    })
  );

  return Effect.runPromise(program);
};
