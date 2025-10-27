import * as React from 'react';
import type { ListSkiSpecsQuery } from '@/types/api.types';
import { SkiSpecCard } from '@/components/ski-specs/SkiSpecCard';
import { SkiSpecGridSkeleton } from '@/components/ski-specs/SkiSpecGridSkeleton';
import { SkiSpecToolbar } from '@/components/ski-specs/SkiSpecToolbar';
import { SkiSpecPagination } from '@/components/ski-specs/SkiSpecPagination';
import { SkiSpecFormDialog } from '@/components/ski-specs/SkiSpecFormDialog';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useSkiSpecs } from '../hooks/useSkiSpecs';
import { useSkiSpecsUrlState } from '../hooks/useSkiSpecsUrlState';
import { useSkiSpecMutation } from '../hooks/useSkiSpecMutation';
import { toast } from 'sonner';
import { DeleteSkiSpecDialog } from './DeleteSkiSpecDialog';

interface EmptyStateProps {
  onAddClick: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onAddClick }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="text-center space-y-4 max-w-md">
      <Button onClick={onAddClick} className="mt-4">
        <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
        Add your ski specification
      </Button>
    </div>
  </div>
);

export const SkiSpecGrid: React.FC = () => {
  const { queryState, updateQueryState, dialogAction, editingId, openDialog, openEditDialog, closeDialog } =
    useSkiSpecsUrlState();
  const { specs, pagination, isLoading, error, refetch } = useSkiSpecs(queryState);

  // Refs for focus management
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  // Delete state and mutation
  const [isDeletingDialogOpen, setIsDeletingDialogOpen] = React.useState<boolean>(false);
  const [deletingSpecId, setDeletingSpecId] = React.useState<string | null>(null);

  const { deleteSkiSpec, isSubmitting } = useSkiSpecMutation();

  const handleSearchChange = React.useCallback(
    (search: string) => {
      updateQueryState({ search, page: 1 }); // Reset to page 1 on new search
    },
    [updateQueryState]
  );

  const handleSortByChange = React.useCallback(
    (sort_by: ListSkiSpecsQuery['sort_by']) => {
      updateQueryState({ sort_by });
    },
    [updateQueryState]
  );

  const handleSortOrderChange = React.useCallback(
    (sort_order: ListSkiSpecsQuery['sort_order']) => {
      updateQueryState({ sort_order });
    },
    [updateQueryState]
  );

  const handlePageChange = React.useCallback(
    (page: number) => {
      updateQueryState({ page });
      // Scroll to top after page change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateQueryState]
  );

  const handleLimitChange = React.useCallback(
    (limit: number) => {
      updateQueryState({ limit, page: 1 }); // Reset to page 1 on limit change
    },
    [updateQueryState]
  );

  const handleAddClick = React.useCallback(() => {
    openDialog();
  }, [openDialog]);

  const handleEditClick = React.useCallback(
    (id: string) => {
      openEditDialog(id);
    },
    [openEditDialog]
  );

  const handleDeleteClick = React.useCallback((id: string) => {
    setDeletingSpecId(id);
    setIsDeletingDialogOpen(true);
  }, []);

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!deletingSpecId) return;
    try {
      await deleteSkiSpec(deletingSpecId);
      setDeletingSpecId(null);
      refetch();
    } catch (error) {
      toast.error('Error deleting specification', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      // Error already handled in useSkiSpecMutation
    }
  }, [deletingSpecId, deleteSkiSpec, refetch]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <header>
          <h1 className="text-3xl font-bold text-foreground" data-testid="ski-spec-grid-header">
            Ski Specifications
          </h1>
          <p className="mt-2 text-muted-foreground">Manage your ski specifications and compare different models.</p>
        </header>
        <Button ref={addButtonRef} onClick={handleAddClick} className="ml-4">
          <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          Add Specification
        </Button>
      </div>

      <SkiSpecToolbar
        search={queryState.search || ''}
        sortBy={queryState.sort_by || 'created_at'}
        sortOrder={queryState.sort_order || 'desc'}
        limit={queryState.limit || 20}
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

      {!isLoading && (pagination?.total_pages ?? 0) === 0 && <EmptyState onAddClick={handleAddClick} />}

      {!isLoading && !error && specs && specs.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map((spec) => (
              <SkiSpecCard
                key={spec.id}
                spec={spec}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                isInProgress={isSubmitting}
              />
            ))}
          </div>

          {pagination && pagination.total_pages > 1 && (
            <SkiSpecPagination pagination={pagination} onPageChange={handlePageChange} />
          )}
        </>
      )}

      {/* Unified Specification Dialog */}
      <SkiSpecFormDialog
        open={dialogAction === 'new' || dialogAction === 'edit'}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
            refetch();
          }
        }}
        mode={dialogAction === 'edit' ? 'edit' : 'create'}
        specId={editingId || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteSkiSpecDialog
        open={isDeletingDialogOpen}
        onOpenChange={setIsDeletingDialogOpen}
        onConfirm={handleDeleteConfirm}
        isInProgress={isSubmitting}
      />
    </>
  );
};
