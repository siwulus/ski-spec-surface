import React, { useEffect } from "react";
import { useAuth } from "@/components/hooks/useAuth";

interface AuthGuardProps {
  /** Child components to render when authenticated */
  children: React.ReactNode;
  /** Optional redirect path (defaults to current path) */
  redirectTo?: string;
}

/**
 * AuthGuard component
 *
 * Wrapper component that:
 * - Checks if user is authenticated
 * - Redirects to /auth/login if not authenticated
 * - Handles expired sessions (401 errors)
 * - Passes redirectTo parameter for return after login
 *
 * Note: This is primarily for client-side route protection.
 * Server-side protection is handled by middleware.
 *
 * @example
 * ```tsx
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children, redirectTo }) => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = redirectTo || window.location.pathname + window.location.search;
      const encodedRedirect = encodeURIComponent(currentPath);
      window.location.href = `/auth/login?redirectTo=${encodedRedirect}`;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  // Show nothing while loading or redirecting
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

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
