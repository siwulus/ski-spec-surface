import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { PaginationMeta, SkiSpecDTO, SkiSpecListResponse } from "@/types/api.types";
import { SkiSpecListResponseSchema } from "@/types/api.types";
import { buildUrl, get, HttpClientError } from "@/lib/utils/httpClient";

interface UseSkiSpecsOptions {
  page?: number;
  limit?: number;
  sort_by?: "name" | "length" | "surface_area" | "relative_weight" | "created_at";
  sort_order?: "asc" | "desc";
  search?: string;
}

interface UseSkiSpecsReturn {
  specs: SkiSpecDTO[] | null;
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const fetchSkiSpecs = async (options: UseSkiSpecsOptions): Promise<SkiSpecListResponse> => {
  const url = buildUrl("/api/ski-specs", {
    page: options.page ?? 1,
    limit: options.limit ?? 100,
    sort_by: options.sort_by ?? "created_at",
    sort_order: options.sort_order ?? "desc",
    search: options.search,
  });

  return await get(url, SkiSpecListResponseSchema);
};

export const useSkiSpecs = (options: UseSkiSpecsOptions = {}): UseSkiSpecsReturn => {
  const [specs, setSpecs] = useState<SkiSpecDTO[] | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSpecs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchSkiSpecs({
        page: options.page,
        limit: options.limit,
        sort_by: options.sort_by,
        sort_order: options.sort_order,
        search: options.search,
      });
      setSpecs(data.data);
      setPagination(data.pagination);
    } catch (err) {
      const error = err as Error;
      setError(error);

      // Handle specific HTTP errors
      if (err instanceof HttpClientError) {
        if (err.status === 401) {
          toast.error("Authentication required", {
            description: "Please log in to view ski specifications",
          });
          return;
        }

        if (err.code === "VALIDATION_ERROR") {
          toast.error("Invalid response format", {
            description: "The server returned unexpected data",
          });
          return;
        }

        if (err.code === "NETWORK_ERROR") {
          toast.error("Network error", {
            description: "Please check your internet connection and try again",
          });
          return;
        }
      }

      // Generic error fallback
      toast.error("Failed to load ski specifications", {
        description: error.message || "Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  }, [options.page, options.limit, options.sort_by, options.sort_order, options.search]);

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
