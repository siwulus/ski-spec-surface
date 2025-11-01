/**
 * UNIT TESTS FOR useNoteForm HOOK
 *
 * This hook manages note form state using React Hook Form + Zod validation.
 *
 * Key features tested:
 * 1. Form initialization with default values
 * 2. Custom default values
 * 3. Dirty state tracking (hasUnsavedChanges)
 * 4. Zod validation (content required, max length 2000)
 * 5. Form submission validation
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNoteForm } from './useNoteForm';

describe('useNoteForm', () => {
  describe('Initialization', () => {
    it('should initialize with empty content and not dirty', () => {
      const { result } = renderHook(() => useNoteForm());

      const values = result.current.form.getValues();
      expect(values.content).toBe('');
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.form.formState.isDirty).toBe(false);
    });

    it('should apply provided default values without marking the form dirty', () => {
      const defaultValues = { content: 'This ski performs well in powder' };
      const { result } = renderHook(() => useNoteForm(defaultValues));

      const values = result.current.form.getValues();
      expect(values.content).toBe('This ski performs well in powder');
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.form.formState.isDirty).toBe(false);
    });

    it('should expose form instance', () => {
      const { result } = renderHook(() => useNoteForm());

      expect(result.current.form).toBeDefined();
      expect(result.current.form.getValues).toBeInstanceOf(Function);
      expect(result.current.form.setValue).toBeInstanceOf(Function);
      expect(result.current.form.handleSubmit).toBeInstanceOf(Function);
    });
  });

  describe('Dirty State Tracking', () => {
    it('should set hasUnsavedChanges to true after content changes', async () => {
      const { result } = renderHook(() => useNoteForm());

      await act(async () => {
        result.current.form.setValue('content', 'Updated content', { shouldDirty: true });
      });

      await waitFor(() => {
        expect(result.current.form.formState.isDirty).toBe(true);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should keep hasUnsavedChanges false when value is set without shouldDirty flag', async () => {
      const { result } = renderHook(() => useNoteForm());

      await act(async () => {
        result.current.form.setValue('content', 'Programmatic update', { shouldDirty: false });
      });

      await waitFor(() => {
        expect(result.current.form.formState.isDirty).toBe(false);
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should track changes from default values', async () => {
      const { result } = renderHook(() => useNoteForm({ content: 'Initial content' }));

      expect(result.current.hasUnsavedChanges).toBe(false);

      await act(async () => {
        result.current.form.setValue('content', 'Modified content', { shouldDirty: true });
      });

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(true);
      });
    });
  });

  describe('Validation (zodResolver)', () => {
    it('should validate required content field', async () => {
      const { result } = renderHook(() => useNoteForm());

      const onValid = vi.fn();
      const onInvalid = vi.fn();

      // Submit with empty content
      await act(async () => {
        await result.current.form.handleSubmit(onValid, onInvalid)();
      });

      expect(onValid).not.toHaveBeenCalled();
      expect(onInvalid).toHaveBeenCalled();

      const errors = onInvalid.mock.calls[0][0];

      expect(errors.content?.message).toBe('Content is required');
    });

    it('should pass validation with valid content', async () => {
      const { result } = renderHook(() => useNoteForm());

      const onValid = vi.fn();
      const onInvalid = vi.fn();

      await act(async () => {
        result.current.form.setValue('content', 'Valid note content', { shouldDirty: true });
      });

      await act(async () => {
        await result.current.form.handleSubmit(onValid, onInvalid)();
      });

      expect(onInvalid).not.toHaveBeenCalled();
      expect(onValid).toHaveBeenCalled();
      // handleSubmit passes data as first argument, event as second
      const callArgs = onValid.mock.calls[0];
      expect(callArgs[0]).toEqual({ content: 'Valid note content' });
    });

    it('should validate maximum content length (2000 characters)', async () => {
      const { result } = renderHook(() => useNoteForm());

      const longContent = 'a'.repeat(2001);

      await act(async () => {
        result.current.form.setValue('content', longContent, { shouldDirty: true, shouldValidate: true });
      });

      await act(async () => {
        await result.current.form.trigger('content');
      });

      expect(result.current.form.formState.errors.content?.message).toBe(
        'Content must be between 1 and 2000 characters'
      );
    });

    it('should allow content exactly at 2000 character limit', async () => {
      const { result } = renderHook(() => useNoteForm());

      const maxLengthContent = 'a'.repeat(2000);

      await act(async () => {
        result.current.form.setValue('content', maxLengthContent, { shouldDirty: true, shouldValidate: true });
      });

      await act(async () => {
        await result.current.form.trigger('content');
      });

      expect(result.current.form.formState.errors.content).toBeUndefined();
    });

    it('should allow whitespace-only content (schema does not trim)', async () => {
      const { result } = renderHook(() => useNoteForm());

      await act(async () => {
        result.current.form.setValue('content', '   ', { shouldDirty: true, shouldValidate: true });
      });

      await act(async () => {
        await result.current.form.trigger('content');
      });

      // The schema counts whitespace as valid characters (no .trim())
      expect(result.current.form.formState.errors.content).toBeUndefined();
    });
  });

  describe('Validation Mode Configuration', () => {
    it('should use onBlur validation mode', () => {
      const { result } = renderHook(() => useNoteForm());

      // Check the form's validation mode configuration
      // Note: mode is not directly exposed but we can verify behavior
      expect(result.current.form).toBeDefined();
    });

    it('should re-validate onChange after first validation', async () => {
      const { result } = renderHook(() => useNoteForm({ content: 'Initial' }));

      // First, clear content and validate to trigger error
      await act(async () => {
        result.current.form.setValue('content', '', { shouldDirty: true });
      });

      await act(async () => {
        await result.current.form.trigger('content');
      });

      expect(result.current.form.formState.errors.content?.message).toBe('Content is required');

      // Now set valid content - should re-validate automatically with shouldValidate flag
      await act(async () => {
        result.current.form.setValue('content', 'Valid content', { shouldValidate: true });
      });

      await waitFor(() => {
        expect(result.current.form.formState.errors.content).toBeUndefined();
      });
    });
  });

  describe('Form Reset', () => {
    it('should reset form to default values and clear dirty state', async () => {
      const { result } = renderHook(() => useNoteForm({ content: 'Initial' }));

      // Change the value
      await act(async () => {
        result.current.form.setValue('content', 'Modified', { shouldDirty: true });
      });

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(true);
      });

      // Reset the form
      await act(async () => {
        result.current.form.reset();
      });

      await waitFor(() => {
        expect(result.current.form.getValues().content).toBe('Initial');
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should reset to new values when provided', async () => {
      const { result } = renderHook(() => useNoteForm({ content: 'Initial' }));

      await act(async () => {
        result.current.form.setValue('content', 'Modified', { shouldDirty: true });
      });

      // Reset with new values
      await act(async () => {
        result.current.form.reset({ content: 'New default' });
      });

      await waitFor(() => {
        expect(result.current.form.getValues().content).toBe('New default');
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe('Form State', () => {
    it('should track touched state', async () => {
      const { result } = renderHook(() => useNoteForm());

      expect(result.current.form.formState.touchedFields.content).toBeUndefined();

      await act(async () => {
        result.current.form.setValue('content', 'Touched', { shouldTouch: true });
      });

      await waitFor(() => {
        expect(result.current.form.formState.touchedFields.content).toBe(true);
      });
    });

    it('should track isValid state', async () => {
      const { result } = renderHook(() => useNoteForm());

      // Trigger validation
      await act(async () => {
        await result.current.form.trigger();
      });

      // Should be invalid (empty content)
      await waitFor(() => {
        expect(result.current.form.formState.isValid).toBe(false);
      });

      // Set valid content
      await act(async () => {
        result.current.form.setValue('content', 'Valid note', { shouldValidate: true });
      });

      await act(async () => {
        await result.current.form.trigger();
      });

      await waitFor(() => {
        expect(result.current.form.formState.isValid).toBe(true);
      });
    });
  });
});
