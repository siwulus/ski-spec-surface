import type { CreateSkiSpecCommand } from '@/types/api.types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NumberInputWithUnitProps } from './NumberInputWithUnit';
import { SkiSpecForm } from './SkiSpecForm';
import type { TextareaWithCounterProps } from './TextareaWithCounter';

/**
 * Unit tests for SkiSpecForm component
 *
 * Tests cover:
 * - Rendering with default and custom props
 * - Form validation and error display
 * - User interactions (input, submit, cancel)
 * - API error handling
 * - Unsaved changes tracking
 * - Accessibility attributes
 * - Edge cases and boundary conditions
 */

/**
 * STEP 1: MOCK DEPENDENCIES
 */

// Create mock functions for form methods
const mockRegister = vi.fn((name: string) => ({
  name,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
}));

const mockWatch = vi.fn();
const mockSetError = vi.fn();
const mockHandleSubmit = vi.fn((callback) => async (e?: React.BaseSyntheticEvent) => {
  e?.preventDefault();
  return callback();
});

// Mock state that can be modified between tests
let mockFormState = {
  errors: {},
  isValid: true,
  isDirty: false,
  isSubmitting: false,
  isSubmitted: false,
  isSubmitSuccessful: false,
  isLoading: false,
  isValidating: false,
  submitCount: 0,
  defaultValues: {},
  dirtyFields: {},
  touchedFields: {},
  validatingFields: {},
};

let mockHasUnsavedChanges = false;

// Mock the useSkiSpecForm hook
vi.mock('@/components/hooks/useSkiSpecForm', () => ({
  useSkiSpecForm: () => ({
    form: {
      register: mockRegister,
      watch: mockWatch,
      setError: mockSetError,
      handleSubmit: mockHandleSubmit,
      formState: mockFormState,
    },
    hasUnsavedChanges: mockHasUnsavedChanges,
  }),
}));

// Mock child components
vi.mock('./NumberInputWithUnit', () => ({
  NumberInputWithUnit: ({ name, label, unit, disabled }: NumberInputWithUnitProps) => (
    <div data-testid={`number-input-${name}`}>
      <label htmlFor={name}>{label}</label>
      <input id={name} type="number" disabled={disabled} aria-label={`${label} (${unit})`} />
    </div>
  ),
}));

vi.mock('./TextareaWithCounter', () => ({
  TextareaWithCounter: ({ name, label, disabled }: TextareaWithCounterProps) => (
    <div data-testid={`textarea-${name}`}>
      <label htmlFor={name}>{label}</label>
      <textarea id={name} disabled={disabled} />
    </div>
  ),
}));

/**
 * STEP 2: TEST DATA
 */
const validFormData: CreateSkiSpecCommand = {
  name: 'Test Ski Model',
  description: 'A great all-mountain ski',
  length: 180,
  tip: 130,
  waist: 100,
  tail: 120,
  radius: 18,
  weight: 1800,
};

const defaultProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  isSubmitting: false,
};

/**
 * STEP 3: TEST SUITES
 */
describe('SkiSpecForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock state to defaults
    mockFormState = {
      errors: {},
      isValid: true,
      isDirty: false,
      isSubmitting: false,
      isSubmitted: false,
      isSubmitSuccessful: false,
      isLoading: false,
      isValidating: false,
      submitCount: 0,
      defaultValues: {},
      dirtyFields: {},
      touchedFields: {},
      validatingFields: {},
    };

    mockHasUnsavedChanges = false;
    mockWatch.mockReturnValue('');
  });

  /**
   * RENDERING TESTS
   */
  describe('Rendering', () => {
    it('should render all form fields with correct labels', () => {
      render(<SkiSpecForm {...defaultProps} />);

      // Name field (not mocked)
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();

      // Description field (mocked)
      expect(screen.getByTestId('textarea-description')).toBeInTheDocument();

      // Dimension fields (mocked)
      expect(screen.getByTestId('number-input-length')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-radius')).toBeInTheDocument();

      // Width fields (mocked)
      expect(screen.getByTestId('number-input-tip')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-waist')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-tail')).toBeInTheDocument();

      // Weight field (mocked)
      expect(screen.getByTestId('number-input-weight')).toBeInTheDocument();
    });

    it('should render form action buttons', () => {
      render(<SkiSpecForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should show required asterisk on name field', () => {
      render(<SkiSpecForm {...defaultProps} />);

      const requiredIndicator = screen.getByLabelText(/required/i);
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator).toHaveClass('text-destructive');
    });

    it('should render with default values when provided', () => {
      render(<SkiSpecForm {...defaultProps} defaultValues={validFormData} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should group width fields together with heading', () => {
      render(<SkiSpecForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /widths/i, level: 3 })).toBeInTheDocument();
    });
  });

  /**
   * FORM VALIDATION AND ERRORS
   */
  describe('Form Validation', () => {
    it('should display validation error for name field', () => {
      mockFormState.errors = {
        name: {
          type: 'manual',
          message: 'Name is required',
        },
      };

      render(<SkiSpecForm {...defaultProps} />);

      expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
    });

    it('should apply error styles when field has validation error', () => {
      mockFormState.errors = {
        name: {
          type: 'manual',
          message: 'Name is required',
        },
      };

      render(<SkiSpecForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveClass('border-destructive');
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should display API validation errors when provided', async () => {
      const apiErrors = { name: 'Name already exists' };

      render(<SkiSpecForm {...defaultProps} apiErrors={apiErrors} />);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith('name', {
          type: 'manual',
          message: 'Name already exists',
        });
      });
    });

    it('should handle multiple API errors', async () => {
      const apiErrors = {
        name: 'Name already exists',
        length: 'Invalid length value',
      };

      render(<SkiSpecForm {...defaultProps} apiErrors={apiErrors} />);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledTimes(2);
        expect(mockSetError).toHaveBeenCalledWith('name', {
          type: 'manual',
          message: 'Name already exists',
        });
        expect(mockSetError).toHaveBeenCalledWith('length', {
          type: 'manual',
          message: 'Invalid length value',
        });
      });
    });

    it('should display cross-field validation error for waist field', () => {
      mockFormState.errors = {
        waist: {
          type: 'custom',
          message: 'Waist must be less than or equal to both tip and tail widths',
        },
      };

      render(<SkiSpecForm {...defaultProps} />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent(/waist must be less than or equal to/i);
    });

    it('should handle empty API errors object', () => {
      render(<SkiSpecForm {...defaultProps} apiErrors={{}} />);

      expect(mockSetError).not.toHaveBeenCalled();
    });

    it('should handle undefined apiErrors prop', () => {
      render(<SkiSpecForm {...defaultProps} apiErrors={undefined} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  /**
   * USER INTERACTIONS
   */
  describe('User Interactions', () => {
    it('should call onSubmit when form is submitted with valid data', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      mockHandleSubmit.mockImplementation((callback) => async (e?: React.BaseSyntheticEvent) => {
        e?.preventDefault();
        await callback(validFormData);
      });

      render(<SkiSpecForm {...defaultProps} onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(validFormData);
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<SkiSpecForm {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should track description length for character counter', () => {
      const descriptionText = 'This is a test description';
      mockWatch.mockReturnValue(descriptionText);

      render(<SkiSpecForm {...defaultProps} />);

      expect(mockWatch).toHaveBeenCalledWith('description');
    });

    it('should handle empty description gracefully', () => {
      mockWatch.mockReturnValue(null);

      render(<SkiSpecForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  /**
   * DISABLED STATES
   */
  describe('Disabled States', () => {
    it('should disable all inputs when isSubmitting is true', () => {
      render(<SkiSpecForm {...defaultProps} isSubmitting={true} />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeDisabled();
    });

    it('should disable cancel button when submitting', () => {
      render(<SkiSpecForm {...defaultProps} isSubmitting={true} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should disable submit button when submitting', () => {
      render(<SkiSpecForm {...defaultProps} isSubmitting={true} />);

      const submitButton = screen.getByRole('button', { name: /saving/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when form is invalid', () => {
      mockFormState.isValid = false;

      render(<SkiSpecForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /save/i });
      expect(submitButton).toBeDisabled();
    });

    it('should change submit button text to "Saving..." when submitting', () => {
      render(<SkiSpecForm {...defaultProps} isSubmitting={true} />);

      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeInTheDocument();
    });
  });

  /**
   * UNSAVED CHANGES TRACKING
   */
  describe('Unsaved Changes Tracking', () => {
    it('should notify parent when unsaved changes state changes', async () => {
      const onUnsavedChanges = vi.fn();
      mockHasUnsavedChanges = true;

      render(<SkiSpecForm {...defaultProps} onUnsavedChanges={onUnsavedChanges} />);

      await waitFor(() => {
        expect(onUnsavedChanges).toHaveBeenCalledWith(true);
      });
    });

    it('should notify parent when form becomes pristine', async () => {
      const onUnsavedChanges = vi.fn();
      mockHasUnsavedChanges = false;

      render(<SkiSpecForm {...defaultProps} onUnsavedChanges={onUnsavedChanges} />);

      await waitFor(() => {
        expect(onUnsavedChanges).toHaveBeenCalledWith(false);
      });
    });

    it('should handle missing onUnsavedChanges callback gracefully', () => {
      mockHasUnsavedChanges = true;

      expect(() => {
        render(<SkiSpecForm {...defaultProps} onUnsavedChanges={undefined} />);
      }).not.toThrow();
    });
  });

  /**
   * ACCESSIBILITY
   */
  describe('Accessibility', () => {
    it('should have proper ARIA attributes on name input', () => {
      render(<SkiSpecForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(nameInput).toHaveAttribute('type', 'text');
    });

    it('should associate error message with input via aria-describedby', () => {
      mockFormState.errors = {
        name: {
          type: 'manual',
          message: 'Name is required',
        },
      };

      render(<SkiSpecForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveAttribute('id', 'name-error');
    });

    it('should not have aria-describedby when there is no error', () => {
      render(<SkiSpecForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).not.toHaveAttribute('aria-describedby');
    });

    it('should mark error messages with role="alert"', () => {
      mockFormState.errors = {
        name: {
          type: 'manual',
          message: 'Name is required',
        },
      };

      render(<SkiSpecForm {...defaultProps} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Name is required');
    });

    it('should have semantic form structure', () => {
      const { container } = render(<SkiSpecForm {...defaultProps} />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  /**
   * FORM PROVIDER INTEGRATION
   */
  describe('FormProvider Integration', () => {
    it('should wrap form in FormProvider for nested components', () => {
      const { container } = render(<SkiSpecForm {...defaultProps} />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();

      // Verify child components that depend on FormProvider are rendered
      expect(screen.getByTestId('textarea-description')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-length')).toBeInTheDocument();
    });

    it('should register name field with form', () => {
      render(<SkiSpecForm {...defaultProps} />);

      expect(mockRegister).toHaveBeenCalledWith('name');
    });
  });

  /**
   * EDGE CASES
   */
  describe('Edge Cases', () => {
    it('should handle form submission with async errors', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));

      mockHandleSubmit.mockImplementation((callback) => async (e?: React.BaseSyntheticEvent) => {
        e?.preventDefault();
        try {
          await callback(validFormData);
        } catch {
          // Catch the error to prevent unhandled rejection
        }
      });

      render(<SkiSpecForm {...defaultProps} onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('should update API errors when they change', async () => {
      const initialErrors = { name: 'Error 1' };
      const { rerender } = render(<SkiSpecForm {...defaultProps} apiErrors={initialErrors} />);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith('name', {
          type: 'manual',
          message: 'Error 1',
        });
      });

      vi.clearAllMocks();

      // Update errors
      const updatedErrors = { name: 'Error 2' };
      rerender(<SkiSpecForm {...defaultProps} apiErrors={updatedErrors} />);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith('name', {
          type: 'manual',
          message: 'Error 2',
        });
      });
    });

    it('should watch description field for character counting', () => {
      const description = 'Test description';
      mockWatch.mockImplementation((field) => {
        if (field === 'description') return description;
        return '';
      });

      render(<SkiSpecForm {...defaultProps} />);

      expect(mockWatch).toHaveBeenCalledWith('description');
    });
  });

  /**
   * LAYOUT AND STYLING
   */
  describe('Layout', () => {
    it('should render form with proper spacing classes', () => {
      const { container } = render(<SkiSpecForm {...defaultProps} />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('space-y-6');
    });

    it('should render action buttons in flex container', () => {
      const { container } = render(<SkiSpecForm {...defaultProps} />);

      const actionsContainer = container.querySelector('.flex.justify-end.gap-3.pt-4');
      expect(actionsContainer).toBeInTheDocument();
    });
  });
});
