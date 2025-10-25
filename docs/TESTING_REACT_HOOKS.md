# Testing React Hooks - Complete Guide

A comprehensive guide to testing custom React hooks in isolation, focusing on hooks with complex logic, async operations, and useEffect side effects.

## Table of Contents

1. [The Two Approaches](#the-two-approaches)
2. [When to Use Each Approach](#when-to-use-each-approach)
3. [Testing Hooks in Isolation with renderHook](#testing-hooks-in-isolation-with-renderhook)
4. [Testing Async Effects](#testing-async-effects)
5. [Common Patterns](#common-patterns)
6. [Testing Complex Hooks](#testing-complex-hooks)
7. [Troubleshooting](#troubleshooting)

---

## The Two Approaches

### Approach 1: Test Through Components (Indirect)

```typescript
// ✅ Good for: Simple hooks, hooks tied to specific components
it('should fetch data when component mounts', async () => {
  render(<ComponentThatUsesHook />);

  await screen.findByText(/data loaded/i);
  expect(screen.getByText(/item 1/i)).toBeInTheDocument();
});
```

**Pros:**

- Tests the hook in realistic usage
- Simpler setup
- Tests integration with components

**Cons:**

- Less isolated
- Harder to test edge cases
- Mixes component and hook logic

### Approach 2: Test Hook in Isolation (Direct)

```typescript
// ✅ Good for: Complex hooks, reusable hooks, hooks with lots of logic
import { renderHook, waitFor } from '@testing-library/react';

it('should fetch data when hook mounts', async () => {
  const { result } = renderHook(() => useSkiSpecs());

  expect(result.current.isLoading).toBe(true);

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.specs).toHaveLength(2);
});
```

**Pros:**

- Complete isolation
- Easy to test edge cases
- Fast and focused
- Test all return values and state combinations

**Cons:**

- Not testing real usage
- May need wrapper providers

---

## When to Use Each Approach

### Test Through Components When:

- ❌ Hook is only used in one component
- ❌ Hook has minimal logic (just wrapping other hooks)
- ❌ Testing integration is more important than isolation

### Test in Isolation When:

- ✅ **Hook has complex logic** (like `useSkiSpecs`)
- ✅ **Hook is reusable** across multiple components
- ✅ **Hook has multiple states** to test
- ✅ **Hook has async operations** that need precise control
- ✅ **Hook has useEffect side effects** you need to verify

---

## Testing Hooks in Isolation with renderHook

### Basic Setup

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('useMyHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.data).toBe(null);
    expect(result.current.isLoading).toBe(true);
  });
});
```

### Key Concepts

#### 1. `result.current` - Accessing Hook Return Values

```typescript
const { result } = renderHook(() => useSkiSpecs());

// Access current values
result.current.specs; // Current specs array
result.current.isLoading; // Current loading state
result.current.refetch; // Current refetch function
```

**Important:** Always use `result.current` to access the latest values.

#### 2. `waitFor` - Waiting for Async Updates

```typescript
// ❌ Bad - Will read stale value
const { result } = renderHook(() => useSkiSpecs());
expect(result.current.specs).toHaveLength(2); // Fails! Still null

// ✅ Good - Wait for async effect to complete
const { result } = renderHook(() => useSkiSpecs());
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
expect(result.current.specs).toHaveLength(2);
```

#### 3. `rerender` - Testing with Different Props

```typescript
const { result, rerender } = renderHook(({ page }) => useSkiSpecs({ page }), { initialProps: { page: 1 } });

// Initial render with page 1
await waitFor(() => expect(result.current.isLoading).toBe(false));
expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('page=1'));

// Rerender with page 2
rerender({ page: 2 });
await waitFor(() => expect(result.current.isLoading).toBe(false));
expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('page=2'));
```

#### 4. `unmount` - Testing Cleanup

```typescript
const { result, unmount } = renderHook(() => useMyHook());

// Use the hook...
await waitFor(() => expect(result.current.isReady).toBe(true));

// Unmount to trigger cleanup
unmount();

// Verify cleanup happened
expect(cleanupMock).toHaveBeenCalled();
```

---

## Testing Async Effects

Hooks that use `useEffect` with async operations need special handling.

### Pattern 1: Wait for Loading to Complete

```typescript
it('should fetch data on mount', async () => {
  mockFetch.mockResolvedValue({ data: [mockSpec1, mockSpec2] });

  const { result } = renderHook(() => useSkiSpecs());

  // Initially loading
  expect(result.current.isLoading).toBe(true);
  expect(result.current.specs).toBe(null);

  // Wait for fetch to complete
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  // Verify final state
  expect(result.current.specs).toHaveLength(2);
  expect(result.current.error).toBe(null);
});
```

### Pattern 2: Wait for Specific Condition

```typescript
it('should handle errors', async () => {
  const error = new Error('Network error');
  mockFetch.mockRejectedValue(error);

  const { result } = renderHook(() => useSkiSpecs());

  // Wait for error state
  await waitFor(() => {
    expect(result.current.error).toBeTruthy();
  });

  expect(result.current.specs).toBe(null);
  expect(result.current.isLoading).toBe(false);
});
```

### Pattern 3: Testing Refetch/Manual Triggers

```typescript
it('should refetch data when refetch is called', async () => {
  mockFetch.mockResolvedValue({ data: [mockSpec1] });

  const { result } = renderHook(() => useSkiSpecs());

  // Wait for initial fetch
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(mockFetch).toHaveBeenCalledTimes(1);

  // Trigger refetch
  mockFetch.mockResolvedValue({ data: [mockSpec1, mockSpec2] });
  await result.current.refetch();

  // Wait for refetch to complete
  await waitFor(() => {
    expect(result.current.specs).toHaveLength(2);
  });

  expect(mockFetch).toHaveBeenCalledTimes(2);
});
```

---

## Common Patterns

### Pattern 1: Testing State Updates from useEffect

```typescript
it('should update state when effect runs', async () => {
  const { result } = renderHook(() => useMyHook());

  // Wait for effect to complete
  await waitFor(() => {
    expect(result.current.isReady).toBe(true);
  });

  // Verify all state updates
  expect(result.current.data).not.toBe(null);
  expect(result.current.error).toBe(null);
});
```

### Pattern 2: Testing Hook with Options

```typescript
describe('with different options', () => {
  it('should respect page option', async () => {
    const { result } = renderHook(() => useSkiSpecs({ page: 2 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('page=2'));
  });

  it('should respect sort_by option', async () => {
    const { result } = renderHook(() => useSkiSpecs({ sort_by: 'name' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('sort_by=name'));
  });
});
```

### Pattern 3: Testing Hook with Changing Props

```typescript
it('should refetch when options change', async () => {
  const { result, rerender } = renderHook(({ page }) => useSkiSpecs({ page }), { initialProps: { page: 1 } });

  // Wait for initial fetch
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(mockFetch).toHaveBeenCalledTimes(1);

  // Change options
  rerender({ page: 2 });

  // Should trigger new fetch
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
```

### Pattern 4: Testing useMemo Dependencies

```typescript
it('should only recompute when dependencies change', () => {
  const computeExpensive = vi.fn(() => 'result');

  const useTestHook = (value: number) => {
    return useMemo(() => computeExpensive(value), [value]);
  };

  const { rerender } = renderHook(({ val }) => useTestHook(val), { initialProps: { val: 1 } });

  expect(computeExpensive).toHaveBeenCalledTimes(1);

  // Rerender with same value - should NOT recompute
  rerender({ val: 1 });
  expect(computeExpensive).toHaveBeenCalledTimes(1);

  // Rerender with new value - should recompute
  rerender({ val: 2 });
  expect(computeExpensive).toHaveBeenCalledTimes(2);
});
```

### Pattern 5: Testing useCallback Stability

```typescript
it('should maintain callback reference when deps unchanged', () => {
  const { result, rerender } = renderHook(({ value }) => useMyHook(value), { initialProps: { value: 1 } });

  const firstCallback = result.current.someCallback;

  // Rerender with same value
  rerender({ value: 1 });
  expect(result.current.someCallback).toBe(firstCallback);

  // Rerender with different value
  rerender({ value: 2 });
  expect(result.current.someCallback).not.toBe(firstCallback);
});
```

---

## Testing Complex Hooks

### Example: useSkiSpecs (Full Test Suite)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSkiSpecs } from './useSkiSpecs';

// Mock dependencies
vi.mock('@/lib/utils/SkiSpecHttpClient');
vi.mock('./useErrorHandler');

describe('useSkiSpecs', () => {
  const mockGet = vi.fn();
  const mockShowError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    const { skiSpecHttpClient } = require('@/lib/utils/SkiSpecHttpClient');
    skiSpecHttpClient.get = mockGet;

    const { useErrorHandler } = require('./useErrorHandler');
    useErrorHandler.mockReturnValue({ showError: mockShowError });
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useSkiSpecs());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.specs).toBe(null);
      expect(result.current.pagination).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Data Fetching', () => {
    it('should fetch data on mount', async () => {
      const mockData = {
        data: [{ id: '1', name: 'Ski 1' }],
        pagination: { page: 1, limit: 100, total: 1, total_pages: 1 },
      };

      mockGet.mockResolvedValue(mockData);

      const { result } = renderHook(() => useSkiSpecs());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.specs).toEqual(mockData.data);
      expect(result.current.pagination).toEqual(mockData.pagination);
      expect(result.current.error).toBe(null);
    });

    it('should use default options', async () => {
      mockGet.mockResolvedValue({ data: [], pagination: {} });

      renderHook(() => useSkiSpecs());

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalled();
      });

      const url = mockGet.mock.calls[0][0];
      expect(url).toContain('page=1');
      expect(url).toContain('limit=100');
      expect(url).toContain('sort_by=created_at');
      expect(url).toContain('sort_order=desc');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValue(error);

      const { result } = renderHook(() => useSkiSpecs());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(error);
      expect(result.current.specs).toBe(null);
      expect(mockShowError).toHaveBeenCalledWith(error);
    });
  });

  describe('Refetch', () => {
    it('should refetch data when refetch is called', async () => {
      mockGet.mockResolvedValue({
        data: [{ id: '1', name: 'Ski 1' }],
        pagination: {},
      });

      const { result } = renderHook(() => useSkiSpecs());

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Call refetch
      await result.current.refetch();

      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Options Changes', () => {
    it('should refetch when page changes', async () => {
      mockGet.mockResolvedValue({ data: [], pagination: {} });

      const { rerender } = renderHook(({ page }) => useSkiSpecs({ page }), { initialProps: { page: 1 } });

      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

      // Change page
      rerender({ page: 2 });

      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

      const secondCallUrl = mockGet.mock.calls[1][0];
      expect(secondCallUrl).toContain('page=2');
    });
  });
});
```

---

## Troubleshooting

### Issue 1: "act" Warnings

```
Warning: An update to TestComponent inside a test was not wrapped in act(...)
```

**Solution:** Use `waitFor` for async updates:

```typescript
// ❌ Bad
const { result } = renderHook(() => useSkiSpecs());
expect(result.current.specs).toHaveLength(2); // May trigger act warning

// ✅ Good
const { result } = renderHook(() => useSkiSpecs());
await waitFor(() => {
  expect(result.current.specs).toHaveLength(2);
});
```

### Issue 2: Reading Stale Values

```typescript
// ❌ Bad - Reading stale value
const { result } = renderHook(() => useSkiSpecs());
const specs = result.current.specs; // Captured at render time
await waitFor(() => expect(result.current.isLoading).toBe(false));
expect(specs).toHaveLength(2); // Still null! Stale reference

// ✅ Good - Always read from result.current
const { result } = renderHook(() => useSkiSpecs());
await waitFor(() => expect(result.current.isLoading).toBe(false));
expect(result.current.specs).toHaveLength(2); // Current value
```

### Issue 3: Hook Not Re-running on Props Change

```typescript
// ❌ Bad - Props not updating
const { result, rerender } = renderHook(() => useSkiSpecs({ page: 1 }));
rerender(); // No new props!

// ✅ Good - Pass new props
const { result, rerender } = renderHook((props) => useSkiSpecs(props), { initialProps: { page: 1 } });
rerender({ page: 2 }); // Props updated
```

### Issue 4: Missing Provider

If your hook needs context:

```typescript
import { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <MyContextProvider>{children}</MyContextProvider>
);

const { result } = renderHook(() => useMyHook(), { wrapper });
```

---

## Best Practices Summary

### ✅ DO

1. **Use `renderHook` for complex hooks** with lots of logic
2. **Always await async operations** with `waitFor`
3. **Read from `result.current`** for latest values
4. **Test all states** (loading, success, error)
5. **Test refetch/callbacks** separately
6. **Mock external dependencies** (HTTP clients, other hooks)
7. **Test options combinations** thoroughly
8. **Use `beforeEach` to clear mocks**

### ❌ DON'T

1. **Don't capture `result.current` values** - always read fresh
2. **Don't forget to wait** for async effects
3. **Don't test through components** for complex logic
4. **Don't mix component and hook tests** in same file
5. **Don't forget to test error cases**
6. **Don't skip testing cleanup** (unmount)

---

## Quick Reference

```typescript
// Basic hook test
const { result } = renderHook(() => useMyHook());
expect(result.current.value).toBe(expected);

// Hook with props
const { result, rerender } = renderHook(
  (props) => useMyHook(props),
  { initialProps: { value: 1 } }
);
rerender({ value: 2 });

// Wait for async
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});

// Test cleanup
const { unmount } = renderHook(() => useMyHook());
unmount();
expect(cleanupCalled).toBe(true);

// With context provider
const wrapper = ({ children }) => <Provider>{children}</Provider>;
renderHook(() => useMyHook(), { wrapper });
```

---

## Next Steps

1. **Read the example**: [useSkiSpecs.spec.ts](../src/components/hooks/useSkiSpecs.spec.ts)
2. **Practice with a simple hook** first
3. **Apply to complex hooks** like useSkiSpecs
4. **Test edge cases** and error scenarios
5. **Ensure good coverage** of all logic paths

Happy hook testing! 🪝✨
