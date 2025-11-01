import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSkiSpecSelection } from './useSkiSpecSelection';

describe('useSkiSpecSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useSkiSpecSelection());

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.count).toBe(0);
    expect(result.current.canCompare).toBe(false);
    expect(result.current.isMaxReached).toBe(false);
  });

  it('should toggle selection on', () => {
    const { result } = renderHook(() => useSkiSpecSelection());

    act(() => {
      result.current.toggleSelection('id-1');
    });

    expect(result.current.selectedIds.has('id-1')).toBe(true);
    expect(result.current.count).toBe(1);
    expect(result.current.isSelected('id-1')).toBe(true);
  });

  it('should toggle selection off', () => {
    const { result } = renderHook(() => useSkiSpecSelection());

    act(() => {
      result.current.toggleSelection('id-1');
    });

    expect(result.current.selectedIds.has('id-1')).toBe(true);

    act(() => {
      result.current.toggleSelection('id-1');
    });

    expect(result.current.selectedIds.has('id-1')).toBe(false);
    expect(result.current.count).toBe(0);
    expect(result.current.isSelected('id-1')).toBe(false);
  });

  it('should allow selecting multiple items up to max (4)', () => {
    const { result } = renderHook(() => useSkiSpecSelection());

    act(() => {
      result.current.toggleSelection('id-1');
      result.current.toggleSelection('id-2');
      result.current.toggleSelection('id-3');
      result.current.toggleSelection('id-4');
    });

    expect(result.current.count).toBe(4);
    expect(result.current.isMaxReached).toBe(true);
  });

  it('should not allow selecting more than 4 items', () => {
    const { result } = renderHook(() => useSkiSpecSelection());

    act(() => {
      result.current.toggleSelection('id-1');
      result.current.toggleSelection('id-2');
      result.current.toggleSelection('id-3');
      result.current.toggleSelection('id-4');
      result.current.toggleSelection('id-5'); // Should be ignored
    });

    expect(result.current.count).toBe(4);
    expect(result.current.selectedIds.has('id-5')).toBe(false);
  });

  it('should set canCompare to true when 2 items are selected', () => {
    const { result } = renderHook(() => useSkiSpecSelection());

    act(() => {
      result.current.toggleSelection('id-1');
    });

    expect(result.current.canCompare).toBe(false);

    act(() => {
      result.current.toggleSelection('id-2');
    });

    expect(result.current.canCompare).toBe(true);
  });

  it('should set canCompare to true when 4 items are selected', () => {
    const { result } = renderHook(() => useSkiSpecSelection());

    act(() => {
      result.current.toggleSelection('id-1');
      result.current.toggleSelection('id-2');
      result.current.toggleSelection('id-3');
      result.current.toggleSelection('id-4');
    });

    expect(result.current.canCompare).toBe(true);
  });

  it('should clear all selections', () => {
    const { result } = renderHook(() => useSkiSpecSelection());

    act(() => {
      result.current.toggleSelection('id-1');
      result.current.toggleSelection('id-2');
      result.current.toggleSelection('id-3');
    });

    expect(result.current.count).toBe(3);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.count).toBe(0);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.canCompare).toBe(false);
  });

  it('should allow deselecting when at max to make room for new selection', () => {
    const { result } = renderHook(() => useSkiSpecSelection());

    act(() => {
      result.current.toggleSelection('id-1');
      result.current.toggleSelection('id-2');
      result.current.toggleSelection('id-3');
      result.current.toggleSelection('id-4');
    });

    expect(result.current.count).toBe(4);
    expect(result.current.isMaxReached).toBe(true);

    // Deselect one
    act(() => {
      result.current.toggleSelection('id-1');
    });

    expect(result.current.count).toBe(3);
    expect(result.current.isMaxReached).toBe(false);

    // Now can select a different one
    act(() => {
      result.current.toggleSelection('id-5');
    });

    expect(result.current.count).toBe(4);
    expect(result.current.selectedIds.has('id-5')).toBe(true);
    expect(result.current.selectedIds.has('id-1')).toBe(false);
  });

  it('should maintain Set identity across re-renders', () => {
    const { result, rerender } = renderHook(() => useSkiSpecSelection());

    const firstSet = result.current.selectedIds;

    rerender();

    // Should be the same Set instance if no mutations happened
    expect(result.current.selectedIds).toBe(firstSet);
  });
});
