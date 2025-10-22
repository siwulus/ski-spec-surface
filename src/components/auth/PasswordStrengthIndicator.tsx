import React from "react";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  /** Password string to evaluate */
  password: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

/**
 * Calculate password strength as a percentage (0-100)
 * Each requirement met contributes 25% to the total strength
 */
const calculateStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  return strength;
};

/**
 * Get color for progress bar based on strength percentage
 */
// const getStrengthColor = (strength: number): string => {
//   if (strength === 0) return "bg-muted";
//   if (strength <= 25) return "bg-destructive";
//   if (strength <= 50) return "bg-orange-500";
//   if (strength <= 75) return "bg-yellow-500";
//   return "bg-green-500";
// };

/**
 * Get text label for password strength
 */
const getStrengthLabel = (strength: number): string => {
  if (strength === 0) return "No password";
  if (strength <= 25) return "Weak";
  if (strength <= 50) return "Fair";
  if (strength <= 75) return "Good";
  return "Strong";
};

/**
 * PasswordStrengthIndicator component
 *
 * Displays real-time password strength visualization with:
 * - Progress bar (0-100%) with color coding
 * - Checklist of password requirements
 *
 * Used in RegisterForm and UpdatePasswordForm
 *
 * @example
 * ```tsx
 * <PasswordStrengthIndicator password={watchedPassword} />
 * ```
 */
export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const strength = calculateStrength(password);
  //const strengthColor = getStrengthColor(strength);
  const strengthLabel = getStrengthLabel(strength);

  const requirements: PasswordRequirement[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
  ];

  return (
    <div className="space-y-3" aria-live="polite">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          <span
            className={`font-medium ${
              strength === 0
                ? "text-muted-foreground"
                : strength <= 25
                  ? "text-destructive"
                  : strength <= 50
                    ? "text-orange-500"
                    : strength <= 75
                      ? "text-yellow-600"
                      : "text-green-600"
            }`}
          >
            {strengthLabel}
          </span>
        </div>
        <Progress
          value={strength}
          className="h-2"
          aria-valuenow={strength}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Password strength: ${strengthLabel}`}
        />
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">Password must contain:</p>
        <ul className="space-y-1">
          {requirements.map((req, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              {req.met ? (
                <Check className="size-4 shrink-0 text-green-600" aria-hidden="true" />
              ) : (
                <X className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className={req.met ? "text-foreground" : "text-muted-foreground"}>{req.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
