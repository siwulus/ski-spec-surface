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
