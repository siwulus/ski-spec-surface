# React Testing Library - Complete Guide

This guide explains how to write effective tests for React components using React Testing Library (RTL), based on the patterns demonstrated in `SkiSpecFormDialog.spec.tsx`.

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [The Testing Pyramid](#the-testing-pyramid)
3. [Query Selection Priority](#query-selection-priority)
4. [Common Patterns](#common-patterns)
5. [Mocking Strategies](#mocking-strategies)
6. [Async Testing](#async-testing)
7. [User Interactions](#user-interactions)
8. [Accessibility Testing](#accessibility-testing)
9. [Common Pitfalls](#common-pitfalls)
10. [Cheat Sheet](#cheat-sheet)

---

## Core Philosophy

React Testing Library encourages testing components **the way users interact with them**, not implementation details.

### ✅ DO

- Query elements by their accessible role, label, or text
- Interact with elements using user events (click, type, etc.)
- Test what the user sees and experiences
- Verify behavior and outcomes, not internal state

### ❌ DON'T

- Test component state directly
- Test props or prop changes
- Query by class names or element types
- Test implementation details like function calls (unless they're side effects)

### Example

```tsx
// ❌ Bad - Testing implementation
expect(component.state.isOpen).toBe(true);
expect(mockFunction).toHaveBeenCalled();

// ✅ Good - Testing behavior
expect(screen.getByRole('dialog')).toBeInTheDocument();
expect(screen.getByText(/success message/i)).toBeInTheDocument();
```

---

## The Testing Pyramid

For frontend components, aim for this distribution:

```
      /\
     /  \  E2E Tests (10%)
    /    \ Integration Tests (30%)
   /      \ Unit Tests (60%)
  /________\
```

### Unit Tests (SkiSpecFormDialog.spec.tsx)

- Test individual component behavior in isolation
- Mock all external dependencies (hooks, APIs, child components)
- Fast to run, easy to debug
- Use for: rendering, props handling, user interactions, edge cases

### Integration Tests

- Test how multiple components work together
- Mock only external APIs/services
- Use for: feature workflows, form submissions with validation

### E2E Tests (Playwright)

- Test complete user journeys in a real browser
- No mocks (except external services)
- Use for: critical user paths, cross-page workflows

---

## Query Selection Priority

Always follow this priority order when querying elements:

### 1. Accessible Queries (Preferred)

```tsx
// By role (best for interactive elements)
screen.getByRole('button', { name: /submit/i });
screen.getByRole('dialog', { name: /edit specification/i });
screen.getByRole('textbox', { name: /ski name/i });

// By label text (best for form inputs)
screen.getByLabelText(/email address/i);

// By placeholder (if no label exists)
screen.getByPlaceholderText(/enter your name/i);

// By text content (for static text)
screen.getByText(/welcome back/i);
```

### 2. Semantic Queries

```tsx
// By alt text (for images)
screen.getByAltText(/profile picture/i);

// By title (for icons with tooltips)
screen.getByTitle(/close dialog/i);
```

### 3. Test IDs (Last Resort)

```tsx
// Only when no accessible query works
screen.getByTestId('complex-widget');
```

### Query Variants

```tsx
// getBy* - Element must exist (throws if not found)
screen.getByRole('button'); // Throws error if missing

// queryBy* - Element may not exist (returns null)
screen.queryByRole('button'); // Returns null if missing
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

// findBy* - Async queries (returns Promise)
await screen.findByRole('button'); // Waits up to 1000ms
```

---

## Common Patterns

### Pattern 1: Basic Rendering Test

```tsx
it('should render component with correct content', () => {
  render(<MyComponent title="Hello" />);

  expect(screen.getByText(/hello/i)).toBeInTheDocument();
});
```

### Pattern 2: Testing Visibility/Conditional Rendering

```tsx
it('should show loading state initially', () => {
  render(<MyComponent isLoading={true} />);

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
```

### Pattern 3: Testing Props Changes (Rerender)

```tsx
it('should update when props change', () => {
  const { rerender } = render(<Counter count={0} />);
  expect(screen.getByText('0')).toBeInTheDocument();

  rerender(<Counter count={5} />);
  expect(screen.getByText('5')).toBeInTheDocument();
});
```

### Pattern 4: Testing Callbacks/Events

```tsx
it('should call onSubmit when form is submitted', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<MyForm onSubmit={handleSubmit} />);

  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'test',
    })
  );
});
```

### Pattern 5: Testing Within Specific Containers

```tsx
it('should render multiple dialogs correctly', () => {
  render(<MyComponent />);

  const deleteDialog = screen.getByRole('dialog', { name: /delete/i });
  const submitButton = within(deleteDialog).getByRole('button', { name: /confirm/i });

  expect(submitButton).toBeInTheDocument();
});
```

---

## Mocking Strategies

### Strategy 1: Mock External Hooks

```tsx
// At the top of your test file
vi.mock('@/hooks/useAuth');

// In beforeEach or individual tests
const { useAuth } = require('@/hooks/useAuth');
useAuth.mockReturnValue({
  user: { id: '123', name: 'John' },
  isLoading: false,
});
```

### Strategy 2: Mock Child Components

```tsx
vi.mock('./ComplexChild', () => ({
  ComplexChild: ({ onAction }: { onAction: () => void }) => <button onClick={onAction}>Trigger Action</button>,
}));
```

**Why mock child components?**

- Isolates the component under test
- Makes tests faster (no heavy child rendering)
- Simplifies assertions
- Reduces test brittleness

### Strategy 3: Mock API Calls

```tsx
// Mock the entire module
vi.mock('@/api/skiSpecs');

// Setup mock responses
const { fetchSkiSpecs } = require('@/api/skiSpecs');
fetchSkiSpecs.mockResolvedValue({
  data: [mockSpec1, mockSpec2],
});
```

### Strategy 4: Mock Browser APIs

```tsx
// In setup.ts or beforeEach
window.matchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));
```

---

## Async Testing

### Pattern 1: Wait for Element to Appear

```tsx
it('should load and display data', async () => {
  render(<DataComponent />);

  // Wait for element to appear (up to 1000ms by default)
  const heading = await screen.findByRole('heading', { name: /data loaded/i });
  expect(heading).toBeInTheDocument();
});
```

### Pattern 2: Wait for Specific Condition

```tsx
it('should update after API call', async () => {
  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });
});
```

### Pattern 3: Wait for Element to Disappear

```tsx
it('should hide loading spinner after load', async () => {
  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
```

### Pattern 4: Custom Timeout

```tsx
await waitFor(
  () => {
    expect(screen.getByText(/slow operation done/i)).toBeInTheDocument();
  },
  { timeout: 5000 } // Wait up to 5 seconds
);
```

### Pattern 5: Testing Multiple Async Updates

```tsx
it('should handle sequential async operations', async () => {
  render(<MultiStepComponent />);

  // Step 1
  await screen.findByText(/step 1 complete/i);

  // Step 2
  await screen.findByText(/step 2 complete/i);

  // Final state
  expect(screen.getByText(/all done/i)).toBeInTheDocument();
});
```

---

## User Interactions

### Always Use `userEvent` Over `fireEvent`

```tsx
import userEvent from '@testing-library/user-event';

// ✅ Good - Realistic user interactions
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'hello');

// ❌ Bad - Low-level events
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'hello' } });
```

### Common User Interactions

#### Clicking Elements

```tsx
it('should handle button clicks', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();

  render(<button onClick={handleClick}>Click Me</button>);

  await user.click(screen.getByRole('button', { name: /click me/i }));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### Typing in Inputs

```tsx
it('should handle text input', async () => {
  const user = userEvent.setup();

  render(<input aria-label="Name" />);

  const input = screen.getByLabelText(/name/i);
  await user.type(input, 'John Doe');

  expect(input).toHaveValue('John Doe');
});
```

#### Clearing Inputs

```tsx
await user.clear(input);
expect(input).toHaveValue('');
```

#### Selecting Options

```tsx
it('should select dropdown option', async () => {
  const user = userEvent.setup();

  render(
    <select aria-label="Country">
      <option value="us">United States</option>
      <option value="ca">Canada</option>
    </select>
  );

  await user.selectOptions(screen.getByLabelText(/country/i), 'ca');

  expect(screen.getByRole('option', { name: /canada/i })).toBeInTheDocument();
});
```

#### Checkbox/Radio Interactions

```tsx
it('should toggle checkbox', async () => {
  const user = userEvent.setup();

  render(<input type="checkbox" aria-label="Agree to terms" />);

  const checkbox = screen.getByLabelText(/agree to terms/i);

  await user.click(checkbox);
  expect(checkbox).toBeChecked();

  await user.click(checkbox);
  expect(checkbox).not.toBeChecked();
});
```

#### Keyboard Navigation

```tsx
it('should handle keyboard navigation', async () => {
  const user = userEvent.setup();

  render(<MyComponent />);

  await user.tab(); // Focus first element
  await user.keyboard('{Enter}'); // Press Enter
  await user.keyboard('{Escape}'); // Press Escape
});
```

#### Upload Files

```tsx
it('should handle file upload', async () => {
  const user = userEvent.setup();
  const file = new File(['content'], 'test.txt', { type: 'text/plain' });

  render(<input type="file" aria-label="Upload file" />);

  const input = screen.getByLabelText(/upload file/i);
  await user.upload(input, file);

  expect(input.files[0]).toBe(file);
});
```

---

## Accessibility Testing

### Test ARIA Attributes

```tsx
it('should have proper ARIA attributes', () => {
  render(<MyDialog open={true} />);

  const dialog = screen.getByRole('dialog');

  expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
  expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
  expect(dialog).toHaveAttribute('aria-modal', 'true');
});
```

### Test Keyboard Navigation

```tsx
it('should support keyboard navigation', async () => {
  const user = userEvent.setup();
  const handleClose = vi.fn();

  render(<Dialog open={true} onClose={handleClose} />);

  await user.keyboard('{Escape}');

  expect(handleClose).toHaveBeenCalled();
});
```

### Test Focus Management

```tsx
it('should trap focus within dialog', async () => {
  const user = userEvent.setup();

  render(<Dialog open={true} />);

  const firstButton = screen.getByRole('button', { name: /first/i });
  const lastButton = screen.getByRole('button', { name: /last/i });

  firstButton.focus();
  expect(firstButton).toHaveFocus();

  await user.tab();
  expect(lastButton).toHaveFocus();

  // Tab again should cycle back
  await user.tab();
  expect(firstButton).toHaveFocus();
});
```

### Test Screen Reader Announcements

```tsx
it('should announce status updates to screen readers', async () => {
  render(<FormWithValidation />);

  const liveRegion = screen.getByRole('status');
  expect(liveRegion).toHaveAttribute('aria-live', 'polite');

  // Trigger validation error
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(within(liveRegion).getByText(/error/i)).toBeInTheDocument();
  });
});
```

---

## Common Pitfalls

### Pitfall 1: Using `act()` Manually

**Problem**: Wrapping everything in `act()`

```tsx
// ❌ Don't do this
await act(async () => {
  await user.click(button);
});
```

**Solution**: RTL utilities already handle `act()` automatically

```tsx
// ✅ Do this
await user.click(button);
```

### Pitfall 2: Not Waiting for Async Updates

**Problem**: Asserting immediately after async action

```tsx
// ❌ Don't do this
user.click(button);
expect(screen.getByText(/success/i)).toBeInTheDocument(); // Fails!
```

**Solution**: Always await user interactions and async assertions

```tsx
// ✅ Do this
await user.click(button);
await screen.findByText(/success/i);
```

### Pitfall 3: Testing Implementation Details

**Problem**: Testing internal state or methods

```tsx
// ❌ Don't do this
expect(wrapper.state('isOpen')).toBe(true);
expect(component.handleClick).toHaveBeenCalled();
```

**Solution**: Test observable behavior

```tsx
// ✅ Do this
expect(screen.getByRole('dialog')).toBeInTheDocument();
```

### Pitfall 4: Using Wrong Query Type

**Problem**: Using `getBy` for elements that might not exist

```tsx
// ❌ Don't do this - throws error
expect(screen.getByRole('dialog')).not.toBeInTheDocument(); // Error!
```

**Solution**: Use `queryBy` for negative assertions

```tsx
// ✅ Do this
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
```

### Pitfall 5: Not Cleaning Up Mocks

**Problem**: Mock state leaks between tests

```tsx
// ❌ Don't do this - mocks persist between tests
vi.mock('@/hooks/useAuth');

it('test 1', () => {
  useAuth.mockReturnValue({ user: mockUser1 });
  // ...
});

it('test 2', () => {
  // Still has mockUser1 from previous test!
});
```

**Solution**: Clear mocks in `beforeEach`

```tsx
// ✅ Do this
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Pitfall 6: Over-Mocking

**Problem**: Mocking everything, even simple utilities

```tsx
// ❌ Don't mock simple utilities
vi.mock('@/utils/formatDate');
```

**Solution**: Only mock external dependencies, APIs, and complex children

```tsx
// ✅ Mock only external dependencies
vi.mock('@/api/fetchData');
vi.mock('./ComplexChildComponent');
```

---

## Cheat Sheet

### Query Selection

| Goal                       | Query                                      |
| -------------------------- | ------------------------------------------ |
| Interactive element        | `getByRole('button', { name: /submit/i })` |
| Form input with label      | `getByLabelText(/email/i)`                 |
| Text content               | `getByText(/welcome/i)`                    |
| Image                      | `getByAltText(/logo/i)`                    |
| Element might not exist    | `queryByRole('dialog')`                    |
| Wait for element to appear | `await findByRole('heading')`              |
| Element in specific area   | `within(container).getByRole('button')`    |

### Common Assertions

```tsx
// Element presence
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Visibility
expect(element).toBeVisible();
expect(element).not.toBeVisible();

// Text content
expect(element).toHaveTextContent(/hello/i);

// Form elements
expect(input).toHaveValue('test');
expect(checkbox).toBeChecked();
expect(select).toHaveDisplayValue('Option 1');
expect(input).toBeDisabled();
expect(button).toBeEnabled();

// Attributes
expect(element).toHaveAttribute('aria-label', 'Close');
expect(element).toHaveClass('active');

// Focus
expect(element).toHaveFocus();

// Function calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
```

### User Interactions

```tsx
const user = userEvent.setup();

// Clicking
await user.click(element);
await user.dblClick(element);

// Typing
await user.type(input, 'hello');
await user.clear(input);

// Selection
await user.selectOptions(select, 'option1');

// Keyboard
await user.tab();
await user.keyboard('{Enter}');
await user.keyboard('{Escape}');

// File upload
await user.upload(fileInput, file);

// Pointer interactions
await user.hover(element);
await user.unhover(element);
```

### Async Testing

```tsx
// Wait for element to appear
await screen.findByRole('button');

// Wait for condition
await waitFor(() => {
  expect(screen.getByText(/done/i)).toBeInTheDocument();
});

// Wait for element to disappear
await waitFor(() => {
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

// Custom timeout
await waitFor(() => {...}, { timeout: 5000 });
```

---

## Example Test Structure

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// 1. Mock dependencies
vi.mock('@/hooks/useMyHook');

describe('MyComponent', () => {
  // 2. Setup and teardown
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 3. Organize tests by feature
  describe('Rendering', () => {
    it('should render with correct props', () => {
      render(<MyComponent title="Hello" />);

      expect(screen.getByText(/hello/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle button click', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<MyComponent onClick={handleClick} />);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Async Behavior', () => {
    it('should load data', async () => {
      render(<MyComponent />);

      await screen.findByText(/data loaded/i);

      expect(screen.getByText(/data loaded/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing data gracefully', () => {
      render(<MyComponent data={null} />);

      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });
  });
});
```

---

## Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Query Priority](https://testing-library.com/docs/queries/about#priority)
- [userEvent API](https://testing-library.com/docs/user-event/intro)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
