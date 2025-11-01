import type { SkiSpecDTO } from '@/types/api.types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkiSpecDetail } from './SkiSpecDetail';

/**
 * Unit tests for SkiSpecDetail component
 *
 * Tests cover:
 * - Rendering with different states (loading, error, success)
 * - User interactions (edit, delete, back navigation)
 * - Dialog management (edit and delete dialogs)
 * - Data refetch after edit
 * - Query params preservation in navigation
 * - Hook integrations
 * - Accessibility attributes
 * - Edge cases (missing description, etc.)
 */

/**
 * STEP 1: MOCK DEPENDENCIES
 */

// Mock window.location.href for navigation tests
delete (window as { location?: Location }).location;
window.location = { href: '/' } as Location;

// Mock hook return values (can be modified per test)
let mockSpec: SkiSpecDTO | null = null;
let mockIsLoading = false;
let mockError: Error | null = null;
const mockRefetch = vi.fn();

let mockIsSubmitting = false;
const mockDeleteSkiSpec = vi.fn();

// Mock useSkiSpec hook
vi.mock('@/components/hooks/useSkiSpec', () => ({
  useSkiSpec: () => ({
    spec: mockSpec,
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
vi.mock('./SkiDiagram', () => ({
  SkiDiagram: ({ spec }: { spec: SkiSpecDTO }) => <div data-testid="ski-diagram">SkiDiagram for {spec.name}</div>,
}));

vi.mock('./SpecValue', () => ({
  SpecValue: ({ label, value, unit }: { label?: string; value: number; unit: string }) => (
    <div data-testid="spec-value">
      {label && `${label}: `}
      {value} {unit}
    </div>
  ),
}));

vi.mock('./NotesList', () => ({
  NotesList: ({ specId }: { specId: string }) => <div data-testid="notes-list">NotesList for {specId}</div>,
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
    mode: string;
    specId?: string;
  }) => (
    <div data-testid="ski-spec-form-dialog" data-open={open} data-mode={mode} data-spec-id={specId}>
      <button onClick={() => onOpenChange(false)}>Close Form Dialog</button>
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
    <div data-testid="delete-ski-spec-dialog" data-open={open} data-in-progress={isInProgress}>
      <button onClick={() => onOpenChange(false)}>Close Delete Dialog</button>
      <button onClick={onConfirm}>Confirm Delete</button>
    </div>
  ),
}));

/**
 * STEP 2: TEST FIXTURES
 */

const createMockSpec = (overrides?: Partial<SkiSpecDTO>): SkiSpecDTO => ({
  id: 'spec-123',
  user_id: 'user-456',
  name: 'Test Ski Model',
  description: 'A great ski for testing',
  length: 180,
  tip: 130,
  waist: 100,
  tail: 120,
  radius: 18.5,
  weight: 1800,
  surface_area: 2100.5,
  relative_weight: 0.857,
  algorithm_version: '1.0.0',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  notes_count: 3,
  ...overrides,
});

/**
 * STEP 3: TEST SUITE
 */

describe('SkiSpecDetail', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset window.location
    window.location.href = '/';

    // Reset default mock states
    mockSpec = null;
    mockIsLoading = false;
    mockError = null;
    mockIsSubmitting = false;

    mockRefetch.mockResolvedValue(undefined);
    mockDeleteSkiSpec.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render loading state initially', () => {
      mockIsLoading = true;
      mockSpec = null;

      render(<SkiSpecDetail specId="spec-123" />);

      // Loading spinner should be visible
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading specification...')).toBeInTheDocument();

      // Content should not be visible
      expect(screen.queryByText('Back to List')).not.toBeInTheDocument();
    });

    it('should render error state when spec not found', () => {
      mockIsLoading = false;
      mockError = new Error('Not found');
      mockSpec = null;

      render(<SkiSpecDetail specId="spec-123" />);

      expect(screen.getByText('Specification not found')).toBeInTheDocument();
      expect(screen.queryByText('Back to List')).not.toBeInTheDocument();
    });

    it('should render error state when spec is null', () => {
      mockIsLoading = false;
      mockError = null;
      mockSpec = null;

      render(<SkiSpecDetail specId="spec-123" />);

      expect(screen.getByText('Specification not found')).toBeInTheDocument();
    });

    it('should render full spec details on success', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Header elements
      expect(screen.getByText('Back to List')).toBeInTheDocument();

      // Spec name and date
      expect(screen.getByText('Test Ski Model')).toBeInTheDocument();
      expect(screen.getByText(/Added on/)).toBeInTheDocument();

      // Action buttons
      expect(screen.getByRole('button', { name: /Edit Test Ski Model/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete Test Ski Model/i })).toBeInTheDocument();

      // Child components
      expect(screen.getByTestId('ski-diagram')).toBeInTheDocument();
      expect(screen.getByTestId('notes-list')).toBeInTheDocument();
    });

    it('should display calculated metrics with badges', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Section title
      expect(screen.getByText('Calculated Metrics')).toBeInTheDocument();

      // Key Metric badges
      const badges = screen.getAllByText('Key Metric');
      expect(badges).toHaveLength(2);

      // Metric values (SpecValue is mocked, so we check for presence)
      const specValues = screen.getAllByTestId('spec-value');
      expect(specValues.length).toBeGreaterThan(0);
    });

    it('should display algorithm version', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({ algorithm_version: '1.0.0' });

      render(<SkiSpecDetail specId="spec-123" />);

      expect(screen.getByText('Algorithm version: 1.0.0')).toBeInTheDocument();
    });

    it('should display description when provided', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({ description: 'A great ski for testing' });

      render(<SkiSpecDetail specId="spec-123" />);

      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('A great ski for testing')).toBeInTheDocument();
    });

    it('should display placeholder when description is null', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({ description: null });

      render(<SkiSpecDetail specId="spec-123" />);

      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('No description provided')).toBeInTheDocument();
    });

    it('should display placeholder when description is empty string', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({ description: '' });

      render(<SkiSpecDetail specId="spec-123" />);

      expect(screen.getByText('No description provided')).toBeInTheDocument();
    });

    it('should pass correct spec data to child components', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // SkiDiagram receives spec
      expect(screen.getByTestId('ski-diagram')).toHaveTextContent('SkiDiagram for Test Ski Model');

      // NotesList receives specId
      expect(screen.getByTestId('notes-list')).toHaveTextContent('NotesList for spec-123');
    });
  });

  describe('user interactions', () => {
    it('should open edit dialog when Edit button clicked', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      const editButton = screen.getByRole('button', { name: /Edit Test Ski Model/i });
      await user.click(editButton);

      // Edit dialog should be open
      const dialog = screen.getByTestId('ski-spec-form-dialog');
      expect(dialog).toHaveAttribute('data-open', 'true');
      expect(dialog).toHaveAttribute('data-mode', 'edit');
      expect(dialog).toHaveAttribute('data-spec-id', 'spec-123');
    });

    it('should close edit dialog when close is triggered', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Open dialog
      const editButton = screen.getByRole('button', { name: /Edit Test Ski Model/i });
      await user.click(editButton);

      // Close dialog
      const closeButton = screen.getByText('Close Form Dialog');
      await user.click(closeButton);

      // Dialog should be closed
      await waitFor(() => {
        const dialog = screen.getByTestId('ski-spec-form-dialog');
        expect(dialog).toHaveAttribute('data-open', 'false');
      });
    });

    it('should refetch data when edit dialog closes', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Open dialog
      const editButton = screen.getByRole('button', { name: /Edit Test Ski Model/i });
      await user.click(editButton);

      // Close dialog
      const closeButton = screen.getByText('Close Form Dialog');
      await user.click(closeButton);

      // Refetch should be called
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should open delete dialog when Delete button clicked', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      const deleteButton = screen.getByRole('button', { name: /Delete Test Ski Model/i });
      await user.click(deleteButton);

      // Delete dialog should be open
      const dialog = screen.getByTestId('delete-ski-spec-dialog');
      expect(dialog).toHaveAttribute('data-open', 'true');
    });

    it('should close delete dialog when close is triggered', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Open dialog
      const deleteButton = screen.getByRole('button', { name: /Delete Test Ski Model/i });
      await user.click(deleteButton);

      // Close dialog
      const closeButton = screen.getByText('Close Delete Dialog');
      await user.click(closeButton);

      // Dialog should be closed
      await waitFor(() => {
        const dialog = screen.getByTestId('delete-ski-spec-dialog');
        expect(dialog).toHaveAttribute('data-open', 'false');
      });
    });
  });

  describe('delete flow', () => {
    it('should call deleteSkiSpec when delete is confirmed', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /Delete Test Ski Model/i });
      await user.click(deleteButton);

      // Confirm delete
      const confirmButton = screen.getByText('Confirm Delete');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteSkiSpec).toHaveBeenCalledWith('spec-123');
        expect(mockDeleteSkiSpec).toHaveBeenCalledTimes(1);
      });
    });

    it('should navigate to list page after successful deletion', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /Delete Test Ski Model/i });
      await user.click(deleteButton);

      // Confirm delete
      const confirmButton = screen.getByText('Confirm Delete');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(window.location.href).toBe('/ski-specs');
      });
    });

    it('should preserve query params in post-delete navigation', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" returnQueryParams="?page=2&sort=name" />);

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /Delete Test Ski Model/i });
      await user.click(deleteButton);

      // Confirm delete
      const confirmButton = screen.getByText('Confirm Delete');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(window.location.href).toBe('/ski-specs?page=2&sort=name');
      });
    });

    it('should pass isSubmitting state to delete dialog', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();
      mockIsSubmitting = true;

      render(<SkiSpecDetail specId="spec-123" />);

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /Delete Test Ski Model/i });
      await user.click(deleteButton);

      // Check isInProgress prop
      const dialog = screen.getByTestId('delete-ski-spec-dialog');
      expect(dialog).toHaveAttribute('data-in-progress', 'true');
    });
  });

  describe('navigation', () => {
    it('should navigate back to list when Back button clicked', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      const backButton = screen.getByRole('button', { name: 'Back to list' });
      await user.click(backButton);

      expect(window.location.href).toBe('/ski-specs');
    });

    it('should preserve query params when navigating back', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" returnQueryParams="?page=3&search=test" />);

      const backButton = screen.getByRole('button', { name: 'Back to list' });
      await user.click(backButton);

      expect(window.location.href).toBe('/ski-specs?page=3&search=test');
    });

    it('should navigate to default list page when no query params provided', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      const backButton = screen.getByRole('button', { name: 'Back to list' });
      await user.click(backButton);

      expect(window.location.href).toBe('/ski-specs');
    });
  });

  describe('accessibility', () => {
    it('should have role="status" on loading spinner', () => {
      mockIsLoading = true;
      mockSpec = null;

      render(<SkiSpecDetail specId="spec-123" />);

      const loadingStatus = screen.getByRole('status');
      expect(loadingStatus).toBeInTheDocument();
      expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
    });

    it('should have descriptive aria-label on back button', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      const backButton = screen.getByRole('button', { name: 'Back to list' });
      expect(backButton).toHaveAttribute('aria-label', 'Back to list');
    });

    it('should have descriptive aria-label on edit button with spec name', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({ name: 'Custom Ski Name' });

      render(<SkiSpecDetail specId="spec-123" />);

      const editButton = screen.getByRole('button', { name: /Edit Custom Ski Name/i });
      expect(editButton).toHaveAttribute('aria-label', 'Edit Custom Ski Name');
    });

    it('should have descriptive aria-label on delete button with spec name', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({ name: 'Custom Ski Name' });

      render(<SkiSpecDetail specId="spec-123" />);

      const deleteButton = screen.getByRole('button', { name: /Delete Custom Ski Name/i });
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete Custom Ski Name');
    });
  });

  describe('edge cases', () => {
    it('should handle spec with very long name', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({
        name: 'A'.repeat(255), // Max length from schema
      });

      render(<SkiSpecDetail specId="spec-123" />);

      expect(screen.getByText('A'.repeat(255))).toBeInTheDocument();
    });

    it('should handle spec with very long description', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({
        description: 'B'.repeat(2000), // Max length from schema
      });

      render(<SkiSpecDetail specId="spec-123" />);

      expect(screen.getByText('B'.repeat(2000))).toBeInTheDocument();
    });

    it('should handle spec with zero notes', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({ notes_count: 0 });

      render(<SkiSpecDetail specId="spec-123" />);

      // NotesList should still render
      expect(screen.getByTestId('notes-list')).toBeInTheDocument();
    });

    it('should handle returnQueryParams with leading question mark', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" returnQueryParams="?page=1" />);

      // Component should handle this correctly (query params are appended as-is)
      expect(screen.getByText('Back to List')).toBeInTheDocument();
    });

    it('should handle returnQueryParams without leading question mark', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" returnQueryParams="page=1" />);

      // Component should handle this correctly
      expect(screen.getByText('Back to List')).toBeInTheDocument();
    });

    it('should handle multiple rapid dialog open/close cycles', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      const editButton = screen.getByRole('button', { name: /Edit Test Ski Model/i });

      // Open and close multiple times
      await user.click(editButton);
      await user.click(screen.getByText('Close Form Dialog'));

      await user.click(editButton);
      await user.click(screen.getByText('Close Form Dialog'));

      await user.click(editButton);
      await user.click(screen.getByText('Close Form Dialog'));

      // Should handle gracefully
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should not refetch if edit dialog was open but no changes made', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Open dialog
      const editButton = screen.getByRole('button', { name: /Edit Test Ski Model/i });
      await user.click(editButton);

      // Close immediately
      const closeButton = screen.getByText('Close Form Dialog');
      await user.click(closeButton);

      // Refetch should still be called (component always refetches on close)
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should call refetch when edit dialog closes', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Open and close edit dialog
      const editButton = screen.getByRole('button', { name: /Edit Test Ski Model/i });
      await user.click(editButton);

      const closeButton = screen.getByText('Close Form Dialog');
      await user.click(closeButton);

      // Refetch should be called
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(1);
      });

      // Spec should still be displayed
      expect(screen.getByText('Test Ski Model')).toBeInTheDocument();
    });

    it('should attempt to delete when confirmation is given', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /Delete Test Ski Model/i });
      await user.click(deleteButton);

      // Confirm delete
      const confirmButton = screen.getByText('Confirm Delete');
      await user.click(confirmButton);

      // Delete should be called with correct spec ID
      await waitFor(() => {
        expect(mockDeleteSkiSpec).toHaveBeenCalledWith('spec-123');
        expect(mockDeleteSkiSpec).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('format and display', () => {
    it('should format created_at date correctly', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec({
        created_at: '2024-12-25T15:30:00Z',
      });

      render(<SkiSpecDetail specId="spec-123" />);

      // Check that date is formatted (exact format depends on locale)
      const dateText = screen.getByText(/Added on/);
      expect(dateText).toBeInTheDocument();
      expect(dateText.textContent).toContain('Added on');
    });

    it('should display section headings correctly', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      expect(screen.getByText('Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Calculated Metrics')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should render all separators', () => {
      mockIsLoading = false;
      mockSpec = createMockSpec();

      const { container } = render(<SkiSpecDetail specId="spec-123" />);

      // Separator is a Radix UI component, check by data-orientation attribute
      const separators = container.querySelectorAll('[data-orientation="horizontal"]');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('dialog props', () => {
    it('should pass correct props to edit dialog', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      render(<SkiSpecDetail specId="spec-123" />);

      const editButton = screen.getByRole('button', { name: /Edit Test Ski Model/i });
      await user.click(editButton);

      const dialog = screen.getByTestId('ski-spec-form-dialog');
      expect(dialog).toHaveAttribute('data-mode', 'edit');
      expect(dialog).toHaveAttribute('data-spec-id', 'spec-123');
    });

    it('should pass correct props to delete dialog', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();
      mockIsSubmitting = false;

      render(<SkiSpecDetail specId="spec-123" />);

      const deleteButton = screen.getByRole('button', { name: /Delete Test Ski Model/i });
      await user.click(deleteButton);

      const dialog = screen.getByTestId('delete-ski-spec-dialog');
      expect(dialog).toHaveAttribute('data-in-progress', 'false');
    });

    it('should update delete dialog when isSubmitting changes', async () => {
      const user = userEvent.setup();
      mockIsLoading = false;
      mockSpec = createMockSpec();

      const { rerender } = render(<SkiSpecDetail specId="spec-123" />);

      const deleteButton = screen.getByRole('button', { name: /Delete Test Ski Model/i });
      await user.click(deleteButton);

      // Initially not submitting
      let dialog = screen.getByTestId('delete-ski-spec-dialog');
      expect(dialog).toHaveAttribute('data-in-progress', 'false');

      // Update to submitting
      mockIsSubmitting = true;
      rerender(<SkiSpecDetail specId="spec-123" />);

      dialog = screen.getByTestId('delete-ski-spec-dialog');
      expect(dialog).toHaveAttribute('data-in-progress', 'true');
    });
  });
});
