import { type ApiErrorResponse, type SessionResponse } from "@/types/api.types";
import type { APIRoute } from "astro";

export const prerender = false;

/**
 * GET /api/auth/session
 * Returns the current user session information.
 *
 * Request body: None
 * Response: SessionResponse (200) or ApiErrorResponse (4xx/5xx)
 *
 * Features:
 * - No authentication required (public endpoint)
 * - Returns user information if authenticated
 * - Returns null user and false isAuthenticated if not authenticated
 * - Provides quick boolean check without null checking
 *
 * Security:
 * - No sensitive information exposed
 * - Safe to call without authentication
 * - Uses middleware-provided session data
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Step 1: Extract session and user information from middleware
    const { session, user } = locals;

    // Step 2: Build response based on authentication status
    const response: SessionResponse = {
      user: user
        ? {
            id: user.id,
            email: user.email || "",
          }
        : null,
      isAuthenticated: !!session,
    };

    // Step 3: Return success response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 4: Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in session check:", {
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
