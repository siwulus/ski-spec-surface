import { LoginCommandSchema, type ApiErrorResponse, type LoginResponse } from "@/types/api.types";
import type { APIRoute } from "astro";

export const prerender = false;

/**
 * POST /api/auth/login
 * Authenticates a user with email and password.
 *
 * Request body: LoginCommand (validated with Zod)
 * Response: LoginResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Features:
 * - Validates email format and password requirements
 * - Supports optional "remember me" functionality
 * - Returns user information on successful authentication
 * - Sets authentication cookies via Supabase
 *
 * Security:
 * - Validates input with Zod schemas
 * - Returns generic error messages to prevent user enumeration
 * - Uses Supabase's secure authentication flow
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;
  try {
    // Step 1: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          code: "INVALID_JSON",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 2: Validate request body against schema
    const validationResult = LoginCommandSchema.safeParse(body);

    if (!validationResult.success) {
      const details = validationResult.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details,
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, password } = validationResult.data;

    // Step 4: Attempt authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Step 5: Handle authentication errors
    if (error) {
      // Log error for debugging (server-side only)
      // eslint-disable-next-line no-console
      console.error("Authentication failed:", {
        email,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Return generic error to prevent user enumeration
      return new Response(
        JSON.stringify({
          error: "Invalid email or password",
          code: "AUTHENTICATION_FAILED",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 6: Handle successful authentication
    if (!data.user) {
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
          code: "AUTHENTICATION_FAILED",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 7: Build success response
    const response: LoginResponse = {
      user: {
        id: data.user.id,
        email: data.user.email || "",
      },
      message: "Login successful",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 8: Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in login:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
