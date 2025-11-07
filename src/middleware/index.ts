import { createSupabaseServerClient, type SupabaseClient } from '@/db/supabase.client';
import type { User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { defineMiddleware } from 'astro:middleware';
import { Effect, pipe } from 'effect';

import { SkiSpecService } from '@/lib/services/SkiSpecService';
import { SkiSpecImportExportService } from '@/lib/services/SkiSpecImportExportService';
import { SkiSurfaceEquationIntegral } from '@/lib/services/SkiSurfaceEquationIntegral';
import { wrapErrorEffect } from '@/lib/utils/error';
import { AuthenticationError, logError, type SkiSpecError } from '@/types/error.types';

// ============================================================================
// Constants
// ============================================================================

// Routes that should only be accessible to guests (not authenticated users)
const GUEST_ONLY_ROUTES = ['/auth/login', '/auth/register'];

// Public paths - Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  // API endpoints for authentication flow
  '/api/auth/callback', // PKCE code exchange for password reset
];

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Checks if a pathname is a public route that doesn't require authentication.
 *
 * @param pathname - URL pathname to check
 * @returns true if the route is public, false otherwise
 */
const isPublicPath = (pathname: string): boolean => PUBLIC_PATHS.includes(pathname);

/**
 * Checks if a pathname is a guest-only route (login, register).
 * These routes should redirect authenticated users away.
 *
 * @param pathname - URL pathname to check
 * @returns true if the route is guest-only, false otherwise
 */
const isGuestOnlyRoute = (pathname: string): boolean => GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route));

// ============================================================================
// Effect-based Functions
// ============================================================================

/**
 * Creates a Supabase server client wrapped in an Effect.
 * This operation always succeeds as client creation doesn't perform I/O.
 *
 * @param headers - Request headers
 * @param cookies - Astro cookies object
 * @returns Effect that succeeds with SupabaseClient
 */
const createSupabaseClientEffect = (headers: Headers, cookies: AstroCookies): Effect.Effect<SupabaseClient, never> => {
  return Effect.sync(() =>
    createSupabaseServerClient({
      headers,
      cookies,
    })
  );
};

/**
 * Fetches the current user from Supabase with type-safe error handling.
 * Maps Supabase errors to our SkiSpecError types.
 *
 * @param supabase - Supabase client
 * @returns Effect that succeeds with User | null or fails with SkiSpecError
 */
const getUserEffect = (supabase: SupabaseClient): Effect.Effect<User | null, SkiSpecError> => {
  return pipe(
    Effect.tryPromise({
      try: () => supabase.auth.getUser(),
      catch: (error) =>
        new AuthenticationError('Failed to fetch user from Supabase', {
          cause: error instanceof Error ? error : undefined,
        }),
    }),
    Effect.map(({ data }) => data.user),
    Effect.catchTag('AuthenticationError', () => Effect.succeed(null)),
    wrapErrorEffect
  );
};

/**
 * Creates a redirect response to the login page with return URL.
 * Preserves the query string from the original URL for deep linking.
 *
 * @param url - Current URL to return to after login
 * @param redirect - Astro redirect function
 * @returns Effect that succeeds with redirect Response
 */
const redirectToLogin = (url: URL, redirect: (path: string) => Response): Effect.Effect<Response, never> => {
  return Effect.sync(() => {
    const redirectUrl = new URL('/auth/login', url);
    // Preserve both pathname and search params for deep linking
    const returnPath = `${url.pathname}${url.search ?? ''}`;
    redirectUrl.searchParams.set('redirectTo', returnPath);
    return redirect(redirectUrl.toString());
  });
};

/**
 * Creates a redirect response to the ski specs page.
 *
 * @param redirect - Astro redirect function
 * @returns Effect that succeeds with redirect Response
 */
const redirectToSpecs = (redirect: (path: string) => Response): Effect.Effect<Response, never> => {
  return Effect.sync(() => redirect('/ski-specs'));
};

// ============================================================================
// Authorization Types
// ============================================================================

/**
 * Result of authorization check.
 * Either allows the request to continue or provides a redirect response.
 */
type AuthorizationResult =
  | { type: 'continue'; user: User | null; supabase: SupabaseClient }
  | { type: 'redirect'; response: Response };

/**
 * Determines the authorization outcome based on user and route.
 * Implements the authorization logic with clear, testable rules.
 *
 * Rules:
 * 1. Authenticated users trying to access guest-only routes → redirect to /ski-specs
 * 2. Unauthenticated users trying to access protected routes → redirect to /auth/login
 * 3. All other cases → continue
 *
 * @param user - Current user (null if not authenticated)
 * @param url - Current URL
 * @param supabase - Supabase client
 * @param redirect - Astro redirect function
 * @returns Effect with authorization result
 */
const authorizeRequest = (
  user: User | null,
  url: URL,
  supabase: SupabaseClient,
  redirect: (path: string) => Response
): Effect.Effect<AuthorizationResult, never> => {
  // Rule 1: Authenticated user on guest-only route
  if (user && isGuestOnlyRoute(url.pathname)) {
    return pipe(
      redirectToSpecs(redirect),
      Effect.map((response) => ({ type: 'redirect' as const, response }))
    );
  }

  // Rule 2: Unauthenticated user on protected route
  if (!user && !isPublicPath(url.pathname)) {
    return pipe(
      redirectToLogin(url, redirect),
      Effect.map((response) => ({ type: 'redirect' as const, response }))
    );
  }

  // Rule 3: Allow request to continue
  return Effect.succeed({ type: 'continue' as const, user, supabase });
};

// ============================================================================
// Main Middleware Handler
// ============================================================================

/**
 * Astro middleware that handles authentication and authorization using Effect.
 *
 * Flow:
 * 1. Create Supabase client (always succeeds)
 * 2. Fetch current user (can fail with DatabaseError)
 * 3. Check authorization (determines continue vs redirect)
 * 4. Set locals and continue, or return redirect response
 * 5. On error: Log and fail open (continue without auth)
 *
 * Error Handling Strategy: Fail Open
 * If authentication check fails (e.g., Supabase is down), we log the error
 * but allow the request to continue unauthenticated. Protected routes will
 * perform their own auth checks and return 401 if needed.
 *
 * This ensures availability > security at the middleware level, while
 * maintaining security at the route level.
 */
export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  const program = pipe(
    // Step 1: Create Supabase client (pure, always succeeds)
    createSupabaseClientEffect(request.headers, cookies),

    // Step 2: Fetch user from Supabase (can fail with DatabaseError)
    Effect.flatMap((supabase) =>
      pipe(
        getUserEffect(supabase),
        Effect.map((user) => ({ user, supabase }))
      )
    ),

    // Step 3: Check authorization and determine action
    Effect.flatMap(({ user, supabase }) => authorizeRequest(user, url, supabase, redirect)),

    // Step 4: Handle result
    Effect.map((result) => {
      if (result.type === 'redirect') {
        return result.response;
      }

      // Set locals for downstream handlers
      locals.user = result.user;
      locals.supabase = result.supabase;
      const equation = new SkiSurfaceEquationIntegral();
      locals.skiSpecService = new SkiSpecService(result.supabase, equation);
      locals.skiSpecImportExportService = new SkiSpecImportExportService(locals.skiSpecService);

      return null; // Signal to continue with next()
    }),

    // Step 5: Error handling - Log but don't block request (fail open)
    Effect.catchAll((error: SkiSpecError) => {
      logError(error, {
        endpoint: url.pathname,
        method: request.method,
        operation: 'middleware',
      });

      // Fail open: Continue without authentication
      // Protected routes will handle auth at the route level
      return Effect.succeed(null);
    })
  );

  // Execute the Effect
  const result = await Effect.runPromise(program);

  // If we got a redirect response, return it; otherwise continue
  return result ?? next();
});
