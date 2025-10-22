import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/hooks/useAuth";
import { RegisterSchema, type RegisterFormData } from "@/types/auth.schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

/**
 * RegisterForm component
 *
 * Provides user registration functionality with:
 * - Email, password, and confirm password fields
 * - Real-time password strength indicator
 * - Client-side validation with Zod
 * - Supabase-based authentication via useAuth hook
 * - Automatic login after successful registration
 * - Redirect to /ski-specs after registration
 *
 * @example
 * ```tsx
 * <RegisterForm />
 * ```
 */
export const RegisterForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch password field for strength indicator
  const watchedPassword = form.watch("password");

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    setIsLoading(true);

    try {
      const { success, error } = await signUp({
        email: data.email,
        password: data.password,
      });

      if (!success) {
        toast.error(error?.message || "Failed to create account");
        return;
      }

      // Success - user account created
      toast.success("Account created successfully!");
      // Force full page reload to refresh middleware and session
      window.location.href = "/ski-specs";
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Registration error:", error);
      toast.error("An unexpected error occurred. Please try again.");
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
                  placeholder="Create a strong password"
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
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Re-enter your password"
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
          {isLoading ? "Creating account..." : "Create account"}
        </Button>

        {/* Link to login */}
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a
            href="/auth/login"
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Log in
          </a>
        </div>
      </form>
    </Form>
  );
};
