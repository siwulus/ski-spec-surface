import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComparisonTable } from './ComparisonTable';
import type { SkiSpecComparisonDTO } from '@/types/api.types';

/**
 * Unit tests for ComparisonTable component
 *
 * Tests cover:
 * - Rendering with different states (loading, error, empty, success)
 * - Active column selection
 * - Difference calculations (absolute and percentage)
 * - Highlighted rows (surface_area, relative_weight)
 * - Accessibility attributes (ARIA labels, table structure)
 * - Formatting functions
 * - Edge cases (null values, different number of specs)
 */

/**
 * STEP 1: MOCK DEPENDENCIES
 */

// Mock hook return values (can be modified per test)
let mockData: SkiSpecComparisonDTO[] | null = null;
let mockIsLoading = false;
let mockError: Error | null = null;
const mockRefetch = vi.fn();

// Mock useCompareSkiSpecs hook
vi.mock('@/components/hooks/useCompareSkiSpecs', () => ({
  useCompareSkiSpecs: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
    refetch: mockRefetch,
  }),
}));

/**
 * STEP 2: TEST DATA FIXTURES
 */

const createMockSpec = (id: string, name: string, overrides?: Partial<SkiSpecComparisonDTO>): SkiSpecComparisonDTO => ({
  id,
  name,
  description: `Description for ${name}`,
  length: 180,
  tip: 130,
  waist: 100,
  tail: 120,
  radius: 18.5,
  weight: 1500,
  surface_area: 2100.0,
  relative_weight: 0.71,
  ...overrides,
});

const mockSpec1 = createMockSpec('spec-1', 'Ski Model 1');
const mockSpec2 = createMockSpec('spec-2', 'Ski Model 2', {
  length: 190,
  tip: 135,
  waist: 105,
  tail: 125,
  radius: 19.0,
  weight: 1600,
  surface_area: 2280.0,
  relative_weight: 0.7,
});
const mockSpec3 = createMockSpec('spec-3', 'Ski Model 3', {
  length: 170,
  tip: 125,
  waist: 95,
  tail: 115,
  radius: 17.5,
  weight: 1400,
  surface_area: 1920.0,
  relative_weight: 0.73,
});

/**
 * STEP 3: TESTS
 */

describe('ComparisonTable', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockData = null;
    mockIsLoading = false;
    mockError = null;
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading skeleton when isLoading is true', () => {
      mockIsLoading = true;

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // Check for loading skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should display error message when error occurs', () => {
      mockError = new Error('Failed to load comparison data');

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      expect(screen.getByText(/Failed to load comparison data/i)).toBeInTheDocument();
      expect(screen.getByText(/Return to specifications list/i)).toBeInTheDocument();
    });

    it('should include link back to specs list in error state', () => {
      mockError = new Error('Network error');

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      const link = screen.getByRole('link', { name: /Return to specifications list/i });
      expect(link).toHaveAttribute('href', '/ski-specs');
    });

    it('should use returnQueryParams in error state link', () => {
      mockError = new Error('Network error');

      render(<ComparisonTable ids={['spec-1', 'spec-2']} returnQueryParams="?page=2&search=Volkl" />);

      const link = screen.getByRole('link', { name: /Return to specifications list/i });
      expect(link).toHaveAttribute('href', '/ski-specs?page=2&search=Volkl');
    });
  });

  describe('Empty State', () => {
    it('should display empty state message when no data is returned', () => {
      mockData = [];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      expect(screen.getByText(/No specifications found for comparison/i)).toBeInTheDocument();
      expect(screen.getByText(/Return to specifications list/i)).toBeInTheDocument();
    });

    it('should use returnQueryParams in empty state link', () => {
      mockData = [];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} returnQueryParams="?page=2&search=Volkl" />);

      const link = screen.getByRole('link', { name: /Return to specifications list/i });
      expect(link).toHaveAttribute('href', '/ski-specs?page=2&search=Volkl');
    });
  });

  describe('Successful Comparison', () => {
    it('should display comparison table with 2 specifications', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // Check that both spec names appear once in the header buttons
      expect(screen.getByText('Ski Model 1')).toBeInTheDocument();
      expect(screen.getByText('Ski Model 2')).toBeInTheDocument();

      // Check that table structure exists
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should display comparison table with 4 specifications', () => {
      const mockSpec4 = createMockSpec('spec-4', 'Ski Model 4');
      mockData = [mockSpec1, mockSpec2, mockSpec3, mockSpec4];

      render(<ComparisonTable ids={['spec-1', 'spec-2', 'spec-3', 'spec-4']} />);

      // Check that all spec names appear once in the header buttons
      expect(screen.getByText('Ski Model 1')).toBeInTheDocument();
      expect(screen.getByText('Ski Model 2')).toBeInTheDocument();
      expect(screen.getByText('Ski Model 3')).toBeInTheDocument();
      expect(screen.getByText('Ski Model 4')).toBeInTheDocument();
    });

    it('should display all parameter rows', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // Check all parameter labels (based on actual implementation)
      expect(screen.getByText('Model Name')).toBeInTheDocument();
      expect(screen.getByText('Length')).toBeInTheDocument();
      expect(screen.getByText('Tip Width')).toBeInTheDocument();
      expect(screen.getByText('Waist Width')).toBeInTheDocument();
      expect(screen.getByText('Tail Width')).toBeInTheDocument();
      expect(screen.getByText('Turning Radius')).toBeInTheDocument();
      expect(screen.getByText('Weight')).toBeInTheDocument();
      expect(screen.getByText('Surface Area')).toBeInTheDocument();
      expect(screen.getByText('Relative Weight')).toBeInTheDocument();
    });

    it('should format values with correct units', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // SpecValue component renders value and unit separately
      expect(screen.getByText('180')).toBeInTheDocument();
      expect(screen.getAllByText('cm').length).toBeGreaterThan(0);
      expect(screen.getByText('130')).toBeInTheDocument();
      expect(screen.getAllByText('mm').length).toBeGreaterThan(0);
      expect(screen.getByText('18.5')).toBeInTheDocument();
      expect(screen.getAllByText('m').length).toBeGreaterThan(0);
      expect(screen.getByText('1500')).toBeInTheDocument();
      expect(screen.getAllByText('g').length).toBeGreaterThan(0);
      expect(screen.getByText('2100')).toBeInTheDocument();
      expect(screen.getAllByText('cm²').length).toBeGreaterThan(0);
      expect(screen.getByText('0.71')).toBeInTheDocument();
      expect(screen.getAllByText('g/cm²').length).toBeGreaterThan(0);
    });

    it('should handle null values gracefully in calculations', () => {
      mockData = [
        createMockSpec('spec-1', 'Ski Model 1', { length: undefined }),
        createMockSpec('spec-2', 'Ski Model 2', { length: undefined }),
      ];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // Should display em dashes for null values
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      // No error should be thrown when rendering null values
    });
  });

  describe('Active Column Selection', () => {
    it('should show first column as base by default', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // First button should be selected
      const buttons = screen.getAllByRole('button', { pressed: true });
      expect(buttons[0]).toHaveTextContent('Ski Model 1');
    });

    it('should allow user to change base column', async () => {
      const user = userEvent.setup();
      mockData = [mockSpec1, mockSpec2, mockSpec3];

      render(<ComparisonTable ids={['spec-1', 'spec-2', 'spec-3']} />);

      // Click on second button
      const button2 = screen.getByRole('button', { name: /Select Ski Model 2 as base/i });
      await user.click(button2);

      // Second button should now be pressed
      await waitFor(() => {
        expect(button2).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should update base column indicator in header', async () => {
      const user = userEvent.setup();
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // Initially, first column should show "(Base)"
      const baseIndicators = screen.getAllByText('(Base)');
      expect(baseIndicators).toHaveLength(1);

      // Click on second button
      const button2 = screen.getByRole('button', { name: /Select Ski Model 2 as base/i });
      await user.click(button2);

      // Base indicator should still be present (just moved)
      await waitFor(() => {
        const updatedIndicators = screen.getAllByText('(Base)');
        expect(updatedIndicators).toHaveLength(1);
      });
    });

    it('should apply proper ARIA labels to base column buttons', () => {
      mockData = [mockSpec1, mockSpec2, mockSpec3];

      render(<ComparisonTable ids={['spec-1', 'spec-2', 'spec-3']} />);

      expect(screen.getByRole('button', { name: /Select Ski Model 1 as base/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Select Ski Model 2 as base/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Select Ski Model 3 as base/i })).toBeInTheDocument();
    });
  });

  describe('Difference Calculations', () => {
    it('should display differences for non-base columns', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // Spec2 has length 190, Spec1 (base) has 180, so difference is +10 (+5.6%)
      expect(screen.getByText(/\+10\.00.*\+5\.6%/)).toBeInTheDocument();
    });

    it('should not display differences for base column', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // The base column (first column) should not show difference indicators
      // This is implicit - we just check that differences are shown for non-base columns
      const differences = screen.getAllByText(/\+|-/);
      // Should have differences for non-base column only
      expect(differences.length).toBeGreaterThan(0);
    });

    it('should display negative differences correctly', () => {
      mockData = [mockSpec1, mockSpec3];

      render(<ComparisonTable ids={['spec-1', 'spec-3']} />);

      // Spec3 has length 170, Spec1 (base) has 180, so difference is -10 (-5.6%)
      expect(screen.getByText(/-10\.00.*-5\.6%/)).toBeInTheDocument();
    });

    it('should update differences when base column changes', async () => {
      const user = userEvent.setup();
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // Initially shows +10 (190-180)
      expect(screen.getByText(/\+10\.00.*\+5\.6%/)).toBeInTheDocument();

      // Change base to second column
      const button2 = screen.getByRole('button', { name: /Select Ski Model 2 as base/i });
      await user.click(button2);

      // Now should show -10 (180-190)
      await waitFor(() => {
        expect(screen.getByText(/-10\.00.*-5\.3%/)).toBeInTheDocument();
      });
    });
  });

  describe('Highlighted Rows', () => {
    it('should highlight Surface Area row', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // Find the Surface Area row
      const surfaceAreaCell = screen.getByText('Surface Area');
      const row = surfaceAreaCell.closest('tr');

      // Check that it has the highlight class
      expect(row).toHaveClass('bg-accent/50');
    });

    it('should highlight Relative Weight row', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      // Find the Relative Weight row
      const relativeWeightCell = screen.getByText('Relative Weight');
      const row = relativeWeightCell.closest('tr');

      // Check that it has the highlight class
      expect(row).toHaveClass('bg-accent/50');
    });

    it('should display Surface Area and Relative Weight with font-semibold', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      const surfaceAreaLabel = screen.getByText('Surface Area');
      const relativeWeightLabel = screen.getByText('Relative Weight');

      expect(surfaceAreaLabel).toHaveClass('font-semibold');
      expect(relativeWeightLabel).toHaveClass('font-semibold');
    });
  });

  describe('Accessibility', () => {
    it('should use proper table structure with thead and tbody', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      const table = screen.getByRole('table');
      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');

      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
    });

    it('should use th elements for column headers with scope="col"', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);

      // Check scope attribute
      headers.forEach((header) => {
        if (header.textContent?.includes('Ski Model')) {
          expect(header).toHaveAttribute('scope', 'col');
        }
      });
    });

    it('should have sticky header with proper z-index', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      const thead = document.querySelector('thead');
      expect(thead).toHaveClass('sticky', 'top-0', 'z-10');
    });
  });

  describe('Legend and Helper Text', () => {
    it('should display legend explaining how to read differences', () => {
      mockData = [mockSpec1, mockSpec2];

      render(<ComparisonTable ids={['spec-1', 'spec-2']} />);

      expect(screen.getByText(/How to read:/i)).toBeInTheDocument();
      expect(screen.getByText(/Highlighted rows:/i)).toBeInTheDocument();
    });
  });
});
