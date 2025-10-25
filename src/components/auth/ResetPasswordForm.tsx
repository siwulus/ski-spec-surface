import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ResetPasswordSchema, type ResetPasswordFormData } from '@/types/auth.types';
import { useAuth } from '@/components/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MailCheck } from 'lucide-react';

/**
 * ResetPasswordForm component
 *
 * Provides password reset request functionality with:
 * - Email input field
 * - Client-side validation with Zod
 * - Supabase-based password reset via useAuth hook
 * - Success message (always shown - security best practice)
 * - Link back to login page
 *
 * Security note: Always shows success message even if email doesn't exist
 * to prevent email enumeration attacks.
 *
 * @example
 * ```tsx
 * <ResetPasswordForm />
 * ```
 */
export const ResetPasswordForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData): Promise<void> => {
    setIsLoading(true);

    try {
      const { success, error } = await resetPassword({ email: data.email });

      if (!success) {
        toast.error(error?.message || 'Failed to send reset email');
        return;
      }

      // Always show success state (security best practice - don't reveal if email exists)
      setEmailSent(true);
      toast.success('Password reset email sent');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Reset password error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show success message after email submission
  if (emailSent) {
    return (
      <div className="space-y-6">
        <Alert>
          <MailCheck className="size-4" />
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>
            If an account exists with the email address you provided, you will receive a password reset link. Please
            check your inbox and spam folder.
          </AlertDescription>
        </Alert>

        <div className="text-center text-sm">
          <a
            href="/auth/login"
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  // Show form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Enter your email address and we&apos;ll send you a link to reset your password.</p>
        </div>

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
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send reset link'}
        </Button>

        {/* Link back to login */}
        <div className="text-center text-sm">
          <a
            href="/auth/login"
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Back to login
          </a>
        </div>
      </form>
    </Form>
  );
};
