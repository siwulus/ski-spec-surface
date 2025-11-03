import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import type { ImportResponse } from '@/types/api.types';
import { ImportResponseSchema } from '@/types/api.types';
import { type SkiSpecError } from '@/types/error.types';
import { Effect, pipe } from 'effect';
import { useCallback, useState } from 'react';
import { useErrorHandler } from './useErrorHandler';

export interface UseImportCsvReturn {
  uploadFile: (file: File) => Promise<void>;
  isUploading: boolean;
  result: ImportResponse | null;
  error: SkiSpecError | null;
}

/**
 * Custom hook for importing ski specifications from CSV files.
 * Handles file upload, validation, and error handling with EffectJS.
 *
 * @returns Hook utilities for CSV import operations
 *
 * @example
 * const { uploadFile, isUploading, result, error, reset } = useImportCsv();
 *
 * const handleFileSelect = async (file: File) => {
 *   await uploadFile(file);
 * };
 */
export const useImportCsv = (): UseImportCsvReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<SkiSpecError | null>(null);
  const { showError, showSuccess } = useErrorHandler();

  const uploadFile = useCallback(
    async (file: File): Promise<void> => {
      await pipe(
        Effect.sync(() => {
          setError(null);
          setResult(null);
          setIsUploading(true);
        }),
        // Create FormData with file
        Effect.flatMap(() =>
          Effect.sync(() => {
            const formData = new FormData();
            formData.append('file', file);
            return formData;
          })
        ),
        // Upload file using SkiSpecHttpClient
        Effect.flatMap((formData) =>
          skiSpecHttpClient.postMultipart('/api/ski-specs/import', ImportResponseSchema, formData)
        ),
        // Handle success
        Effect.tap((importResult) =>
          Effect.sync(() => {
            setResult(importResult);
            setIsUploading(false);
            showSuccess('Import successful', 'The file has been imported successfully');
          })
        ),
        // Handle errors
        Effect.tapError((err) =>
          Effect.sync(() => {
            setError(err);
            setIsUploading(false);
            showError(err);
          })
        ),
        Effect.runPromise
      );
    },
    [showError, showSuccess]
  );

  return {
    uploadFile,
    isUploading,
    result,
    error,
  };
};
