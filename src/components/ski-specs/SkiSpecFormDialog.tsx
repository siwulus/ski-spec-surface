import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SkiSpecForm } from "./SkiSpecForm";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { useUrlSync } from "@/components/hooks/useUrlSync";
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
  /** Form mode - only 'create' for this implementation */
  mode: "create";
  /** Success callback with created spec */
  onSuccess?: (spec: SkiSpecDTO) => void;
  /** Ref to the trigger button for focus return */
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Main dialog container for creating ski specifications
 * Handles URL sync, form submission, and unsaved changes
 */
export const SkiSpecFormDialog: React.FC<SkiSpecFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  onSuccess,
  triggerRef,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync modal state with URL
  useUrlSync(open, onOpenChange);

  // Focus management
  useFocusTrap(dialogRef, open, triggerRef);

  // API mutation hook
  const { createSkiSpec, isSubmitting, apiErrors } = useSkiSpecMutation((spec) => {
    // On success
    setHasUnsavedChanges(false);
    onOpenChange(false);
    onSuccess?.(spec);
  });

  // Handle form submission
  const handleSubmit = async (data: CreateSkiSpecCommand) => {
    try {
      await createSkiSpec(data);
    } catch (error) {
      // Error already handled in useSkiSpecMutation
      // eslint-disable-next-line no-console
      console.error("Failed to create ski spec:", error);
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

          <SkiSpecForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            apiErrors={apiErrors}
            onUnsavedChanges={setHasUnsavedChanges}
          />
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
