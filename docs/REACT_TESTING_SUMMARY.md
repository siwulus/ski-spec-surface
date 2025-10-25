# React Testing Library - SkiSpecFormDialog Example Summary

This document summarizes the comprehensive testing example created for `SkiSpecFormDialog.tsx`.

## What We Created

### 1. **Complete Test Suite** ([SkiSpecFormDialog.spec.tsx](../src/components/ski-specs/SkiSpecFormDialog.spec.tsx))

A fully-functional test suite with **20 passing tests** covering:

- ✅ Component rendering (create vs edit mode)
- ✅ Loading states and async data fetching
- ✅ Form submission (create and update)
- ✅ Error handling
- ✅ User interactions
- ✅ ARIA accessibility attributes
- ✅ Props handling and edge cases

### 2. **Comprehensive Guide** ([REACT_TESTING_GUIDE.md](./REACT_TESTING_GUIDE.md))

A 400+ line guide covering:

- Core philosophy of React Testing Library
- The testing pyramid
- Query selection priority (getBy, queryBy, findBy)
- Common patterns with examples
- Mocking strategies
- Async testing patterns
- User interactions with userEvent
- Accessibility testing
- Common pitfalls to avoid
- Quick reference cheat sheet

## Key Testing Patterns Demonstrated

### Pattern 1: Mocking Dependencies

```typescript
// Mock external hooks
vi.mock('@/components/hooks/useSkiSpecMutation', () => ({
  useSkiSpecMutation: () => ({
    createSkiSpec: mockCreateSkiSpec,
    updateSkiSpec: mockUpdateSkiSpec,
    isSubmitting: false,
    apiErrors: {},
  }),
}));

// Mock child components for isolation
vi.mock('./SkiSpecForm', () => ({
  SkiSpecForm: ({ onSubmit, onCancel }) => (
    <div data-testid="ski-spec-form">
      <button onClick={() => onSubmit({ name: 'Test' })}>Submit Form</button>
      <button onClick={onCancel}>Cancel Form</button>
    </div>
  ),
}));
```

**Why?** Isolating the component under test makes tests faster, more focused, and less brittle.

### Pattern 2: Query by Accessibility

```typescript
// ✅ Good - Query by role and accessible name
const dialog = screen.getByRole('dialog', { name: /add new specification/i });
const submitButton = screen.getByRole('button', { name: /submit/i });

// ❌ Bad - Query by test ID
const dialog = screen.getByTestId('dialog');
```

**Why?** Testing with accessibility queries ensures your UI works for all users, including those using screen readers.

### Pattern 3: Async Testing

```typescript
// Wait for element to appear
const heading = await screen.findByText(/data loaded/i);

// Wait for specific condition
await waitFor(() => {
  expect(screen.getByText(/updated/i)).toBeInTheDocument();
});

// Wait for element to disappear
await waitFor(() => {
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
```

**Why?** Components often update asynchronously. Always await user interactions and state changes.

### Pattern 4: User Interactions

```typescript
const user = userEvent.setup();

// Click buttons
await user.click(submitButton);

// Type in inputs
await user.type(input, 'hello');

// Keyboard navigation
await user.keyboard('{Escape}');
```

**Why?** `userEvent` simulates real user behavior better than `fireEvent`.

### Pattern 5: Testing Props and Callbacks

```typescript
it('should call onSubmit when form is submitted', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<MyForm onSubmit={handleSubmit} />);

  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'test' })
  );
});
```

**Why?** Verify that your component correctly communicates with its parent.

## Test Organization

Tests are organized into logical groups using `describe` blocks:

1. **Rendering** - Basic visibility and content
2. **Loading State** - Async data fetching and loading indicators
3. **Data Fetching** - API calls and error handling
4. **Form Submission** - Create and update operations
5. **Callback Handling** - Parent-child communication
6. **Accessibility** - ARIA attributes and screen reader support
7. **Props Handling** - Component API and prop changes
8. **Edge Cases** - Boundary conditions and unusual scenarios

## Important Lessons Learned

### Lesson 1: Mock Granularity

**When to mock:**

- External APIs and services
- Custom hooks that make API calls
- Complex child components (for unit tests)

**When NOT to mock:**

- Simple utility functions
- Built-in browser APIs (unless necessary)
- The component under test itself

### Lesson 2: Unit vs Integration Tests

Our example demonstrates **unit testing** with mocked children. For testing complete workflows:

```
Unit Tests (this example)
├── Mock child components
├── Test component in isolation
├── Fast and focused
└── Co-located: SkiSpecFormDialog.spec.tsx

Integration Tests (recommended for complex workflows)
├── Use real child components
├── Test complete feature flows
├── Slower but more realistic
└── Location: tests/integration/

E2E Tests (for critical paths)
├── Real browser environment
├── Test complete user journeys
├── Slowest but most realistic
└── Location: tests/e2e/
```

### Lesson 3: Don't Test Implementation Details

```typescript
// ❌ Bad - Testing implementation
expect(component.state.isOpen).toBe(true);
expect(mockFunction).toHaveBeenCalled();

// ✅ Good - Testing behavior
expect(screen.getByRole('dialog')).toBeInTheDocument();
expect(screen.getByText(/success message/i)).toBeInTheDocument();
```

### Lesson 4: Query Selection Matters

Follow this priority:

1. **getByRole** - Best for interactive elements
2. **getByLabelText** - Best for form inputs
3. **getByText** - Good for static content
4. **getByTestId** - Last resort only

### Lesson 5: Always Await Async Operations

```typescript
// ❌ Bad - No await
user.click(button);
expect(screen.getByText(/success/i)).toBeInTheDocument(); // Fails!

// ✅ Good - Await interactions and assertions
await user.click(button);
await screen.findByText(/success/i);
```

## Running the Tests

```bash
# Run just this test file
pnpm test:unit src/components/ski-specs/SkiSpecFormDialog.spec.tsx

# Run all unit tests
pnpm test:unit

# Run tests in watch mode
pnpm test

# Run with coverage
pnpm test:coverage
```

## Test Results

```
Test Files  1 passed (1)
Tests       20 passed (20)
Duration    1.33s
```

### Coverage Breakdown

The test suite covers:

- ✅ All rendering modes (create, edit, loading)
- ✅ All user interactions (submit, cancel)
- ✅ All async operations (fetch, create, update)
- ✅ All error scenarios
- ✅ All accessibility attributes
- ✅ All edge cases

## Next Steps

### To Expand This Example:

1. **Add Integration Tests** - Test with real child components

   ```typescript
   // tests/integration/SkiSpecFormDialog.integration.spec.tsx
   // Don't mock SkiSpecForm or UnsavedChangesDialog
   ```

2. **Add E2E Tests** - Test in real browser

   ```typescript
   // tests/e2e/ski-spec-form.spec.ts
   test('user can create a ski specification', async ({ page }) => {
     await page.goto('/ski-specs');
     await page.click('text=Add Specification');
     // ... full user workflow
   });
   ```

3. **Test More Components** - Apply these patterns to other components
   - SkiSpecForm.tsx
   - UnsavedChangesDialog.tsx
   - PasswordStrengthIndicator.tsx (already has tests)

### To Learn More:

- Read [REACT_TESTING_GUIDE.md](./REACT_TESTING_GUIDE.md) for comprehensive patterns
- Explore [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- Read Kent C. Dodds' articles on testing
- Study the existing test: [SkiSpecFormDialog.spec.tsx](../src/components/ski-specs/SkiSpecFormDialog.spec.tsx)

## Common Questions

### Q: Why mock child components?

**A:** For unit tests, mocking children isolates the component under test, making tests faster and more focused. For integration tests, use real children.

### Q: Should I always use `await` with `userEvent`?

**A:** Yes! `userEvent` methods return promises. Always await them.

### Q: When should I use `getBy` vs `queryBy` vs `findBy`?

**A:**

- `getBy*` - Element must exist (throws if not found)
- `queryBy*` - Element may not exist (returns null)
- `findBy*` - Wait for element to appear (async)

### Q: How do I test accessibility?

**A:**

1. Query by role and accessible name
2. Test ARIA attributes
3. Test keyboard navigation
4. Use `toHaveAccessibleName()` and `toHaveAccessibleDescription()`

### Q: What about testing hooks?

**A:** Test hooks through the components that use them. For complex hooks, use `@testing-library/react-hooks`.

## Conclusion

This example demonstrates professional React Testing Library patterns:

✅ **User-centric** - Test what users see and do
✅ **Accessible** - Query by roles and labels
✅ **Isolated** - Mock dependencies appropriately
✅ **Async-aware** - Properly handle state updates
✅ **Well-organized** - Clear structure and documentation
✅ **Educational** - Heavily commented for learning

The test suite serves as both:

1. **Production-ready tests** for SkiSpecFormDialog
2. **Learning resource** for React Testing Library patterns

Use this as a template for testing other React components in your codebase!
