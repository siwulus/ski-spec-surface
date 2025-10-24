import { skiSpecHttpClient } from "@/lib/utils/SkiSpecHttpClient";
import type { CreateSkiSpecCommand, SkiSpecDTO, UpdateSkiSpecCommand } from "@/types/api.types";
import { SkiSpecDTOSchema } from "@/types/api.types";
import { Effect, pipe } from "effect";
import { useCallback, useState } from "react";
import { useErrorHandler } from "./useErrorHandler";

/**
 * Custom hook for handling ski spec CRUD API calls with EffectJS
 *
 * Uses Effect-based HTTP client for type-safe, composable error handling.
 * All errors are handled via useErrorHandler for consistent UX.
 *
 * @returns CRUD functions, loading state, and API errors
 */
export const useSkiSpecMutation = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const { showError, showSuccess } = useErrorHandler();

  const createSkiSpec = useCallback(
    async (data: CreateSkiSpecCommand): Promise<SkiSpecDTO> => {
      return await pipe(
        Effect.sync(() => {
          setIsSubmitting(true);
          setApiErrors({});
        }),
        Effect.flatMap(() => skiSpecHttpClient.post("/api/ski-specs", SkiSpecDTOSchema, data)),
        Effect.tap(() =>
          Effect.sync(() => {
            showSuccess("Success", "Specification has been added");
            setIsSubmitting(false);
          })
        ),
        Effect.tapError((err) =>
          Effect.sync(() => {
            const fieldErrors = showError(err, {
              redirectOnAuth: true,
              redirectTo: "/ski-specs",
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

  const updateSkiSpec = useCallback(
    async (id: string, data: UpdateSkiSpecCommand): Promise<SkiSpecDTO> => {
      return await pipe(
        Effect.sync(() => {
          setIsSubmitting(true);
          setApiErrors({});
        }),
        Effect.flatMap(() => skiSpecHttpClient.put(`/api/ski-specs/${id}`, SkiSpecDTOSchema, data)),
        Effect.tap(() =>
          Effect.sync(() => {
            showSuccess("Success", "Specification has been updated");
            setIsSubmitting(false);
          })
        ),
        Effect.tapError((err) =>
          Effect.sync(() => {
            const fieldErrors = showError(err, {
              redirectOnAuth: true,
              redirectTo: "/ski-specs",
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

  const getSkiSpec = useCallback(
    async (id: string): Promise<SkiSpecDTO> => {
      return await pipe(
        Effect.sync(() => {
          setIsSubmitting(true);
          setApiErrors({});
        }),
        Effect.flatMap(() => skiSpecHttpClient.get(`/api/ski-specs/${id}`, SkiSpecDTOSchema)),
        Effect.tap(() =>
          Effect.sync(() => {
            setIsSubmitting(false);
          })
        ),
        Effect.tapError((err) =>
          Effect.sync(() => {
            showError(err, {
              redirectOnAuth: true,
              redirectTo: "/ski-specs",
            });
            setIsSubmitting(false);
          })
        ),
        Effect.runPromise
      );
    },
    [showError]
  );

  const deleteSkiSpec = useCallback(
    async (id: string): Promise<void> => {
      return await pipe(
        Effect.sync(() => {
          setIsSubmitting(true);
          setApiErrors({});
        }),
        Effect.flatMap(() => skiSpecHttpClient.delete(`/api/ski-specs/${id}`, SkiSpecDTOSchema)),
        Effect.map(() => undefined),
        Effect.tap(() =>
          Effect.sync(() => {
            showSuccess("Success", "Specification has been deleted");
            setIsSubmitting(false);
          })
        ),
        Effect.tapError((err) =>
          Effect.sync(() => {
            showError(err, { redirectOnAuth: true, redirectTo: "/ski-specs" });
            setIsSubmitting(false);
          })
        ),
        Effect.runPromise
      );
    },
    [showError, showSuccess]
  );
  return {
    createSkiSpec,
    updateSkiSpec,
    getSkiSpec,
    deleteSkiSpec,
    isSubmitting,
    apiErrors,
  };
};
