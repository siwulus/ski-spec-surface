import { z } from "zod";

/**
 * Login form validation schema
 *
 * Validates:
 * - Email format
 * - Password minimum length (6 characters for login)
 * - Optional "remember me" checkbox
 */
export const LoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

/**
 * Registration form validation schema
 *
 * Validates:
 * - Email format
 * - Password strength requirements (8+ chars, upper, lower, number)
 * - Password confirmation match
 */
export const RegisterSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof RegisterSchema>;

/**
 * Password reset request form validation schema
 *
 * Validates:
 * - Email format
 */
export const ResetPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;

/**
 * Update password form validation schema
 *
 * Validates:
 * - New password strength requirements (8+ chars, upper, lower, number)
 * - Password confirmation match
 */
export const UpdatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UpdatePasswordFormData = z.infer<typeof UpdatePasswordSchema>;
