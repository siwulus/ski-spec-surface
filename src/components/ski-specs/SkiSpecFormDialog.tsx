import { useSkiSpecMutation } from "@/components/hooks/useSkiSpecMutation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CreateSkiSpecCommand, SkiSpecDTO, UpdateSkiSpecCommand } from "@/types/api.types";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { SkiSpecForm } from "./SkiSpecForm";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

/**
 * Props for the main dialog component
 */
export interface SkiSpecFormDialogProps {
  /** Controlled open state */
  open: boolean;
  /** Open state change handler */
  onOpenChange: (open: boolean) => void;
  /** Form mode - 'create' or 'edit' */
  mode: "create" | "edit";
  /** Spec ID for edit mode */
  specId?: string;
}

/**
 * Main dialog container for creating and editing ski specifications
 * Handles URL sync, form submission, and unsaved changes
 */
export const SkiSpecFormDialog: React.FC<SkiSpecFormDialogProps> = ({ open, onOpenChange, mode, specId }) => {
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editData, setEditData] = useState<SkiSpecDTO | undefined>();

  // API mutation hook
  const { createSkiSpec, updateSkiSpec, getSkiSpec, isSubmitting, apiErrors } = useSkiSpecMutation();

  // Fetch initial data when dialog opens in edit mode
  useEffect(() => {
    if (open && mode === "edit" && specId) {
      getSkiSpec(specId)
        .then(setEditData)
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error("Failed to fetch ski spec:", error);
          setEditData(undefined);
        });
    } else if (!open) {
      // Reset initial data when dialog closes
      setEditData(undefined);
    }
  }, [open, mode, specId, getSkiSpec]);

  // Handle form submission
  const handleCreateUpdateSubmit = async (data: CreateSkiSpecCommand | UpdateSkiSpecCommand) => {
    try {
      if (mode === "edit" && specId) {
        await updateSkiSpec(specId, data);
      } else {
        await createSkiSpec(data);
      }
      onOpenChange(false);
    } catch (error) {
      // Error already handled in useSkiSpecMutation
      // eslint-disable-next-line no-console
      console.error(`Failed to ${mode} ski spec:`, error);
    }
  };

  // Handle cancel - check for unsaved changes
  const handleCreateUpdateCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  // Handle dialog open change - check for unsaved changes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  // Confirm discard unsaved changes
  const handleConfirmDiscard = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  // Cancel discard (keep modal open)
  const handleCancelDiscard = () => {
    setShowUnsavedDialog(false);
  };

  // Determine if we should show content or loading state
  const isLoading = mode === "edit" && !editData;
  const showContent = mode === "create" || (mode === "edit" && editData);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-labelledby="dialog-title"
          aria-describedby={isLoading ? undefined : "dialog-description"}
        >
          {isLoading ? (
            // Show centered spinner while loading
            <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <p className="mt-4 text-sm text-muted-foreground">Loading specification...</p>
            </div>
          ) : (
            // Show full content when ready
            <>
              <DialogHeader>
                <DialogTitle id="dialog-title">
                  {mode === "create" ? "Add New Specification" : "Edit Specification"}
                </DialogTitle>
                <DialogDescription id="dialog-description">
                  Enter the technical parameters of the skis. All fields marked with an asterisk (*) are required.
                </DialogDescription>
              </DialogHeader>

              {showContent && (
                <SkiSpecForm
                  key={mode === "edit" ? specId : "new"}
                  onSubmit={handleCreateUpdateSubmit}
                  onCancel={handleCreateUpdateCancel}
                  defaultValues={
                    mode === "edit" && editData
                      ? {
                          name: editData.name,
                          description: editData.description,
                          length: editData.length,
                          tip: editData.tip,
                          waist: editData.waist,
                          tail: editData.tail,
                          radius: editData.radius,
                          weight: editData.weight,
                        }
                      : undefined
                  }
                  isSubmitting={isSubmitting}
                  apiErrors={apiErrors}
                  onUnsavedChanges={setHasUnsavedChanges}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </>
  );
};
