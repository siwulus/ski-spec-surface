import React from 'react';
import { FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInputWithUnit } from './NumberInputWithUnit';
import { TextareaWithCounter } from './TextareaWithCounter';
import { useSkiSpecForm } from '@/components/hooks/useSkiSpecForm';
import type { CreateSkiSpecCommand } from '@/types/api.types';

/**
 * Props for the form component
 */
export interface SkiSpecFormProps {
  /** Form submission handler */
  onSubmit: (data: CreateSkiSpecCommand) => Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Default form values */
  defaultValues?: Partial<CreateSkiSpecCommand>;
  /** Submission state */
  isSubmitting: boolean;
  /** API validation errors mapped by field name */
  apiErrors?: Record<string, string>;
  /** Callback to notify parent of unsaved changes state */
  onUnsavedChanges?: (hasUnsavedChanges: boolean) => void;
}

/**
 * Main form component for creating/editing ski specifications
 * Uses React Hook Form with Zod validation
 */
export const SkiSpecForm: React.FC<SkiSpecFormProps> = ({
  onSubmit,
  onCancel,
  defaultValues,
  isSubmitting,
  apiErrors = {},
  onUnsavedChanges,
}) => {
  const { form, hasUnsavedChanges } = useSkiSpecForm(defaultValues);
  const { watch, formState, handleSubmit, setError } = form;

  // Watch description field for character counter
  const description = watch('description');
  const descriptionLength = description?.length || 0;

  // Notify parent of unsaved changes state
  React.useEffect(() => {
    onUnsavedChanges?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChanges]);

  // Set API errors on fields when they arrive
  React.useEffect(() => {
    Object.entries(apiErrors).forEach(([field, message]) => {
      setError(field as keyof CreateSkiSpecCommand, {
        type: 'manual',
        message,
      });
    });
  }, [apiErrors, setError]);

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Name field */}
        <div className="space-y-2">
          <Label htmlFor="name" className={formState.errors.name ? 'text-destructive' : ''}>
            Name
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          </Label>
          <Input
            id="name"
            type="text"
            disabled={isSubmitting}
            aria-invalid={!!formState.errors.name}
            aria-describedby={formState.errors.name ? 'name-error' : undefined}
            aria-required="true"
            className={formState.errors.name ? 'border-destructive' : ''}
            {...form.register('name')}
          />
          {formState.errors.name && (
            <p id="name-error" className="text-sm text-destructive" role="alert">
              {formState.errors.name.message}
            </p>
          )}
        </div>

        {/* Description field with counter */}
        <TextareaWithCounter
          name="description"
          label="Description (optional)"
          maxLength={2000}
          currentLength={descriptionLength}
          required={false}
          disabled={isSubmitting}
        />

        {/* Dimensions grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInputWithUnit name="length" label="Length" unit="cm" min={100} max={250} disabled={isSubmitting} />

          <NumberInputWithUnit
            name="radius"
            label="Radius"
            unit="m"
            min={1}
            max={30}
            step={0.5}
            disabled={isSubmitting}
          />
        </div>

        {/* Width fields - all three in one row on larger screens */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Widths</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberInputWithUnit name="tip" label="Tip" unit="mm" min={50} max={250} disabled={isSubmitting} />

            <NumberInputWithUnit name="waist" label="Waist" unit="mm" min={50} max={250} disabled={isSubmitting} />

            <NumberInputWithUnit name="tail" label="Tail" unit="mm" min={50} max={250} disabled={isSubmitting} />
          </div>

          {/* Show cross-field validation error under waist */}
          {formState.errors.waist && (
            <p className="text-sm text-destructive" role="alert">
              {formState.errors.waist.message}
            </p>
          )}
        </div>

        {/* Weight field */}
        <NumberInputWithUnit
          name="weight"
          label="Weight (single ski)"
          unit="g"
          min={500}
          max={3000}
          disabled={isSubmitting}
        />

        {/* Form actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button type="submit" disabled={isSubmitting || !formState.isValid}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
