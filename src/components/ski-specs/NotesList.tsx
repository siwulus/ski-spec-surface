import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNotes } from '@/components/hooks/useNotes';
import { useNoteMutation } from '@/components/hooks/useNoteMutation';
import type { CreateNoteCommand, NoteDTO } from '@/types/api.types';
import { Plus, FileText } from 'lucide-react';
import React, { useState } from 'react';
import { NoteCard } from './NoteCard';
import { NoteFormDialog } from './NoteFormDialog';
import { DeleteNoteDialog } from './DeleteNoteDialog';

interface NotesListProps {
  specId: string;
}

/**
 * Container component for the notes section.
 * Manages notes list, pagination, and CRUD operations with modals.
 */
export const NotesList: React.FC<NotesListProps> = ({ specId }) => {
  const { notes, pagination, isLoading, loadMore, refetch } = useNotes({ specId, limit: 50 });
  const { createNote, updateNote, deleteNote, isSubmitting, apiErrors } = useNoteMutation();

  // Dialog state
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [noteToEdit, setNoteToEdit] = useState<NoteDTO | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | undefined>();

  // Handle opening add dialog
  const handleOpenAddDialog = () => {
    setFormMode('create');
    setNoteToEdit(undefined);
    setIsFormDialogOpen(true);
  };

  // Handle opening edit dialog
  const handleOpenEditDialog = (note: NoteDTO) => {
    setFormMode('edit');
    setNoteToEdit(note);
    setIsFormDialogOpen(true);
  };

  // Handle opening delete dialog
  const handleOpenDeleteDialog = (noteId: string) => {
    setNoteToDelete(noteId);
    setIsDeleteDialogOpen(true);
  };

  // Handle form submission (create or edit)
  const handleFormSubmit = async (data: CreateNoteCommand) => {
    if (formMode === 'create') {
      await createNote(specId, data);
    } else if (formMode === 'edit' && noteToEdit) {
      await updateNote(specId, noteToEdit.id, data);
    }

    // Refetch notes from page 1 to show updated list
    await refetch();
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;

    await deleteNote(specId, noteToDelete);

    // Refetch notes from page 1 to show updated list
    await refetch();
    setNoteToDelete(undefined);
  };

  const hasMorePages = pagination && pagination.page < pagination.total_pages;
  const showLoadMore = hasMorePages && !isLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Notes ({pagination?.total} {pagination?.total === 1 ? 'note' : 'notes'})
        </h2>
        <Button onClick={handleOpenAddDialog} size="sm" data-testid="add-note-button">
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      <Separator />

      {/* Loading state */}
      {isLoading && !notes && (
        <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
          <p className="text-sm text-muted-foreground">Loading notes...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notes && notes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center" role="status" aria-live="polite">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">No notes yet</p>
          <Button onClick={handleOpenAddDialog} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add your first note
          </Button>
        </div>
      )}

      {/* Notes list */}
      {notes && notes.length > 0 && (
        <div className="space-y-3" role="list" aria-label="Notes">
          {notes.map((note) => (
            <div key={note.id} role="listitem">
              <NoteCard
                note={note}
                onEdit={handleOpenEditDialog}
                onDelete={handleOpenDeleteDialog}
                isInProgress={isSubmitting}
              />
            </div>
          ))}
        </div>
      )}

      {/* Load more button */}
      {showLoadMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={loadMore} variant="outline" size="sm" disabled={isLoading}>
            Show more
          </Button>
        </div>
      )}

      {/* Form Dialog (Add/Edit) */}
      <NoteFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        mode={formMode}
        noteToEdit={noteToEdit}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        apiErrors={apiErrors}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteNoteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isInProgress={isSubmitting}
      />
    </div>
  );
};
