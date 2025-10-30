import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/hooks/useAuth';
import { LoginSchema, type LoginFormData } from '@/types/auth.types';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface LoginFormProps {
  /** Optional redirect path after successful login (from URL param) */
  redirectTo?: string;
}

/**
 * LoginForm component
 *
 * Provides login functionality with:
 * - Email and password fields
 * - Client-side validation with Zod
 * - Supabase-based authentication via useAuth hook
 * - Error handling with user-friendly messages
 * - Redirect after successful login
 * - Detection of passwordChanged query param to show success message after password reset
 *
 * @example
 * ```tsx
 * <LoginForm redirectTo="/ski-specs" />
 * ```
 */
export const LoginForm: React.FC<LoginFormProps> = ({ redirectTo }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Detect passwordChanged query param and show success message
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('passwordChanged') === 'true') {
      toast.success('Password updated successfully! You can now log in with your new password.');
      // Clean up URL by removing the query param for cleaner UX
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setIsLoading(true);

    try {
      const { success, error } = await signIn({
        email: data.email,
        password: data.password,
      });

      if (!success) {
        toast.error(error?.message || 'Failed to sign in');
        return;
      }

      // Success - redirect to intended page or default
      toast.success('Successfully logged in!');

      // Force full page reload to refresh middleware and session
      const destination = redirectTo || '/ski-specs';
      window.location.href = destination;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Login error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Email field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  data-testid="email-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  data-testid="password-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isLoading} data-testid="login-submit-button">
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>

        {/* Links */}
        <div className="space-y-2 text-center text-sm">
          <div>
            <a
              href="/auth/reset-password"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Forgot your password?
            </a>
          </div>
          <div className="text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a
              href="/auth/register"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Sign up
            </a>
          </div>
        </div>
      </form>
    </Form>
  );
};
