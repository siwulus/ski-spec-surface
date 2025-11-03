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

  /**
   * Build request configuration for multipart/form-data requests.
   * Does NOT set Content-Type header - browser sets it automatically with boundary.
   *
   * @param options - Fetch RequestInit options
   * @returns Complete RequestInit configuration without Content-Type header
   */
  private buildMultipartConfig(options: RequestInit = {}): RequestInit {
    const { method = 'POST', body, headers = {}, credentials = 'include', ...rest } = options;

    return {
      method,
      credentials,
      headers: {
        // Do NOT set Content-Type for FormData
        // Browser will set it automatically with proper boundary
        ...headers,
      },
      body,
      ...rest,
    };
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

  /**
   * Convenience method for POST requests with multipart/form-data (file uploads).
   *
   * Handles FormData requests without setting Content-Type header,
   * allowing the browser to set it automatically with the proper boundary.
   *
   * @param url - URL to post to
   * @param schema - Zod schema to validate response
   * @param formData - FormData object containing files/fields
   * @param headers - Optional additional headers (do not set Content-Type)
   * @returns Effect with validated data or typed error
   *
   * @example
   * const formData = new FormData();
   * formData.append('file', file);
   * const effect = client.postMultipart('/api/upload', ResponseSchema, formData);
   */
  postMultipart<T>(
    url: string,
    schema: ZodType<T>,
    formData: FormData,
    headers?: Record<string, string>
  ): Effect.Effect<T, SkiSpecError> {
    // Use a custom fetch pipeline that doesn't set Content-Type
    return pipe(
      Effect.tryPromise({
        try: () => fetch(url, this.buildMultipartConfig({ method: 'POST', body: formData, headers })),
        catch: (error) =>
          new NetworkError('Network request failed', {
            cause: error instanceof Error ? error : undefined,
            context: {
              url,
              method: 'POST',
            },
          }),
      }),
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

  getBlob(
    url: string,
    headers?: Record<string, string>
  ): Effect.Effect<{ blob: Blob; filename: string | null; mimeType: string | null }, SkiSpecError> {
    return pipe(
      this.fetchEffect(url, this.buildRequestConfig({ headers })),
      Effect.flatMap((response) =>
        Match.value(response.ok).pipe(
          Match.when(true, () =>
            pipe(
              Effect.tryPromise({
                try: () => response.blob(),
                catch: (error) =>
                  new NetworkError('Failed to fetch blob', {
                    cause: error instanceof Error ? error : undefined,
                    context: { url, method: 'GET', headers },
                  }),
              }),
              Effect.map((blob) => ({
                blob,
                filename: this.extractFilename(response),
                mimeType: response.headers.get('content-type'),
              }))
            )
          ),
          Match.when(false, () =>
            pipe(
              Effect.tryPromise({
                try: () => response.json(),
                catch: (error) =>
                  new UnexpectedError('Failed to parse blob response', {
                    cause: error instanceof Error ? error : undefined,
                    context: { url, method: 'GET', headers },
                  }),
              }),
              Effect.flatMap((errData) => Effect.fail(this.mapHttpStatusToError(response, errData)))
            )
          ),
          Match.exhaustive
        )
      ),
      withErrorLogging
    );
  }

  private extractFilename(response: Response): string | null {
    const header = response.headers.get('content-disposition');
    if (!header) return null;

    // Handles: attachment; filename="example.csv"; filename*=UTF-8''example.csv
    // Prefer RFC 5987 filename* if present
    const filenameStarMatch = /filename\*\s*=\s*([^']*)''([^;]+)/i.exec(header);
    if (filenameStarMatch?.[2]) {
      try {
        return decodeURIComponent(filenameStarMatch[2]);
      } catch {
        return filenameStarMatch[2];
      }
    }

    const filenameMatch = /filename\s*=\s*"?(.*?)"?($|;)/i.exec(header);
    return filenameMatch?.[1] ?? null;
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
