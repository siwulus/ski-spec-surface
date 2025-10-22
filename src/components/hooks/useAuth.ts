import { useState, useEffect, useCallback } from "react";
import { get, post } from "@/lib/utils/httpClient";
import { SessionResponseSchema, LogoutResponseSchema, type UserDTO } from "@/types/api.types";

export interface UseAuthReturn {
  /** Current authenticated user or null if not logged in */
  user: UserDTO | null;
  /** Loading state during initial session check */
  isLoading: boolean;
  /** Whether user is authenticated (convenience property) */
  isAuthenticated: boolean;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Manually refresh the session */
  refreshSession: () => Promise<void>;
}

/**
 * Hook to manage authentication state on the client-side
 * Uses API endpoints instead of direct Supabase client calls
 *
 * @returns Authentication state and methods
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches the current session from the API
   */
  const fetchSession = useCallback(async () => {
    try {
      const response = await get("/api/auth/session", SessionResponseSchema);
      setUser(response.user ?? null);
      setIsAuthenticated(response.isAuthenticated);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching session:", error);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Initialize session on mount
   */
  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      await fetchSession();
      setIsLoading(false);
    };

    initSession();
  }, [fetchSession]);

  /**
   * Sign out the current user
   * Calls the logout API endpoint and clears local state
   */
  const signOut = async (): Promise<void> => {
    try {
      await post("/api/auth/logout", LogoutResponseSchema, null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error signing out:", error);
      throw error;
    }
  };

  /**
   * Manually refresh the session
   * Useful after login/registration to update the auth state
   */
  const refreshSession = async (): Promise<void> => {
    await fetchSession();
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    signOut,
    refreshSession,
  };
};
