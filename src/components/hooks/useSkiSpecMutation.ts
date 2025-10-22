import { useState, useCallback } from "react";
import type { CreateSkiSpecCommand, UpdateSkiSpecCommand, SkiSpecDTO, ApiErrorResponse } from "@/types/api.types";
import { toast } from "sonner";

/**
 * Custom hook for handling ski spec CRUD API calls
 *
 * @param onSuccess - Optional success callback for create/update operations
 * @returns CRUD functions, loading state, and API errors
 */
export const useSkiSpecMutation = (onSuccess?: (spec: SkiSpecDTO) => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const createSkiSpec = useCallback(
    async (data: CreateSkiSpecCommand): Promise<void> => {
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

            toast.error("Validation Error", {
              description: "Please check the entered data.",
            });

            throw new Error("Validation failed");
          }

          // Handle conflict error (409)
          if (response.status === 409) {
            setApiErrors({
              name: "A specification with this name already exists",
            });

            toast.error("Name Already Exists", {
              description: "A specification with this name already exists. Choose a different name.",
            });

            throw new Error("Conflict");
          }

          // Handle unauthorized error (401)
          if (response.status === 401) {
            toast.error("Session Expired", {
              description: "Please log in again.",
            });

            // Redirect to login
            window.location.href = "/auth/login?redirectTo=/ski-specs";
            throw new Error("Unauthorized");
          }

          // Handle other errors
          toast.error("Error", {
            description: "Failed to create specification. Please try again.",
          });

          throw new Error("Failed to create specification");
        }

        const spec: SkiSpecDTO = await response.json();

        toast.success("Success", {
          description: "Specification has been added",
        });

        onSuccess?.(spec);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess]
  );

  const updateSkiSpec = useCallback(
    async (id: string, data: UpdateSkiSpecCommand): Promise<void> => {
      setIsSubmitting(true);
      setApiErrors({});

      try {
        const response = await fetch(`/api/ski-specs/${id}`, {
          method: "PUT",
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

            toast.error("Validation Error", {
              description: "Please check the entered data.",
            });

            throw new Error("Validation failed");
          }

          // Handle conflict error (409)
          if (response.status === 409) {
            setApiErrors({
              name: "A specification with this name already exists",
            });

            toast.error("Name Already Exists", {
              description: "A specification with this name already exists. Choose a different name.",
            });

            throw new Error("Conflict");
          }

          // Handle not found error (404)
          if (response.status === 404) {
            toast.error("Not Found", {
              description: "Specification not found.",
            });

            throw new Error("Not found");
          }

          // Handle unauthorized error (401)
          if (response.status === 401) {
            toast.error("Session Expired", {
              description: "Please log in again.",
            });

            // Redirect to login
            window.location.href = "/auth/login?redirectTo=/ski-specs";
            throw new Error("Unauthorized");
          }

          // Handle other errors
          toast.error("Error", {
            description: "Failed to update specification. Please try again.",
          });

          throw new Error("Failed to update specification");
        }

        const spec: SkiSpecDTO = await response.json();

        toast.success("Success", {
          description: "Specification has been updated",
        });

        onSuccess?.(spec);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess]
  );

  const getSkiSpec = useCallback(async (id: string): Promise<SkiSpecDTO> => {
    setIsSubmitting(true);
    setApiErrors({});

    try {
      const response = await fetch(`/api/ski-specs/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Handle not found error (404)
        if (response.status === 404) {
          toast.error("Not Found", {
            description: "Specification not found.",
          });

          throw new Error("Specification not found");
        }

        // Handle unauthorized error (401)
        if (response.status === 401) {
          toast.error("Session Expired", {
            description: "Please log in again.",
          });

          // Redirect to login
          window.location.href = "/auth/login?redirectTo=/ski-specs";
          throw new Error("Unauthorized");
        }

        // Handle invalid UUID format (400)
        if (response.status === 400) {
          toast.error("Invalid ID", {
            description: "Invalid specification ID format.",
          });

          throw new Error("Invalid ID format");
        }

        // Handle other errors
        toast.error("Error", {
          description: "Failed to fetch specification. Please try again.",
        });

        throw new Error("Failed to fetch specification");
      }

      const spec: SkiSpecDTO = await response.json();
      return spec;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    createSkiSpec,
    updateSkiSpec,
    getSkiSpec,
    isSubmitting,
    apiErrors,
  };
};
