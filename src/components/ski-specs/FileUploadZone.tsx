import { useCallback, useId, useRef, useState, type DragEvent } from 'react';
import { UploadIcon, FileIcon, AlertCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

/**
 * FileUploadZone component provides a drag-and-drop area for file uploads
 * with keyboard accessibility and visual feedback.
 */
export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  isLoading = false,
  accept = '.csv,text/csv,application/csv',
  maxSizeMB = 10,
  disabled = false,
}: FileUploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const fileNameId = `${id}-filename`;
  const errorId = `${id}-error`;

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxSizeBytes) {
        return `File is too large (maximum size: ${maxSizeMB}MB)`;
      }

      // Check file type
      const validTypes = ['text/csv', 'application/csv'];
      const validExtensions = ['.csv'];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        return 'Invalid file format. Accepted formats: CSV';
      }

      return null;
    },
    [maxSizeBytes, maxSizeMB]
  );

  const handleFileSelection = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        setSelectedFileName(null);
        return;
      }

      setSelectedFileName(file.name);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelection(file);
      }
    },
    [handleFileSelection]
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled && !isLoading) {
        setIsDragOver(true);
      }
    },
    [disabled, isLoading]
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      if (disabled || isLoading) {
        return;
      }

      const file = event.dataTransfer.files?.[0];
      if (file) {
        handleFileSelection(file);
      }
    },
    [disabled, isLoading, handleFileSelection]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isLoading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isLoading]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.key === 'Enter' || event.key === ' ') && !disabled && !isLoading) {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled, isLoading]
  );

  const isDisabled = disabled || isLoading;

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label="Drag a CSV file here or click to select"
        aria-describedby={error ? errorId : undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
					relative flex flex-col items-center justify-center
					min-h-[200px] p-8
					border-2 border-dashed rounded-lg
					transition-colors duration-200
					${isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
					${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
					focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
				`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          disabled={isDisabled}
          className="sr-only"
          aria-hidden="true"
        />

        <div className="flex flex-col items-center gap-3 text-center">
          <UploadIcon className={`h-12 w-12 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
          <div>
            <p className="text-base font-medium text-foreground">Drag a CSV file here</p>
            <p className="text-sm text-muted-foreground mt-1">or</p>
          </div>
          <Button type="button" variant="outline" disabled={isDisabled} tabIndex={-1}>
            Choose file
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Maximum size: {maxSizeMB}MB</p>
        </div>
      </div>

      {selectedFileName && !error && (
        <div
          className="flex items-center gap-2 p-3 bg-muted rounded-md"
          role="status"
          aria-live="polite"
          id={fileNameId}
        >
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground flex-1 truncate">{selectedFileName}</span>
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
          role="alert"
          aria-live="assertive"
          id={errorId}
        >
          <AlertCircleIcon className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}
    </div>
  );
};
