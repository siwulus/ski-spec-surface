import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { SkiSpecDTO } from '@/types/api.types';
import { Pencil, Trash2, Eye } from 'lucide-react';
import * as React from 'react';
import { SkiDiagram } from './SkiDiagram';
import { SpecValue } from './SpecValue';

interface SkiSpecCardProps {
  spec: SkiSpecDTO;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isInProgress?: boolean;
  // Selection mode props
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  isSelectionDisabled?: boolean;
}

export const SkiSpecCard: React.FC<SkiSpecCardProps> = ({
  spec,
  onEdit,
  onDelete,
  isInProgress,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
  isSelectionDisabled = false,
}) => {
  const handleViewDetails = () => {
    // Capture current list filters/sorting to preserve on back navigation
    const currentSearch = window.location.search;
    const detailUrl = currentSearch ? `/ski-specs/${spec.id}${currentSearch}` : `/ski-specs/${spec.id}`;
    window.location.href = detailUrl;
  };

  const handleCheckboxChange = () => {
    onToggleSelection?.(spec.id);
  };

  const checkboxId = React.useId();

  return (
    <Card data-testid={`ski-spec-card-${spec.id}`} className={isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex-1">
            <button
              onClick={handleViewDetails}
              disabled={isInProgress}
              className="text-left w-full hover:text-primary transition-colors cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              aria-label={`View details for ${spec.name}`}
              data-testid={`ski-spec-card-title-${spec.id}`}
            >
              {spec.name}
            </button>
          </CardTitle>
          {selectionMode && (
            <div className="flex items-center">
              <Checkbox
                id={checkboxId}
                checked={isSelected}
                onCheckedChange={handleCheckboxChange}
                disabled={isSelectionDisabled && !isSelected}
                aria-label={`Select ${spec.name} for comparison`}
                data-testid={`ski-spec-card-checkbox-${spec.id}`}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dimensions Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Dimensions</h3>
          {/* Visual Ski Diagram */}
          <SkiDiagram spec={spec} />
        </div>

        {/* Calculated Metrics Section */}

        <div className="flex flex-nowrap gap-2 justify-between">
          <SpecValue label="Surface" value={spec.surface_area} unit="cm²" />
          <SpecValue label="Rel. Weight" value={spec.relative_weight} unit="g/cm²" />
        </div>
      </CardContent>

      <CardFooter className="border-t">
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-muted-foreground">
            {spec.notes_count} {spec.notes_count === 1 ? 'note' : 'notes'}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label={`View details for ${spec.name}`}
              onClick={handleViewDetails}
              disabled={isInProgress}
              data-testid="ski-spec-card-view-button"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Edit ${spec.name}`}
              onClick={() => onEdit?.(spec.id)}
              disabled={isInProgress}
              data-testid="ski-spec-card-edit-button"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Delete ${spec.name}`}
              onClick={() => onDelete?.(spec.id)}
              disabled={isInProgress}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
