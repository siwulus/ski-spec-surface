import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SkiSpecForm } from "./SkiSpecForm";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { useSkiSpecMutation } from "@/components/hooks/useSkiSpecMutation";
import { useFocusTrap } from "@/components/hooks/useFocusTrap";
import type { CreateSkiSpecCommand, SkiSpecDTO } from "@/types/api.types";

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
  /** Success callback with created/updated spec */
  onSuccess?: (spec: SkiSpecDTO) => void;
  /** Ref to the trigger button for focus return */
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Main dialog container for creating and editing ski specifications
 * Handles URL sync, form submission, and unsaved changes
 */
export const SkiSpecFormDialog: React.FC<SkiSpecFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  specId,
  onSuccess,
  triggerRef,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialData, setInitialData] = useState<SkiSpecDTO | undefined>();

  // Focus management
  useFocusTrap(dialogRef, open, triggerRef);

  // API mutation hook
  const { createSkiSpec, updateSkiSpec, getSkiSpec, isSubmitting, apiErrors } = useSkiSpecMutation((spec) => {
    // On success
    setHasUnsavedChanges(false);
    onOpenChange(false);
    onSuccess?.(spec);
  });

  // Fetch initial data when dialog opens in edit mode
  useEffect(() => {
    if (open && mode === "edit" && specId) {
      getSkiSpec(specId)
        .then(setInitialData)
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error("Failed to fetch ski spec:", error);
          setInitialData(undefined);
        });
    } else if (!open) {
      // Reset initial data when dialog closes
      setInitialData(undefined);
    }
  }, [open, mode, specId, getSkiSpec]);

  // Handle form submission
  const handleSubmit = async (data: CreateSkiSpecCommand) => {
    try {
      if (mode === "edit" && specId) {
        await updateSkiSpec(specId, data);
      } else {
        await createSkiSpec(data);
      }
    } catch (error) {
      // Error already handled in useSkiSpecMutation
      // eslint-disable-next-line no-console
      console.error(`Failed to ${mode} ski spec:`, error);
    }
  };

  // Handle cancel - check for unsaved changes
  const handleCancel = () => {
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

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          ref={dialogRef}
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
        >
          <DialogHeader>
            <DialogTitle id="dialog-title">
              {mode === "create" ? "Add New Specification" : "Edit Specification"}
            </DialogTitle>
            <DialogDescription id="dialog-description">
              Enter the technical parameters of the skis. All fields marked with an asterisk (*) are required.
            </DialogDescription>
          </DialogHeader>

          {/* Only render form when we have data in edit mode, or immediately in create mode */}
          {(mode === "create" || (mode === "edit" && initialData)) && (
            <SkiSpecForm
              key={mode === "edit" ? specId : "new"}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              defaultValues={
                mode === "edit" && initialData
                  ? {
                      name: initialData.name,
                      description: initialData.description,
                      length: initialData.length,
                      tip: initialData.tip,
                      waist: initialData.waist,
                      tail: initialData.tail,
                      radius: initialData.radius,
                      weight: initialData.weight,
                    }
                  : undefined
              }
              isSubmitting={isSubmitting}
              apiErrors={apiErrors}
              onUnsavedChanges={setHasUnsavedChanges}
            />
          )}

          {/* Show loading state while fetching data in edit mode */}
          {mode === "edit" && !initialData && <div className="py-8 text-center text-muted-foreground">Loading...</div>}
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
