/**
 * UNIT TESTS FOR useSkiSpec HOOK
 *
 * This hook fetches a single ski specification by ID.
 *
 * Key features tested:
 * 1. Initial data fetching on mount
 * 2. Loading states
 * 3. Error handling with EffectJS
 * 4. Error handler integration (redirects on 404/auth errors)
 * 5. Refetch functionality
 * 6. SpecId changes trigger refetch
 */

import type { SkiSpecDTO } from '@/types/api.types';
import { AuthenticationError, NetworkError, NotFoundError } from '@/types/error.types';
import { renderHook, waitFor } from '@testing-library/react';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock external dependencies
vi.mock('@/lib/utils/SkiSpecHttpClient');
vi.mock('./useErrorHandler');

// Import after mocking
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { useErrorHandler } from './useErrorHandler';
import { useSkiSpec } from './useSkiSpec';

// Test data
const mockSkiSpec: SkiSpecDTO = {
  id: 'spec-123',
  name: 'Rossignol Soul 7',
  description: 'All-mountain freeride ski',
  length: 180,
  tip: 136,
  waist: 106,
  tail: 126,
  radius: 18,
  weight: 1800,
  surface_area: 19440,
  relative_weight: 0.0926,
  notes_count: 3,
  user_id: 'user-1',
  algorithm_version: '1.0.0',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('useSkiSpec', () => {
  const mockShowError = vi.fn();
  const mockShowSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.succeed(mockSkiSpec));
    vi.mocked(useErrorHandler).mockReturnValue({ showError: mockShowError, showSuccess: mockShowSuccess });
  });

  describe('Initial State', () => {
    it('should initialize with loading state and null data', () => {
      // Return a promise that never resolves to test initial state
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        Effect.promise(() => new Promise(() => {}))
      );

      const { result } = renderHook(() => useSkiSpec('spec-123'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.spec).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.refetch).toBeInstanceOf(Function);
    });
  });

  describe('Data Fetching on Mount', () => {
    it('should fetch ski spec automatically on mount', async () => {
      const { result } = renderHook(() => useSkiSpec('spec-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.spec).toEqual(mockSkiSpec);
      expect(result.current.error).toBe(null);
    });

    it('should call API with correct spec ID', async () => {
      const { result } = renderHook(() => useSkiSpec('spec-456'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);
      expect(skiSpecHttpClient.get).toHaveBeenCalledWith('/api/ski-specs/spec-456', expect.anything());
    });

    it('should handle successful response with all fields', async () => {
      const { result } = renderHook(() => useSkiSpec('spec-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const spec = result.current.spec;
      expect(spec).toBeDefined();
      expect(spec?.id).toBe('spec-123');
      expect(spec?.name).toBe('Rossignol Soul 7');
      expect(spec?.surface_area).toBe(19440);
      expect(spec?.relative_weight).toBe(0.0926);
      expect(spec?.notes_count).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors and call error handler', async () => {
      const networkError = new NetworkError('Failed to fetch spec');
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.fail(networkError));

      const { result } = renderHook(() => useSkiSpec('spec-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(networkError);
      expect(result.current.spec).toBe(null);
      expect(mockShowError).toHaveBeenCalledWith(networkError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
    });

    it('should handle 404 errors with redirect', async () => {
      const notFoundError = new NotFoundError('Ski specification not found');
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.fail(notFoundError));

      const { result } = renderHook(() => useSkiSpec('spec-999'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(notFoundError);
      expect(mockShowError).toHaveBeenCalledWith(notFoundError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
    });

    it('should handle authentication errors with redirect', async () => {
      const authError = new AuthenticationError('Not authorized');
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.fail(authError));

      const { result } = renderHook(() => useSkiSpec('spec-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(authError);
      expect(mockShowError).toHaveBeenCalledWith(authError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
    });

    it('should set loading to false after error', async () => {
      const networkError = new NetworkError('Network timeout');
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.fail(networkError));

      const { result } = renderHook(() => useSkiSpec('spec-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(networkError);
    });
  });

  describe('Refetch Functionality', () => {
    it('should expose refetch function', async () => {
      const { result } = renderHook(() => useSkiSpec('spec-123'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.refetch).toBeInstanceOf(Function);
    });

    it('should refetch data when refetch is called', async () => {
      const { result } = renderHook(() => useSkiSpec('spec-123'));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);
      expect(result.current.spec).toEqual(mockSkiSpec);

      // Call refetch manually
      await result.current.refetch();

      // Should call API again
      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should clear error state on refetch', async () => {
      const networkError = new NetworkError('Network error');
      vi.mocked(skiSpecHttpClient.get)
        .mockReturnValueOnce(Effect.fail(networkError))
        .mockReturnValueOnce(Effect.succeed(mockSkiSpec));

      const { result } = renderHook(() => useSkiSpec('spec-123'));

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).toBe(networkError);
      });

      // Refetch should clear error and load data
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      expect(result.current.spec).toEqual(mockSkiSpec);
    });

    it('should set loading state during refetch', async () => {
      const { result } = renderHook(() => useSkiSpec('spec-123'));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Setup a delayed response for refetch
      let resolvePromise!: (value: SkiSpecDTO) => void;
      const pendingPromise = new Promise<SkiSpecDTO>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.promise(() => pendingPromise));

      // Start refetch (don't await yet)
      const refetchPromise = result.current.refetch();

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Complete the refetch
      resolvePromise(mockSkiSpec);
      await refetchPromise;

      // Should no longer be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should refetch with updated data', async () => {
      const updatedSpec: SkiSpecDTO = {
        ...mockSkiSpec,
        name: 'Updated Ski Name',
        notes_count: 5,
      };

      vi.mocked(skiSpecHttpClient.get)
        .mockReturnValueOnce(Effect.succeed(mockSkiSpec))
        .mockReturnValueOnce(Effect.succeed(updatedSpec));

      const { result } = renderHook(() => useSkiSpec('spec-123'));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.spec?.name).toBe('Rossignol Soul 7');
      });

      // Refetch
      await result.current.refetch();

      // Should have updated data
      await waitFor(() => {
        expect(result.current.spec?.name).toBe('Updated Ski Name');
      });

      expect(result.current.spec?.notes_count).toBe(5);
    });
  });

  describe('SpecId Changes', () => {
    it('should refetch when specId changes', async () => {
      const anotherSpec: SkiSpecDTO = {
        ...mockSkiSpec,
        id: 'spec-456',
        name: 'K2 Mindbender',
      };

      vi.mocked(skiSpecHttpClient.get)
        .mockReturnValueOnce(Effect.succeed(mockSkiSpec))
        .mockReturnValueOnce(Effect.succeed(anotherSpec));

      const { result, rerender } = renderHook(({ specId }) => useSkiSpec(specId), {
        initialProps: { specId: 'spec-123' },
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);
      expect(skiSpecHttpClient.get).toHaveBeenCalledWith('/api/ski-specs/spec-123', expect.anything());
      expect(result.current.spec?.id).toBe('spec-123');

      // Change specId
      rerender({ specId: 'spec-456' });

      // Should trigger a new fetch
      await waitFor(() => {
        expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(2);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledWith('/api/ski-specs/spec-456', expect.anything());

      await waitFor(() => {
        expect(result.current.spec?.id).toBe('spec-456');
      });

      expect(result.current.spec?.name).toBe('K2 Mindbender');
    });

    it('should not refetch when specId remains the same', async () => {
      const { result, rerender } = renderHook(({ specId }) => useSkiSpec(specId), {
        initialProps: { specId: 'spec-123' },
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);

      // Rerender with same specId
      rerender({ specId: 'spec-123' });

      // Should NOT trigger another fetch (loadSpec is memoized)
      await waitFor(() => {
        expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading State', () => {
    it('should eventually finish loading and set data', async () => {
      const { result } = renderHook(() => useSkiSpec('spec-123'));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.spec).toEqual(mockSkiSpec);
      expect(result.current.error).toBe(null);
    });

    it('should eventually finish loading and set error', async () => {
      const networkError = new NetworkError('Failed');
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.fail(networkError));

      const { result } = renderHook(() => useSkiSpec('spec-123'));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(networkError);
      expect(result.current.spec).toBe(null);
    });
  });
});
