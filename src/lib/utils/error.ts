/**
 * Effect-based Error Handling Utilities
 *
 * This module provides reusable, type-safe error handling utilities for API routes using EffectJS.
 * It eliminates repetitive error handling code and ensures consistent error logging and response
 * generation across all endpoints.
 *
 * Architecture:
 * - Layer 1: Effect wrappers for existing utilities
 * - Layer 2: Generic error handler
 * - Layer 3: Pre-built catch handlers for each error type
 * - Layer 4: Combinator utilities for composition
 */

import { Effect, pipe } from 'effect';
import {
  type SkiSpecError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  NetworkError,
  BusinessLogicError,
  AuthOperationError,
  InvalidJsonError,
  UnexpectedError,
  createErrorResponse,
  logError,
  wrapError,
} from '@/types/error.types';

// ============================================================================
// Types
// ============================================================================

/**
 * Context information for error logging.
 * Used to add endpoint-specific information to error logs.
 */
export interface ErrorContext {
  /** API endpoint path (e.g., "/api/auth/logout") */
  endpoint?: string;
  /** HTTP method (e.g., "POST", "GET") */
  method?: string;
  /** Authenticated user ID for correlation */
  userId?: string;
  /** Operation being performed (e.g., "signOut", "createSpec") */
  operation?: string;
  /** Any additional context data */
  [key: string]: unknown;
}

// ============================================================================
// Layer 1: Effect Wrappers (Basic Building Blocks)
// ============================================================================

/**
 * Wraps createErrorResponse in an Effect.
 * Converts a SkiSpecError to an HTTP Response wrapped in Effect.succeed.
 *
 * @param error - SkiSpecError to convert
 * @returns Effect that always succeeds with Response
 */
export const createErrorResponseEffect = (error: SkiSpecError): Effect.Effect<Response> =>
  Effect.succeed(createErrorResponse(error));

/**
 * Wraps logError in an Effect.sync.
 * Logs a SkiSpecError with additional context as a lazy side effect.
 *
 * @param error - SkiSpecError to log
 * @param context - Additional context for logging
 * @returns Effect that succeeds after logging
 */
export const logErrorEffect = (error: SkiSpecError, context?: ErrorContext): Effect.Effect<SkiSpecError> =>
  Effect.sync(() => {
    logError(error, context);
    return error;
  });

// ============================================================================
// Layer 2: Generic Error Handler (Core Utility)
// ============================================================================

/**
 * Generic error handler that works for ANY SkiSpecError.
 * Logs the error with context and returns an HTTP error Response.
 *
 * This is the core utility that powers all other handlers.
 * Use this directly with Effect.catchAll or use pre-built handlers below.
 *
 * @param error - Any SkiSpecError to handle
 * @param context - Optional context for logging
 * @returns Effect that succeeds with error Response
 *
 * @example
 * ```typescript
 * pipe(
 *   someEffect,
 *   Effect.catchAll((error) =>
 *     handleSkiSpecError(wrapError(error), { endpoint: "/api/users" })
 *   )
 * )
 * ```
 */
export const handleSkiSpecError = (error: SkiSpecError, context?: ErrorContext): Effect.Effect<Response> =>
  pipe(logErrorEffect(error, context), Effect.flatMap(createErrorResponseEffect));

// ============================================================================
// Layer 3: Pre-built Catch Handlers (Convenience Functions)
// ============================================================================

/**
 * Creates a typed handler for ValidationError.
 * Use with Effect.catchTag("ValidationError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for ValidationError
 *
 * @example
 * ```typescript
 * pipe(
 *   effect,
 *   Effect.catchTag("ValidationError", catchValidationError({ endpoint: "/api/specs" }))
 * )
 * ```
 */
export const catchValidationError =
  (context?: ErrorContext) =>
  (error: ValidationError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for AuthenticationError.
 * Use with Effect.catchTag("AuthenticationError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for AuthenticationError
 */
export const catchAuthenticationError =
  (context?: ErrorContext) =>
  (error: AuthenticationError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for AuthorizationError.
 * Use with Effect.catchTag("AuthorizationError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for AuthorizationError
 */
export const catchAuthorizationError =
  (context?: ErrorContext) =>
  (error: AuthorizationError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for NotFoundError.
 * Use with Effect.catchTag("NotFoundError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for NotFoundError
 */
export const catchNotFoundError =
  (context?: ErrorContext) =>
  (error: NotFoundError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for ConflictError.
 * Use with Effect.catchTag("ConflictError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for ConflictError
 */
export const catchConflictError =
  (context?: ErrorContext) =>
  (error: ConflictError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for DatabaseError.
 * Use with Effect.catchTag("DatabaseError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for DatabaseError
 */
export const catchDatabaseError =
  (context?: ErrorContext) =>
  (error: DatabaseError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for NetworkError.
 * Use with Effect.catchTag("NetworkError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for NetworkError
 */
export const catchNetworkError =
  (context?: ErrorContext) =>
  (error: NetworkError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for BusinessLogicError.
 * Use with Effect.catchTag("BusinessLogicError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for BusinessLogicError
 */
export const catchBusinessLogicError =
  (context?: ErrorContext) =>
  (error: BusinessLogicError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for AuthOperationError.
 * Use with Effect.catchTag("AuthOperationError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for AuthOperationError
 */
export const catchAuthOperationError =
  (context?: ErrorContext) =>
  (error: AuthOperationError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for InvalidJsonError.
 * Use with Effect.catchTag("InvalidJsonError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for InvalidJsonError
 */
export const catchInvalidJsonError =
  (context?: ErrorContext) =>
  (error: InvalidJsonError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

/**
 * Creates a typed handler for UnexpectedError.
 * Use with Effect.catchTag("UnexpectedError", ...).
 *
 * @param context - Optional context for logging
 * @returns Handler function for UnexpectedError
 */
export const catchUnexpectedError =
  (context?: ErrorContext) =>
  (error: UnexpectedError): Effect.Effect<Response> =>
    handleSkiSpecError(error, context);

// ============================================================================
// Layer 4: Combinator Utilities (Composition Helpers)
// ============================================================================

/**
 * Catches ALL SkiSpecError types and handles them consistently.
 * This is the most convenient utility - catches all 11 error types at once.
 *
 * Internally chains all catchTag handlers for type safety.
 * Falls back to handleSkiSpecError for any unexpected errors.
 *
 * @param context - Optional context for logging
 * @returns Function that adds error handling to an Effect
 *
 * @example
 * ```typescript
 * const program = pipe(
 *   performOperation(),
 *   Effect.flatMap(() => createSuccessResponse()),
 *   catchAllSkiSpecErrors({ endpoint: "/api/auth/logout", method: "POST" })
 * );
 * ```
 */
export const catchAllSkiSpecErrors =
  (context?: ErrorContext) =>
  <R>(effect: Effect.Effect<Response, SkiSpecError, R>): Effect.Effect<Response, never, R> =>
    pipe(
      effect,
      Effect.catchTag('ValidationError', catchValidationError(context)),
      Effect.catchTag('AuthenticationError', catchAuthenticationError(context)),
      Effect.catchTag('AuthorizationError', catchAuthorizationError(context)),
      Effect.catchTag('NotFoundError', catchNotFoundError(context)),
      Effect.catchTag('ConflictError', catchConflictError(context)),
      Effect.catchTag('DatabaseError', catchDatabaseError(context)),
      Effect.catchTag('NetworkError', catchNetworkError(context)),
      Effect.catchTag('BusinessLogicError', catchBusinessLogicError(context)),
      Effect.catchTag('AuthOperationError', catchAuthOperationError(context)),
      Effect.catchTag('InvalidJsonError', catchInvalidJsonError(context)),
      Effect.catchTag('UnexpectedError', catchUnexpectedError(context)),
      // Safety net for any unhandled errors (shouldn't occur with proper typing)
      Effect.catchAll((error: unknown) => {
        const wrappedError = new UnexpectedError('Unhandled error type', {
          cause: error instanceof Error ? error : undefined,
          context: {
            errorType: typeof error,
            errorValue: String(error),
            ...context,
          },
        });
        return handleSkiSpecError(wrappedError, context);
      })
    );

/**
 * Wraps unknown errors into SkiSpecError and ensures type safety.
 * Useful when working with external libraries that throw unknown errors.
 *
 * @param effect - Effect that might fail with unknown error type
 * @param defaultMessage - Default message if error is not an Error instance
 * @returns Effect with SkiSpecError as error type
 *
 * @example
 * ```typescript
 * const safeEffect = pipe(
 *   Effect.tryPromise(() => externalApi.call()),
 *   wrapErrorEffect("External API call failed")
 * );
 * ```
 */
export const wrapErrorEffect = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  defaultMessage = 'An unexpected error occurred'
): Effect.Effect<A, SkiSpecError, R> =>
  pipe(
    effect,
    Effect.mapError((error) => wrapError(error, defaultMessage))
  );

/**
 * Adds automatic error logging to any Effect.
 * Logs errors that occur but does not handle them (still propagates).
 *
 * Use this when you want to log errors but let them bubble up for handling elsewhere.
 *
 * @param effect - Effect to add logging to
 * @param context - Context for logging
 * @returns Effect with logging side effect on errors
 *
 * @example
 * ```typescript
 * const effectWithLogging = pipe(
 *   riskyOperation(),
 *   withErrorLogging({ operation: "riskyOperation" })
 * );
 * ```
 */
export const withErrorLogging = <A, R>(
  effect: Effect.Effect<A, SkiSpecError, R>,
  context?: ErrorContext
): Effect.Effect<A, SkiSpecError, R> =>
  pipe(
    effect,
    Effect.tapError((error) => logErrorEffect(error, context))
  );
