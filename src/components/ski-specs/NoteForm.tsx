import React from 'react';
import { FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNoteForm } from '@/components/hooks/useNoteForm';
import type { CreateNoteCommand } from '@/types/api.types';

/**
 * Props for the note form component
 */
export interface NoteFormProps {
  /** Form submission handler */
  onSubmit: (data: CreateNoteCommand) => Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Default form values (for editing) */
  defaultValues?: Partial<CreateNoteCommand>;
  /** Submission state */
  isSubmitting: boolean;
  /** API validation errors mapped by field name */
  apiErrors?: Record<string, string>;
  /** Callback to notify parent of unsaved changes state */
  onUnsavedChanges?: (hasUnsavedChanges: boolean) => void;
}

const MAX_CONTENT_LENGTH = 2000;

/**
 * Form component for creating/editing notes.
 * Uses React Hook Form with Zod validation.
 */
export const NoteForm: React.FC<NoteFormProps> = ({
  onSubmit,
  onCancel,
  defaultValues,
  isSubmitting,
  apiErrors = {},
  onUnsavedChanges,
}) => {
  const { form, hasUnsavedChanges } = useNoteForm(defaultValues);
  const { register, watch, formState, handleSubmit, setError } = form;

  // Watch content field for character counter
  const content = watch('content');
  const contentLength = content?.length || 0;
  const remaining = MAX_CONTENT_LENGTH - contentLength;
  const isNearLimit = remaining < 100;

  // Notify parent of unsaved changes state
  React.useEffect(() => {
    onUnsavedChanges?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChanges]);

  // Set API errors on fields when they arrive
  React.useEffect(() => {
    Object.entries(apiErrors).forEach(([field, message]) => {
      setError(field as keyof CreateNoteCommand, {
        type: 'manual',
        message,
      });
    });
  }, [apiErrors, setError]);

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
  });

  const hasError = !!formState.errors.content;
  const errorMessage = formState.errors.content?.message;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Content field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content" className={hasError ? 'text-destructive' : ''}>
              Content
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            </Label>

            {/* Character counter */}
            <span
              className={`text-sm ${isNearLimit ? 'text-warning' : 'text-muted-foreground'}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {remaining} / {MAX_CONTENT_LENGTH}
            </span>
          </div>

          <Textarea
            id="content"
            rows={6}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder="Enter your note here..."
            data-testid="note-form-content"
            disabled={isSubmitting}
            aria-invalid={hasError}
            aria-describedby={hasError ? 'content-error' : 'content-counter'}
            aria-required={true}
            className={hasError ? 'border-destructive' : ''}
            {...register('content')}
          />

          <div id="content-counter" className="sr-only">
            {remaining} characters remaining out of {MAX_CONTENT_LENGTH}
          </div>

          {hasError && (
            <p id="content-error" className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : defaultValues ? 'Update Note' : 'Add Note'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
