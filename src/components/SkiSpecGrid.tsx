import * as React from "react";
import type { ListSkiSpecsQuery } from "@/types/api.types";
import { SkiSpecCard } from "@/components/SkiSpecCard";
import { SkiSpecGridSkeleton } from "@/components/SkiSpecGridSkeleton";
import { SkiSpecToolbar } from "@/components/SkiSpecToolbar";
import { SkiSpecPagination } from "@/components/SkiSpecPagination";
import { useSkiSpecs } from "./hooks/useSkiSpecs";
import { useSkiSpecsQueryUrlState } from "./hooks/useSkiSpecsQueryUrlState";

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="text-center space-y-4 max-w-md">
      <h2 className="text-2xl font-semibold text-foreground">No specifications yet</h2>
      <p className="text-muted-foreground">
        Get started by adding your first ski specification to compare different models and analyze their
        characteristics.
      </p>
      <div className="text-sm text-muted-foreground mt-2">Add button coming in next iteration</div>
    </div>
  </div>
);

export const SkiSpecGrid: React.FC = () => {
  const { state, updateState } = useSkiSpecsQueryUrlState();

  const { specs, pagination, isLoading, error } = useSkiSpecs(state);

  const handleSearchChange = React.useCallback(
    (search: string) => {
      updateState({ search, page: 1 }); // Reset to page 1 on new search
    },
    [updateState]
  );

  const handleSortByChange = React.useCallback(
    (sort_by: ListSkiSpecsQuery["sort_by"]) => {
      updateState({ sort_by });
    },
    [updateState]
  );

  const handleSortOrderChange = React.useCallback(
    (sort_order: ListSkiSpecsQuery["sort_order"]) => {
      updateState({ sort_order });
    },
    [updateState]
  );

  const handlePageChange = React.useCallback(
    (page: number) => {
      updateState({ page });
      // Scroll to top after page change
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateState]
  );

  const handleLimitChange = React.useCallback(
    (limit: number) => {
      updateState({ limit, page: 1 }); // Reset to page 1 on limit change
    },
    [updateState]
  );

  return (
    <>
      <SkiSpecToolbar
        search={state.search || ""}
        sortBy={state.sort_by || "created_at"}
        sortOrder={state.sort_order || "desc"}
        limit={state.limit || 20}
        onSearchChange={handleSearchChange}
        onSortByChange={handleSortByChange}
        onSortOrderChange={handleSortOrderChange}
        onLimitChange={handleLimitChange}
      />

      {isLoading && <SkiSpecGridSkeleton />}

      {error && (
        <div className="flex flex-col items-center justify-center py-12 px-4" role="alert" aria-live="assertive">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-semibold text-destructive">Error loading specifications</h2>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (!specs || specs.length === 0) && <EmptyState />}

      {!isLoading && !error && specs && specs.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map((spec) => (
              <SkiSpecCard key={spec.id} spec={spec} />
            ))}
          </div>

          {pagination && pagination.total_pages > 1 && (
            <SkiSpecPagination pagination={pagination} onPageChange={handlePageChange} />
          )}
        </>
      )}
    </>
  );
};
