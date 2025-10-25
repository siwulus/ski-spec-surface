# React Testing Library - Quick Start

A 5-minute guide to get started with React Testing Library based on the SkiSpecFormDialog example.

## Installation (Already Done)

Your project already has everything configured:

- ✅ Vitest
- ✅ React Testing Library
- ✅ Testing utilities in `src/test/`

## Basic Test Structure

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('MyComponent', () => {
  it('should render with correct text', () => {
    render(<MyComponent title="Hello" />);

    expect(screen.getByText(/hello/i)).toBeInTheDocument();
  });
});
```

## The 3 Essential Patterns

### 1. Querying Elements

```typescript
// By role (BEST - use this most often)
screen.getByRole('button', { name: /submit/i });
screen.getByRole('heading', { name: /title/i });
screen.getByRole('textbox', { name: /email/i });

// By label (for form inputs)
screen.getByLabelText(/password/i);

// By text (for static content)
screen.getByText(/welcome back/i);
```

### 2. User Interactions

```typescript
const user = userEvent.setup();

// Click
await user.click(screen.getByRole('button', { name: /submit/i }));

// Type
await user.type(screen.getByLabelText(/email/i), 'test@example.com');

// Clear
await user.clear(screen.getByLabelText(/search/i));
```

### 3. Async Testing

```typescript
// Wait for element to appear
const successMsg = await screen.findByText(/success/i);

// Wait for condition
await waitFor(() => {
  expect(screen.getByText(/updated/i)).toBeInTheDocument();
});
```

## Common Queries Reference

| What you're testing          | Use this query                                       |
| ---------------------------- | ---------------------------------------------------- |
| Button                       | `getByRole('button', { name: /click me/i })`         |
| Link                         | `getByRole('link', { name: /home/i })`               |
| Heading                      | `getByRole('heading', { name: /title/i })`           |
| Text input                   | `getByLabelText(/email/i)` or `getByRole('textbox')` |
| Checkbox                     | `getByRole('checkbox', { name: /agree/i })`          |
| Dialog/Modal                 | `getByRole('dialog', { name: /confirm/i })`          |
| Any text                     | `getByText(/hello world/i)`                          |
| Element that might not exist | `queryByRole('dialog')`                              |
| Element that loads async     | `await findByRole('button')`                         |

## The 3 Query Types

```typescript
// getBy* - Throws error if not found (use for assertions)
const button = screen.getByRole('button');

// queryBy* - Returns null if not found (use for NOT assertions)
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

// findBy* - Waits for element (use for async)
const message = await screen.findByText(/loaded/i);
```

## Writing Your First Test

### Step 1: Create test file next to component

```
src/components/MyButton.tsx
src/components/MyButton.spec.tsx  ← Create this
```

### Step 2: Basic test

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MyButton } from './MyButton';

describe('MyButton', () => {
  it('should render button with text', () => {
    render(<MyButton>Click Me</MyButton>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
});
```

### Step 3: Test interaction

```typescript
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

it('should call onClick when clicked', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();

  render(<MyButton onClick={handleClick}>Click Me</MyButton>);

  await user.click(screen.getByRole('button', { name: /click me/i }));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## Common Assertions

```typescript
// Element is in document
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Text content
expect(element).toHaveTextContent(/hello/i);

// Form values
expect(input).toHaveValue('test@example.com');
expect(checkbox).toBeChecked();

// Attributes
expect(button).toBeDisabled();
expect(link).toHaveAttribute('href', '/home');

// Accessibility
expect(dialog).toHaveAttribute('aria-labelledby');
```

## Running Tests

```bash
# Run all tests in watch mode
pnpm test

# Run specific file
pnpm test:unit src/components/MyButton.spec.tsx

# Run all tests once
pnpm test:unit

# Run with coverage
pnpm test:coverage
```

## Real Example from Your Codebase

Check out the comprehensive example:

📁 **[SkiSpecFormDialog.spec.tsx](../src/components/ski-specs/SkiSpecFormDialog.spec.tsx)**

- 20 passing tests
- Heavily commented
- Shows all common patterns

## Learn More

1. **Quick reference**: This file
2. **Complete guide**: [REACT_TESTING_GUIDE.md](./REACT_TESTING_GUIDE.md)
3. **Example summary**: [REACT_TESTING_SUMMARY.md](./REACT_TESTING_SUMMARY.md)
4. **Official docs**: https://testing-library.com/docs/react-testing-library/intro/

## Common Mistakes to Avoid

❌ **Don't** test implementation details

```typescript
expect(component.state.isOpen).toBe(true); // Bad
```

✅ **Do** test what users see

```typescript
expect(screen.getByRole('dialog')).toBeInTheDocument(); // Good
```

---

❌ **Don't** forget to await user interactions

```typescript
user.click(button); // Bad - missing await
```

✅ **Do** await all user interactions

```typescript
await user.click(button); // Good
```

---

❌ **Don't** use test IDs as your first choice

```typescript
screen.getByTestId('submit-button'); // Bad
```

✅ **Do** use accessible queries

```typescript
screen.getByRole('button', { name: /submit/i }); // Good
```

## Next Steps

1. Read through [SkiSpecFormDialog.spec.tsx](../src/components/ski-specs/SkiSpecFormDialog.spec.tsx)
2. Try writing a test for a simple component
3. Refer to [REACT_TESTING_GUIDE.md](./REACT_TESTING_GUIDE.md) for detailed patterns
4. Test a component with user interactions
5. Add tests to your pull requests

Happy testing! 🧪
