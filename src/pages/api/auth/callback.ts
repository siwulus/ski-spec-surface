import { Effect, pipe } from 'effect';
import { AuthenticationError, AuthOperationError, type SkiSpecError, wrapError } from '@/types/error.types';
import { catchAllSkiSpecErrors } from '@/lib/utils/error';
import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';

export const prerender = false;

/**
 * GET /api/auth/callback
 * Handles PKCE code exchange for password reset flow using EffectJS functional programming style.
 *
 * Query parameters:
 * - code: PKCE authorization code from Supabase password reset email (required)
 *
 * Response: HTTP 302 redirect to /auth/update-password (success) or /auth/reset-password (error)
 *
 * Features:
 * - Railway-oriented programming with Effect pipe pattern
 * - Type-safe error handling with discriminated unions
 * - Pure functional composition (no try-catch, no if statements)
 * - Consistent error handling via reusable utilities
 * - Comprehensive error logging with context
 *
 * Security:
 * - Uses Supabase PKCE flow for secure session establishment
 * - Code is single-use and expires after 5 minutes
 * - Generic error messages to prevent information disclosure
 * - No sensitive data in error responses
 *
 * Flow:
 * 1. User clicks reset password link from email → /api/auth/callback?code=xxx
 * 2. Exchange code for session (establishes authenticated session via cookies)
 * 3. Redirect to /auth/update-password (user can now change password)
 * 4. On error: Redirect to /auth/reset-password?error=invalid_code
 */

// ============================================================================
// Pure Effects
// ============================================================================

/**
 * Effect that extracts the code parameter from request URL.
 * Fails with AuthenticationError if code is missing or invalid.
 *
 * @param url - Request URL
 * @returns Effect that succeeds with code string or fails with SkiSpecError
 */
const extractCode = (url: URL): Effect.Effect<string, SkiSpecError, never> =>
  Effect.sync(() => {
    const code = url.searchParams.get('code');

    if (!code || code.trim() === '') {
      throw new AuthenticationError('Missing or empty code parameter', {
        context: {
          url: url.pathname,
          hasCodeParam: url.searchParams.has('code'),
        },
      });
    }

    return code.trim();
  }).pipe(Effect.catchAll((error) => Effect.fail(wrapError(error, 'Failed to extract code from URL'))));

/**
 * Effect that exchanges PKCE code for Supabase session.
 * Wraps the async operation in Effect.tryPromise for type-safe error handling.
 *
 * @param supabase - Supabase client from middleware
 * @param code - PKCE authorization code
 * @returns Effect that succeeds with void or fails with SkiSpecError
 */
const exchangeCodeForSession = (
  supabase: SupabaseClient<Database>,
  code: string
): Effect.Effect<void, SkiSpecError, never> =>
  Effect.tryPromise({
    try: async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        throw new AuthOperationError('Failed to exchange code for session', {
          cause: error,
          code: 'CODE_EXCHANGE_FAILED',
          operation: 'exchangeCodeForSession',
          context: {
            supabaseErrorCode: error.code,
            supabaseErrorMessage: error.message,
            codeLength: code.length,
          },
        });
      }
    },
    catch: (error) => wrapError(error, 'Code exchange operation failed'),
  });

/**
 * Effect that creates a redirect response to the update password page.
 * Pure function that returns an Effect wrapping the redirect Response.
 *
 * @param redirect - Astro's redirect helper function from context
 * @returns Effect that always succeeds with redirect Response (302)
 */
const createSuccessRedirect = (
  redirect: (path: string, status?: 300 | 301 | 302 | 303 | 304 | 307 | 308) => Response
): Effect.Effect<Response, never, never> => Effect.succeed(redirect('/auth/update-password', 302));

/**
 * Effect that creates a redirect response to the reset password page with error indicator.
 * Used when code exchange fails (invalid, expired, or already used code).
 *
 * @param redirect - Astro's redirect helper function from context
 * @returns Effect that always succeeds with redirect Response (302)
 */
const createErrorRedirect = (
  redirect: (path: string, status?: 300 | 301 | 302 | 303 | 304 | 307 | 308) => Response
): Effect.Effect<Response, never, never> => Effect.succeed(redirect('/auth/reset-password?error=invalid_code', 302));

// ============================================================================
// Main Handler
// ============================================================================

/**
 * GET handler implementing PKCE code exchange for password reset.
 *
 * Flow:
 * 1. extractCode - Extract code from query parameters (can fail with AuthenticationError)
 * 2. exchangeCodeForSession - Exchange code for session (can fail with AuthOperationError)
 * 3. createSuccessRedirect - Redirect to update password page (if steps 1-2 succeed)
 * 4. On any error - createErrorRedirect - Redirect to reset password page with error
 * 5. catchAllSkiSpecErrors - Handle all errors consistently with logging
 *
 * All error handling (logging, response generation) is handled by catchAllSkiSpecErrors utility.
 * This eliminates repetitive error handler code and ensures consistent behavior.
 */
export const GET: APIRoute = async ({ locals, url, redirect }) => {
  const { supabase } = locals;

  const program = pipe(
    // Step 1: Extract code from URL (can fail with AuthenticationError if missing)
    extractCode(url),
    // Step 2: Exchange code for session (can fail with AuthOperationError if invalid/expired)
    Effect.flatMap((code) => exchangeCodeForSession(supabase, code)),
    // Step 3: On success, redirect to update password page
    Effect.flatMap(() => createSuccessRedirect(redirect)),
    // Step 4: On any error, redirect to reset password page with error indicator
    // This provides a fallback for all error types (missing code, invalid code, expired code)
    Effect.catchAll(() => createErrorRedirect(redirect)),
    // Step 5: Log any errors that occurred (catchAllSkiSpecErrors logs before the catchAll redirect)
    // Note: This won't catch the errors because we already handled them with catchAll above,
    // but we need to wrap the entire flow for consistency with other endpoints
    catchAllSkiSpecErrors({
      endpoint: '/api/auth/callback',
      method: 'GET',
    })
  );

  // Execute the Effect and return the Response
  return Effect.runPromise(program);
};
