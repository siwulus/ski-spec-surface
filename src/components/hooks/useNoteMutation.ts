import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import type { CreateNoteCommand, NoteDTO, UpdateNoteCommand } from '@/types/api.types';
import { NoteDTOSchema } from '@/types/api.types';
import { Effect, pipe } from 'effect';
import { useCallback, useState } from 'react';
import { useErrorHandler } from './useErrorHandler';

/**
 * Custom hook for handling note CRUD API calls with EffectJS.
 *
 * Uses Effect-based HTTP client for type-safe, composable error handling.
 * All errors are handled via useErrorHandler for consistent UX with toast notifications.
 *
 * @returns CRUD functions, loading state, and API errors
 */
export const useNoteMutation = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const { showError, showSuccess } = useErrorHandler();

  const createNote = useCallback(
    async (specId: string, data: CreateNoteCommand): Promise<NoteDTO> => {
      return await pipe(
        Effect.sync(() => {
          setIsSubmitting(true);
          setApiErrors({});
        }),
        Effect.flatMap(() => skiSpecHttpClient.post(`/api/ski-specs/${specId}/notes`, NoteDTOSchema, data)),
        Effect.tap(() =>
          Effect.sync(() => {
            showSuccess('Success', 'Note has been added');
            setIsSubmitting(false);
          })
        ),
        Effect.tapError((err) =>
          Effect.sync(() => {
            const fieldErrors = showError(err, {
              redirectOnAuth: true,
              redirectTo: '/ski-specs',
            });
            setApiErrors(fieldErrors);
            setIsSubmitting(false);
          })
        ),
        Effect.runPromise
      );
    },
    [showError, showSuccess]
  );

  const updateNote = useCallback(
    async (specId: string, noteId: string, data: UpdateNoteCommand): Promise<NoteDTO> => {
      return await pipe(
        Effect.sync(() => {
          setIsSubmitting(true);
          setApiErrors({});
        }),
        Effect.flatMap(() => skiSpecHttpClient.put(`/api/ski-specs/${specId}/notes/${noteId}`, NoteDTOSchema, data)),
        Effect.tap(() =>
          Effect.sync(() => {
            showSuccess('Success', 'Note has been updated');
            setIsSubmitting(false);
          })
        ),
        Effect.tapError((err) =>
          Effect.sync(() => {
            const fieldErrors = showError(err, {
              redirectOnAuth: true,
              redirectTo: '/ski-specs',
            });
            setApiErrors(fieldErrors);
            setIsSubmitting(false);
          })
        ),
        Effect.runPromise
      );
    },
    [showError, showSuccess]
  );

  const deleteNote = useCallback(
    async (specId: string, noteId: string): Promise<void> => {
      return await pipe(
        Effect.sync(() => {
          setIsSubmitting(true);
          setApiErrors({});
        }),
        Effect.flatMap(() => skiSpecHttpClient.deleteNoContent(`/api/ski-specs/${specId}/notes/${noteId}`)),
        Effect.tap(() =>
          Effect.sync(() => {
            showSuccess('Success', 'Note has been deleted');
            setIsSubmitting(false);
          })
        ),
        Effect.tapError((err) =>
          Effect.sync(() => {
            showError(err, { redirectOnAuth: true, redirectTo: '/ski-specs' });
            setIsSubmitting(false);
          })
        ),
        Effect.runPromise
      );
    },
    [showError, showSuccess]
  );

  return {
    createNote,
    updateNote,
    deleteNote,
    isSubmitting,
    apiErrors,
  };
};
