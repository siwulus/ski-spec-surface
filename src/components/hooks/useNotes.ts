import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PaginationMeta, NoteDTO, NoteListResponse } from '@/types/api.types';
import { NoteListResponseSchema } from '@/types/api.types';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { Effect, pipe } from 'effect';
import { buildUrl } from '@/lib/utils/http';
import type { SkiSpecError } from '@/types/error.types';
import { useErrorHandler } from './useErrorHandler';

interface UseNotesOptions {
  specId: string;
  page?: number;
  limit?: number;
}

interface UseNotesReturn {
  notes: NoteDTO[] | null;
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: Error | null;
  loadMore: () => void;
  refetch: () => Promise<void>;
}

const fetchNotes = (specId: string, page: number, limit: number): Effect.Effect<NoteListResponse, SkiSpecError> =>
  pipe(
    Effect.sync(() =>
      buildUrl(`/api/ski-specs/${specId}/notes`, {
        page,
        limit,
      })
    ),
    Effect.flatMap((url) => skiSpecHttpClient.get(url, NoteListResponseSchema))
  );

/**
 * Custom hook for fetching paginated notes for a ski specification.
 *
 * Uses EffectJS for type-safe error handling and automatic error display via toast.
 * Supports incremental loading with "Load More" pattern (appends to existing notes).
 *
 * @param options - Spec ID and pagination options
 * @returns Notes list, pagination metadata, loading state, error, and control functions
 */
export const useNotes = (options: UseNotesOptions): UseNotesReturn => {
  const { specId, page: initialPage = 1, limit: initialLimit = 50 } = options;

  const [notes, setNotes] = useState<NoteDTO[] | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { showError } = useErrorHandler();

  const optionsMemo = useMemo(
    () => ({
      page: currentPage,
      limit: initialLimit,
    }),
    [currentPage, initialLimit]
  );

  const loadNotes = useCallback(
    async (resetPage = false) => {
      const pageToLoad = resetPage ? 1 : optionsMemo.page;

      await pipe(
        Effect.sync(() => {
          setIsLoading(true);
          setError(null);
        }),
        Effect.flatMap(() => fetchNotes(specId, pageToLoad, optionsMemo.limit)),
        Effect.tap(({ data, pagination: paginationData }) =>
          Effect.sync(() => {
            if (resetPage || pageToLoad === 1) {
              // Reset to first page - replace all notes
              setNotes(data);
              setCurrentPage(1);
            } else {
              // Load more - append new notes
              setNotes((prev) => (prev ? [...prev, ...data] : data));
            }
            setPagination(paginationData);
            setIsLoading(false);
          })
        ),
        Effect.catchAll((err) =>
          Effect.sync(() => {
            setError(err);
            showError(err);
            setIsLoading(false);
          })
        ),
        Effect.runPromise
      );
    },
    [specId, optionsMemo, showError]
  );

  const loadMore = useCallback(() => {
    if (pagination && currentPage < pagination.total_pages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [pagination, currentPage]);

  const refetch = useCallback(async () => {
    await loadNotes(true);
  }, [loadNotes]);

  useEffect(() => {
    loadNotes(currentPage === 1);
  }, [loadNotes, currentPage]);

  return {
    notes,
    pagination,
    isLoading,
    error,
    loadMore,
    refetch,
  };
};
