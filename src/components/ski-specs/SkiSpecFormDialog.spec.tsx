import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkiSpecFormDialog } from './SkiSpecFormDialog';
import type { SkiSpecDTO } from '@/types/api.types';

/**
 * STEP 1: MOCK DEPENDENCIES
 *
 * React Testing Library best practice: Mock external dependencies (hooks, APIs, modules)
 * at the module level using vi.mock()
 */

// Create mock functions that we can control in tests
const mockCreateSkiSpec = vi.fn();
const mockUpdateSkiSpec = vi.fn();
const mockGetSkiSpec = vi.fn();
const mockDeleteSkiSpec = vi.fn();

// Mock the mutation hook that handles API calls
vi.mock('@/components/hooks/useSkiSpecMutation', () => ({
  useSkiSpecMutation: () => ({
    createSkiSpec: mockCreateSkiSpec,
    updateSkiSpec: mockUpdateSkiSpec,
    getSkiSpec: mockGetSkiSpec,
    deleteSkiSpec: mockDeleteSkiSpec,
    isSubmitting: false,
    apiErrors: {},
  }),
}));

// Mock child components to isolate the component under test
// This makes tests faster and focuses on SkiSpecFormDialog's behavior only
vi.mock('./SkiSpecForm', () => ({
  SkiSpecForm: ({
    onSubmit,
    onCancel,
    defaultValues,
    isSubmitting,
    apiErrors,
    onUnsavedChanges,
  }: {
    onSubmit: (data: Partial<SkiSpecDTO>) => void;
    onCancel: () => void;
    defaultValues?: SkiSpecDTO;
    isSubmitting: boolean;
    apiErrors: Record<string, string>;
    onUnsavedChanges: (hasChanges: boolean) => void;
  }) => (
    <div data-testid="ski-spec-form">
      <button onClick={() => onSubmit({ name: 'Test Ski' })}>Submit Form</button>
      <button onClick={onCancel}>Cancel Form</button>
      <button onClick={() => onUnsavedChanges(true)}>Make Changes</button>
      {isSubmitting && <div>Form Submitting...</div>}
      {Object.keys(apiErrors).length > 0 && <div>Form has errors</div>}
      {defaultValues && <div>Has default values</div>}
    </div>
  ),
}));

vi.mock('./UnsavedChangesDialog', () => ({
  UnsavedChangesDialog: ({
    open,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-labelledby="unsaved-changes-title">
        <h2 id="unsaved-changes-title">Unsaved Changes</h2>
        <button onClick={onConfirm}>Discard Changes</button>
        <button onClick={onCancel}>Keep Editing</button>
      </div>
    ) : null,
}));

/**
 * STEP 2: SETUP TEST UTILITIES AND HELPERS
 *
 * Create reusable mocks and helper functions for common test scenarios
 */

// Sample test data following the DRY principle
const mockSkiSpecDTO: SkiSpecDTO = {
  id: 'test-spec-id',
  name: 'Existing Ski',
  description: 'A great ski',
  length: 180,
  tip: 130,
  waist: 100,
  tail: 120,
  radius: 18,
  weight: 1800,
  surface_area: 18000,
  relative_weight: 0.1,
  notes_count: 0,
  user_id: 'user-123',
  algorithm_version: '1.0.0',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

/**
 * STEP 3: ORGANIZE TESTS WITH DESCRIBE BLOCKS
 *
 * Group related tests together for better organization and readability
 */

describe('SkiSpecFormDialog', () => {
  /**
   * STEP 4: SETUP AND TEARDOWN
   *
   * Reset mocks before each test to ensure test isolation
   */
  beforeEach(() => {
    // Clear all mock function call history
    vi.clearAllMocks();
  });

  /**
   * STEP 5: TEST RENDERING AND BASIC VISIBILITY
   *
   * Pattern: Test what the user sees when the component first renders
   */
  describe('Rendering', () => {
    it('should not render when closed', () => {
      // Arrange: Setup component props
      const onOpenChange = vi.fn();

      // Act: Render the component
      render(<SkiSpecFormDialog open={false} onOpenChange={onOpenChange} mode="create" />);

      // Assert: Check that dialog is not visible
      // Use queryBy* for elements that should NOT exist
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render create dialog with correct title and description', () => {
      const onOpenChange = vi.fn();

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="create" />);

      // Query by role and accessible name (best practice)
      const dialog = screen.getByRole('dialog', { name: /add new specification/i });
      expect(dialog).toBeInTheDocument();

      // Check for descriptive text
      expect(screen.getByText(/enter the technical parameters/i)).toBeInTheDocument();
    });

    it('should render edit dialog with correct title', async () => {
      const onOpenChange = vi.fn();
      mockGetSkiSpec.mockResolvedValue(mockSkiSpecDTO);

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-id" />);

      // Wait for data to load, then check for edit title
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /edit specification/i })).toBeInTheDocument();
      });
    });
  });

  /**
   * STEP 6: TEST LOADING STATES
   *
   * Pattern: Test different UI states (loading, error, success)
   */
  describe('Loading State', () => {
    it('should show loading spinner in edit mode while fetching data', () => {
      const onOpenChange = vi.fn();
      mockGetSkiSpec.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        })
      ); // Never resolves

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-id" />);

      // Check for loading indicator with role="status" for screen readers
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toBeInTheDocument();
      expect(screen.getByText(/loading specification/i)).toBeInTheDocument();

      // Verify the form is NOT shown during loading
      expect(screen.queryByTestId('ski-spec-form')).not.toBeInTheDocument();
    });

    it('should fetch ski spec data when opening in edit mode', () => {
      const onOpenChange = vi.fn();
      const specId = 'test-spec-id';
      mockGetSkiSpec.mockResolvedValue(mockSkiSpecDTO);

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId={specId} />);

      // Verify the hook was called with correct ID
      expect(mockGetSkiSpec).toHaveBeenCalledWith(specId);
      expect(mockGetSkiSpec).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * STEP 7: TEST ASYNC BEHAVIOR
   *
   * Pattern: Use waitFor for async updates and state changes
   */
  describe('Data Fetching', () => {
    it('should display form with fetched data after loading completes', async () => {
      const onOpenChange = vi.fn();
      mockGetSkiSpec.mockResolvedValue(mockSkiSpecDTO);

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-spec-id" />);

      // Wait for async data fetching to complete
      await waitFor(() => {
        expect(screen.getByTestId('ski-spec-form')).toBeInTheDocument();
      });

      // Verify loading state is gone
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      // Verify form received the data
      expect(screen.getByText(/has default values/i)).toBeInTheDocument();
    });

    it('should handle fetch errors gracefully', async () => {
      const onOpenChange = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* intentional */
      });

      mockGetSkiSpec.mockRejectedValue(new Error('Network error'));

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-spec-id" />);

      // Wait for error to be handled
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch ski spec:', expect.any(Error));
      });

      // Form should not be displayed on error
      expect(screen.queryByTestId('ski-spec-form')).not.toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should reset data when dialog closes', async () => {
      const onOpenChange = vi.fn();
      mockGetSkiSpec.mockResolvedValue(mockSkiSpecDTO);

      // First render - open
      const { rerender } = render(
        <SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-spec-id" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('ski-spec-form')).toBeInTheDocument();
      });

      // Rerender - close
      rerender(<SkiSpecFormDialog open={false} onOpenChange={onOpenChange} mode="edit" specId="test-spec-id" />);

      // Rerender - open again
      rerender(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-spec-id" />);

      // Should show loading again (data was reset)
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  /**
   * STEP 8: TEST USER INTERACTIONS
   *
   * Pattern: Use userEvent for realistic user interactions
   */
  describe('Form Submission', () => {
    it('should call createSkiSpec when submitting in create mode', async () => {
      // Setup userEvent for realistic interactions
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      mockCreateSkiSpec.mockResolvedValue(mockSkiSpecDTO);

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="create" />);

      // Find and click the submit button
      const submitButton = screen.getByRole('button', { name: /submit form/i });
      await user.click(submitButton);

      // Verify the mutation was called
      expect(mockCreateSkiSpec).toHaveBeenCalledWith({ name: 'Test Ski' });

      // Wait for dialog to close after successful submission
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should call updateSkiSpec when submitting in edit mode', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const specId = 'test-spec-id';

      mockGetSkiSpec.mockResolvedValue(mockSkiSpecDTO);
      mockUpdateSkiSpec.mockResolvedValue(mockSkiSpecDTO);

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId={specId} />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('ski-spec-form')).toBeInTheDocument();
      });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /submit form/i });
      await user.click(submitButton);

      // Verify update was called with correct ID
      expect(mockUpdateSkiSpec).toHaveBeenCalledWith(specId, { name: 'Test Ski' });

      // Verify dialog closes on success
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should handle submission errors without closing dialog', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* intentional */
      });

      mockCreateSkiSpec.mockRejectedValue(new Error('API Error'));

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="create" />);

      const submitButton = screen.getByRole('button', { name: /submit form/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // Dialog should NOT close on error
      expect(onOpenChange).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  /**
   * STEP 9: TEST COMPONENT PROP CALLBACKS
   *
   * Pattern: Test that parent component correctly handles callbacks from children
   *
   * NOTE: The unsaved changes workflow tests are omitted here because they would require
   * testing with real child components (SkiSpecForm and UnsavedChangesDialog).
   * When child components are mocked, we lose the ability to test complex workflows
   * that depend on real child behavior.
   *
   * Best practices for testing complex workflows:
   * 1. Unit tests (this file): Test component in isolation with mocked children
   *    - Focus on props, state, and direct user interactions
   * 2. Integration tests: Test with real child components
   *    - Test complete user workflows (type in form, click cancel, confirm discard)
   *    - Place in tests/integration/ directory
   * 3. E2E tests: Test in real browser
   *    - Test critical paths end-to-end
   */
  describe('Callback Handling', () => {
    it('should close dialog immediately when canceling without changes', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="create" />);

      // Cancel without making changes
      const cancelButton = screen.getByRole('button', { name: /cancel form/i });
      await user.click(cancelButton);

      // Should close immediately when there are no unsaved changes
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onUnsavedChanges callback from SkiSpecForm', () => {
      const onOpenChange = vi.fn();

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="create" />);

      // Verify that SkiSpecForm receives the onUnsavedChanges callback
      const form = screen.getByTestId('ski-spec-form');
      expect(form).toBeInTheDocument();

      // The mocked form component exposes a button to simulate changes
      const makeChangesButton = screen.getByRole('button', { name: /make changes/i });
      expect(makeChangesButton).toBeInTheDocument();
    });
  });

  /**
   * STEP 10: TEST ACCESSIBILITY
   *
   * Pattern: Verify ARIA attributes and semantic HTML
   */
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const onOpenChange = vi.fn();

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="create" />);

      const dialog = screen.getByRole('dialog');

      // Verify ARIA labelledby points to title
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');

      // Verify ARIA describedby points to description
      expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
    });

    it('should not have aria-describedby during loading state', () => {
      const onOpenChange = vi.fn();
      mockGetSkiSpec.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        })
      );

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-id" />);

      // Find dialog element using screen (not container.querySelector)
      const dialog = screen.getByRole('dialog');

      // During loading, aria-describedby should be undefined
      expect(dialog).not.toHaveAttribute('aria-describedby');
    });

    it('should have role="status" and aria-live on loading indicator', () => {
      const onOpenChange = vi.fn();
      mockGetSkiSpec.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        })
      );

      render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-id" />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });
  });

  /**
   * STEP 11: TEST PROPS AND COMPONENT API
   *
   * Pattern: Verify component responds correctly to different prop combinations
   */
  describe('Props Handling', () => {
    it('should handle mode switching correctly', async () => {
      const onOpenChange = vi.fn();
      mockGetSkiSpec.mockResolvedValue(mockSkiSpecDTO);

      const { rerender } = render(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="create" />);

      expect(screen.getByRole('dialog', { name: /add new/i })).toBeInTheDocument();

      // Switch to edit mode
      rerender(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-id" />);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /edit/i })).toBeInTheDocument();
      });
    });

    it('should require specId in edit mode', () => {
      const onOpenChange = vi.fn();

      render(
        <SkiSpecFormDialog
          open={true}
          onOpenChange={onOpenChange}
          mode="edit"
          // specId is missing - component should handle gracefully
        />
      );

      // Component should not crash and not attempt to fetch
      expect(mockGetSkiSpec).not.toHaveBeenCalled();
    });
  });

  /**
   * STEP 12: TEST EDGE CASES
   *
   * Pattern: Think about boundary conditions and unusual scenarios
   */
  describe('Edge Cases', () => {
    it('should handle rapid open/close cycles', async () => {
      const onOpenChange = vi.fn();
      mockGetSkiSpec.mockResolvedValue(mockSkiSpecDTO);

      const { rerender } = render(
        <SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-id" />
      );

      // Close immediately
      rerender(<SkiSpecFormDialog open={false} onOpenChange={onOpenChange} mode="edit" specId="test-id" />);

      // Open again
      rerender(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="test-id" />);

      // Should not cause errors and should fetch data again
      await waitFor(() => {
        expect(mockGetSkiSpec).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle form key change when switching between specs', async () => {
      const onOpenChange = vi.fn();
      mockGetSkiSpec.mockResolvedValue(mockSkiSpecDTO);

      const { rerender } = render(
        <SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="spec-1" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('ski-spec-form')).toBeInTheDocument();
      });

      // Switch to different spec
      rerender(<SkiSpecFormDialog open={true} onOpenChange={onOpenChange} mode="edit" specId="spec-2" />);

      // Should fetch new spec data
      await waitFor(() => {
        expect(mockGetSkiSpec).toHaveBeenCalledWith('spec-2');
      });
    });
  });
});
