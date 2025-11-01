/**
 * UNIT TESTS FOR useNotes HOOK
 *
 * This hook handles paginated note fetching with "Load More" functionality.
 *
 * Key features tested:
 * 1. Initial data fetching on mount
 * 2. Pagination with incremental loading (appends notes)
 * 3. Load more functionality
 * 4. Refetch functionality (resets to page 1)
 * 5. Error handling with EffectJS
 * 6. Loading states
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO, PaginationMeta, NoteListResponse } from '@/types/api.types';
import { Effect } from 'effect';
import { NetworkError } from '@/types/error.types';

// Mock external dependencies
vi.mock('@/lib/utils/SkiSpecHttpClient');
vi.mock('./useErrorHandler');

// Import after mocking
import { useNotes } from './useNotes';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { useErrorHandler } from './useErrorHandler';

// Test data
const mockNote1: NoteDTO = {
  id: 'note-1',
  ski_spec_id: 'spec-123',
  content: 'Great all-mountain performance',
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
};

const mockNote2: NoteDTO = {
  id: 'note-2',
  ski_spec_id: 'spec-123',
  content: 'Excellent in powder',
  created_at: '2025-01-01T11:00:00Z',
  updated_at: '2025-01-01T11:00:00Z',
};

const mockNote3: NoteDTO = {
  id: 'note-3',
  ski_spec_id: 'spec-123',
  content: 'Heavy on groomers',
  created_at: '2025-01-01T12:00:00Z',
  updated_at: '2025-01-01T12:00:00Z',
};

const mockPaginationPage1: PaginationMeta = {
  page: 1,
  limit: 2,
  total: 3,
  total_pages: 2,
};

const mockPaginationPage2: PaginationMeta = {
  page: 2,
  limit: 2,
  total: 3,
  total_pages: 2,
};

const mockResponsePage1: NoteListResponse = {
  data: [mockNote1, mockNote2],
  pagination: mockPaginationPage1,
};

const mockResponsePage2: NoteListResponse = {
  data: [mockNote3],
  pagination: mockPaginationPage2,
};

describe('useNotes', () => {
  const mockShowError = vi.fn();
  const mockShowSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.succeed(mockResponsePage1));
    vi.mocked(useErrorHandler).mockReturnValue({ showError: mockShowError, showSuccess: mockShowSuccess });
  });

  describe('Initial State', () => {
    it('should initialize with loading state and null data', () => {
      // Return a promise that never resolves to test initial state
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        Effect.promise(() => new Promise(() => {}))
      );

      const { result } = renderHook(() => useNotes({ specId: 'spec-123' }));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.notes).toBe(null);
      expect(result.current.pagination).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.loadMore).toBeInstanceOf(Function);
      expect(result.current.refetch).toBeInstanceOf(Function);
    });
  });

  describe('Data Fetching on Mount', () => {
    it('should fetch notes automatically on mount', async () => {
      const { result } = renderHook(() => useNotes({ specId: 'spec-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notes).toEqual([mockNote1, mockNote2]);
      expect(result.current.pagination).toEqual(mockPaginationPage1);
      expect(result.current.error).toBe(null);
    });

    it('should call API with default options', async () => {
      const { result } = renderHook(() => useNotes({ specId: 'spec-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);

      const calledUrl = vi.mocked(skiSpecHttpClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('/api/ski-specs/spec-123/notes');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=50');
    });

    it('should handle successful response with empty data', async () => {
      const emptyResponse: NoteListResponse = {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, total_pages: 0 },
      };
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.succeed(emptyResponse));

      const { result } = renderHook(() => useNotes({ specId: 'spec-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notes).toEqual([]);
      expect(result.current.pagination?.total).toBe(0);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Custom Options', () => {
    it('should respect custom page option', async () => {
      const { result } = renderHook(() => useNotes({ specId: 'spec-123', page: 2 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = vi.mocked(skiSpecHttpClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('page=2');
    });

    it('should respect custom limit option', async () => {
      const { result } = renderHook(() => useNotes({ specId: 'spec-123', limit: 10 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = vi.mocked(skiSpecHttpClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('limit=10');
    });
  });

  describe('Load More Functionality', () => {
    it('should append new notes when loadMore is called', async () => {
      vi.mocked(skiSpecHttpClient.get)
        .mockReturnValueOnce(Effect.succeed(mockResponsePage1))
        .mockReturnValueOnce(Effect.succeed(mockResponsePage2));

      const { result } = renderHook(() => useNotes({ specId: 'spec-123', limit: 2 }));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notes).toEqual([mockNote1, mockNote2]);
      expect(result.current.pagination?.page).toBe(1);

      // Call loadMore
      act(() => {
        result.current.loadMore();
      });

      // Wait for next page to load
      await waitFor(() => {
        expect(result.current.notes).toEqual([mockNote1, mockNote2, mockNote3]);
      });

      expect(result.current.pagination?.page).toBe(2);
      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(2);

      // Verify second call has page=2
      const secondCallUrl = vi.mocked(skiSpecHttpClient.get).mock.calls[1][0];
      expect(secondCallUrl).toContain('page=2');
    });

    it('should not load more when already on last page', async () => {
      const lastPageResponse: NoteListResponse = {
        data: [mockNote1],
        pagination: { page: 1, limit: 10, total: 1, total_pages: 1 },
      };
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.succeed(lastPageResponse));

      const { result } = renderHook(() => useNotes({ specId: 'spec-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);

      // Call loadMore when already on last page
      result.current.loadMore();

      // Should not trigger another API call
      await waitFor(() => {
        expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);
      });
    });

    it('should not load more when pagination is null', async () => {
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        Effect.promise(() => new Promise(() => {}))
      );

      const { result } = renderHook(() => useNotes({ specId: 'spec-123' }));

      // Try to load more before initial load completes
      result.current.loadMore();

      // Should not trigger any changes
      expect(result.current.pagination).toBe(null);
    });
  });

  describe('Refetch Functionality', () => {
    it('should reset to page 1 and replace notes when refetch is called', async () => {
      // Mock to return page 1 or page 2 based on URL
      vi.mocked(skiSpecHttpClient.get).mockImplementation((url) => {
        if (url.includes('page=2')) {
          return Effect.succeed(mockResponsePage2);
        }
        return Effect.succeed(mockResponsePage1);
      });

      const { result } = renderHook(() => useNotes({ specId: 'spec-123', limit: 2 }));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notes).toEqual([mockNote1, mockNote2]);

      // Load more to get to page 2
      act(() => {
        result.current.loadMore();
      });
      await waitFor(() => {
        expect(result.current.notes).toEqual([mockNote1, mockNote2, mockNote3]);
      });

      // Refetch should reset to page 1 and replace all notes
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.notes).toEqual([mockNote1, mockNote2]);
      });

      expect(result.current.pagination?.page).toBe(1);

      // Verify last call is back to page=1
      const calls = vi.mocked(skiSpecHttpClient.get).mock.calls;
      const lastCallUrl = calls[calls.length - 1][0];
      expect(lastCallUrl).toContain('page=1');
    });

    it('should clear error state on refetch', async () => {
      const networkError = new NetworkError('Network error');
      vi.mocked(skiSpecHttpClient.get)
        .mockReturnValueOnce(Effect.fail(networkError))
        .mockReturnValueOnce(Effect.succeed(mockResponsePage1));

      const { result } = renderHook(() => useNotes({ specId: 'spec-123' }));

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).toBe(networkError);
      });

      // Refetch should clear error
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      expect(result.current.notes).toEqual([mockNote1, mockNote2]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors and call error handler', async () => {
      const networkError = new NetworkError('Failed to fetch notes');
      vi.mocked(skiSpecHttpClient.get).mockReturnValue(Effect.fail(networkError));

      const { result } = renderHook(() => useNotes({ specId: 'spec-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(networkError);
      expect(result.current.notes).toBe(null);
      expect(result.current.pagination).toBe(null);
      expect(mockShowError).toHaveBeenCalledWith(networkError);
    });

    it('should handle errors during load more', async () => {
      const networkError = new NetworkError('Load more failed');
      vi.mocked(skiSpecHttpClient.get)
        .mockReturnValueOnce(Effect.succeed(mockResponsePage1))
        .mockReturnValueOnce(Effect.fail(networkError));

      const { result } = renderHook(() => useNotes({ specId: 'spec-123', limit: 2 }));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notes).toEqual([mockNote1, mockNote2]);

      // Load more fails
      result.current.loadMore();

      await waitFor(() => {
        expect(result.current.error).toBe(networkError);
      });

      expect(mockShowError).toHaveBeenCalledWith(networkError);
      // Notes should still be from first page (error doesn't clear existing data in this implementation)
    });
  });

  describe('SpecId Changes', () => {
    it('should refetch when specId changes', async () => {
      vi.mocked(skiSpecHttpClient.get)
        .mockReturnValueOnce(Effect.succeed(mockResponsePage1))
        .mockReturnValueOnce(Effect.succeed(mockResponsePage1));

      const { result, rerender } = renderHook(({ specId }) => useNotes({ specId }), {
        initialProps: { specId: 'spec-123' },
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(1);
      expect(vi.mocked(skiSpecHttpClient.get).mock.calls[0][0]).toContain('spec-123');

      // Change specId
      rerender({ specId: 'spec-456' });

      await waitFor(() => {
        expect(skiSpecHttpClient.get).toHaveBeenCalledTimes(2);
      });

      expect(vi.mocked(skiSpecHttpClient.get).mock.calls[1][0]).toContain('spec-456');
    });
  });
});
