import { useCallback, useState } from 'react';

interface UseSkiSpecSelectionReturn {
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  count: number;
  canCompare: boolean;
  isMaxReached: boolean;
}

const MIN_SELECTION = 2;
const MAX_SELECTION = 4;

/**
 * Hook for managing ski spec selection state for comparison feature.
 * Enforces 2-4 selection limit as per comparison API requirements.
 */
export const useSkiSpecSelection = (): UseSkiSpecSelectionReturn => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Deselect
        next.delete(id);
      } else {
        // Select only if under max limit
        if (next.size < MAX_SELECTION) {
          next.add(id);
        }
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string): boolean => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  const count = selectedIds.size;
  const canCompare = count >= MIN_SELECTION && count <= MAX_SELECTION;
  const isMaxReached = count >= MAX_SELECTION;

  return {
    selectedIds,
    toggleSelection,
    clearSelection,
    isSelected,
    count,
    canCompare,
    isMaxReached,
  };
};
