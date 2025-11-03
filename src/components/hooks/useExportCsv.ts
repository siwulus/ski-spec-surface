import { useCallback, useState } from 'react';
import { Effect, pipe } from 'effect';
import type { ExportSkiSpecsQuery } from '@/types/api.types';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { type SkiSpecError } from '@/types/error.types';
import { useErrorHandler } from './useErrorHandler';

export interface UseExportCsvReturn {
  exportFile: (query: ExportSkiSpecsQuery) => Promise<void>;
  isExporting: boolean;
  error: SkiSpecError | null;
}

/**
 * Hook for exporting ski specifications to CSV using current filter/sort state.
 * Follows the EffectJS error-handling approach used across the app.
 */
export const useExportCsv = (): UseExportCsvReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<SkiSpecError | null>(null);
  const { showError, showSuccess } = useErrorHandler();

  const buildExportUrl = useCallback((query: ExportSkiSpecsQuery): string => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.sort_by) params.set('sort_by', query.sort_by);
    if (query.sort_order) params.set('sort_order', query.sort_order);
    const url = `/api/ski-specs/export${params.toString() ? `?${params.toString()}` : ''}`;
    return url;
  }, []);

  const triggerFileDownload = useCallback(
    (blob: Blob, filename: string | null) => {
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = downloadUrl;
      anchor.download = filename ?? 'ski-specs.csv';

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);

      showSuccess('Export successful', 'The file has been exported successfully');
    },
    [showSuccess]
  );

  const exportFile = useCallback(
    async (query: ExportSkiSpecsQuery): Promise<void> => {
      const program = pipe(
        Effect.sync(() => {
          setIsExporting(true);
          setError(null);
        }),
        Effect.map(() => buildExportUrl(query)),
        Effect.flatMap((url) => skiSpecHttpClient.getBlob(url, { 'Content-Type': 'text/csv' })),
        Effect.tap(({ blob, filename }) => Effect.sync(() => triggerFileDownload(blob, filename))),
        Effect.tapError((err) =>
          Effect.sync(() => {
            const skiSpecError = err as SkiSpecError;
            setError(skiSpecError);
            showError(skiSpecError, { redirectOnAuth: true, redirectTo: '/ski-specs' });
          })
        ),
        Effect.ensuring(
          Effect.sync(() => {
            setIsExporting(false);
          })
        )
      );

      await Effect.runPromise(Effect.either(program));
    },
    [buildExportUrl, triggerFileDownload, showError]
  );

  return { exportFile, isExporting, error };
};
