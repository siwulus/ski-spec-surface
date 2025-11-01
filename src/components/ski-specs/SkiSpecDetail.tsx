import { useSkiSpec } from '@/components/hooks/useSkiSpec';
import { useSkiSpecMutation } from '@/components/hooks/useSkiSpecMutation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { DeleteSkiSpecDialog } from './DeleteSkiSpecDialog';
import { NotesList } from './NotesList';
import { SkiDiagram } from './SkiDiagram';
import { SkiSpecFormDialog } from './SkiSpecFormDialog';
import { SpecValue } from './SpecValue';

interface SkiSpecDetailProps {
  specId: string;
  returnQueryParams?: string;
}

/**
 * Main detail view component for a ski specification.
 * Displays all spec parameters, description, action buttons, and notes section.
 */
export const SkiSpecDetail: React.FC<SkiSpecDetailProps> = ({ specId, returnQueryParams }) => {
  const { spec, isLoading, error, refetch } = useSkiSpec(specId);
  const { deleteSkiSpec, isSubmitting } = useSkiSpecMutation();

  // Dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    await deleteSkiSpec(specId);
    // Redirect to list page after successful deletion, preserving filters
    const listUrl = returnQueryParams ? `/ski-specs${returnQueryParams}` : '/ski-specs';
    window.location.href = listUrl;
  };

  // Handle back to list
  const handleBackToList = () => {
    // Navigate back with preserved filters/sorting
    const listUrl = returnQueryParams ? `/ski-specs${returnQueryParams}` : '/ski-specs';
    window.location.href = listUrl;
  };

  // Handle edit success - refetch data to show updated spec
  const handleEditSuccess = async () => {
    await refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading specification...</p>
      </div>
    );
  }

  // Error state (404 or other errors will trigger redirect via useSkiSpec hook)
  if (error || !spec) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Specification not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBackToList} aria-label="Back to list">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      {/* Main Card - Spec Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{spec.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Added on {new Date(spec.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                aria-label={`Edit ${spec.name}`}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label={`Delete ${spec.name}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Ski Diagram Visualization */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Dimensions</h3>
            <SkiDiagram spec={spec} />
          </div>

          <Separator />

          {/* Calculated Metrics - Highlighted */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Calculated Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="shrink-0">
                  Key Metric
                </Badge>
                <SpecValue label="Surface Area" value={spec.surface_area} unit="cm²" />
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="shrink-0">
                  Key Metric
                </Badge>
                <SpecValue label="Relative Weight" value={spec.relative_weight} unit="g/cm²" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Algorithm version: {spec.algorithm_version}</p>
          </div>

          <Separator />

          {/* Description Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Description</h3>
            {spec.description ? (
              <p className="text-sm whitespace-pre-wrap">{spec.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description provided</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardContent className="pt-6">
          <NotesList specId={specId} />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <SkiSpecFormDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            // Refetch data when dialog closes to show updated spec
            void handleEditSuccess();
          }
        }}
        mode="edit"
        specId={specId}
      />

      {/* Delete Dialog */}
      <DeleteSkiSpecDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isInProgress={isSubmitting}
      />
    </div>
  );
};
