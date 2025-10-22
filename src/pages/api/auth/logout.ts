import { type ApiErrorResponse, type LogoutResponse } from "@/types/api.types";
import type { APIRoute } from "astro";

export const prerender = false;

/**
 * POST /api/auth/logout
 * Logs out the current user by clearing the session and removing authentication cookies.
 *
 * Request body: None
 * Response: LogoutResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Features:
 * - Clears all authentication cookies
 * - Invalidates the current session
 * - Works regardless of authentication status (idempotent)
 * - Returns success confirmation
 *
 * Security:
 * - Uses Supabase's secure logout flow
 * - Clears all session data server-side
 * - No sensitive information in response
 */
export const POST: APIRoute = async ({ locals }) => {
  const { supabase } = locals;
  try {
    // Step 2: Attempt logout
    const { error } = await supabase.auth.signOut();

    // Step 3: Handle logout errors
    if (error) {
      // Log error for debugging (server-side only)
      // eslint-disable-next-line no-console
      console.error("Logout failed:", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Failed to logout",
          code: "LOGOUT_FAILED",
          timestamp: new Date().toISOString(),
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 4: Build success response
    const response: LogoutResponse = {
      success: true,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 5: Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in logout:", {
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
