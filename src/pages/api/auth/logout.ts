import { Effect, pipe } from 'effect';
import { type LogoutResponse } from '@/types/api.types';
import { AuthOperationError, SkiSpecError, wrapError } from '@/types/error.types';
import { catchAllSkiSpecErrors } from '@/lib/utils/error';
import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';

export const prerender = false;

/**
 * POST /api/auth/logout
 * Logs out the current user using EffectJS functional programming style.
 *
 * Request body: None
 * Response: LogoutResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Features:
 * - Railway-oriented programming with Effect pipe pattern
 * - Type-safe error handling with discriminated unions
 * - Pure functional composition (no try-catch, no if statements)
 * - Consistent error handling via reusable utilities
 * - Comprehensive error logging with context
 *
 * Security:
 * - Uses Supabase's secure logout flow
 * - Clears all session data server-side
 * - No sensitive information in response
 */

// ============================================================================
// Pure Effects
// ============================================================================

/**
 * Effect that performs Supabase sign out.
 * Wraps the async operation in Effect.tryPromise for type-safe error handling.
 *
 * @param supabase - Supabase client from middleware
 * @returns Effect that succeeds with void or fails with SkiSpecError
 */
const performSignOut = (supabase: SupabaseClient<Database>): Effect.Effect<void, SkiSpecError, never> =>
  Effect.tryPromise({
    try: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new AuthOperationError('Failed to logout', {
          cause: error,
          code: 'LOGOUT_FAILED',
          operation: 'signOut',
          context: {
            supabaseErrorCode: error.code,
            supabaseErrorMessage: error.message,
          },
        });
      }
    },
    catch: (error) => wrapError(error, 'Logout operation failed'),
  });

/**
 * Effect that creates a success response.
 * Pure function that returns an Effect wrapping the Response.
 *
 * @returns Effect that always succeeds with Response (200)
 */
const createSuccessResponse = () =>
  Effect.succeed(
    new Response(
      JSON.stringify({
        success: true,
      } satisfies LogoutResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  );

// ============================================================================
// Main Handler
// ============================================================================

/**
 * POST handler implementing logout functionality.
 *
 * Flow:
 * 1. performSignOut - Attempt Supabase sign out
 * 2. createSuccessResponse - Build success response (if step 1 succeeds)
 * 3. catchAllSkiSpecErrors - Handle all errors consistently
 *
 * All error handling (logging, response generation) is handled by catchAllSkiSpecErrors utility.
 * This eliminates repetitive error handler code and ensures consistent behavior.
 */
export const POST: APIRoute = async ({ locals }) => {
  const { supabase } = locals;

  const program = pipe(
    // Step 1: Perform sign out (can fail with AuthOperationError or UnexpectedError)
    performSignOut(supabase),
    // Step 2: On success, create success response
    Effect.flatMap(() => createSuccessResponse()),
    // Step 3: Handle all errors consistently with logging and response generation
    catchAllSkiSpecErrors({
      endpoint: '/api/auth/logout',
      method: 'POST',
    })
  );

  // Execute the Effect and return the Response
  return Effect.runPromise(program);
};
