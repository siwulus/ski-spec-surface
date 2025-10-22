import { useState } from "react";
import type { CreateSkiSpecCommand, SkiSpecDTO, ApiErrorResponse } from "@/types/api.types";
import { toast } from "sonner";

/**
 * Custom hook for handling ski spec creation API call
 *
 * @param onSuccess - Optional success callback
 * @returns Mutation function, loading state, and API errors
 */
export const useSkiSpecMutation = (onSuccess?: (spec: SkiSpecDTO) => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const createSkiSpec = async (data: CreateSkiSpecCommand): Promise<void> => {
    setIsSubmitting(true);
    setApiErrors({});

    try {
      const response = await fetch("/api/ski-specs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Handle validation errors (400/422)
        if (response.status === 400 || response.status === 422) {
          const error: ApiErrorResponse = await response.json();
          const fieldErrors: Record<string, string> = {};

          error.details?.forEach((detail) => {
            fieldErrors[detail.field] = detail.message;
          });

          setApiErrors(fieldErrors);

          toast.error("Błąd walidacji", {
            description: "Sprawdź poprawność wprowadzonych danych.",
          });

          throw new Error("Validation failed");
        }

        // Handle conflict error (409)
        if (response.status === 409) {
          setApiErrors({
            name: "Specyfikacja o tej nazwie już istnieje",
          });

          toast.error("Nazwa już istnieje", {
            description: "Specyfikacja o tej nazwie już istnieje. Wybierz inną nazwę.",
          });

          throw new Error("Conflict");
        }

        // Handle unauthorized error (401)
        if (response.status === 401) {
          toast.error("Sesja wygasła", {
            description: "Zaloguj się ponownie.",
          });

          // Redirect to login
          window.location.href = "/auth/login?redirectTo=/ski-specs";
          throw new Error("Unauthorized");
        }

        // Handle other errors
        toast.error("Błąd", {
          description: "Nie udało się utworzyć specyfikacji. Spróbuj ponownie.",
        });

        throw new Error("Failed to create specification");
      }

      const spec: SkiSpecDTO = await response.json();

      toast.success("Sukces", {
        description: "Specyfikacja została dodana",
      });

      onSuccess?.(spec);
    } catch (error) {
      // Error already handled above, just re-throw
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createSkiSpec,
    isSubmitting,
    apiErrors,
  };
};
