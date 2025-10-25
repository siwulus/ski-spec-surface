import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { CreateSkiSpecCommand } from '@/types/api.types';

/**
 * Props for textarea with character counter
 */
export interface TextareaWithCounterProps {
  /** Field name for registration */
  name: string;
  /** Field label */
  label: string;
  /** Maximum character length */
  maxLength: number;
  /** Current character count */
  currentLength: number;
  /** Whether field is required */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Textarea field with character counter
 * Integrates with React Hook Form
 */
export const TextareaWithCounter: React.FC<TextareaWithCounterProps> = ({
  name,
  label,
  maxLength,
  currentLength,
  required = false,
  error,
  disabled = false,
}) => {
  const { register, formState } = useFormContext<CreateSkiSpecCommand>();

  const fieldError = error || formState.errors[name as keyof CreateSkiSpecCommand]?.message;
  const hasError = !!fieldError;

  // Calculate remaining characters
  const remaining = maxLength - currentLength;
  const isNearLimit = remaining < 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={name} className={hasError ? 'text-destructive' : ''}>
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </Label>

        {/* Character counter */}
        <span
          className={`text-sm ${isNearLimit ? 'text-warning' : 'text-muted-foreground'}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {remaining} / {maxLength}
        </span>
      </div>

      <Textarea
        id={name}
        rows={4}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : `${name}-counter`}
        aria-required={required}
        className={hasError ? 'border-destructive' : ''}
        {...register(name as keyof CreateSkiSpecCommand)}
      />

      <div id={`${name}-counter`} className="sr-only">
        {remaining} characters remaining out of {maxLength}
      </div>

      {hasError && (
        <p id={`${name}-error`} className="text-sm text-destructive" role="alert">
          {fieldError as string}
        </p>
      )}
    </div>
  );
};
