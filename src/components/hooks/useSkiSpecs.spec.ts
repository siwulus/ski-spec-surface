/**
 * TESTING REACT HOOKS IN ISOLATION
 *
 * This file demonstrates how to test a complex React hook using renderHook.
 *
 * Key challenges this hook has:
 * 1. Complex state management (specs, pagination, loading, error)
 * 2. useEffect that runs on mount and option changes
 * 3. Async operations with EffectJS
 * 4. Dependencies on external hooks (useErrorHandler)
 * 5. useMemo for options memoization
 * 6. useCallback for loadSpecs function
 * 7. Refetch functionality
 *
 * Testing approach:
 * - Use renderHook to test in isolation
 * - Mock external dependencies (HTTP client, useErrorHandler)
 * - Test all states: initial, loading, success, error
 * - Test option changes trigger refetch
 * - Test refetch callback
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkiSpecDTO, PaginationMeta, SkiSpecListResponse } from '@/types/api.types';
import { Effect } from 'effect';
import { NetworkError } from '@/types/error.types';

/**
 * STEP 1: MOCK EXTERNAL DEPENDENCIES
 *
 * The hook depends on:
 * 1. skiSpecHttpClient - for API calls
 * 2. useErrorHandler - for error handling
 *
 * Note: We use vi.mock() without factory functions to avoid hoisting issues
 */

// Mock the HTTP client module
vi.mock('@/lib/utils/SkiSpecHttpClient');

// Mock the error handler hook
vi.mock('./useErrorHandler');

// Import after mocking
import { useSkiSpecs } from './useSkiSpecs';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { useErrorHandler } from './useErrorHandler';

/**
 * STEP 2: CREATE TEST DATA
 *
 * Reusable mock data that matches the actual API response shape
 */

const mockSkiSpec1: SkiSpecDTO = {
  id: 'spec-1',
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
  notes_count: 0,
  user_id: 'user-123',
  algorithm_version: '1.0.0',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockSkiSpec2: SkiSpecDTO = {
  ...mockSkiSpec1,
  id: 'spec-2',
  name: 'K2 Mindbender',
  length: 177,
};

const mockPagination: PaginationMeta = {
  page: 1,
  limit: 100,
  total: 2,
  total_pages: 1,
};

const mockSuccessResponse: SkiSpecListResponse = {
  data: [mockSkiSpec1, mockSkiSpec2],
  pagination: mockPagination,
};

/**
 * STEP 3: ORGANIZE TESTS BY FUNCTIONALITY
 */

describe('useSkiSpecs', () => {
  const mockShowError = vi.fn();
  const mockShowSuccess = vi.fn();

  /**
   * STEP 4: SETUP AND TEARDOWN
   *
   * Reset mocks before each test to ensure isolation
   */
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock implementations using vi.mocked()
    vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.succeed(mockSuccessResponse));
    vi.mocked(useErrorHandler).mockReturnValue({ showError: mockShowError, showSuccess: mockShowSuccess });
  });

  /**
   * STEP 5: TEST INITIAL STATE
   *
   * Pattern: Verify the hook starts with correct default values
   */
  describe('Initial State', () => {
    it('should initialize with loading state and null data', () => {
      // Prevent the effect from resolving immediately for this test
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(
        // Return a promise that never resolves
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        Effect.promise(() => new Promise(() => {}))
      );

      const { result } = renderHook(() => useSkiSpecs());

      // Verify initial state before any async operations complete
      expect(result.current.isLoading).toBe(true);
      expect(result.current.specs).toBe(null);
      expect(result.current.pagination).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.refetch).toBeInstanceOf(Function);
    });
  });

  /**
   * STEP 6: TEST DATA FETCHING ON MOUNT
   *
   * Pattern: Test useEffect behavior when component/hook mounts
   */
  describe('Data Fetching on Mount', () => {
    it('should fetch specs automatically on mount', async () => {
      const { result } = renderHook(() => useSkiSpecs());

      // Wait for the async fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state
      expect(result.current.specs).toEqual([mockSkiSpec1, mockSkiSpec2]);
      expect(result.current.pagination).toEqual(mockPagination);
      expect(result.current.error).toBe(null);
    });

    it('should call API with default options', async () => {
      const { result } = renderHook(() => useSkiSpecs());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify the HTTP client was called
      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);

      // Verify the URL contains default parameters
      const calledUrl = vi.mocked(skiSpecHttpClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('/api/ski-specs');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=100');
      expect(calledUrl).toContain('sort_by=created_at');
      expect(calledUrl).toContain('sort_order=desc');
    });

    it('should handle successful response with empty data', async () => {
      const emptyResponse: SkiSpecListResponse = {
        data: [],
        pagination: { ...mockPagination, total: 0 },
      };
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.succeed(emptyResponse));

      const { result } = renderHook(() => useSkiSpecs());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.specs).toEqual([]);
      expect(result.current.pagination?.total).toBe(0);
      expect(result.current.error).toBe(null);
    });
  });

  /**
   * STEP 7: TEST OPTIONS HANDLING
   *
   * Pattern: Test that hook responds to different option combinations
   */
  describe('Options Handling', () => {
    it('should respect custom page option', async () => {
      const { result } = renderHook(() => useSkiSpecs({ page: 2 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = vi.mocked(skiSpecHttpClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('page=2');
    });

    it('should respect custom limit option', async () => {
      const { result } = renderHook(() => useSkiSpecs({ limit: 50 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = vi.mocked(skiSpecHttpClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('limit=50');
    });

    it('should respect sort_by option', async () => {
      const { result } = renderHook(() => useSkiSpecs({ sort_by: 'name' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = vi.mocked(skiSpecHttpClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('sort_by=name');
    });

    it('should respect search option', async () => {
      const { result } = renderHook(() => useSkiSpecs({ search: 'Rossignol' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = vi.mocked(skiSpecHttpClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('search=Rossignol');
    });
  });

  /**
   * STEP 8: TEST OPTIONS CHANGES (RERENDER)
   *
   * Pattern: Test that hook refetches when options change
   * This tests the useEffect dependency array and useMemo
   */
  describe('Options Changes', () => {
    it('should refetch when page changes', async () => {
      const { result, rerender } = renderHook(({ page }) => useSkiSpecs({ page }), {
        initialProps: { page: 1 },
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);
      expect(vi.mocked(skiSpecHttpClient.get).mock.calls[0][0]).toContain('page=1');

      // Change page - should trigger refetch
      rerender({ page: 2 });

      // Wait for refetch to complete
      await waitFor(() => {
        expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(2);
      });

      expect(vi.mocked(skiSpecHttpClient.get).mock.calls[1][0]).toContain('page=2');
    });
  });

  /**
   * STEP 9: TEST ERROR HANDLING
   *
   * Pattern: Test that hook handles errors correctly
   */
  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const apiError: NetworkError = new NetworkError('Network error');
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.fail(apiError));

      const { result } = renderHook(() => useSkiSpecs());

      // Wait for error state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify error state
      expect(result.current.error).toBe(apiError);
      expect(result.current.specs).toBe(null);
      expect(result.current.pagination).toBe(null);

      // Verify error handler was called
      expect(mockShowError).toHaveBeenCalledWith(apiError);
    });
  });

  /**
   * STEP 10: TEST REFETCH CALLBACK
   *
   * Pattern: Test manual refetch functionality
   */
  describe('Refetch Callback', () => {
    it('should expose refetch function', async () => {
      const { result } = renderHook(() => useSkiSpecs());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.refetch).toBeInstanceOf(Function);
    });

    it('should refetch data when refetch is called', async () => {
      const { result } = renderHook(() => useSkiSpecs());

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);
      expect(result.current.specs).toHaveLength(2);

      // Call refetch manually
      await result.current.refetch();

      // Should call API again
      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
