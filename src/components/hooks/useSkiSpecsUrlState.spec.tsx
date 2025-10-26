import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkiSpecsUrlState } from './useSkiSpecsUrlState';
import type { ListSkiSpecsQuery } from '@/types/api.types';

describe('useSkiSpecsUrlState', () => {
  let mockPushState: ReturnType<typeof vi.fn>;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;
  let popstateHandler: ((event: PopStateEvent) => void) | null = null;
  let mockLocation: { pathname: string; search: string };

  beforeEach(() => {
    // Mock window.location
    mockLocation = {
      pathname: '/ski-specs',
      search: '',
    };

    // Mock history API
    mockPushState = vi.fn();

    // Mock event listeners to capture popstate handler
    mockAddEventListener = vi.fn((event: string, handler: (event: PopStateEvent) => void) => {
      if (event === 'popstate') {
        popstateHandler = handler;
      }
    });
    mockRemoveEventListener = vi.fn();

    // Setup global mocks
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
      configurable: true,
    });
    window.history.pushState = mockPushState;
    window.addEventListener = mockAddEventListener;
    window.removeEventListener = mockRemoveEventListener;
  });

  afterEach(() => {
    vi.clearAllMocks();
    popstateHandler = null;
  });

  describe('Initial state', () => {
    it('should initialize with default query state when URL has no parameters', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      expect(result.current.queryState).toEqual({
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
        search: '',
      });
      expect(result.current.dialogAction).toBeNull();
      expect(result.current.editingId).toBeNull();
    });

    it('should initialize with query state from URL parameters', () => {
      mockLocation.search = '?page=2&limit=50&sort_by=model&sort_order=asc&search=atomic';

      const { result } = renderHook(() => useSkiSpecsUrlState());

      expect(result.current.queryState).toEqual({
        page: 2,
        limit: 50,
        sort_by: 'model',
        sort_order: 'asc',
        search: 'atomic',
      });
    });

    it('should initialize with dialog action "new" from URL', () => {
      mockLocation.search = '?action=new';

      const { result } = renderHook(() => useSkiSpecsUrlState());

      expect(result.current.dialogAction).toBe('new');
      expect(result.current.editingId).toBeNull();
    });

    it('should initialize with dialog action "edit" and ID from URL', () => {
      mockLocation.search = '?action=edit&id=test-uuid-123';

      const { result } = renderHook(() => useSkiSpecsUrlState());

      expect(result.current.dialogAction).toBe('edit');
      expect(result.current.editingId).toBe('test-uuid-123');
    });

    it('should ignore invalid action parameter', () => {
      mockLocation.search = '?action=invalid';

      const { result } = renderHook(() => useSkiSpecsUrlState());

      expect(result.current.dialogAction).toBeNull();
    });

    it('should handle partial URL parameters with defaults', () => {
      mockLocation.search = '?page=3&search=salomon';

      const { result } = renderHook(() => useSkiSpecsUrlState());

      expect(result.current.queryState).toEqual({
        page: 3,
        limit: 20, // default
        sort_by: 'created_at', // default
        sort_order: 'desc', // default
        search: 'salomon',
      });
    });

    it('should handle invalid numeric parameters gracefully', () => {
      mockLocation.search = '?page=invalid&limit=notanumber';

      const { result } = renderHook(() => useSkiSpecsUrlState());

      // parseInt returns NaN for invalid strings, which is falsy
      expect(isNaN(result.current.queryState.page)).toBe(true);
      expect(isNaN(result.current.queryState.limit)).toBe(true);
    });
  });

  describe('updateQueryState', () => {
    it('should update query state and sync with URL', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.updateQueryState({ page: 3 });
      });

      expect(result.current.queryState.page).toBe(3);
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs?page=3');
    });

    it('should update multiple query parameters at once', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.updateQueryState({
          page: 2,
          limit: 50,
          sort_by: 'name',
          sort_order: 'asc',
          search: 'volkl',
        });
      });

      expect(result.current.queryState).toEqual({
        page: 2,
        limit: 50,
        sort_by: 'name',
        sort_order: 'asc',
        search: 'volkl',
      });
      expect(mockPushState).toHaveBeenCalledWith(
        {},
        '',
        '/ski-specs?page=2&limit=50&sort_by=name&sort_order=asc&search=volkl'
      );
    });

    it('should preserve dialog action when updating query state', () => {
      mockLocation.search = '?action=new';
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.updateQueryState({ page: 2 });
      });

      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs?action=new&page=2');
    });

    it('should preserve editing ID when updating query state', () => {
      mockLocation.search = '?action=edit&id=test-uuid';
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.updateQueryState({ search: 'atomic' });
      });

      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs?action=edit&id=test-uuid&search=atomic');
    });

    it('should omit default values from URL', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      // Set non-default values
      act(() => {
        result.current.updateQueryState({ page: 2, limit: 50 });
      });

      // Reset to default values
      act(() => {
        result.current.updateQueryState({
          page: 1,
          limit: 20,
          sort_by: 'created_at',
          sort_order: 'desc',
          search: '',
        });
      });

      expect(mockPushState).toHaveBeenLastCalledWith({}, '', '/ski-specs');
    });

    it('should handle search parameter correctly', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.updateQueryState({ search: 'atomic hawx' });
      });

      expect(result.current.queryState.search).toBe('atomic hawx');
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs?search=atomic+hawx');
    });

    it('should clear search parameter when empty', () => {
      mockLocation.search = '?search=atomic';
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.updateQueryState({ search: '' });
      });

      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs');
    });
  });

  describe('Dialog actions', () => {
    it('should open new dialog and update URL', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.openDialog();
      });

      expect(result.current.dialogAction).toBe('new');
      expect(result.current.editingId).toBeNull();
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs?action=new');
    });

    it('should open edit dialog with ID and update URL', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.openEditDialog('test-uuid-456');
      });

      expect(result.current.dialogAction).toBe('edit');
      expect(result.current.editingId).toBe('test-uuid-456');
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs?action=edit&id=test-uuid-456');
    });

    it('should close dialog and clear URL parameters', () => {
      mockLocation.search = '?action=edit&id=test-uuid';
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.closeDialog();
      });

      expect(result.current.dialogAction).toBeNull();
      expect(result.current.editingId).toBeNull();
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs');
    });

    it('should preserve query parameters when opening dialog', () => {
      mockLocation.search = '?page=2&search=atomic';
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.openDialog();
      });

      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs?action=new&page=2&search=atomic');
    });

    it('should preserve query parameters when closing dialog', () => {
      mockLocation.search = '?action=new&page=2&search=atomic';
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.closeDialog();
      });

      expect(mockPushState).toHaveBeenCalledWith({}, '', '/ski-specs?page=2&search=atomic');
    });
  });

  describe('Browser navigation (popstate)', () => {
    it('should register popstate event listener on mount', () => {
      renderHook(() => useSkiSpecsUrlState());

      expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('should unregister popstate event listener on unmount', () => {
      const { unmount } = renderHook(() => useSkiSpecsUrlState());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('should update state when browser back/forward button is used', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      // Simulate browser navigation
      mockLocation.search = '?page=3&search=salomon';

      act(() => {
        if (popstateHandler) {
          popstateHandler(new PopStateEvent('popstate'));
        }
      });

      expect(result.current.queryState).toEqual({
        page: 3,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
        search: 'salomon',
      });
    });

    it('should update dialog state when browser back/forward button is used', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      // Simulate browser navigation to edit dialog
      mockLocation.search = '?action=edit&id=test-uuid-789';

      act(() => {
        if (popstateHandler) {
          popstateHandler(new PopStateEvent('popstate'));
        }
      });

      expect(result.current.dialogAction).toBe('edit');
      expect(result.current.editingId).toBe('test-uuid-789');
    });

    it('should clear dialog state on popstate when action is removed', () => {
      mockLocation.search = '?action=new';
      const { result } = renderHook(() => useSkiSpecsUrlState());

      // Simulate browser navigation back
      mockLocation.search = '';

      act(() => {
        if (popstateHandler) {
          popstateHandler(new PopStateEvent('popstate'));
        }
      });

      expect(result.current.dialogAction).toBeNull();
      expect(result.current.editingId).toBeNull();
    });

    it('should reset to defaults on popstate when all parameters are removed', () => {
      mockLocation.search = '?page=5&limit=50&sort_by=model&sort_order=asc&search=atomic';
      const { result } = renderHook(() => useSkiSpecsUrlState());

      // Simulate browser navigation back to clean URL
      mockLocation.search = '';

      act(() => {
        if (popstateHandler) {
          popstateHandler(new PopStateEvent('popstate'));
        }
      });

      expect(result.current.queryState).toEqual({
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
        search: '',
      });
    });
  });

  describe('Complex scenarios', () => {
    it('should handle rapid state updates correctly', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.updateQueryState({ page: 2 });
      });

      act(() => {
        result.current.updateQueryState({ search: 'atomic' });
      });

      act(() => {
        result.current.openDialog();
      });

      expect(result.current.queryState.page).toBe(2);
      expect(result.current.queryState.search).toBe('atomic');
      expect(result.current.dialogAction).toBe('new');
      expect(mockPushState).toHaveBeenCalledTimes(3);
    });

    it('should transition from new dialog to edit dialog', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.openDialog();
      });

      expect(result.current.dialogAction).toBe('new');

      act(() => {
        result.current.openEditDialog('new-uuid');
      });

      expect(result.current.dialogAction).toBe('edit');
      expect(result.current.editingId).toBe('new-uuid');
      expect(mockPushState).toHaveBeenLastCalledWith({}, '', '/ski-specs?action=edit&id=new-uuid');
    });

    it('should handle all query parameters with dialog action', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.updateQueryState({
          page: 3,
          limit: 50,
          sort_by: 'name',
          sort_order: 'asc',
          search: 'salomon qst',
        });
      });

      act(() => {
        result.current.openEditDialog('complex-uuid');
      });

      expect(mockPushState).toHaveBeenLastCalledWith(
        {},
        '',
        '/ski-specs?action=edit&id=complex-uuid&page=3&limit=50&sort_by=name&sort_order=asc&search=salomon+qst'
      );
    });

    it('should maintain referential stability for callback functions', () => {
      const { result, rerender } = renderHook(() => useSkiSpecsUrlState());

      const initialOpenDialog = result.current.openDialog;
      const initialOpenEditDialog = result.current.openEditDialog;
      const initialCloseDialog = result.current.closeDialog;
      const initialUpdateQueryState = result.current.updateQueryState;

      // Rerender without state changes
      rerender();

      // All callbacks should maintain referential stability on rerender
      expect(result.current.openDialog).toBe(initialOpenDialog);
      expect(result.current.openEditDialog).toBe(initialOpenEditDialog);
      expect(result.current.closeDialog).toBe(initialCloseDialog);
      expect(result.current.updateQueryState).toBe(initialUpdateQueryState);
    });
  });

  describe('Edge cases', () => {
    it('should handle edit action without ID gracefully', () => {
      mockLocation.search = '?action=edit';

      const { result } = renderHook(() => useSkiSpecsUrlState());

      expect(result.current.dialogAction).toBe('edit');
      expect(result.current.editingId).toBeNull();
    });

    it('should handle ID parameter without edit action', () => {
      mockLocation.search = '?id=orphan-uuid';

      const { result } = renderHook(() => useSkiSpecsUrlState());

      expect(result.current.dialogAction).toBeNull();
      expect(result.current.editingId).toBeNull();
    });

    it('should handle malformed URL parameters', () => {
      mockLocation.search = '?page=&limit=&search=';

      const { result } = renderHook(() => useSkiSpecsUrlState());

      expect(result.current.queryState).toEqual({
        page: 1, // Empty string || defaults to 1
        limit: 20, // Empty string || defaults to 20
        sort_by: 'created_at',
        sort_order: 'desc',
        search: '',
      });
    });

    it('should handle special characters in search parameter', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      act(() => {
        result.current.updateQueryState({ search: 'atomic & salomon' });
      });

      expect(result.current.queryState.search).toBe('atomic & salomon');
      expect(mockPushState).toHaveBeenCalledWith({}, '', expect.stringContaining('search=atomic+%26+salomon'));
    });

    it('should preserve query state type safety', () => {
      const { result } = renderHook(() => useSkiSpecsUrlState());

      const queryState: ListSkiSpecsQuery = result.current.queryState;

      // TypeScript compile-time check
      expect(queryState.page).toBeTypeOf('number');
      expect(queryState.limit).toBeTypeOf('number');
      expect(queryState.sort_by).toBeTypeOf('string');
      expect(queryState.sort_order).toBeTypeOf('string');
      expect(queryState.search).toBeTypeOf('string');
    });
  });
});
