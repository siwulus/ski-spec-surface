import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SkiSpecSelectionToolbar } from './SkiSpecSelectionToolbar';

describe('SkiSpecSelectionToolbar', () => {
  const defaultProps = {
    selectedCount: 0,
    canCompare: false,
    onCompare: vi.fn(),
    onClear: vi.fn(),
    onExitMode: vi.fn(),
  };

  it('should render with zero selection message', () => {
    render(<SkiSpecSelectionToolbar {...defaultProps} />);

    expect(screen.getByText('Select 2-4 ski specs to compare')).toBeInTheDocument();
  });

  it('should render selection count when items are selected', () => {
    render(<SkiSpecSelectionToolbar {...defaultProps} selectedCount={2} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/of 4 selected/i)).toBeInTheDocument();
  });

  it('should show Clear button when items are selected', () => {
    render(<SkiSpecSelectionToolbar {...defaultProps} selectedCount={2} />);

    expect(screen.getByTestId('clear-selection-button')).toBeInTheDocument();
  });

  it('should not show Clear button when no items are selected', () => {
    render(<SkiSpecSelectionToolbar {...defaultProps} selectedCount={0} />);

    expect(screen.queryByTestId('clear-selection-button')).not.toBeInTheDocument();
  });

  it('should call onClear when Clear button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(<SkiSpecSelectionToolbar {...defaultProps} selectedCount={2} onClear={onClear} />);

    const clearButton = screen.getByTestId('clear-selection-button');
    await user.click(clearButton);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('should disable Compare button when canCompare is false', () => {
    render(<SkiSpecSelectionToolbar {...defaultProps} selectedCount={1} canCompare={false} />);

    const compareButton = screen.getByTestId('compare-selected-button');
    expect(compareButton).toBeDisabled();
  });

  it('should enable Compare button when canCompare is true', () => {
    render(<SkiSpecSelectionToolbar {...defaultProps} selectedCount={2} canCompare={true} />);

    const compareButton = screen.getByTestId('compare-selected-button');
    expect(compareButton).not.toBeDisabled();
  });

  it('should call onCompare when Compare button is clicked', async () => {
    const user = userEvent.setup();
    const onCompare = vi.fn();

    render(<SkiSpecSelectionToolbar {...defaultProps} selectedCount={2} canCompare={true} onCompare={onCompare} />);

    const compareButton = screen.getByTestId('compare-selected-button');
    await user.click(compareButton);

    expect(onCompare).toHaveBeenCalledTimes(1);
  });

  it('should call onExitMode when Exit Compare Mode button is clicked', async () => {
    const user = userEvent.setup();
    const onExitMode = vi.fn();

    render(<SkiSpecSelectionToolbar {...defaultProps} onExitMode={onExitMode} />);

    const exitButton = screen.getByTestId('exit-compare-mode-button');
    await user.click(exitButton);

    expect(onExitMode).toHaveBeenCalledTimes(1);
  });

  it('should have aria-live region for selection counter', () => {
    render(<SkiSpecSelectionToolbar {...defaultProps} selectedCount={3} />);

    const counter = screen.getByTestId('selection-counter');
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter).toHaveAttribute('aria-atomic', 'true');
  });

  it('should have proper ARIA label for toolbar region', () => {
    const { container } = render(<SkiSpecSelectionToolbar {...defaultProps} />);

    const toolbar = container.querySelector('[role="region"]');
    expect(toolbar).toHaveAttribute('aria-label', 'Comparison selection toolbar');
  });

  it('should show correct count for maximum selection (4)', () => {
    render(<SkiSpecSelectionToolbar {...defaultProps} selectedCount={4} />);

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/of 4 selected/i)).toBeInTheDocument();
  });
});
