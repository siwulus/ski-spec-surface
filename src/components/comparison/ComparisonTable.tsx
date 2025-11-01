import * as React from 'react';
import { useCompareSkiSpecs } from '@/components/hooks/useCompareSkiSpecs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SpecValue } from '@/components/ski-specs/SpecValue';
import type { SkiSpecComparisonDTO } from '@/types/api.types';
import { cn } from '@/lib/utils/style';

interface ComparisonTableProps {
  ids: string[];
  returnQueryParams?: string;
}

/**
 * ComparisonTable component for displaying side-by-side comparison of ski specifications.
 *
 * Features:
 * - Displays 2-4 ski specifications in columns
 * - Allows selection of active/base column for comparison
 * - Calculates absolute and percentage differences relative to active column
 * - Highlights key metrics (surface_area, relative_weight)
 * - Accessible table structure with proper ARIA labels
 * - Sticky header on desktop for better UX
 * - Responsive design with horizontal scrolling
 */
export const ComparisonTable: React.FC<ComparisonTableProps> = ({ ids, returnQueryParams }) => {
  const { data, isLoading, error } = useCompareSkiSpecs({ ids });
  const [activeColumnIndex, setActiveColumnIndex] = React.useState<number>(0);

  // Construct back URL with preserved list filters
  const backToListUrl = returnQueryParams ? `/ski-specs${returnQueryParams}` : '/ski-specs';

  // Calculate difference from active column
  const calculateDifference = React.useCallback(
    (value: number | null, fieldName: keyof SkiSpecComparisonDTO): { absolute: number; percentage: number } | null => {
      if (!data || value === null) return null;

      const baseValue = data[activeColumnIndex]?.[fieldName];
      if (typeof baseValue !== 'number' || baseValue === 0) return null;

      const absolute = value - baseValue;
      const percentage = ((value - baseValue) / baseValue) * 100;

      return { absolute, percentage };
    },
    [data, activeColumnIndex]
  );

  // Format difference for display
  const formatDifference = (diff: { absolute: number; percentage: number } | null): string => {
    if (!diff) return '—';

    const sign = diff.absolute >= 0 ? '+' : '';
    return `${sign}${diff.absolute.toFixed(2)} (${sign}${diff.percentage.toFixed(1)}%)`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load comparison data: {error.message}
          <br />
          <Button variant="link" className="px-0 h-auto" asChild>
            <a href={backToListUrl}>Return to specifications list</a>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No specifications found for comparison.
          <br />
          <Button variant="link" className="px-0 h-auto" asChild>
            <a href={backToListUrl}>Return to specifications list</a>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comparison table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-48 font-semibold">Model Name</TableHead>
              {data.map((spec, index) => (
                <TableHead
                  key={spec.id}
                  className={cn(
                    'p-0 transition-colors cursor-pointer',
                    'hover:bg-primary/5',
                    activeColumnIndex === index && 'bg-primary/10'
                  )}
                  scope="col"
                >
                  <button
                    type="button"
                    onClick={() => setActiveColumnIndex(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveColumnIndex(index);
                      }
                    }}
                    aria-pressed={activeColumnIndex === index}
                    aria-label={`Select ${spec.name} as base column for comparison`}
                    className="w-full h-full text-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 px-2 py-3"
                  >
                    {spec.name}
                    {activeColumnIndex === index && (
                      <span className="block text-xs font-normal text-muted-foreground">(Base)</span>
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Length */}
            <TableRow>
              <TableCell className="font-medium">Length</TableCell>
              {data.map((spec, index) => {
                const diff = calculateDifference(spec.length, 'length');
                return (
                  <TableCell key={spec.id} className={cn('text-center', activeColumnIndex === index && 'bg-primary/5')}>
                    <div className="flex flex-col items-center">
                      <SpecValue value={spec.length} unit="cm" />
                      {activeColumnIndex !== index && diff && (
                        <div className="text-xs text-muted-foreground">{formatDifference(diff)}</div>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Tip */}
            <TableRow>
              <TableCell className="font-medium">Tip Width</TableCell>
              {data.map((spec, index) => {
                const diff = calculateDifference(spec.tip, 'tip');
                return (
                  <TableCell key={spec.id} className={cn('text-center', activeColumnIndex === index && 'bg-primary/5')}>
                    <div className="flex flex-col items-center">
                      <SpecValue value={spec.tip} unit="mm" />
                      {activeColumnIndex !== index && diff && (
                        <div className="text-xs text-muted-foreground">{formatDifference(diff)}</div>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Waist */}
            <TableRow>
              <TableCell className="font-medium">Waist Width</TableCell>
              {data.map((spec, index) => {
                const diff = calculateDifference(spec.waist, 'waist');
                return (
                  <TableCell key={spec.id} className={cn('text-center', activeColumnIndex === index && 'bg-primary/5')}>
                    <div className="flex flex-col items-center">
                      <SpecValue value={spec.waist} unit="mm" />
                      {activeColumnIndex !== index && diff && (
                        <div className="text-xs text-muted-foreground">{formatDifference(diff)}</div>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Tail */}
            <TableRow>
              <TableCell className="font-medium">Tail Width</TableCell>
              {data.map((spec, index) => {
                const diff = calculateDifference(spec.tail, 'tail');
                return (
                  <TableCell key={spec.id} className={cn('text-center', activeColumnIndex === index && 'bg-primary/5')}>
                    <div className="flex flex-col items-center">
                      <SpecValue value={spec.tail} unit="mm" />
                      {activeColumnIndex !== index && diff && (
                        <div className="text-xs text-muted-foreground">{formatDifference(diff)}</div>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Radius */}
            <TableRow>
              <TableCell className="font-medium">Turning Radius</TableCell>
              {data.map((spec, index) => {
                const diff = calculateDifference(spec.radius, 'radius');
                return (
                  <TableCell key={spec.id} className={cn('text-center', activeColumnIndex === index && 'bg-primary/5')}>
                    <div className="flex flex-col items-center">
                      <SpecValue value={spec.radius} unit="m" />
                      {activeColumnIndex !== index && diff && (
                        <div className="text-xs text-muted-foreground">{formatDifference(diff)}</div>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Weight */}
            <TableRow>
              <TableCell className="font-medium">Weight</TableCell>
              {data.map((spec, index) => {
                const diff = calculateDifference(spec.weight, 'weight');
                return (
                  <TableCell key={spec.id} className={cn('text-center', activeColumnIndex === index && 'bg-primary/5')}>
                    <div className="flex flex-col items-center">
                      <SpecValue value={spec.weight} unit="g" />
                      {activeColumnIndex !== index && diff && (
                        <div className="text-xs text-muted-foreground">{formatDifference(diff)}</div>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Surface Area (highlighted) */}
            <TableRow className="bg-accent/50">
              <TableCell className="font-semibold">Surface Area</TableCell>
              {data.map((spec, index) => {
                const diff = calculateDifference(spec.surface_area, 'surface_area');
                return (
                  <TableCell
                    key={spec.id}
                    className={cn('text-center font-medium', activeColumnIndex === index && 'bg-primary/10')}
                  >
                    <div className="flex flex-col items-center">
                      <SpecValue value={spec.surface_area} unit="cm²" />
                      {activeColumnIndex !== index && diff && (
                        <div className="text-xs text-muted-foreground">{formatDifference(diff)}</div>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Relative Weight (highlighted) */}
            <TableRow className="bg-accent/50">
              <TableCell className="font-semibold">Relative Weight</TableCell>
              {data.map((spec, index) => {
                const diff = calculateDifference(spec.relative_weight, 'relative_weight');
                return (
                  <TableCell
                    key={spec.id}
                    className={cn('text-center font-medium', activeColumnIndex === index && 'bg-primary/10')}
                  >
                    <div className="flex flex-col items-center">
                      <SpecValue value={spec.relative_weight} unit="g/cm²" />
                      {activeColumnIndex !== index && diff && (
                        <div className="text-xs text-muted-foreground">{formatDifference(diff)}</div>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          <strong>How to read:</strong> Values in parentheses show the difference from the base column (absolute change
          and percentage change).
        </p>
        <p>
          <strong>Highlighted rows:</strong> Surface Area and Relative Weight are the key calculated metrics.
        </p>
      </div>
    </div>
  );
};
