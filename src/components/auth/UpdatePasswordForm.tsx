import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UpdatePasswordSchema, type UpdatePasswordFormData } from "@/types/auth.types";
import { useAuth } from "@/components/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle } from "lucide-react";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

/**
 * UpdatePasswordForm component
 *
 * Provides password update functionality with:
 * - New password and confirm password fields
 * - Real-time password strength indicator
 * - Client-side validation with Zod
 * - Supabase-based password update via useAuth hook
 * - Automatic redirect to /ski-specs after success
 *
 * Used on /auth/update-password page after password reset email link.
 * The session is established by the server-side middleware when the user
 * clicks the reset link from their email.
 *
 * @example
 * ```tsx
 * <UpdatePasswordForm />
 * ```
 */
export const UpdatePasswordForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { updatePassword } = useAuth();

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(UpdatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Watch password field for strength indicator
  const watchedPassword = form.watch("password");

  const onSubmit = async (data: UpdatePasswordFormData): Promise<void> => {
    setIsLoading(true);

    try {
      const { success, error } = await updatePassword({ password: data.password });

      if (!success) {
        toast.error(error?.message || "Failed to update password");
        return;
      }
      // Success
      setIsSuccess(true);
      toast.success("Password updated successfully!");

      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = "/ski-specs";
      }, 2000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Update password error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show success state
  if (isSuccess) {
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle className="size-4" />
          <AlertTitle>Password updated successfully!</AlertTitle>
          <AlertDescription>
            Your password has been updated. You will be redirected to the main page shortly.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Enter your new password below.</p>
        </div>

        {/* New password field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password strength indicator - only show when password is entered */}
        {watchedPassword && watchedPassword.length > 0 && <PasswordStrengthIndicator password={watchedPassword} />}

        {/* Confirm password field */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
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
          {isLoading ? "Updating password..." : "Update password"}
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
