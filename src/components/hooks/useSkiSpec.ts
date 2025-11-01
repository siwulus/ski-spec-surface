import { useState, useEffect, useCallback } from 'react';
import type { SkiSpecDTO } from '@/types/api.types';
import { SkiSpecDTOSchema } from '@/types/api.types';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { Effect, pipe } from 'effect';
import type { SkiSpecError } from '@/types/error.types';
import { useErrorHandler } from './useErrorHandler';

interface UseSkiSpecReturn {
  spec: SkiSpecDTO | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const fetchSkiSpec = (specId: string): Effect.Effect<SkiSpecDTO, SkiSpecError> =>
  skiSpecHttpClient.get(`/api/ski-specs/${specId}`, SkiSpecDTOSchema);

/**
 * Custom hook for fetching a single ski specification by ID.
 *
 * Uses EffectJS for type-safe error handling and automatic error display via toast.
 * On 404 or authorization errors, redirects to /ski-specs list page.
 *
 * @param specId - The UUID of the ski specification to fetch
 * @returns Spec data, loading state, error, and refetch function
 */
export const useSkiSpec = (specId: string): UseSkiSpecReturn => {
  const [spec, setSpec] = useState<SkiSpecDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { showError } = useErrorHandler();

  const loadSpec = useCallback(async () => {
    await pipe(
      Effect.sync(() => {
        setIsLoading(true);
        setError(null);
      }),
      Effect.flatMap(() => fetchSkiSpec(specId)),
      Effect.tap((data) =>
        Effect.sync(() => {
          setSpec(data);
          setIsLoading(false);
        })
      ),
      Effect.catchAll((err) =>
        Effect.sync(() => {
          setError(err);
          showError(err, {
            redirectOnAuth: true,
            redirectTo: '/ski-specs',
          });
          setIsLoading(false);
        })
      ),
      Effect.runPromise
    );
  }, [specId, showError]);

  useEffect(() => {
    loadSpec();
  }, [loadSpec]);

  return {
    spec,
    isLoading,
    error,
    refetch: loadSpec,
  };
};
