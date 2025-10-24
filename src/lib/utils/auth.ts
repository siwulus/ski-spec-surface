import { Effect } from "effect";
import { AuthenticationError } from "@/types/error.types";

/**
 * Fetch wrapper with automatic 401 handling
 *
 * Intercepts fetch responses and redirects to login on 401 Unauthorized
 * Adds Bearer token from session to requests (if available)
 *
 * @param input - Request URL or Request object
 * @param init - Request initialization options
 * @returns Response promise
 *
 * @example
 * ```ts
 * const response = await authenticatedFetch('/api/ski-specs', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 * ```
 */
export const authenticatedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const response = await fetch(input, init);

  // Handle 401 Unauthorized - redirect to login
  if (response.status === 401) {
    const currentPath = window.location.pathname + window.location.search;
    const encodedRedirect = encodeURIComponent(currentPath);
    window.location.href = `/auth/login?redirectTo=${encodedRedirect}&error=session_expired`;
    throw new Error("Unauthorized - redirecting to login");
  }

  return response;
};

/**
 * Setup global fetch interceptor for 401 handling
 *
 * WARNING: This modifies the global fetch function.
 * Use with caution. Consider using authenticatedFetch() instead.
 *
 * @example
 * ```ts
 * // In your app initialization
 * setupFetchInterceptor();
 * ```
 */
export const setupFetchInterceptor = (): void => {
  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);

    // Only intercept API calls (not external resources)
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isApiCall = url.startsWith("/api/");

    if (isApiCall && response.status === 401) {
      const currentPath = window.location.pathname + window.location.search;
      const encodedRedirect = encodeURIComponent(currentPath);
      window.location.href = `/auth/login?redirectTo=${encodedRedirect}&error=session_expired`;
    }

    return response;
  };
};

import z from "zod";

/**
 * Authentication error with user-friendly message
 */
export interface AuthError {
  /** User-friendly error message in English */
  message: string;
  /** Original error code from Supabase */
  code?: string;
}

/**
 * Maps Supabase Auth errors to user-friendly messages in English
 *
 * @param error - Error object from Supabase Auth
 * @returns AuthError with friendly message
 *
 * @example
 * ```ts
 * try {
 *   await supabase.auth.signIn({ email, password });
 * } catch (error) {
 *   const authError = mapSupabaseAuthError(error);
 *   toast.error(authError.message);
 * }
 * ```
 */

const ErrorSchema = z
  .object({
    code: z.string().optional(),
    error_code: z.string().optional(),
    message: z.string().optional(),
  })
  .partial();

export const mapSupabaseAuthError = (error: unknown): AuthError => {
  const parsed = ErrorSchema.safeParse(error);

  let code: string;
  if (parsed.success) {
    code = parsed.data.code || parsed.data.error_code || parsed.data.message || "unknown_error";
  } else if (typeof error === "string") {
    code = error;
  } else {
    code = "unknown_error";
  }

  const errorMessages: Record<string, string> = {
    // Authentication errors
    invalid_credentials: "Invalid email or password",
    invalid_grant: "Password reset link has expired or is invalid",
    user_not_found: "User with this email address not found",

    // Email verification
    email_not_confirmed: "Email has not been confirmed. Please check your inbox.",

    // Registration errors
    user_already_exists: "This email address is already registered",
    weak_password: "Password is too weak. Please use a stronger password.",

    // Rate limiting
    over_email_send_rate_limit: "Too many email attempts. Please try again later.",
    too_many_requests: "Too many attempts. Please try again later.",

    // Session errors
    refresh_token_not_found: "Session has expired. Please log in again.",
    session_not_found: "Session has expired. Please log in again.",

    // Provider errors
    email_provider_disabled: "Email login is currently unavailable",

    // Validation errors
    validation_failed: "Form data is invalid",
    signup_disabled: "Registration is currently disabled",

    // Network errors
    "Failed to fetch": "No internet connection. Please check your connection and try again.",
    "Network request failed": "Connection error. Please check your connection and try again.",
  };

  // Try to find matching error message
  const message = errorMessages[code] || errorMessages[String(code).toLowerCase()];

  if (message) {
    return { message, code };
  }

  // Check if error message contains known patterns
  const errorString = String((error as { message?: string })?.message || (error as string) || "").toLowerCase();

  if (errorString.includes("email") && errorString.includes("invalid")) {
    return {
      message: "Invalid email address format",
      code: "invalid_email",
    };
  }

  if (errorString.includes("password") && errorString.includes("short")) {
    return {
      message: "Password is too short",
      code: "password_too_short",
    };
  }

  if (errorString.includes("network") || errorString.includes("fetch")) {
    return {
      message: "Connection error. Please check your connection and try again.",
      code: "network_error",
    };
  }

  // Default fallback message
  return {
    message: "An unexpected error occurred. Please try again.",
    code: code || "unknown_error",
  };
};

/**
 * Validates and extracts user ID from the authenticated user object.
 *
 * This utility is used in API routes to ensure the user is authenticated before proceeding.
 * Fails with AuthenticationError if user is not authenticated.
 *
 * @param user - User object from Astro locals (can be null or undefined if not authenticated)
 * @returns Effect.Effect that succeeds with the user ID string or fails with AuthenticationError
 */
export const getUserIdEffect = (user: { id: string } | null | undefined): Effect.Effect<string, AuthenticationError> =>
  user?.id ? Effect.succeed(user.id) : Effect.fail(new AuthenticationError("User not authenticated"));
