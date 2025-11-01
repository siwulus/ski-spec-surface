import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SkiSpecCard } from './SkiSpecCard';
import type { SkiSpecDTO } from '@/types/api.types';

describe('SkiSpecCard - Selection Mode', () => {
  const mockSpec: SkiSpecDTO = {
    id: 'test-id-1',
    name: 'Test Ski',
    description: 'Test Description',
    length: 180,
    tip: 130,
    waist: 100,
    tail: 120,
    radius: 18,
    weight: 1500,
    surface_area: 2160,
    relative_weight: 0.69,
    notes_count: 2,
    user_id: 'user-1',
    algorithm_version: '1.0.0',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should not render checkbox when selectionMode is false', () => {
    render(<SkiSpecCard spec={mockSpec} selectionMode={false} />);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('should render checkbox when selectionMode is true', () => {
    render(<SkiSpecCard spec={mockSpec} selectionMode={true} onToggleSelection={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox', { name: `Select ${mockSpec.name} for comparison` });
    expect(checkbox).toBeInTheDocument();
  });

  it('should render unchecked checkbox when not selected', () => {
    render(<SkiSpecCard spec={mockSpec} selectionMode={true} isSelected={false} onToggleSelection={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('should render checked checkbox when selected', () => {
    render(<SkiSpecCard spec={mockSpec} selectionMode={true} isSelected={true} onToggleSelection={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should call onToggleSelection when checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onToggleSelection = vi.fn();

    render(
      <SkiSpecCard spec={mockSpec} selectionMode={true} isSelected={false} onToggleSelection={onToggleSelection} />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onToggleSelection).toHaveBeenCalledWith(mockSpec.id);
  });

  it('should disable checkbox when isSelectionDisabled is true and not selected', () => {
    render(
      <SkiSpecCard
        spec={mockSpec}
        selectionMode={true}
        isSelected={false}
        isSelectionDisabled={true}
        onToggleSelection={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('should not disable checkbox when isSelectionDisabled is true but item is selected', () => {
    render(
      <SkiSpecCard
        spec={mockSpec}
        selectionMode={true}
        isSelected={true}
        isSelectionDisabled={true}
        onToggleSelection={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeDisabled();
  });

  it('should apply visual styling when selected', () => {
    const { container } = render(
      <SkiSpecCard spec={mockSpec} selectionMode={true} isSelected={true} onToggleSelection={vi.fn()} />
    );

    const card = container.querySelector('[data-testid="ski-spec-card-test-id-1"]');
    expect(card).toHaveClass('ring-2', 'ring-primary', 'bg-primary/5');
  });

  it('should not apply visual styling when not selected', () => {
    const { container } = render(
      <SkiSpecCard spec={mockSpec} selectionMode={true} isSelected={false} onToggleSelection={vi.fn()} />
    );

    const card = container.querySelector('[data-testid="ski-spec-card-test-id-1"]');
    expect(card).not.toHaveClass('ring-2', 'ring-primary', 'bg-primary/5');
  });

  it('should render all spec details even in selection mode', () => {
    render(<SkiSpecCard spec={mockSpec} selectionMode={true} onToggleSelection={vi.fn()} />);

    expect(screen.getByText(mockSpec.name)).toBeInTheDocument();
    expect(screen.getByText(`${mockSpec.notes_count} notes`)).toBeInTheDocument();
  });

  it('should have proper ARIA label for checkbox', () => {
    render(<SkiSpecCard spec={mockSpec} selectionMode={true} onToggleSelection={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAccessibleName(`Select ${mockSpec.name} for comparison`);
  });
});
