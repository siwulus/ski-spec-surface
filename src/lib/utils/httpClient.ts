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
 * Generic HTTP client with Zod validation
 * Fetches data from an API endpoint and validates the response against a Zod schema
 *
 * @param url - The URL to fetch from
 * @param schema - Zod schema to validate the response against
 * @param options - Fetch options (method, body, headers, credentials)
 * @returns Validated response data
 * @throws HttpClientError if request fails or validation fails
 */
export const fetchWithValidation = async <T>(
  url: string,
  schema: ZodType<T>,
  options: RequestInit = {}
): Promise<T> => {
  try {
    // Make the request
    const response = await fetch(url, buildRequestConfig(options));
    return buildResponse(response, schema);
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
};

const buildRequestConfig = (options: RequestInit = {}): RequestInit => {
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
};

const buildResponse = async <T>(response: Response, schema: ZodType<T>): Promise<T> => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      throw new HttpClientError(response.statusText || "Request failed", response.status);
    }

    throw new HttpClientError(
      -errorData.error || errorData.message || "Request failed",
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
};
/**
 * Build URL with query parameters
 *
 * @param baseUrl - Base URL
 * @param params - Query parameters as key-value pairs
 * @returns URL with query string
 */
export const buildUrl = (baseUrl: string, params: Record<string, string | number | boolean | undefined>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Convenience method for GET requests
 */
export const get = async <T>(url: string, schema: ZodType<T>, headers?: Record<string, string>): Promise<T> => {
  return fetchWithValidation(url, schema, { method: "GET", headers });
};

/**
 * Convenience method for POST requests
 */
export const post = async <T>(
  url: string,
  schema: ZodType<T>,
  body: BodyInit | null | undefined,
  headers?: Record<string, string>
): Promise<T> => {
  return fetchWithValidation(url, schema, { method: "POST", body, headers });
};

/**
 * Convenience method for PUT requests
 */
export const put = async <T>(
  url: string,
  schema: ZodType<T>,
  body: BodyInit | null | undefined,
  headers?: Record<string, string>
): Promise<T> => {
  return fetchWithValidation(url, schema, { method: "PUT", body, headers });
};

/**
 * Convenience method for DELETE requests
 */
export const del = async <T>(url: string, schema: ZodType<T>, headers?: Record<string, string>): Promise<T> => {
  return fetchWithValidation(url, schema, { method: "DELETE", headers });
};
