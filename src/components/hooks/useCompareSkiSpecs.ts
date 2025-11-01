import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SkiSpecComparisonDTO, CompareSkiSpecsResponse } from '@/types/api.types';
import { CompareSkiSpecsResponseSchema } from '@/types/api.types';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { Effect, pipe } from 'effect';
import { buildUrl } from '@/lib/utils/http';
import type { SkiSpecError } from '@/types/error.types';
import { useErrorHandler } from './useErrorHandler';

interface UseCompareSkiSpecsOptions {
  ids: string[];
}

interface UseCompareSkiSpecsReturn {
  data: SkiSpecComparisonDTO[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const fetchCompareSkiSpecs = (ids: string[]): Effect.Effect<CompareSkiSpecsResponse, SkiSpecError> =>
  pipe(
    Effect.sync(() =>
      buildUrl('/api/ski-specs/compare', {
        ids: ids.join(','),
      })
    ),
    Effect.flatMap((url) => skiSpecHttpClient.get(url, CompareSkiSpecsResponseSchema))
  );

/**
 * Custom hook to compare multiple ski specifications.
 *
 * Fetches and compares 2-4 ski specifications from the API.
 * Handles loading states, errors, and provides refetch capability.
 *
 * @param options - Hook options containing array of specification IDs
 * @returns Object containing comparison data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useCompareSkiSpecs({
 *   ids: ['uuid1', 'uuid2', 'uuid3']
 * });
 * ```
 */
export const useCompareSkiSpecs = (options: UseCompareSkiSpecsOptions): UseCompareSkiSpecsReturn => {
  const [data, setData] = useState<SkiSpecComparisonDTO[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { showError } = useErrorHandler();

  // Memoize IDs to prevent unnecessary re-fetches
  const idsString = options.ids.join(',');

  const idsMemo = useMemo(() => options.ids, [idsString]);

  const loadData = useCallback(async () => {
    // Only fetch if we have valid IDs
    if (!idsMemo || idsMemo.length < 2 || idsMemo.length > 4) {
      setError(new Error('Comparison requires between 2 and 4 specification IDs'));
      setIsLoading(false);
      return;
    }

    await pipe(
      Effect.sync(() => {
        setIsLoading(true);
        setError(null);
      }),
      Effect.flatMap(() => fetchCompareSkiSpecs(idsMemo)),
      Effect.tap((response) =>
        Effect.sync(() => {
          setData(response.specifications);
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
  }, [idsMemo, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refetch: loadData,
  };
};
