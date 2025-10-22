import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateSkiSpecCommand } from "@/types/api.types";

/**
 * Props for numeric input with unit display
 */
export interface NumberInputWithUnitProps {
  /** Field name for registration */
  name: string;
  /** Field label */
  label: string;
  /** Unit to display (cm, mm, m, g) */
  unit: string;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Whether field is required */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Numeric input field with unit display and validation
 * Integrates with React Hook Form
 */
export const NumberInputWithUnit: React.FC<NumberInputWithUnitProps> = ({
  name,
  label,
  unit,
  min,
  max,
  required = true,
  error,
  disabled = false,
}) => {
  const { register, formState } = useFormContext<CreateSkiSpecCommand>();

  const fieldError = error || formState.errors[name as keyof CreateSkiSpecCommand]?.message;
  const hasError = !!fieldError;

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={hasError ? "text-destructive" : ""}>
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </Label>

      <div className="relative">
        <Input
          id={name}
          type="number"
          step="1"
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
          aria-required={required}
          className={hasError ? "border-destructive pr-12" : "pr-12"}
          {...register(name as keyof CreateSkiSpecCommand, {
            valueAsNumber: true, // Convert string to number
          })}
        />

        {/* Unit label positioned inside input on the right */}
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none"
          aria-hidden="true"
        >
          {unit}
        </span>
      </div>

      {hasError && (
        <p id={`${name}-error`} className="text-sm text-destructive" role="alert">
          {fieldError as string}
        </p>
      )}
    </div>
  );
};
