import { useImportCsv } from '@/components/hooks/useImportCsv';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2Icon } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { ImportResultsTabs } from './ImportResultsTabs';

export interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStage = 'upload' | 'uploading' | 'results';

/**
 * ImportCsvDialog provides a complete CSV import workflow with file upload,
 * progress indication, and detailed results display.
 */
export const ImportCsvDialog: React.FC<ImportCsvDialogProps> = ({ open, onOpenChange }: ImportCsvDialogProps) => {
  const [stage, setStage] = useState<ImportStage>('upload');
  const { uploadFile, isUploading, result, error } = useImportCsv();
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Delay reset to avoid flickering during close animation
      const timer = setTimeout(() => {
        setStage('upload');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Update stage based on upload state
  useEffect(() => {
    if (isUploading) {
      setStage('uploading');
    } else if (result) {
      setStage('results');
    } else if (error) {
      // Stay in upload stage to allow retry
      setStage('upload');
    }
  }, [isUploading, result, error]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      await uploadFile(file);
    },
    [uploadFile]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const getDialogTitle = (): string => {
    switch (stage) {
      case 'uploading':
        return 'Importing specifications...';
      case 'results':
        return 'Import results';
      default:
        return 'Import specifications';
    }
  };

  const getDialogDescription = (): string => {
    switch (stage) {
      case 'uploading':
        return 'Please wait while the CSV file is being processed...';
      case 'results':
        return 'Summary of imported specifications and validation errors';
      default:
        return 'Import ski specifications from a CSV file (max 10MB)';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>{getDialogTitle()}</DialogTitle>
          <DialogDescription id={descriptionId}>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Upload Stage */}
          {stage === 'upload' && (
            <>
              <FileUploadZone
                onFileSelect={handleFileSelect}
                isLoading={isUploading}
                accept=".csv,text/csv,application/csv"
                maxSizeMB={10}
              />
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {/* Uploading Stage */}
          {stage === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2Icon className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-base font-medium text-foreground" role="status" aria-live="polite">
                Importing...
              </p>
              <p className="text-sm text-muted-foreground mt-2">Validating and processing data</p>
            </div>
          )}

          {/* Results Stage */}
          {stage === 'results' && result && (
            <>
              <div role="status" aria-live="assertive" className="sr-only" aria-atomic="true">
                Imported {result.summary.successful} specifications, {result.summary.failed} errors
              </div>
              <ImportResultsTabs result={result} />
              <div className="flex justify-end gap-2 mt-6">
                <Button onClick={handleClose}>Close</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
