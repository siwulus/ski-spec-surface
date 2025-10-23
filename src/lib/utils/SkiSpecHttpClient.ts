import type { ZodType } from "zod";

/**
 * HTTP client error with additional context
 */
export class HttpClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

/**
 * HTTP client class for making validated API requests
 * Uses Zod schemas for response validation
 */
export class SkiSpecHttpClient {
  /**
   * Generic HTTP client with Zod validation
   * Fetches data from an API endpoint and validates the response against a Zod schema
   *
   * @param url - The URL to fetch from
   * @param schema - Zod schema to validate the response against
   * @param options - Fetch options (method, body, headers, credentials)
   * @returns Validated response data
   * @throws HttpClientError if request fails or validation fails
   */
  private async fetchWithValidation<T>(url: string, schema: ZodType<T>, options: RequestInit = {}): Promise<T> {
    try {
      // Make the request
      const response = await fetch(url, this.buildRequestConfig(options));
      return this.buildResponse(response, schema);
    } catch (error) {
      // Re-throw HttpClientError as-is
      if (error instanceof HttpClientError) {
        throw error;
      }
      // Wrap other errors (network errors, etc.)
      if (error instanceof Error) {
        throw new HttpClientError(error.message, undefined, "NETWORK_ERROR");
      }
      // Unknown error
      throw new HttpClientError("An unknown error occurred");
    }
  }

  private buildRequestConfig(options: RequestInit = {}): RequestInit {
    const { method = "GET", body, headers = {}, credentials = "include", ...rest } = options;

    const config: RequestInit = {
      method,
      credentials,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      ...rest,
    };

    if (body && method !== "GET") {
      config.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    return config;
  }

  private async buildResponse<T>(response: Response, schema: ZodType<T>): Promise<T> {
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        throw new HttpClientError(response.statusText || "Request failed", response.status);
      }

      throw new HttpClientError(
        errorData.error || errorData.message || "Request failed",
        response.status,
        errorData.code,
        errorData.details
      );
    }
    const data = await response.json();
    const validationResult = schema.safeParse(data);

    if (!validationResult.success) {
      throw new HttpClientError(
        "Response validation failed",
        undefined,
        "VALIDATION_ERROR",
        validationResult.error.issues
      );
    }

    return validationResult.data;
  }

  /**
   * Convenience method for GET requests
   */
  async get<T>(url: string, schema: ZodType<T>, headers?: Record<string, string>): Promise<T> {
    return this.fetchWithValidation(url, schema, { method: "GET", headers });
  }

  /**
   * Convenience method for POST requests
   */
  async post<T>(
    url: string,
    schema: ZodType<T>,
    body: BodyInit | null | undefined,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.fetchWithValidation(url, schema, { method: "POST", body, headers });
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T>(
    url: string,
    schema: ZodType<T>,
    body: BodyInit | null | undefined,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.fetchWithValidation(url, schema, { method: "PUT", body, headers });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T>(url: string, schema: ZodType<T>, headers?: Record<string, string>): Promise<T> {
    return this.fetchWithValidation(url, schema, { method: "DELETE", headers });
  }
}

/**
 * Default instance of SkiSpecHttpClient for use across the application
 */
export const skiSpecHttpClient = new SkiSpecHttpClient();
