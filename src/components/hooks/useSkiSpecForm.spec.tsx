import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSkiSpecForm } from './useSkiSpecForm';

describe('useSkiSpecForm', () => {
  describe('initialization', () => {
    it('initializes with sensible default values and not dirty', () => {
      const { result } = renderHook(() => useSkiSpecForm());

      const values = result.current.form.getValues();
      expect(values.name).toBe('');
      expect(values.description).toBeNull();
      expect(values.length).toBe(180);
      expect(values.tip).toBe(130);
      expect(values.waist).toBe(100);
      expect(values.tail).toBe(120);
      expect(values.radius).toBe(15);
      expect(values.weight).toBe(1500);

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.form.formState.isDirty).toBe(false);
    });

    it('applies provided default values without marking the form dirty', () => {
      const { result } = renderHook(() => useSkiSpecForm({ name: 'Custom', length: 190, radius: 19.5, weight: 1600 }));

      const values = result.current.form.getValues();
      expect(values.name).toBe('Custom');
      expect(values.length).toBe(190);
      expect(values.radius).toBe(19.5);
      expect(values.weight).toBe(1600);

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.form.formState.isDirty).toBe(false);
    });
  });

  describe('dirty state tracking', () => {
    it('sets hasUnsavedChanges to true after a field value changes', async () => {
      const { result } = renderHook(() => useSkiSpecForm());

      await act(async () => {
        result.current.form.setValue('name', 'New Name', { shouldDirty: true });
      });

      await waitFor(() => {
        expect(result.current.form.formState.isDirty).toBe(true);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('validation (zodResolver)', () => {
    it('validates required name field', async () => {
      const { result } = renderHook(() => useSkiSpecForm());

      // Use handleSubmit to run resolver and collect errors
      const onValid = vi.fn();
      const onInvalid = vi.fn();

      await act(async () => {
        await result.current.form.handleSubmit(onValid, onInvalid)();
      });

      expect(onValid).not.toHaveBeenCalled();
      expect(onInvalid).toHaveBeenCalled();

      const errors = onInvalid.mock.calls[0][0] as ReturnType<typeof result.current.form.getFieldState>;
      // @ts-expect-error - errors is FieldErrors, index by key
      expect(errors.name?.message).toBe('Name is required');
    });

    it('validates waist must be <= tip and tail (refinement)', async () => {
      const { result } = renderHook(() => useSkiSpecForm());

      // Defaults: tip=130, tail=120; set waist greater to violate the rule
      await act(async () => {
        result.current.form.setValue('waist', 125, { shouldDirty: true, shouldValidate: true });
      });

      await act(async () => {
        await result.current.form.trigger();
      });

      expect(result.current.form.formState.errors.waist?.message).toBe(
        'Waist must be less than or equal to both tip and tail widths'
      );
    });

    it('validates radius allows at most 2 decimal places', async () => {
      const { result } = renderHook(() => useSkiSpecForm());

      await act(async () => {
        result.current.form.setValue('radius', 10.123, { shouldDirty: true, shouldValidate: true });
      });

      await act(async () => {
        await result.current.form.trigger('radius');
      });

      expect(result.current.form.formState.errors.radius?.message).toBe('Radius must have at most 2 decimal places');
    });
  });
});
