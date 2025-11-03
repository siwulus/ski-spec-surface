import * as React from 'react';
import type { ExportSkiSpecsQuery } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { DownloadIcon, Loader2Icon } from 'lucide-react';
import { useExportCsv } from '@/components/hooks/useExportCsv';

export interface ExportButtonProps {
  query: ExportSkiSpecsQuery;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ query, className }) => {
  const { exportFile, isExporting } = useExportCsv();

  const handleClick = React.useCallback(async () => {
    await exportFile(query);
  }, [exportFile, query]);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isExporting}
      aria-label="Export specifications to CSV file"
      aria-busy={isExporting}
      className={className}
      data-testid="export-button"
    >
      {isExporting ? (
        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
      ) : (
        <DownloadIcon className="h-4 w-4 mr-2" aria-hidden="true" />
      )}
      Export CSV
    </Button>
  );
};
