import { useMemo } from 'react';
import { CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
import type { ImportResponse } from '@/types/api.types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface ImportResultsTabsProps {
  result: ImportResponse;
}

/**
 * ImportResultsTabs displays the results of a CSV import operation
 * with separate tabs for successful imports and errors.
 */
export const ImportResultsTabs: React.FC<ImportResultsTabsProps> = ({ result }: ImportResultsTabsProps) => {
  const { summary, imported, errors } = result;

  // Determine default active tab: show errors tab if there are any errors
  const defaultTab = useMemo(() => {
    return errors.length > 0 ? 'errors' : 'imported';
  }, [errors.length]);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">Imported</p>
              <p className="text-2xl font-bold text-foreground">{summary.successful}</p>
            </div>
          </div>
          {summary.failed > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">Errors</p>
                <p className="text-2xl font-bold text-foreground">{summary.failed}</p>
              </div>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total rows</p>
          <p className="text-xl font-semibold text-foreground">{summary.total_rows}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="imported" className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            Imported ({imported.length})
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <AlertCircleIcon className="h-4 w-4" />
            Errors ({errors.length})
          </TabsTrigger>
        </TabsList>

        {/* Imported Items Tab */}
        <TabsContent value="imported" className="mt-4">
          {imported.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircleIcon className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-base font-medium text-foreground">No specifications were imported</p>
              <p className="text-sm text-muted-foreground mt-1">All records contained errors</p>
            </div>
          ) : (
            <div className="border rounded-lg max-w-full">
              <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
                <Table aria-label="Imported specifications" className="min-w-full table-fixed">
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead className="w-20">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-32">ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imported.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.row}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground break-all whitespace-pre-wrap">
                          {item.id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="mt-4">
          {errors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircleIcon className="h-12 w-12 text-success mb-3" />
              <p className="text-base font-medium text-foreground">All specifications were imported successfully</p>
              <p className="text-sm text-muted-foreground mt-1">No validation errors</p>
            </div>
          ) : (
            <div className="border rounded-lg max-w-full">
              <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
                <Table aria-label="Validation errors" className="min-w-full table-fixed">
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead className="w-20">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((error, index) => (
                      <TableRow key={`${error.row}-${index}`}>
                        <TableCell className="font-medium align-top">{error.row}</TableCell>
                        <TableCell className="align-top break-words whitespace-normal">{error.name}</TableCell>
                        <TableCell className="break-words whitespace-normal">
                          <ul className="space-y-1">
                            {error.errors.map((detail, detailIndex) => (
                              <li
                                key={`${error.row}-${detail.field}-${detailIndex}`}
                                className="text-sm break-words whitespace-normal"
                              >
                                <span className="font-medium text-foreground">{detail.field}:</span>{' '}
                                <span className="text-destructive">{detail.message}</span>
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
