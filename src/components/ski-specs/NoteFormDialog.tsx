import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CreateNoteCommand, NoteDTO } from '@/types/api.types';
import React, { useState } from 'react';
import { NoteForm } from './NoteForm';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

/**
 * Props for the note form dialog component
 */
export interface NoteFormDialogProps {
  /** Controlled open state */
  open: boolean;
  /** Open state change handler */
  onOpenChange: (open: boolean) => void;
  /** Form mode - 'create' or 'edit' */
  mode: 'create' | 'edit';
  /** Note data for edit mode */
  noteToEdit?: NoteDTO;
  /** Form submission handler */
  onSubmit: (data: CreateNoteCommand) => Promise<void>;
  /** Submission state */
  isSubmitting: boolean;
  /** API validation errors */
  apiErrors?: Record<string, string>;
}

/**
 * Dialog container for creating and editing notes.
 * Handles form submission and unsaved changes confirmation.
 */
export const NoteFormDialog: React.FC<NoteFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  noteToEdit,
  onSubmit,
  isSubmitting,
  apiErrors = {},
}) => {
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Handle form submission
  const handleSubmit = async (data: CreateNoteCommand) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      // Error already handled in useNoteMutation
      // eslint-disable-next-line no-console
      console.error(`Failed to ${mode} note:`, error);
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
      <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
        <DialogContent className="max-w-2xl" aria-labelledby="dialog-title" aria-describedby="dialog-description">
          <DialogHeader>
            <DialogTitle id="dialog-title">{mode === 'create' ? 'Add New Note' : 'Edit Note'}</DialogTitle>
            <DialogDescription id="dialog-description">
              {mode === 'create'
                ? 'Add a note to this ski specification. Maximum 2000 characters.'
                : 'Edit your note. Maximum 2000 characters.'}
            </DialogDescription>
          </DialogHeader>

          <NoteForm
            key={mode === 'edit' && noteToEdit ? noteToEdit.id : 'new'}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            defaultValues={
              mode === 'edit' && noteToEdit
                ? {
                    content: noteToEdit.content,
                  }
                : undefined
            }
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
