import { renderHook, waitFor } from '@testing-library/react';
import { AuthError, type Session, type User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { Effect } from 'effect';

// Mock Supabase client
const mockGetUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockOnAuthStateChange = vi.fn();

// Mock SkiSpecHttpClient
vi.mock('@/lib/utils/SkiSpecHttpClient');

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  })),
}));

describe('useAuth', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
  };

  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  const mockAuthError: AuthError = new AuthError('Invalid credentials', 401);

  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables required by useAuth hook
    vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('PUBLIC_SUPABASE_KEY', 'test-anon-key');

    // Setup default mock return values
    unsubscribe = vi.fn();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    // Default: user is not authenticated
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  describe('Initialization and Session Management', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should fetch user on mount', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetUser).toHaveBeenCalledTimes(1);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should set user to null when no session exists', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle error when fetching user fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching session:', mockAuthError);

      consoleErrorSpy.mockRestore();
    });

    it('should subscribe to auth state changes on mount', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
      expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should update state when auth state changes', async () => {
      let authStateCallback: (event: string, session: Session | null) => void = () => {
        void 0;
      };

      mockOnAuthStateChange.mockImplementationOnce((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe } } };
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate auth state change
      authStateCallback('SIGNED_IN', mockSession);

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should unsubscribe from auth state changes on unmount', async () => {
      const { unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('signIn', () => {
    it('should successfully sign in with valid credentials', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(authResult.success).toBe(true);
      expect(authResult.error).toBeUndefined();
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return error when sign in fails', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.signIn({
        email: 'test@example.com',
        password: 'wrong-password',
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(mockAuthError);
    });

    it('should handle exception during sign in', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const thrownError = new Error('Network error');

      mockSignInWithPassword.mockRejectedValueOnce(thrownError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(thrownError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing in:', thrownError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('signUp', () => {
    it('should successfully sign up with valid credentials', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.signUp({
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(authResult.success).toBe(true);
      expect(authResult.error).toBeUndefined();
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
    });

    it('should return error when sign up fails', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.signUp({
        email: 'existing@example.com',
        password: 'password123',
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(mockAuthError);
    });

    it('should handle exception during sign up', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const thrownError = new Error('Network error');

      mockSignUp.mockRejectedValueOnce(thrownError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.signUp({
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(thrownError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing up:', thrownError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockSignOut.mockResolvedValueOnce({
        error: null,
      });

      vi.mocked(skiSpecHttpClient.post).mockReturnValueOnce(Effect.succeed({}));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      const authResult = await result.current.signOut();

      expect(authResult.success).toBe(true);
      expect(authResult.error).toBeUndefined();
      expect(skiSpecHttpClient.post).toHaveBeenCalledWith('/api/auth/logout', expect.anything(), null);
      expect(mockSignOut).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should return error when sign out fails', async () => {
      mockSignOut.mockResolvedValueOnce({
        error: mockAuthError,
      });

      vi.mocked(skiSpecHttpClient.post).mockReturnValueOnce(Effect.succeed({}));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.signOut();

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(mockAuthError);
    });

    it('should handle exception during sign out', async () => {
      const { skiSpecHttpClient } = await import('@/lib/utils/SkiSpecHttpClient');
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const thrownError = new Error('Network error');

      (skiSpecHttpClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(thrownError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.signOut();

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(thrownError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing out:', thrownError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('resetPassword', () => {
    it('should successfully request password reset', async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.resetPassword({
        email: 'test@example.com',
      });

      expect(authResult.success).toBe(true);
      expect(authResult.error).toBeUndefined();
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: 'http://localhost:3000/api/auth/callback',
      });
    });

    it('should return error when password reset fails', async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.resetPassword({
        email: 'test@example.com',
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(mockAuthError);
    });

    it('should handle exception during password reset', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const thrownError = new Error('Network error');

      mockResetPasswordForEmail.mockRejectedValueOnce(thrownError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.resetPassword({
        email: 'test@example.com',
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(thrownError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error requesting password reset:', thrownError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updatePassword', () => {
    it('should successfully update password', async () => {
      mockUpdateUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.updatePassword({
        password: 'newpassword123',
      });

      expect(authResult.success).toBe(true);
      expect(authResult.error).toBeUndefined();
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });

    it('should return error when password update fails', async () => {
      mockUpdateUser.mockResolvedValueOnce({
        data: { user: null },
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.updatePassword({
        password: 'newpassword123',
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(mockAuthError);
    });

    it('should handle exception during password update', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const thrownError = new Error('Network error');

      mockUpdateUser.mockRejectedValueOnce(thrownError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const authResult = await result.current.updatePassword({
        password: 'newpassword123',
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toEqual(thrownError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating password:', thrownError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('refreshSession', () => {
    it('should manually refresh the session', async () => {
      mockGetUser
        .mockResolvedValueOnce({
          data: { user: null },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { user: mockUser },
          error: null,
        });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      await result.current.refreshSession();

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(mockGetUser).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during session refresh', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      mockGetUser
        .mockResolvedValueOnce({
          data: { user: mockUser },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { user: null },
          error: mockAuthError,
        });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await result.current.refreshSession();

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching session:', mockAuthError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Return value consistency', () => {
    it('should return all required properties', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('signIn');
      expect(result.current).toHaveProperty('signUp');
      expect(result.current).toHaveProperty('signOut');
      expect(result.current).toHaveProperty('resetPassword');
      expect(result.current).toHaveProperty('updatePassword');
      expect(result.current).toHaveProperty('refreshSession');
    });

    it('should maintain consistent return type signatures', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.resetPassword).toBe('function');
      expect(typeof result.current.updatePassword).toBe('function');
      expect(typeof result.current.refreshSession).toBe('function');
    });
  });

  describe('Supabase client memoization', () => {
    it('should create Supabase client only once', async () => {
      const { createBrowserClient } = await import('@supabase/ssr');

      const { rerender } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalled();
      });

      const callCount = (createBrowserClient as ReturnType<typeof vi.fn>).mock.calls.length;

      rerender();

      expect((createBrowserClient as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });
  });
});
