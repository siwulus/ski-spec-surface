import type { Database } from '@/db/database.types';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { LogoutResponseSchema } from '@/types/api.types';
import { createBrowserClient } from '@supabase/ssr';
import type { AuthError, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
}

export interface ResetPasswordCredentials {
  email: string;
}

export interface UpdatePasswordCredentials {
  password: string;
}

export interface AuthResult {
  success: boolean;
  error?: AuthError;
}

export interface UseAuthReturn {
  /** Current authenticated user or null if not logged in */
  user: User | null;
  /** Loading state during initial session check */
  isLoading: boolean;
  /** Whether user is authenticated (convenience property) */
  isAuthenticated: boolean;
  /** Sign in with email and password */
  signIn: (credentials: LoginCredentials) => Promise<AuthResult>;
  /** Sign up with email and password */
  signUp: (credentials: SignUpCredentials) => Promise<AuthResult>;
  /** Sign out the current user */
  signOut: () => Promise<AuthResult>;
  /** Request password reset email */
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<AuthResult>;
  /** Update password (requires valid session from reset email) */
  updatePassword: (credentials: UpdatePasswordCredentials) => Promise<AuthResult>;
  /** Manually refresh the session */
  refreshSession: () => Promise<void>;
}

/**
 * Hook to manage authentication state on the client-side
 * Uses Supabase browser client for direct auth operations
 *
 * @returns Authentication state and methods
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Create Supabase browser client
   * Memoized to create only once per hook instance
   */
  const supabase = useMemo(
    () => createBrowserClient<Database>(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_KEY),
    []
  );

  /**
   * Fetches the current session from Supabase
   */
  const fetchUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }
      setUser(user ?? null);
      setIsAuthenticated(!!user);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching session:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [supabase.auth]);

  /**
   * Initialize session and subscribe to auth state changes
   */
  useEffect(() => {
    const initUser = async () => {
      setIsLoading(true);
      await fetchUser();
      setIsLoading(false);
    };

    initUser();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, supabase.auth]);

  /**
   * Sign in with email and password
   */
  const signIn = async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { success: false, error };
      }

      // State will be updated by onAuthStateChange subscription
      return { success: true };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error signing in:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (credentials: SignUpCredentials): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { success: false, error };
      }

      // State will be updated by onAuthStateChange subscription
      return { success: true };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error signing up:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    }
  };

  /**
   * Sign out the current user
   * Calls both client-side Supabase signOut and server-side logout API
   */
  const signOut = async (): Promise<AuthResult> => {
    try {
      // Call server-side logout API to clear server session
      await skiSpecHttpClient.post('/api/auth/logout', LogoutResponseSchema, null);

      // Call client-side Supabase signOut to clear local session
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { success: false, error };
      }

      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error signing out:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    }
  };

  /**
   * Request password reset email
   */
  const resetPassword = async (credentials: ResetPasswordCredentials): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(credentials.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error requesting password reset:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    }
  };

  /**
   * Update password (requires valid session from reset email)
   */
  const updatePassword = async (credentials: UpdatePasswordCredentials): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: credentials.password,
      });

      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating password:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    }
  };

  /**
   * Manually refresh the session
   * Useful after login/registration to update the auth state
   */
  const refreshSession = async (): Promise<void> => {
    await fetchUser();
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
  };
};
