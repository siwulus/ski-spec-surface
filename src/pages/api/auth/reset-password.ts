import { ResetPasswordCommandSchema, type ApiErrorResponse, type ResetPasswordResponse } from "@/types/api.types";
import type { APIRoute } from "astro";

export const prerender = false;

/**
 * POST /api/auth/reset-password
 * Sends a password reset email to the specified email address.
 *
 * Request body: ResetPasswordCommand (validated with Zod)
 * Response: ResetPasswordResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Features:
 * - Validates email format
 * - Sends password reset email via Supabase
 * - Redirects to update password page after reset
 * - Works regardless of whether email exists (security feature)
 *
 * Security:
 * - Validates input with Zod schemas
 * - Returns generic success message regardless of email existence
 * - Uses Supabase's secure password reset flow
 * - Prevents email enumeration attacks
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
    const validationResult = ResetPasswordCommandSchema.safeParse(body);

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

    const { email } = validationResult.data;

    // Step 4: Attempt password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth/update-password`,
    });

    // Step 5: Handle reset errors
    if (error) {
      // Log error for debugging (server-side only)
      // eslint-disable-next-line no-console
      console.error("Password reset failed:", {
        email,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Failed to send password reset email",
          code: "RESET_FAILED",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 6: Build success response
    // Always return success message regardless of whether email exists
    // This prevents email enumeration attacks
    const response: ResetPasswordResponse = {
      message: "If an account with this email exists, you will receive a password reset link",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 7: Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in password reset:", {
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
