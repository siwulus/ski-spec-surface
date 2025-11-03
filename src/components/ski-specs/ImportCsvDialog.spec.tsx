import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportCsvDialog } from './ImportCsvDialog';
import type { ImportResponse } from '@/types/api.types';

// Mock the useImportCsv hook
const mockUploadFile = vi.fn();
const mockReset = vi.fn();
let mockHookState = {
  uploadFile: mockUploadFile,
  isUploading: false,
  result: null as ImportResponse | null,
  error: null as Error | null,
  reset: mockReset,
};

vi.mock('@/components/hooks/useImportCsv', () => ({
  useImportCsv: () => mockHookState,
}));

describe('ImportCsvDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });

  const mockSuccessResult: ImportResponse = {
    summary: {
      total_rows: 2,
      successful: 2,
      failed: 0,
      skipped: 0,
    },
    imported: [
      { row: 1, name: 'Ski 1', id: 'uuid-1' },
      { row: 2, name: 'Ski 2', id: 'uuid-2' },
    ],
    errors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      uploadFile: mockUploadFile,
      isUploading: false,
      result: null,
      error: null,
      reset: mockReset,
    };
  });

  describe('Upload stage', () => {
    it('renders upload stage by default', () => {
      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Import specyfikacji')).toBeInTheDocument();
      expect(screen.getByText(/zaimportuj specyfikacje nart z pliku csv/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: /przeciągnij plik csv tutaj lub kliknij aby wybrać/i,
        })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /anuluj/i })).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<ImportCsvDialog open={false} onOpenChange={mockOnOpenChange} />);

      expect(screen.queryByText('Import specyfikacji')).not.toBeInTheDocument();
    });

    it('calls uploadFile when file is selected', async () => {
      mockUploadFile.mockResolvedValueOnce(undefined);

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Dialog renders in a portal, so use document.querySelector
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      await userEvent.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(mockUploadFile).toHaveBeenCalledWith(mockFile);
      });
    });

    it('calls onOpenChange(false) when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      const cancelButton = screen.getByRole('button', { name: /anuluj/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Uploading stage', () => {
    it('renders uploading stage when isUploading is true', () => {
      mockHookState.isUploading = true;

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Importowanie specyfikacji...')).toBeInTheDocument();
      expect(screen.getByText(/trwa walidacja i przetwarzanie danych/i)).toBeInTheDocument();
      // The status role is on the text "Importowanie..." not "Importowanie specyfikacji..."
      expect(screen.getByText('Importowanie...')).toBeInTheDocument();
      expect(screen.getByText('Importowanie...')).toHaveAttribute('role', 'status');
    });

    it('shows loading spinner during upload', () => {
      mockHookState.isUploading = true;

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Check for spinner (Loader2Icon with animate-spin) - Dialog renders in portal
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Results stage', () => {
    it('renders results stage when result is available', () => {
      mockHookState.result = mockSuccessResult;

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Wyniki importu')).toBeInTheDocument();
      expect(screen.getByText(/podsumowanie zaimportowanych specyfikacji i błędów walidacji/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zamknij/i })).toBeInTheDocument();
    });

    it('displays ImportResultsTabs with result data', () => {
      mockHookState.result = mockSuccessResult;

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Check that results are displayed
      expect(screen.getByText('Zaimportowano')).toBeInTheDocument();
      // Check specific imported items
      expect(screen.getByText('Ski 1')).toBeInTheDocument();
      expect(screen.getByText('Ski 2')).toBeInTheDocument();
      // Check that the summary section exists
      expect(screen.getByText('Łącznie wierszy')).toBeInTheDocument();
    });

    it('announces results with aria-live', () => {
      mockHookState.result = mockSuccessResult;

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      const liveRegion = screen.getByText(/zaimportowano 2 specyfikacji, 0 błędów/i);
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('calls onOpenChange(false) when Close is clicked', async () => {
      const user = userEvent.setup();
      mockHookState.result = mockSuccessResult;

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      const closeButton = screen.getByRole('button', { name: /zamknij/i });
      await user.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Error handling', () => {
    it('returns to upload stage when error occurs', () => {
      mockHookState.error = new Error('Upload failed');

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Should show upload stage to allow retry
      expect(
        screen.getByRole('button', {
          name: /przeciągnij plik csv tutaj lub kliknij aby wybrać/i,
        })
      ).toBeInTheDocument();
    });
  });

  describe('Dialog lifecycle', () => {
    it('resets state when dialog closes', async () => {
      const { rerender } = render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Close dialog
      rerender(<ImportCsvDialog open={false} onOpenChange={mockOnOpenChange} />);

      // Wait for reset timeout (300ms)
      await waitFor(
        () => {
          expect(mockReset).toHaveBeenCalled();
        },
        { timeout: 500 }
      );
    });

    it('does not reset immediately to avoid flickering', () => {
      const { rerender } = render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Close dialog
      rerender(<ImportCsvDialog open={false} onOpenChange={mockOnOpenChange} />);

      // Reset should not be called immediately
      expect(mockReset).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes on dialog', () => {
      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('has descriptive title and description for each stage', () => {
      const { rerender } = render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Upload stage
      expect(screen.getByText('Import specyfikacji')).toBeInTheDocument();

      // Uploading stage
      mockHookState.isUploading = true;
      rerender(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText('Importowanie specyfikacji...')).toBeInTheDocument();

      // Results stage
      mockHookState.isUploading = false;
      mockHookState.result = mockSuccessResult;
      rerender(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText('Wyniki importu')).toBeInTheDocument();
    });

    it('includes live region for upload status', () => {
      mockHookState.isUploading = true;

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      const statusText = screen.getByText('Importowanie...');
      expect(statusText).toHaveAttribute('role', 'status');
      expect(statusText).toHaveAttribute('aria-live', 'polite');
    });

    it('includes assertive live region for results', () => {
      mockHookState.result = mockSuccessResult;

      render(<ImportCsvDialog open={true} onOpenChange={mockOnOpenChange} />);

      const resultsAnnouncement = screen.getByText(/zaimportowano 2 specyfikacji, 0 błędów/i);
      expect(resultsAnnouncement).toHaveAttribute('aria-live', 'assertive');
    });
  });
});
