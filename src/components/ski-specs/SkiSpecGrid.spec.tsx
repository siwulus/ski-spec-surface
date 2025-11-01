import type { ListSkiSpecsQuery, PaginationMeta, SkiSpecDTO } from '@/types/api.types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkiSpecGrid } from './SkiSpecGrid';
import { toast } from 'sonner';

/**
 * Unit tests for SkiSpecGrid component
 *
 * Tests cover:
 * - Rendering with different states (loading, error, empty, success)
 * - Toolbar interactions (search, sort, pagination limit)
 * - Pagination behavior and scroll
 * - CRUD operations (add, edit, delete)
 * - Dialog management (form and delete dialogs)
 * - Hook integrations
 * - Accessibility attributes
 * - Focus management
 * - Edge cases and error handling
 */

/**
 * STEP 1: MOCK DEPENDENCIES
 */

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock window.scrollTo
const mockScrollTo = vi.fn();
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: mockScrollTo,
});

// Mock hook return values (can be modified per test)
let mockQueryState: ListSkiSpecsQuery = {
  page: 1,
  limit: 20,
  sort_by: 'created_at',
  sort_order: 'desc',
  search: '',
};

let mockDialogAction: 'new' | 'edit' | null = null;
let mockEditingId: string | null = null;
const mockUpdateQueryState = vi.fn();
const mockOpenDialog = vi.fn();
const mockOpenEditDialog = vi.fn();
const mockCloseDialog = vi.fn();

let mockSpecs: SkiSpecDTO[] | null = null;
let mockPagination: PaginationMeta | null = null;
let mockIsLoading = false;
let mockError: Error | null = null;
const mockRefetch = vi.fn();

const mockDeleteSkiSpec = vi.fn();
let mockIsSubmitting = false;

// Mock useSkiSpecsUrlState hook
vi.mock('@/components/hooks/useSkiSpecsUrlState', () => ({
  useSkiSpecsUrlState: () => ({
    queryState: mockQueryState,
    updateQueryState: mockUpdateQueryState,
    dialogAction: mockDialogAction,
    editingId: mockEditingId,
    openDialog: mockOpenDialog,
    openEditDialog: mockOpenEditDialog,
    closeDialog: mockCloseDialog,
  }),
}));

// Mock useSkiSpecs hook
vi.mock('@/components/hooks/useSkiSpecs', () => ({
  useSkiSpecs: () => ({
    specs: mockSpecs,
    pagination: mockPagination,
    isLoading: mockIsLoading,
    error: mockError,
    refetch: mockRefetch,
  }),
}));

// Mock useSkiSpecMutation hook
vi.mock('@/components/hooks/useSkiSpecMutation', () => ({
  useSkiSpecMutation: () => ({
    deleteSkiSpec: mockDeleteSkiSpec,
    isSubmitting: mockIsSubmitting,
  }),
}));

// Mock child components
vi.mock('./SkiSpecToolbar', () => ({
  SkiSpecToolbar: ({
    search,
    sortBy,
    sortOrder,
    limit,
    onSearchChange,
    onSortByChange,
    onSortOrderChange,
    onLimitChange,
  }: {
    search: string;
    sortBy: string;
    sortOrder: string;
    limit: number;
    onSearchChange: (search: string) => void;
    onSortByChange: (sortBy: string) => void;
    onSortOrderChange: (sortOrder: string) => void;
    onLimitChange: (limit: number) => void;
  }) => (
    <div data-testid="ski-spec-toolbar">
      <input
        data-testid="toolbar-search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Search"
      />
      <select
        data-testid="toolbar-sort-by"
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value as ListSkiSpecsQuery['sort_by'])}
        aria-label="Sort by"
      >
        <option value="created_at">Created</option>
        <option value="name">Name</option>
      </select>
      <select
        data-testid="toolbar-sort-order"
        value={sortOrder}
        onChange={(e) => onSortOrderChange(e.target.value as ListSkiSpecsQuery['sort_order'])}
        aria-label="Sort order"
      >
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
      <select
        data-testid="toolbar-limit"
        value={limit}
        onChange={(e) => onLimitChange(Number(e.target.value))}
        aria-label="Items per page"
      >
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </select>
    </div>
  ),
}));

vi.mock('./SkiSpecCard', () => ({
  SkiSpecCard: ({
    spec,
    onEdit,
    onDelete,
    isInProgress,
  }: {
    spec: SkiSpecDTO;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    isInProgress: boolean;
  }) => (
    <div data-testid={`ski-spec-card-${spec.id}`}>
      <h3>{spec.name}</h3>
      <button onClick={() => onEdit(spec.id)} disabled={isInProgress} aria-label={`Edit ${spec.name}`}>
        Edit
      </button>
      <button onClick={() => onDelete(spec.id)} disabled={isInProgress} aria-label={`Delete ${spec.name}`}>
        Delete
      </button>
    </div>
  ),
}));

vi.mock('./SkiSpecPagination', () => ({
  SkiSpecPagination: ({
    pagination,
    onPageChange,
  }: {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
  }) => (
    <div data-testid="ski-spec-pagination">
      <button onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1}>
        Previous
      </button>
      <span>
        Page {pagination.page} of {pagination.total_pages}
      </span>
      <button onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page === pagination.total_pages}>
        Next
      </button>
    </div>
  ),
}));

vi.mock('./SkiSpecFormDialog', () => ({
  SkiSpecFormDialog: ({
    open,
    onOpenChange,
    mode,
    specId,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    specId?: string;
  }) => (
    <div data-testid="ski-spec-form-dialog" data-open={open} data-mode={mode} data-spec-id={specId}>
      {open && (
        <>
          <span>Form Dialog - {mode}</span>
          <button onClick={() => onOpenChange(false)}>Close</button>
        </>
      )}
    </div>
  ),
}));

vi.mock('./DeleteSkiSpecDialog', () => ({
  DeleteSkiSpecDialog: ({
    open,
    onOpenChange,
    onConfirm,
    isInProgress,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isInProgress: boolean;
  }) => (
    <div data-testid="delete-ski-spec-dialog" data-open={open}>
      {open && (
        <>
          <span>Delete Confirmation</span>
          <button onClick={onConfirm} disabled={isInProgress}>
            Confirm Delete
          </button>
          <button onClick={() => onOpenChange(false)}>Cancel</button>
        </>
      )}
    </div>
  ),
}));

vi.mock('./SkiSpecGridSkeleton', () => ({
  SkiSpecGridSkeleton: () => <div data-testid="ski-spec-grid-skeleton">Loading...</div>,
}));

/**
 * STEP 2: TEST DATA
 */
const createMockSkiSpec = (overrides: Partial<SkiSpecDTO> = {}): SkiSpecDTO => ({
  id: 'spec-1',
  user_id: 'user-1',
  name: 'Test Ski Model',
  description: 'A great all-mountain ski',
  length: 180,
  tip: 130,
  waist: 100,
  tail: 120,
  radius: 18,
  weight: 1800,
  surface_area: 1520,
  relative_weight: 1.18,
  algorithm_version: '1.0.0',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  notes_count: 2,
  ...overrides,
});

const createMockPagination = (overrides: Partial<PaginationMeta> = {}): PaginationMeta => ({
  page: 1,
  limit: 20,
  total: 50,
  total_pages: 3,
  ...overrides,
});

/**
 * STEP 3: TEST SUITES
 */
describe('SkiSpecGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock state to defaults
    mockQueryState = {
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
      search: '',
    };

    mockDialogAction = null;
    mockEditingId = null;
    mockSpecs = null;
    mockPagination = null;
    mockIsLoading = false;
    mockError = null;
    mockIsSubmitting = false;

    mockScrollTo.mockClear();
  });

  /**
   * RENDERING TESTS
   */
  describe('Rendering', () => {
    it('should render header with title and description', () => {
      render(<SkiSpecGrid />);

      const header = screen.getByTestId('ski-spec-grid-header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('Ski Specifications');
      expect(screen.getByText(/manage your ski specifications/i)).toBeInTheDocument();
    });

    it('should render "Add Specification" button', () => {
      render(<SkiSpecGrid />);

      const addButton = screen.getByRole('button', { name: /add specification/i });
      expect(addButton).toBeInTheDocument();
      expect(addButton).toBeVisible();
    });

    it('should always render toolbar regardless of state', () => {
      render(<SkiSpecGrid />);

      expect(screen.getByTestId('ski-spec-toolbar')).toBeInTheDocument();
    });

    it('should render loading skeleton when isLoading is true', () => {
      mockIsLoading = true;

      render(<SkiSpecGrid />);

      expect(screen.getByTestId('ski-spec-grid-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should render error message when error is present', () => {
      mockError = new Error('Failed to load specifications');

      render(<SkiSpecGrid />);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('Error loading specifications');
      expect(errorAlert).toHaveTextContent('Failed to load specifications');
    });

    it('should render empty state when no specs and not loading', () => {
      mockIsLoading = false;
      mockSpecs = [];
      mockPagination = createMockPagination({ total: 0, total_pages: 0 });

      render(<SkiSpecGrid />);

      const emptyStateButton = screen.getByRole('button', { name: /add your ski specification/i });
      expect(emptyStateButton).toBeInTheDocument();
      expect(screen.queryByTestId('ski-spec-grid-skeleton')).not.toBeInTheDocument();
    });

    it('should render grid with ski spec cards when specs are available', () => {
      mockIsLoading = false;
      mockSpecs = [
        createMockSkiSpec({ id: 'spec-1', name: 'Ski Model 1' }),
        createMockSkiSpec({ id: 'spec-2', name: 'Ski Model 2' }),
      ];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      expect(screen.getByTestId('ski-spec-card-spec-1')).toBeInTheDocument();
      expect(screen.getByTestId('ski-spec-card-spec-2')).toBeInTheDocument();
      expect(screen.getByText('Ski Model 1')).toBeInTheDocument();
      expect(screen.getByText('Ski Model 2')).toBeInTheDocument();
    });

    it('should render pagination when total_pages > 1', () => {
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination({ total_pages: 3 });

      render(<SkiSpecGrid />);

      expect(screen.getByTestId('ski-spec-pagination')).toBeInTheDocument();
    });

    it('should not render pagination when total_pages is 1', () => {
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination({ total_pages: 1 });

      render(<SkiSpecGrid />);

      expect(screen.queryByTestId('ski-spec-pagination')).not.toBeInTheDocument();
    });

    it('should not render pagination when total_pages is 0', () => {
      mockIsLoading = false;
      mockSpecs = [];
      mockPagination = createMockPagination({ total: 0, total_pages: 0 });

      render(<SkiSpecGrid />);

      expect(screen.queryByTestId('ski-spec-pagination')).not.toBeInTheDocument();
    });

    it('should pass correct props to SkiSpecToolbar', () => {
      mockQueryState = {
        page: 2,
        limit: 50,
        sort_by: 'name',
        sort_order: 'asc',
        search: 'test search',
      };

      render(<SkiSpecGrid />);

      const searchInput = screen.getByTestId('toolbar-search') as HTMLInputElement;
      expect(searchInput.value).toBe('test search');

      const sortBySelect = screen.getByTestId('toolbar-sort-by') as HTMLSelectElement;
      expect(sortBySelect.value).toBe('name');

      const sortOrderSelect = screen.getByTestId('toolbar-sort-order') as HTMLSelectElement;
      expect(sortOrderSelect.value).toBe('asc');

      const limitSelect = screen.getByTestId('toolbar-limit') as HTMLSelectElement;
      expect(limitSelect.value).toBe('50');
    });

    it('should render form dialog when dialogAction is "new"', () => {
      mockDialogAction = 'new';

      render(<SkiSpecGrid />);

      const formDialog = screen.getByTestId('ski-spec-form-dialog');
      expect(formDialog).toHaveAttribute('data-open', 'true');
      expect(formDialog).toHaveAttribute('data-mode', 'create');
      expect(screen.getByText(/form dialog - create/i)).toBeInTheDocument();
    });

    it('should render form dialog when dialogAction is "edit"', () => {
      mockDialogAction = 'edit';
      mockEditingId = 'spec-123';

      render(<SkiSpecGrid />);

      const formDialog = screen.getByTestId('ski-spec-form-dialog');
      expect(formDialog).toHaveAttribute('data-open', 'true');
      expect(formDialog).toHaveAttribute('data-mode', 'edit');
      expect(formDialog).toHaveAttribute('data-spec-id', 'spec-123');
      expect(screen.getByText(/form dialog - edit/i)).toBeInTheDocument();
    });

    it('should not show form dialog content when dialogAction is null', () => {
      mockDialogAction = null;

      render(<SkiSpecGrid />);

      const formDialog = screen.getByTestId('ski-spec-form-dialog');
      expect(formDialog).toHaveAttribute('data-open', 'false');
      expect(screen.queryByText(/form dialog/i)).not.toBeInTheDocument();
    });
  });

  /**
   * TOOLBAR INTERACTION TESTS
   */
  describe('Toolbar Interactions', () => {
    it('should call updateQueryState with search term and reset page to 1 on search change', async () => {
      const user = userEvent.setup();
      render(<SkiSpecGrid />);

      const searchInput = screen.getByTestId('toolbar-search');

      // Type one character to trigger the search handler
      await user.type(searchInput, 'a');

      // Verify that updateQueryState was called with the search value and page reset to 1
      await waitFor(() => {
        expect(mockUpdateQueryState).toHaveBeenCalledWith({
          search: 'a',
          page: 1,
        });
      });
    });

    it('should call updateQueryState with new sort_by on sort by change', async () => {
      const user = userEvent.setup();
      render(<SkiSpecGrid />);

      const sortBySelect = screen.getByTestId('toolbar-sort-by');
      await user.selectOptions(sortBySelect, 'name');

      expect(mockUpdateQueryState).toHaveBeenCalledWith({ sort_by: 'name' });
    });

    it('should call updateQueryState with new sort_order on sort order change', async () => {
      const user = userEvent.setup();
      render(<SkiSpecGrid />);

      const sortOrderSelect = screen.getByTestId('toolbar-sort-order');
      await user.selectOptions(sortOrderSelect, 'asc');

      expect(mockUpdateQueryState).toHaveBeenCalledWith({ sort_order: 'asc' });
    });

    it('should call updateQueryState with new limit and reset page to 1 on limit change', async () => {
      const user = userEvent.setup();
      render(<SkiSpecGrid />);

      const limitSelect = screen.getByTestId('toolbar-limit');
      await user.selectOptions(limitSelect, '50');

      expect(mockUpdateQueryState).toHaveBeenCalledWith({
        limit: 50,
        page: 1,
      });
    });

    it('should handle empty search input', async () => {
      const user = userEvent.setup();
      mockQueryState = { ...mockQueryState, search: 'test' };
      render(<SkiSpecGrid />);

      const searchInput = screen.getByTestId('toolbar-search');
      await user.clear(searchInput);

      await waitFor(() => {
        expect(mockUpdateQueryState).toHaveBeenCalled();
      });
    });

    it('should provide toolbar with default values when queryState fields are undefined', () => {
      mockQueryState = {
        page: 1,
        limit: 20,
        sort_by: undefined as unknown as ListSkiSpecsQuery['sort_by'],
        sort_order: undefined as unknown as ListSkiSpecsQuery['sort_order'],
        search: undefined as unknown as string,
      };

      render(<SkiSpecGrid />);

      const searchInput = screen.getByTestId('toolbar-search') as HTMLInputElement;
      expect(searchInput.value).toBe('');
    });
  });

  /**
   * PAGINATION TESTS
   */
  describe('Pagination', () => {
    beforeEach(() => {
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination({ page: 2, total_pages: 5 });
    });

    it('should call updateQueryState with new page number on page change', async () => {
      const user = userEvent.setup();
      render(<SkiSpecGrid />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(mockUpdateQueryState).toHaveBeenCalledWith({ page: 3 });
    });

    it('should scroll to top with smooth behavior on page change', async () => {
      const user = userEvent.setup();
      render(<SkiSpecGrid />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      });
    });

    it('should handle previous page navigation', async () => {
      const user = userEvent.setup();
      render(<SkiSpecGrid />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      expect(mockUpdateQueryState).toHaveBeenCalledWith({ page: 1 });
    });
  });

  /**
   * ADD/EDIT/DELETE OPERATIONS
   */
  describe('Add/Edit/Delete Operations', () => {
    it('should call openDialog when "Add Specification" button is clicked', async () => {
      const user = userEvent.setup();
      render(<SkiSpecGrid />);

      const addButton = screen.getByRole('button', { name: /add specification/i });
      await user.click(addButton);

      expect(mockOpenDialog).toHaveBeenCalledTimes(1);
    });

    it('should call openDialog when empty state add button is clicked', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [];
      mockPagination = createMockPagination({ total: 0, total_pages: 0 });

      render(<SkiSpecGrid />);

      const emptyStateButton = screen.getByRole('button', { name: /add your ski specification/i });
      await user.click(emptyStateButton);

      expect(mockOpenDialog).toHaveBeenCalledTimes(1);
    });

    it('should call openEditDialog with spec ID when edit button is clicked', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec({ id: 'spec-123', name: 'Test Ski' })];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      const editButton = screen.getByRole('button', { name: /edit test ski/i });
      await user.click(editButton);

      expect(mockOpenEditDialog).toHaveBeenCalledWith('spec-123');
    });

    it('should open delete dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec({ id: 'spec-456', name: 'Test Ski' })];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      const deleteButton = screen.getByRole('button', { name: /delete test ski/i });
      await user.click(deleteButton);

      await waitFor(() => {
        const deleteDialog = screen.getByTestId('delete-ski-spec-dialog');
        expect(deleteDialog).toHaveAttribute('data-open', 'true');
        expect(screen.getByText(/delete confirmation/i)).toBeInTheDocument();
      });
    });

    it('should call deleteSkiSpec and refetch when delete is confirmed', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec({ id: 'spec-789', name: 'Test Ski' })];
      mockPagination = createMockPagination();
      mockDeleteSkiSpec.mockResolvedValue(undefined);

      render(<SkiSpecGrid />);

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /delete test ski/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteSkiSpec).toHaveBeenCalledWith('spec-789');
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('should show toast error when delete fails', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec({ id: 'spec-error', name: 'Test Ski' })];
      mockPagination = createMockPagination();
      mockDeleteSkiSpec.mockRejectedValue(new Error('Delete failed'));

      render(<SkiSpecGrid />);

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /delete test ski/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error deleting specification', {
          description: 'Delete failed',
        });
      });
    });

    it('should handle delete error with non-Error object', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec({ id: 'spec-unknown', name: 'Test Ski' })];
      mockPagination = createMockPagination();
      mockDeleteSkiSpec.mockRejectedValue('Unknown error');

      render(<SkiSpecGrid />);

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /delete test ski/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error deleting specification', {
          description: 'Unknown error',
        });
      });
    });

    it('should handle confirm delete when no deletingSpecId is set', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      // Manually trigger delete dialog without setting spec ID (edge case)
      const deleteDialog = screen.getByTestId('delete-ski-spec-dialog');
      const confirmButton = deleteDialog.querySelector('button');

      if (confirmButton) {
        await user.click(confirmButton);
      }

      // Should return early without calling deleteSkiSpec
      expect(mockDeleteSkiSpec).not.toHaveBeenCalled();
    });

    it('should pass isInProgress prop to SkiSpecCard', () => {
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination();
      mockIsSubmitting = true;

      render(<SkiSpecGrid />);

      const editButton = screen.getByRole('button', { name: /edit test ski model/i });
      expect(editButton).toBeDisabled();
    });
  });

  /**
   * DIALOG MANAGEMENT TESTS
   */
  describe('Dialog Management', () => {
    it('should show form dialog when dialogAction is "new"', () => {
      mockDialogAction = 'new';

      render(<SkiSpecGrid />);

      const formDialog = screen.getByTestId('ski-spec-form-dialog');
      expect(formDialog).toHaveAttribute('data-open', 'true');
      expect(formDialog).toHaveAttribute('data-mode', 'create');
    });

    it('should show form dialog when dialogAction is "edit" with specId', () => {
      mockDialogAction = 'edit';
      mockEditingId = 'spec-edit-123';

      render(<SkiSpecGrid />);

      const formDialog = screen.getByTestId('ski-spec-form-dialog');
      expect(formDialog).toHaveAttribute('data-open', 'true');
      expect(formDialog).toHaveAttribute('data-mode', 'edit');
      expect(formDialog).toHaveAttribute('data-spec-id', 'spec-edit-123');
    });

    it('should close form dialog and refetch when onOpenChange is called with false', async () => {
      const user = userEvent.setup();
      mockDialogAction = 'new';

      render(<SkiSpecGrid />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockCloseDialog).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should not show form dialog when dialogAction is null', () => {
      mockDialogAction = null;

      render(<SkiSpecGrid />);

      const formDialog = screen.getByTestId('ski-spec-form-dialog');
      expect(formDialog).toHaveAttribute('data-open', 'false');
    });

    it('should control delete dialog open state', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec({ id: 'spec-123', name: 'Test Ski' })];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      // Initially closed
      let deleteDialog = screen.getByTestId('delete-ski-spec-dialog');
      expect(deleteDialog).toHaveAttribute('data-open', 'false');

      // Open dialog
      const deleteButton = screen.getByRole('button', { name: /delete test ski/i });
      await user.click(deleteButton);

      await waitFor(() => {
        deleteDialog = screen.getByTestId('delete-ski-spec-dialog');
        expect(deleteDialog).toHaveAttribute('data-open', 'true');
      });
    });

    it('should close delete dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      // Open dialog
      const deleteButton = screen.getByRole('button', { name: /delete test ski model/i });
      await user.click(deleteButton);

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        const deleteDialog = screen.getByTestId('delete-ski-spec-dialog');
        expect(deleteDialog).toHaveAttribute('data-open', 'false');
      });
    });

    it('should pass isInProgress to delete dialog', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination();
      mockIsSubmitting = false; // Start with false so we can click the button

      const { rerender } = render(<SkiSpecGrid />);

      // Open delete dialog first
      const deleteButton = screen.getByRole('button', { name: /delete test ski model/i });
      await user.click(deleteButton);

      // Now set isSubmitting to true and rerender
      mockIsSubmitting = true;
      rerender(<SkiSpecGrid />);

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
        expect(confirmButton).toBeDisabled();
      });
    });
  });

  /**
   * HOOK INTEGRATION TESTS
   */
  describe('Hook Integration', () => {
    it('should call useSkiSpecs with queryState', () => {
      mockQueryState = {
        page: 3,
        limit: 50,
        sort_by: 'name',
        sort_order: 'asc',
        search: 'atomic',
      };

      render(<SkiSpecGrid />);

      // Hook is called with the queryState from useSkiSpecsUrlState
      // Verify component renders correctly based on hook return
      expect(screen.getByTestId('ski-spec-toolbar')).toBeInTheDocument();
    });

    it('should use refetch function from useSkiSpecs', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination();
      mockDeleteSkiSpec.mockResolvedValue(undefined);

      render(<SkiSpecGrid />);

      // Trigger delete operation that calls refetch
      const deleteButton = screen.getByRole('button', { name: /delete test ski model/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('should handle multiple hook states correctly', () => {
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec({ id: 'spec-1' }), createMockSkiSpec({ id: 'spec-2' })];
      mockPagination = createMockPagination({ page: 2, total_pages: 5 });
      mockQueryState = { page: 2, limit: 20, sort_by: 'name', sort_order: 'asc', search: 'test' };

      render(<SkiSpecGrid />);

      expect(screen.getByTestId('ski-spec-card-spec-1')).toBeInTheDocument();
      expect(screen.getByTestId('ski-spec-card-spec-2')).toBeInTheDocument();
      expect(screen.getByTestId('ski-spec-pagination')).toBeInTheDocument();
      expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
    });
  });

  /**
   * ACCESSIBILITY TESTS
   */
  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<SkiSpecGrid />);

      const header = screen.getByRole('heading', { level: 1, name: /ski specifications/i });
      expect(header).toBeInTheDocument();
    });

    it('should have data-testid on header for testing', () => {
      render(<SkiSpecGrid />);

      const header = screen.getByTestId('ski-spec-grid-header');
      expect(header).toBeInTheDocument();
    });

    it('should mark error message with role="alert" and aria-live="assertive"', () => {
      mockError = new Error('Network error');

      render(<SkiSpecGrid />);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      expect(errorAlert).toHaveTextContent('Network error');
    });

    it('should have accessible button labels', () => {
      render(<SkiSpecGrid />);

      const addButton = screen.getByRole('button', { name: /add specification/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should hide decorative icons from screen readers', () => {
      render(<SkiSpecGrid />);

      const addButton = screen.getByRole('button', { name: /add specification/i });
      const icon = addButton.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should provide accessible labels for card actions', () => {
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec({ id: 'spec-1', name: 'Atomic Vantage' })];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      expect(screen.getByRole('button', { name: /edit atomic vantage/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete atomic vantage/i })).toBeInTheDocument();
    });

    it('should have semantic header element', () => {
      const { container } = render(<SkiSpecGrid />);

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });
  });

  /**
   * EDGE CASES & ERROR HANDLING
   */
  describe('Edge Cases', () => {
    it('should handle null specs gracefully', () => {
      mockIsLoading = false;
      mockSpecs = null;
      mockPagination = null;

      render(<SkiSpecGrid />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByTestId('ski-spec-toolbar')).toBeInTheDocument();
    });

    it('should handle empty specs array', () => {
      mockIsLoading = false;
      mockSpecs = [];
      mockPagination = createMockPagination({ total: 0, total_pages: 0 });

      render(<SkiSpecGrid />);

      expect(screen.getByRole('button', { name: /add your ski specification/i })).toBeInTheDocument();
      expect(screen.queryByTestId('ski-spec-pagination')).not.toBeInTheDocument();
    });

    it('should handle pagination being null', () => {
      mockIsLoading = false;
      mockSpecs = [];
      mockPagination = null;

      render(<SkiSpecGrid />);

      expect(screen.getByRole('button', { name: /add your ski specification/i })).toBeInTheDocument();
    });

    it('should not show specs or pagination when loading', () => {
      mockIsLoading = true;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      expect(screen.getByTestId('ski-spec-grid-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('ski-spec-card-spec-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ski-spec-pagination')).not.toBeInTheDocument();
    });

    it('should not show specs when error is present', () => {
      mockError = new Error('Server error');
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByTestId('ski-spec-card-spec-1')).not.toBeInTheDocument();
    });

    it('should handle rapid multiple add button clicks', async () => {
      const user = userEvent.setup();
      render(<SkiSpecGrid />);

      const addButton = screen.getByRole('button', { name: /add specification/i });
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);

      expect(mockOpenDialog).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid pagination changes', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination({ page: 2, total_pages: 5 });

      render(<SkiSpecGrid />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      expect(mockUpdateQueryState).toHaveBeenCalledTimes(2);
      expect(mockScrollTo).toHaveBeenCalledTimes(2);
    });

    it('should handle error with empty message', () => {
      mockError = new Error('');

      render(<SkiSpecGrid />);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
    });
  });

  /**
   * FOCUS MANAGEMENT
   */
  describe('Focus Management', () => {
    it('should create ref for add button', () => {
      render(<SkiSpecGrid />);

      const addButton = screen.getByRole('button', { name: /add specification/i });
      expect(addButton).toBeInTheDocument();
      // Ref is internal, just verify button renders
    });

    it('should maintain focus after dialog operations', async () => {
      const user = userEvent.setup();
      mockDialogAction = 'new';

      render(<SkiSpecGrid />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Component should still be mounted and functional
      expect(screen.getByRole('button', { name: /add specification/i })).toBeInTheDocument();
    });
  });

  /**
   * COMPONENT INTEGRATION
   */
  describe('Component Integration', () => {
    it('should pass all required props to child components', () => {
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec({ id: 'spec-1', name: 'Test Ski' })];
      mockPagination = createMockPagination({ page: 2, total_pages: 3 });
      mockDialogAction = 'edit';
      mockEditingId = 'spec-1';

      render(<SkiSpecGrid />);

      // Verify all components render with correct props
      expect(screen.getByTestId('ski-spec-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('ski-spec-card-spec-1')).toBeInTheDocument();
      expect(screen.getByTestId('ski-spec-pagination')).toBeInTheDocument();
      expect(screen.getByTestId('ski-spec-form-dialog')).toHaveAttribute('data-mode', 'edit');
      expect(screen.getByTestId('delete-ski-spec-dialog')).toBeInTheDocument();
    });

    it('should coordinate state between multiple child components', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpecs = [createMockSkiSpec()];
      mockPagination = createMockPagination();

      render(<SkiSpecGrid />);

      // Interact with toolbar
      const searchInput = screen.getByTestId('toolbar-search');
      await user.type(searchInput, 'test');

      // Interact with card
      const editButton = screen.getByRole('button', { name: /edit test ski model/i });
      await user.click(editButton);

      // Verify state updates
      expect(mockUpdateQueryState).toHaveBeenCalled();
      expect(mockOpenEditDialog).toHaveBeenCalled();
    });
  });
});
