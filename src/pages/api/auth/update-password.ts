import { UpdatePasswordCommandSchema, type ApiErrorResponse, type UpdatePasswordResponse } from "@/types/api.types";
import type { APIRoute } from "astro";

export const prerender = false;

/**
 * POST /api/auth/update-password
 * Updates the user's password using a password reset token.
 *
 * Request body: UpdatePasswordCommand (validated with Zod)
 * Response: UpdatePasswordResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Features:
 * - Validates new password strength requirements
 * - Ensures password confirmation matches
 * - Requires valid password reset session
 * - Updates password and clears reset session
 *
 * Security:
 * - Validates input with Zod schemas
 * - Enforces strong password requirements
 * - Requires valid authentication session
 * - Uses Supabase's secure password update flow
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, session, user } = locals;
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
    const validationResult = UpdatePasswordCommandSchema.safeParse(body);

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

    const { password } = validationResult.data;

    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Invalid or expired password reset session",
          code: "INVALID_SESSION",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 5: Attempt password update
    const { error } = await supabase.auth.updateUser({
      password,
    });

    // Step 6: Handle update errors
    if (error) {
      // Log error for debugging (server-side only)
      // eslint-disable-next-line no-console
      console.error("Password update failed:", {
        userId: user?.id || "unknown",
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Failed to update password",
          code: "UPDATE_FAILED",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 7: Build success response
    const response: UpdatePasswordResponse = {
      message: "Password updated successfully",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 8: Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in password update:", {
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
