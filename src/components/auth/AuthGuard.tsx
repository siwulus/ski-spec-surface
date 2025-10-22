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
