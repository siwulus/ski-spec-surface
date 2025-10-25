import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PaginationMeta, SkiSpecDTO, SkiSpecListResponse } from '@/types/api.types';
import { SkiSpecListResponseSchema } from '@/types/api.types';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { Effect, pipe } from 'effect';
import { buildUrl } from '@/lib/utils/http';
import type { SkiSpecError } from '@/types/error.types';
import { useErrorHandler } from './useErrorHandler';

interface UseSkiSpecsOptions {
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'length' | 'surface_area' | 'relative_weight' | 'created_at';
  sort_order?: 'asc' | 'desc';
  search?: string;
}

interface UseSkiSpecsReturn {
  specs: SkiSpecDTO[] | null;
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const fetchSkiSpecs = (options: UseSkiSpecsOptions): Effect.Effect<SkiSpecListResponse, SkiSpecError> =>
  pipe(
    Effect.sync(() =>
      buildUrl('/api/ski-specs', {
        page: options.page ?? 1,
        limit: options.limit ?? 100,
        sort_by: options.sort_by ?? 'created_at',
        sort_order: options.sort_order ?? 'desc',
        search: options.search,
      })
    ),
    Effect.flatMap((url) => skiSpecHttpClient.get(url, SkiSpecListResponseSchema))
  );

export const useSkiSpecs = (options: UseSkiSpecsOptions = {}): UseSkiSpecsReturn => {
  const [specs, setSpecs] = useState<SkiSpecDTO[] | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { showError } = useErrorHandler();
  const optionsMemo = useMemo(
    () => ({
      page: options.page ?? 1,
      limit: options.limit ?? 100,
      sort_by: options.sort_by ?? 'created_at',
      sort_order: options.sort_order ?? 'desc',
      search: options.search,
    }),
    [options.page, options.limit, options.sort_by, options.sort_order, options.search]
  );
  const loadSpecs = useCallback(async () => {
    await pipe(
      Effect.sync(() => {
        setIsLoading(true);
        setError(null);
      }),
      Effect.flatMap(() => fetchSkiSpecs(optionsMemo)),
      Effect.tap(({ data, pagination }) =>
        Effect.sync(() => {
          setSpecs(data);
          setPagination(pagination);
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
  }, [optionsMemo, showError]);

  useEffect(() => {
    loadSpecs();
  }, [loadSpecs]);

  return {
    specs,
    pagination,
    isLoading,
    error,
    refetch: loadSpecs,
  };
};
