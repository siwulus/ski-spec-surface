import { parseJsonPromise, parseJsonResponse } from '@/lib/utils/zod';
import type { ApiErrorResponse, ValidationErrorDetail } from '@/types/api.types';
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NetworkError,
  NotFoundError,
  UnexpectedError,
  ValidationError,
  type SkiSpecError,
} from '@/types/error.types';
import { Effect, Match, pipe } from 'effect';
import type { ZodType } from 'zod';
import { withErrorLogging } from './error';

/**
 * HTTP client class for making validated API requests with Effect-based error handling.
 *
 * Returns Effect.Effect<T, SkiSpecError> for all operations, enabling:
 * - Type-safe error handling with discriminated unions
 * - Railway-oriented programming patterns
 * - Composable error handling pipelines
 *
 * All errors are mapped to specific SkiSpecError types based on HTTP status codes.
 */
export class SkiSpecHttpClient {
  /**
   * Map HTTP status code and error response to appropriate SkiSpecError.
   *
   * @param response - Fetch Response object
   * @param errorData - Parsed error response from API
   * @returns Appropriate SkiSpecError based on status code
   */
  private mapHttpStatusToError(response: Response, errorData: unknown): SkiSpecError {
    const status = response.status;
    const apiError = errorData as ApiErrorResponse;
    const message = apiError?.error || response.statusText || 'Request failed';

    switch (status) {
      case 400:
      case 422: {
        // Validation error - extract details if present
        const details: ValidationErrorDetail[] = apiError?.details || [];
        return new ValidationError(message, details, {
          context: { status, url: response.url },
        });
      }

      case 401:
        return new AuthenticationError(message, {
          context: { status, url: response.url },
        });

      case 403:
        return new AuthorizationError(message, {
          context: { status, url: response.url },
        });

      case 404:
        return new NotFoundError(message, {
          context: { status, url: response.url },
        });

      case 409:
        return new ConflictError(message, {
          code: apiError?.code,
          context: { status, url: response.url },
        });

      default:
        return new UnexpectedError(message, {
          context: { status, url: response.url, code: apiError?.code },
        });
    }
  }

  /**
   * Build request configuration with default headers and JSON body handling.
   *
   * @param options - Fetch RequestInit options
   * @returns Complete RequestInit configuration
   */
  private buildRequestConfig(options: RequestInit = {}): RequestInit {
    const { method = 'GET', body, headers = {}, credentials = 'include', ...rest } = options;

    const config: RequestInit = {
      method,
      credentials,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      ...rest,
    };

    if (body && method !== 'GET') {
      config.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return config;
  }

  private fetchEffect(url: string, options: RequestInit = {}): Effect.Effect<Response, SkiSpecError> {
    return Effect.tryPromise({
      try: () => fetch(url, this.buildRequestConfig(options)),
      catch: (error) =>
        new NetworkError('Network request failed', {
          cause: error instanceof Error ? error : undefined,
          context: {
            url,
            method: options.method || 'GET',
          },
        }),
    });
  }

  /**
   * Core fetch method with validation and error handling.
   *
   * Effect pipeline:
   * 1. Make HTTP request (handle network errors)
   * 2. Parse response JSON (handle parse errors)
   * 3. Check HTTP status (map to typed errors)
   * 4. Validate response schema (handle validation errors)
   * 5. Return validated data
   *
   * @param url - URL to fetch from
   * @param schema - Zod schema to validate response
   * @param options - Fetch options
   * @returns Effect with validated data or typed error
   */
  private fetchWithValidation<T>(
    url: string,
    schema: ZodType<T>,
    options: RequestInit = {}
  ): Effect.Effect<T, SkiSpecError> {
    // Step 1: Make HTTP request
    return pipe(
      this.fetchEffect(url, options),
      Effect.flatMap((response) =>
        Match.value(response.ok).pipe(
          Match.when(true, () => parseJsonResponse(response, schema)),
          Match.when(false, () =>
            pipe(
              parseJsonPromise(() => response.json()),
              Effect.flatMap((errorData) => Effect.fail(this.mapHttpStatusToError(response, errorData)))
            )
          ),
          Match.exhaustive
        )
      ),
      withErrorLogging
    );
  }

  /**
   * Convenience method for GET requests.
   *
   * @param url - URL to fetch from
   * @param schema - Zod schema to validate response
   * @param headers - Optional additional headers
   * @returns Effect with validated data or typed error
   */
  get<T>(url: string, schema: ZodType<T>, headers?: Record<string, string>): Effect.Effect<T, SkiSpecError> {
    return this.fetchWithValidation(url, schema, { method: 'GET', headers });
  }

  /**
   * Convenience method for POST requests.
   *
   * @param url - URL to post to
   * @param schema - Zod schema to validate response
   * @param body - Request body (will be JSON stringified)
   * @param headers - Optional additional headers
   * @returns Effect with validated data or typed error
   */
  post<T>(
    url: string,
    schema: ZodType<T>,
    body: BodyInit | null | Record<string, unknown>,
    headers?: Record<string, string>
  ): Effect.Effect<T, SkiSpecError> {
    return this.fetchWithValidation(url, schema, { method: 'POST', body: body as BodyInit, headers });
  }

  /**
   * Convenience method for PUT requests.
   *
   * @param url - URL to put to
   * @param schema - Zod schema to validate response
   * @param body - Request body (will be JSON stringified)
   * @param headers - Optional additional headers
   * @returns Effect with validated data or typed error
   */
  put<T>(
    url: string,
    schema: ZodType<T>,
    body: BodyInit | null | Record<string, unknown>,
    headers?: Record<string, string>
  ): Effect.Effect<T, SkiSpecError> {
    return this.fetchWithValidation(url, schema, { method: 'PUT', body: body as BodyInit, headers });
  }

  /**
   * Convenience method for DELETE requests.
   *
   * @param url - URL to delete
   * @param schema - Zod schema to validate response
   * @param headers - Optional additional headers
   * @returns Effect with validated data or typed error
   */
  delete<T>(url: string, schema: ZodType<T>, headers?: Record<string, string>): Effect.Effect<T, SkiSpecError> {
    return this.fetchWithValidation(url, schema, { method: 'DELETE', headers });
  }

  /**
   * Convenience method for DELETE requests that return 204 No Content.
   *
   * Handles the common case where DELETE endpoints return an empty response body.
   * No schema validation is performed as there is no content to validate.
   *
   * @param url - URL to delete
   * @param headers - Optional additional headers
   * @returns Effect that succeeds with void or fails with typed error
   */
  deleteNoContent(url: string, headers?: Record<string, string>): Effect.Effect<void, SkiSpecError> {
    return pipe(
      this.fetchEffect(url, { method: 'DELETE', headers }),
      Effect.flatMap((response) =>
        Match.value(response.ok).pipe(
          Match.when(true, () => Effect.succeed(undefined)),
          Match.when(false, () =>
            pipe(
              parseJsonPromise(() => response.json()),
              Effect.flatMap((errorData) => Effect.fail(this.mapHttpStatusToError(response, errorData)))
            )
          ),
          Match.exhaustive
        )
      ),
      withErrorLogging
    );
  }
}

/**
 * Default instance of SkiSpecHttpClient for use across the application.
 *
 * Usage:
 * ```typescript
 * import { skiSpecHttpClient } from "@/lib/utils/SkiSpecHttpClient";
 *
 * const effect = skiSpecHttpClient.get("/api/ski-specs", SkiSpecListResponseSchema);
 *
 * pipe(
 *   effect,
 *   Effect.tap((data) => Effect.sync(() => console.log(data))),
 *   Effect.tapError((error) => Effect.sync(() => handleError(error))),
 *   Effect.runPromise
 * );
 * ```
 */
export const skiSpecHttpClient = new SkiSpecHttpClient();
