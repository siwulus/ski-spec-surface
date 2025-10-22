import * as React from "react";
import type { ListSkiSpecsQuery } from "@/types/api.types";
import { SkiSpecCard } from "@/components/SkiSpecCard";
import { SkiSpecGridSkeleton } from "@/components/SkiSpecGridSkeleton";
import { SkiSpecToolbar } from "@/components/SkiSpecToolbar";
import { SkiSpecPagination } from "@/components/SkiSpecPagination";
import { SkiSpecFormDialog } from "@/components/ski-specs/SkiSpecFormDialog";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useSkiSpecs } from "./hooks/useSkiSpecs";
import { useSkiSpecsQueryUrlState } from "./hooks/useSkiSpecsQueryUrlState";

interface EmptyStateProps {
  onAddClick: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onAddClick }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="text-center space-y-4 max-w-md">
      <h2 className="text-2xl font-semibold text-foreground">No specifications yet</h2>
      <p className="text-muted-foreground">
        Get started by adding your first ski specification to compare different models and analyze their
        characteristics.
      </p>
      <Button onClick={onAddClick} className="mt-4">
        <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
        Add your first specification
      </Button>
    </div>
  </div>
);

export const SkiSpecGrid: React.FC = () => {
  const { state, updateState } = useSkiSpecsQueryUrlState();
  const { specs, pagination, isLoading, error, refetch } = useSkiSpecs(state);

  // Dialog state management
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  // Check URL on mount to auto-open dialog
  React.useEffect(() => {
    if (window.location.pathname === "/ski-specs/new") {
      setDialogOpen(true);
    }
  }, []);

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

  const handleAddClick = React.useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleDialogSuccess = React.useCallback(() => {
    // Refetch the list after successful creation
    refetch();
  }, [refetch]);

  return (
    <>
      {/* Header with Add button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          {(pagination?.total_pages ?? 0) > 0 && (
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
          )}
        </div>
        {(pagination?.total_pages ?? 0) > 0 && (
          <Button ref={addButtonRef} onClick={handleAddClick} className="ml-4">
            <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Specification
          </Button>
        )}
      </div>

      {isLoading && <SkiSpecGridSkeleton />}

      {error && (
        <div className="flex flex-col items-center justify-center py-12 px-4" role="alert" aria-live="assertive">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-semibold text-destructive">Error loading specifications</h2>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        </div>
      )}

      {!isLoading && (pagination?.total_pages ?? 0) === 0 && <EmptyState onAddClick={handleAddClick} />}

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

      {/* Add Specification Dialog */}
      <SkiSpecFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
        onSuccess={handleDialogSuccess}
        triggerRef={addButtonRef}
      />
    </>
  );
};
