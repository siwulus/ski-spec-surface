import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { NoteDTO } from '@/types/api.types';
import { Pencil, Trash2, FileText } from 'lucide-react';
import * as React from 'react';

interface NoteCardProps {
  note: NoteDTO;
  onEdit?: (note: NoteDTO) => void;
  onDelete?: (noteId: string) => void;
  isInProgress?: boolean;
}

/**
 * Formats ISO datetime string to localized date and time.
 */
const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const NoteCard: React.FC<NoteCardProps> = React.memo(
  ({ note, onEdit, onDelete, isInProgress }: NoteCardProps) => {
    const isEdited = note.updated_at !== note.created_at;

    return (
      <Card data-testid={`note-card-${note.id}`} className="relative">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            {/* Avatar Icon */}
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <FileText className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Note Content */}
              <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>

              {/* Timestamps */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <time dateTime={note.created_at} title={`Created: ${formatDateTime(note.created_at)}`}>
                  Created {formatDateTime(note.created_at)}
                </time>
                {isEdited && (
                  <time dateTime={note.updated_at} title={`Updated: ${formatDateTime(note.updated_at)}`}>
                    Edited {formatDateTime(note.updated_at)}
                  </time>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Edit note"
                onClick={() => onEdit?.(note)}
                disabled={isInProgress}
                data-testid="note-card-edit-button"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete note"
                onClick={() => onDelete?.(note.id)}
                disabled={isInProgress}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid="note-card-delete-button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

NoteCard.displayName = 'NoteCard';
