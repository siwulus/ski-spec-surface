import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateSkiSpecCommand, SkiSpecDTO, UpdateSkiSpecCommand } from '@/types/api.types';
import { SkiSpecDTOSchema } from '@/types/api.types';
import { Effect } from 'effect';
import { ValidationError, NetworkError } from '@/types/error.types';

vi.mock('@/lib/utils/SkiSpecHttpClient');
vi.mock('./useErrorHandler');

import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { useErrorHandler } from './useErrorHandler';
import { useSkiSpecMutation } from './useSkiSpecMutation';

const mockCreateCommand: CreateSkiSpecCommand = {
  name: 'Mock Spec',
  description: 'A mock ski specification',
  length: 180,
  tip: 140,
  waist: 110,
  tail: 130,
  radius: 18,
  weight: 1800,
};

const mockUpdateCommand: UpdateSkiSpecCommand = {
  ...mockCreateCommand,
  name: 'Updated Mock Spec',
  description: 'Updated description',
};

const mockSkiSpec: SkiSpecDTO = {
  id: 'spec-1',
  user_id: 'user-1',
  name: mockCreateCommand.name,
  description: mockCreateCommand.description,
  length: mockCreateCommand.length,
  tip: mockCreateCommand.tip,
  waist: mockCreateCommand.waist,
  tail: mockCreateCommand.tail,
  radius: mockCreateCommand.radius,
  weight: mockCreateCommand.weight,
  surface_area: 12345,
  relative_weight: 0.08,
  algorithm_version: '1.0.0',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  notes_count: 0,
};

describe('useSkiSpecMutation', () => {
  const mockShowError = vi.fn().mockReturnValue({});
  const mockShowSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useErrorHandler).mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    });

    vi.mocked(skiSpecHttpClient.post).mockReturnValue(Effect.succeed(mockSkiSpec));
    vi.mocked(skiSpecHttpClient.put).mockReturnValue(
      Effect.succeed({
        ...mockSkiSpec,
        name: mockUpdateCommand.name,
        description: mockUpdateCommand.description,
      })
    );
    vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.succeed(mockSkiSpec));
    vi.mocked(skiSpecHttpClient.deleteNoContent).mockReturnValue(Effect.succeed(undefined));
  });

  describe('initial state', () => {
    it('should expose default state values', () => {
      const { result } = renderHook(() => useSkiSpecMutation());

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.apiErrors).toEqual({});
      expect(result.current.createSkiSpec).toBeInstanceOf(Function);
      expect(result.current.updateSkiSpec).toBeInstanceOf(Function);
      expect(result.current.getSkiSpec).toBeInstanceOf(Function);
      expect(result.current.deleteSkiSpec).toBeInstanceOf(Function);
    });
  });

  describe('createSkiSpec', () => {
    it('should submit new specification and show success message', async () => {
      const { result } = renderHook(() => useSkiSpecMutation());

      let response: SkiSpecDTO | undefined;
      await act(async () => {
        response = await result.current.createSkiSpec(mockCreateCommand);
      });

      expect(response).toEqual(mockSkiSpec);
      expect(skiSpecHttpClient.post).toHaveBeenCalledWith('/api/ski-specs', SkiSpecDTOSchema, mockCreateCommand);
      expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Specification has been added');
      await waitFor(() => expect(result.current.isSubmitting).toBe(false));
      expect(result.current.apiErrors).toEqual({});
    });

    it('should handle validation errors and collect field errors', async () => {
      const validationError = new ValidationError('Invalid data', [{ field: 'name', message: 'Required' }]);
      const fieldErrors = { name: 'Required' };

      vi.mocked(skiSpecHttpClient.post).mockReturnValueOnce(Effect.fail(validationError));
      mockShowError.mockReturnValueOnce(fieldErrors);

      const { result } = renderHook(() => useSkiSpecMutation());

      await act(async () => {
        await expect(result.current.createSkiSpec(mockCreateCommand)).rejects.toThrow('Invalid data');
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));

      expect(mockShowError).toHaveBeenCalledWith(validationError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
      await waitFor(() => expect(result.current.apiErrors).toEqual(fieldErrors));
    });

    it('should clear previous api errors before a new submission', async () => {
      const validationError = new ValidationError('Invalid data', [{ field: 'length', message: 'Out of range' }]);
      const errorMap = { length: 'Out of range' };

      vi.mocked(skiSpecHttpClient.post)
        .mockReturnValueOnce(Effect.fail(validationError))
        .mockReturnValueOnce(Effect.succeed(mockSkiSpec));
      mockShowError.mockReturnValueOnce(errorMap).mockReturnValueOnce({});

      const { result } = renderHook(() => useSkiSpecMutation());

      await act(async () => {
        await expect(result.current.createSkiSpec(mockCreateCommand)).rejects.toThrow('Invalid data');
      });

      await waitFor(() => expect(result.current.apiErrors).toEqual(errorMap));

      let response: SkiSpecDTO | undefined;
      await act(async () => {
        response = await result.current.createSkiSpec(mockCreateCommand);
      });

      expect(response).toEqual(mockSkiSpec);
      await waitFor(() => expect(result.current.apiErrors).toEqual({}));
    });
  });

  describe('updateSkiSpec', () => {
    it('should update specification and show success message', async () => {
      const { result } = renderHook(() => useSkiSpecMutation());

      await act(async () => {
        await result.current.updateSkiSpec('spec-1', mockUpdateCommand);
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));
      expect(skiSpecHttpClient.put).toHaveBeenCalledWith('/api/ski-specs/spec-1', SkiSpecDTOSchema, mockUpdateCommand);
      expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Specification has been updated');
    });

    it('should handle errors and propagate field messages', async () => {
      const validationError = new ValidationError('Invalid data', [{ field: 'waist', message: 'Too small' }]);
      const fieldErrors = { waist: 'Too small' };

      vi.mocked(skiSpecHttpClient.put).mockReturnValueOnce(Effect.fail(validationError));

      // Reset and reconfigure the mock for this test
      mockShowError.mockReset();
      mockShowError.mockReturnValue(fieldErrors);

      const { result } = renderHook(() => useSkiSpecMutation());

      await act(async () => {
        await expect(result.current.updateSkiSpec('spec-1', mockUpdateCommand)).rejects.toThrow('Invalid data');
      });

      expect(mockShowError).toHaveBeenCalledWith(validationError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });

      await waitFor(() => expect(result.current.apiErrors).toEqual(fieldErrors));
    });
  });

  describe('getSkiSpec', () => {
    it('should fetch specification and reset submitting state', async () => {
      const { result } = renderHook(() => useSkiSpecMutation());

      let response: SkiSpecDTO | undefined;
      await act(async () => {
        response = await result.current.getSkiSpec('spec-1');
      });

      expect(response).toEqual(mockSkiSpec);

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));
      expect(skiSpecHttpClient.get).toHaveBeenCalledWith('/api/ski-specs/spec-1', SkiSpecDTOSchema);
      expect(result.current.apiErrors).toEqual({});
    });

    it('should handle fetch errors via error handler without setting api errors', async () => {
      const networkError = new NetworkError('Offline');

      vi.mocked(skiSpecHttpClient.get).mockReturnValueOnce(Effect.fail(networkError));

      const { result } = renderHook(() => useSkiSpecMutation());

      await act(async () => {
        await expect(result.current.getSkiSpec('spec-2')).rejects.toThrow('Offline');
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));

      expect(mockShowError).toHaveBeenCalledWith(networkError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
      expect(result.current.apiErrors).toEqual({});
    });
  });

  describe('deleteSkiSpec', () => {
    it('should delete specification and show success toast', async () => {
      const { result } = renderHook(() => useSkiSpecMutation());

      await act(async () => {
        await result.current.deleteSkiSpec('spec-1');
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));
      expect(skiSpecHttpClient.deleteNoContent).toHaveBeenCalledWith('/api/ski-specs/spec-1');
      expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Specification has been deleted');
    });

    it('should handle delete errors via error handler', async () => {
      const networkError = new NetworkError('Server unreachable');

      vi.mocked(skiSpecHttpClient.deleteNoContent).mockReturnValueOnce(Effect.fail(networkError));

      const { result } = renderHook(() => useSkiSpecMutation());

      await act(async () => {
        await expect(result.current.deleteSkiSpec('spec-3')).rejects.toThrow('Server unreachable');
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));

      expect(mockShowError).toHaveBeenCalledWith(networkError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
    });
  });
});
