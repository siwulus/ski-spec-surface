import * as React from 'react';
import { Button } from '@/components/ui/button';
import { XIcon, ArrowRightIcon } from 'lucide-react';

interface SkiSpecSelectionToolbarProps {
  selectedCount: number;
  canCompare: boolean;
  onCompare: () => void;
  onClear: () => void;
  onExitMode: () => void;
}

export const SkiSpecSelectionToolbar: React.FC<SkiSpecSelectionToolbarProps> = ({
  selectedCount,
  canCompare,
  onCompare,
  onClear,
  onExitMode,
}) => {
  return (
    <div
      className="flex items-center justify-between bg-muted/50 border rounded-lg p-4 mb-6"
      role="region"
      aria-label="Comparison selection toolbar"
    >
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium" aria-live="polite" aria-atomic="true" data-testid="selection-counter">
          {selectedCount === 0 ? (
            'Select 2-4 ski specs to compare'
          ) : (
            <>
              <span className="text-primary">{selectedCount}</span> of 4 selected
            </>
          )}
        </div>
        {selectedCount > 0 && (
          <Button variant="outline" size="sm" onClick={onClear} data-testid="clear-selection-button">
            <XIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onCompare}
          disabled={!canCompare}
          size="sm"
          data-testid="compare-selected-button"
          aria-disabled={!canCompare}
        >
          Compare Selected
          <ArrowRightIcon className="h-4 w-4 ml-2" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onExitMode} data-testid="exit-compare-mode-button">
          Exit Compare Mode
        </Button>
      </div>
    </div>
  );
};
