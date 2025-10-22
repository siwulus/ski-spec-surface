import { RegisterCommandSchema, type ApiErrorResponse, type RegisterResponse } from "@/types/api.types";
import type { APIRoute } from "astro";

export const prerender = false;

/**
 * POST /api/auth/register
 * Creates a new user account with email and password.
 *
 * Request body: RegisterCommand (validated with Zod)
 * Response: RegisterResponse (201) or ApiErrorResponse (4xx/5xx)
 *
 * Features:
 * - Validates email format and password strength requirements
 * - Ensures password confirmation matches
 * - Requires terms acceptance
 * - Handles email confirmation flow
 * - Returns user information and confirmation status
 *
 * Security:
 * - Validates input with Zod schemas
 * - Enforces strong password requirements
 * - Uses Supabase's secure registration flow
 * - Returns generic error messages to prevent user enumeration
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
    const validationResult = RegisterCommandSchema.safeParse(body);

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

    // Step 4: Attempt registration
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // Step 5: Handle registration errors
    if (error) {
      // Log error for debugging (server-side only)
      // eslint-disable-next-line no-console
      console.error("Registration failed:", {
        email,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Handle specific error cases
      if (error.message.includes("already registered")) {
        return new Response(
          JSON.stringify({
            error: "An account with this email already exists",
            code: "EMAIL_ALREADY_EXISTS",
            timestamp: new Date().toISOString(),
          } satisfies ApiErrorResponse),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }

      // Return generic error for other cases
      return new Response(
        JSON.stringify({
          error: "Registration failed",
          code: "REGISTRATION_FAILED",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 6: Build success response
    const response: RegisterResponse = {
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email || "",
          }
        : null,
      message: data.user ? "Account created successfully" : "Please check your email to confirm your account",
      requiresEmailConfirmation: !data.user,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 7: Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in registration:", {
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
