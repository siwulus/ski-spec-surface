/**
 * Error Type Definitions for Ski Spec Surface
 *
 * This file contains a comprehensive, type-safe error handling system designed for:
 * - Consistent error handling across API routes and service layers
 * - Integration with EffectJS functional programming patterns
 * - Clear error categorization with discriminated unions (_tag field)
 * - Rich contextual information for debugging and logging
 * - Automatic HTTP response generation
 */

import type { ApiErrorResponse, ValidationErrorDetail } from '@/types/api.types';

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error class for all application errors.
 * Extends Error with additional fields for API error handling.
 *
 * Features:
 * - _tag: Discriminated union tag for Effect.catchTag() pattern matching
 * - code: Application-specific error code (e.g., "VALIDATION_ERROR")
 * - statusCode: HTTP status code for API responses
 * - timestamp: ISO 8601 timestamp of when error occurred
 * - cause: Original error for error wrapping/chaining
 * - context: Additional debugging context (userId, resourceId, etc.)
 */
export abstract class SkiSpecError extends Error {
  abstract readonly _tag: string;
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: string;
  readonly cause?: Error;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.cause = options?.cause;
    this.context = options?.context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ============================================================================
// Specialized Error Classes
// ============================================================================

/**
 * Validation error for invalid user input.
 * Used when request data fails Zod schema validation.
 *
 * HTTP Status: 400 Bad Request
 * Error Code: VALIDATION_ERROR
 *
 * Example: Invalid field values, missing required fields, type mismatches
 */
export class ValidationError extends SkiSpecError {
  readonly _tag = 'ValidationError';
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly details: ValidationErrorDetail[];

  constructor(
    message: string,
    details: ValidationErrorDetail[],
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options);
    this.details = details;
  }
}

/**
 * Authentication error when user is not authenticated.
 * Used when protected routes are accessed without valid authentication.
 *
 * HTTP Status: 401 Unauthorized
 * Error Code: UNAUTHORIZED
 *
 * Example: Missing session, expired token, invalid credentials
 */
export class AuthenticationError extends SkiSpecError {
  readonly _tag = 'AuthenticationError';
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;

  constructor(
    message = 'Authentication required',
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options);
  }
}

/**
 * Authorization error when user lacks permission for the requested resource.
 * Used when authenticated user tries to access resources they don't own.
 *
 * HTTP Status: 403 Forbidden
 * Error Code: FORBIDDEN
 *
 * Example: Accessing another user's ski specification
 *
 * Note: For IDOR prevention, often converted to NotFoundError to avoid
 * information disclosure about resource existence.
 */
export class AuthorizationError extends SkiSpecError {
  readonly _tag = 'AuthorizationError';
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;
  readonly resourceId?: string;
  readonly resourceType?: string;

  constructor(
    message = 'Access forbidden',
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
      resourceId?: string;
      resourceType?: string;
    }
  ) {
    super(message, options);
    this.resourceId = options?.resourceId;
    this.resourceType = options?.resourceType;
  }
}

/**
 * Not found error for non-existent resources.
 * Used when a requested resource doesn't exist or user doesn't have access.
 *
 * HTTP Status: 404 Not Found
 * Error Code: NOT_FOUND
 *
 * Security: This error is used for both "doesn't exist" and "unauthorized access"
 * scenarios to prevent information disclosure (IDOR prevention).
 *
 * Example: Ski specification with given UUID doesn't exist, or belongs to another user
 */
export class NotFoundError extends SkiSpecError {
  readonly _tag = 'NotFoundError';
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly resourceType?: string;
  readonly resourceId?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
      resourceType?: string;
      resourceId?: string;
    }
  ) {
    super(message, options);
    this.resourceType = options?.resourceType;
    this.resourceId = options?.resourceId;
  }
}

/**
 * Conflict error for resource conflicts (duplicate, concurrent modification, etc.).
 * Used when operation would violate uniqueness or business constraints.
 *
 * HTTP Status: 409 Conflict
 * Error Code: CONFLICT or DUPLICATE_{FIELD}
 *
 * Example: Creating ski specification with name that already exists for user
 */
export class ConflictError extends SkiSpecError {
  readonly _tag = 'ConflictError';
  readonly code: string;
  readonly statusCode = 409;
  readonly resourceType?: string;
  readonly conflictingField?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
      resourceType?: string;
      conflictingField?: string;
      code?: string;
    }
  ) {
    super(message, options);
    this.resourceType = options?.resourceType;
    this.conflictingField = options?.conflictingField;
    this.code = options?.code || 'CONFLICT';
  }
}

/**
 * Database error for database operation failures.
 * Used when database queries, inserts, updates, or deletes fail.
 *
 * HTTP Status: 500 Internal Server Error
 * Error Code: DATABASE_ERROR
 *
 * Example: Connection failures, constraint violations, query timeouts
 *
 * Note: Specific database errors (like UNIQUE constraint) should be caught
 * and transformed into more specific error types (e.g., ConflictError).
 */
export class DatabaseError extends SkiSpecError {
  readonly _tag = 'DatabaseError';
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;
  readonly operation?: string;
  readonly table?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
      operation?: string;
      table?: string;
    }
  ) {
    super(message, options);
    this.operation = options?.operation;
    this.table = options?.table;
  }
}

/**
 * Network error for HTTP/network operation failures.
 * Used in client-side code when fetch requests fail.
 *
 * HTTP Status: N/A (client-side error)
 * Error Code: NETWORK_ERROR
 *
 * Example: Network unavailable, timeout, CORS issues
 */
export class NetworkError extends SkiSpecError {
  readonly _tag = 'NetworkError';
  readonly code = 'NETWORK_ERROR';
  readonly statusCode = 500; // Used for error response generation
  readonly url?: string;
  readonly method?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
      url?: string;
      method?: string;
    }
  ) {
    super(message, options);
    this.url = options?.url;
    this.method = options?.method;
  }
}

/**
 * Business logic error for domain-specific validation failures.
 * Used when data is syntactically valid but violates business rules.
 *
 * HTTP Status: 400 Bad Request
 * Error Code: BUSINESS_LOGIC_ERROR or specific code
 *
 * Example: Waist width greater than tip/tail, invalid calculation result
 */
export class BusinessLogicError extends SkiSpecError {
  readonly _tag = 'BusinessLogicError';
  readonly code: string;
  readonly statusCode = 400;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
      code?: string;
    }
  ) {
    super(message, options);
    this.code = options?.code || 'BUSINESS_LOGIC_ERROR';
  }
}

/**
 * Authentication operation error for auth-specific failures.
 * Used when authentication operations (login, logout, password reset) fail.
 *
 * HTTP Status: 500 Internal Server Error
 * Error Code: Specific to operation (e.g., LOGOUT_FAILED, LOGIN_FAILED)
 *
 * Example: Supabase auth.signOut() fails, session invalidation fails
 */
export class AuthOperationError extends SkiSpecError {
  readonly _tag = 'AuthOperationError';
  readonly code: string;
  readonly statusCode = 500;
  readonly operation?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
      code?: string;
      operation?: string;
    }
  ) {
    super(message, options);
    this.code = options?.code || 'AUTH_OPERATION_FAILED';
    this.operation = options?.operation;
  }
}

/**
 * Invalid JSON error for malformed request bodies.
 * Used when request.json() fails to parse.
 *
 * HTTP Status: 400 Bad Request
 * Error Code: INVALID_JSON
 *
 * Example: Malformed JSON syntax, missing quotes, trailing commas
 */
export class InvalidJsonError extends SkiSpecError {
  readonly _tag = 'InvalidJsonError';
  readonly code = 'INVALID_JSON';
  readonly statusCode = 400;

  constructor(
    message = 'Invalid request body',
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options);
  }
}

/**
 * Unexpected error for unknown/unhandled errors.
 * Used as a catch-all for errors that don't fit other categories.
 *
 * HTTP Status: 500 Internal Server Error
 * Error Code: INTERNAL_ERROR
 *
 * Example: Unexpected exceptions, programming errors, null pointer exceptions
 */
export class UnexpectedError extends SkiSpecError {
  readonly _tag = 'UnexpectedError';
  readonly code = 'INTERNAL_ERROR';
  readonly statusCode = 500;

  constructor(
    message = 'Internal server error',
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options);
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is a SkiSpecError.
 * Useful for error handling in catch blocks.
 *
 * @param error - Unknown error to check
 * @returns True if error is a SkiSpecError instance
 */
export const isSkiSpecError = (error: unknown): error is SkiSpecError => {
  return error instanceof SkiSpecError;
};

/**
 * Type guard to check if an error is a specific SkiSpecError type.
 * Uses the _tag discriminated union for type narrowing.
 *
 * @param error - Unknown error to check
 * @param tag - Expected _tag value
 * @returns True if error has the specified _tag
 */
export const hasErrorTag = <T extends SkiSpecError['_tag']>(
  error: unknown,
  tag: T
): error is Extract<SkiSpecError, { _tag: T }> => {
  return isSkiSpecError(error) && error._tag === tag;
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts a SkiSpecError to an ApiErrorResponse for HTTP responses.
 * Includes special handling for ValidationError with details field.
 *
 * @param error - SkiSpecError to convert
 * @returns ApiErrorResponse object ready for JSON serialization
 */
export const toApiErrorResponse = (error: SkiSpecError): ApiErrorResponse => {
  const baseResponse: ApiErrorResponse = {
    error: error.message,
    code: error.code,
    timestamp: error.timestamp,
  };

  // Add validation details if present
  if (error instanceof ValidationError && error.details.length > 0) {
    baseResponse.details = error.details;
  }

  return baseResponse;
};

/**
 * Creates an HTTP Response from a SkiSpecError.
 * Convenience function for API routes.
 *
 * @param error - SkiSpecError to convert to Response
 * @returns Response object with JSON body and appropriate status code
 */
export const createErrorResponse = (error: SkiSpecError): Response => {
  return new Response(JSON.stringify(toApiErrorResponse(error)), {
    status: error.statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * Logs an error with consistent formatting.
 * Includes stack trace for server-side debugging.
 *
 * @param error - Error to log
 * @param additionalContext - Additional context to include in log
 */
export const logError = (error: SkiSpecError, additionalContext?: Record<string, unknown>): void => {
  // eslint-disable-next-line no-console
  console.error(`[${error._tag}] ${error.message}`, {
    code: error.code,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
    context: error.context,
    ...additionalContext,
    stack: error.stack,
    cause: error.cause
      ? {
          message: error.cause.message,
          stack: error.cause.stack,
        }
      : undefined,
  });
};

/**
 * Wraps an unknown error into a SkiSpecError.
 * Useful for catch blocks to ensure consistent error handling.
 *
 * @param error - Unknown error to wrap
 * @param defaultMessage - Default message if error is not an Error instance
 * @returns SkiSpecError (preserves if already SkiSpecError, otherwise wraps as UnexpectedError)
 */
export const wrapError = (error: unknown, defaultMessage = 'An unexpected error occurred'): SkiSpecError => {
  // Already a SkiSpecError - return as-is
  if (isSkiSpecError(error)) {
    return error;
  }

  // Standard Error - wrap with cause
  if (error instanceof Error) {
    return new UnexpectedError(error.message, { cause: error });
  }

  // Unknown error type - wrap with default message
  return new UnexpectedError(defaultMessage);
};

// ============================================================================
// Type Exports for Discriminated Union
// ============================================================================

/**
 * Union type of all SkiSpecError types.
 * Useful for exhaustive pattern matching in switch statements.
 */
export type SkiSpecErrorType =
  | ValidationError
  | AuthenticationError
  | AuthorizationError
  | NotFoundError
  | ConflictError
  | DatabaseError
  | NetworkError
  | BusinessLogicError
  | AuthOperationError
  | InvalidJsonError
  | UnexpectedError;

/**
 * Union type of all error _tag values.
 * Useful for type-safe Effect.catchTag() calls.
 */
export type ErrorTag = SkiSpecErrorType['_tag'];
