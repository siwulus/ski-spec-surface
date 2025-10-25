# Testing Guide

This document provides comprehensive guidance for writing and running tests in the Ski Surface Spec Extension project.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Continuous Integration](#continuous-integration)

## Overview

The project uses a comprehensive testing strategy with three types of tests:

- **Unit Tests**: Test individual functions and components in isolation (Vitest + React Testing Library)
- **Integration Tests**: Test interactions between multiple components or services (Vitest)
- **E2E Tests**: Test complete user flows and application behavior (Playwright)

### Testing Stack

| Tool                                                                     | Purpose                            |
| ------------------------------------------------------------------------ | ---------------------------------- |
| [Vitest](https://vitest.dev/)                                            | Unit and integration test runner   |
| [React Testing Library](https://testing-library.com/react)               | React component testing            |
| [Playwright](https://playwright.dev/)                                    | E2E browser testing                |
| [axe-core](https://github.com/dequelabs/axe-core)                        | Accessibility testing              |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) | Custom matchers for DOM assertions |

## Test Types

### Unit Tests

Unit tests focus on testing individual functions, utilities, and components in isolation.

**Naming Convention**: `*.spec.{ts,tsx}`

**Location**: Co-located with the source file in `src/**/*.spec.{ts,tsx}`

**Example**:

```typescript
// src/components/auth/PasswordStrengthIndicator.spec.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  it('displays "Strong" for password with all requirements met', () => {
    render(<PasswordStrengthIndicator password="Abc123def" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});
```

**Important**: Unit tests should be placed in the same directory as the file they test. For example:

```text
src/components/auth/
├── PasswordStrengthIndicator.tsx
└── PasswordStrengthIndicator.spec.tsx
```

### Integration Tests

Integration tests verify that multiple components or services work together correctly.

**Naming Convention**: `*.integration.spec.{ts,tsx}`

**Location**: `tests/integration/**/*.integration.spec.{ts,tsx}`

**Example**:

```typescript
// tests/integration/SkiSpecForm.integration.spec.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, userEvent } from '@/test/test-utils';
import { SkiSpecForm } from '@/components/ski-specs/SkiSpecForm';

describe('SkiSpecForm Integration', () => {
  it('calculates surface area when dimensions are entered', async () => {
    const user = userEvent.setup();
    render(<SkiSpecForm />);

    await user.type(screen.getByLabelText(/length/i), '186');
    await user.type(screen.getByLabelText(/tip/i), '140');
    // ... verify calculations
  });
});
```

### E2E Tests

E2E tests verify complete user workflows from start to finish in a real browser environment.

**Naming Convention**: `*.spec.ts` (Playwright convention)

**Location**: `tests/e2e/**/*.spec.ts`

**Example**:

```typescript
// tests/e2e/auth-login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login with valid credentials', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill('user@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /login/i }).click();

  await expect(page).toHaveURL(/\/ski-specs/);
});
```

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Run all unit/integration tests once
pnpm test:unit

# Run tests in watch mode (recommended during development)
pnpm test:watch

# Run tests with UI (visual test explorer)
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

#### Watch Mode

Watch mode automatically reruns tests when files change:

```bash
pnpm test:watch
```

Useful commands in watch mode:

- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `t` to filter by test name pattern
- Press `q` to quit

#### Coverage Reports

Generate coverage reports to identify untested code:

```bash
pnpm test:coverage
```

Coverage report will be available at `coverage/index.html`.

**Coverage Thresholds** (configured in `vitest.config.ts`):

- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

### E2E Tests (Playwright)

```bash
# Run all E2E tests (headless mode)
pnpm test:e2e

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Run tests in debug mode (step through tests)
pnpm test:e2e:debug

# Run tests with UI mode (interactive test explorer)
pnpm test:e2e:ui

# Generate test code using codegen
pnpm test:e2e:codegen
```

#### Playwright UI Mode

The UI mode provides an interactive interface for running and debugging tests:

```bash
pnpm test:e2e:ui
```

Features:

- Visual test explorer
- Watch mode for tests
- Time travel debugging
- Network inspection
- Console logs

#### Code Generation

Use codegen to record browser interactions and generate test code:

```bash
pnpm test:e2e:codegen
```

This opens a browser where you can interact with your app, and Playwright will generate the corresponding test code.

### Run All Tests

```bash
# Run both unit and E2E tests
pnpm test:all
```

## Writing Tests

### Unit Testing Components with React Testing Library

**Key Principles**:

- Test user behavior, not implementation details
- Query by accessibility attributes (roles, labels)
- Use `userEvent` for realistic user interactions

**Example**:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    const button = screen.getByRole('button', { name: /submit/i });
    await user.click(button);

    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

### Testing with EffectJS

When testing code that uses EffectJS, use `Effect.runPromise` or `Effect.either`:

```typescript
import { Effect } from 'effect';
import { describe, it, expect } from 'vitest';

describe('calculateRelativeWeight', () => {
  it('calculates correctly', async () => {
    const result = await Effect.runPromise(service.calculateRelativeWeight(1800, 2400));
    expect(result).toBe(0.75);
  });

  it('handles errors', async () => {
    const effect = service.calculateRelativeWeight(1800, 0);
    const result = await Effect.runPromise(Effect.either(effect));

    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(BusinessLogicError);
    }
  });
});
```

### Mocking with Vitest

**Mock Functions**:

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
mockFn.mockResolvedValue('async value');
```

**Mock Modules**:

```typescript
vi.mock('@/lib/services/SkiSpecService', () => ({
  SkiSpecService: vi.fn().mockImplementation(() => ({
    createSkiSpec: vi.fn().mockResolvedValue({ id: '123' }),
  })),
}));
```

**Spy on Functions**:

```typescript
const spy = vi.spyOn(object, 'method');
expect(spy).toHaveBeenCalledWith('expected-arg');
```

### E2E Testing with Playwright

**Best Practices**:

1. Use Page Object Model for complex pages
2. Prefer user-facing locators (roles, labels)
3. Add explicit waits for dynamic content
4. Use fixtures for common setup

**Locator Strategies** (in order of preference):

```typescript
// 1. By Role (most accessible)
page.getByRole('button', { name: /submit/i });

// 2. By Label
page.getByLabel(/email/i);

// 3. By Placeholder
page.getByPlaceholder(/enter your name/i);

// 4. By Text
page.getByText(/welcome/i);

// 5. By Test ID (last resort)
page.getByTestId('submit-button');
```

**Page Object Model Example**:

```typescript
// tests/e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole('button', { name: /login/i }).click();
  }

  async getErrorMessage() {
    return this.page.locator('[role="alert"]').textContent();
  }
}

// Usage in test
test('login with invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('invalid@example.com', 'wrong');

  const error = await loginPage.getErrorMessage();
  expect(error).toContain('Invalid credentials');
});
```

### Accessibility Testing

Use the `checkA11y` helper to test accessibility:

```typescript
import { test } from '@playwright/test';
import { checkA11y } from '../fixtures/accessibility';

test('page is accessible', async ({ page }) => {
  await page.goto('/');
  await checkA11y(page);
});

// With options
test('specific element is accessible', async ({ page }) => {
  await page.goto('/');
  await checkA11y(page, {
    include: ['main'],
    exclude: ['.third-party-widget'],
    disabledRules: ['color-contrast'], // Only if necessary
  });
});
```

## Best Practices

### General

1. **Write tests first** (TDD) when fixing bugs or adding features
2. **Keep tests isolated** - each test should be independent
3. **Use descriptive test names** - describe what the test does
4. **Follow AAA pattern** - Arrange, Act, Assert
5. **Avoid implementation details** - test behavior, not internals

### Vitest-Specific

1. **Use `describe` blocks** to group related tests
2. **Leverage setup/teardown hooks** (`beforeEach`, `afterEach`)
3. **Use inline snapshots** for readable assertions: `expect(value).toMatchInlineSnapshot()`
4. **Enable strict typing** - ensure mocks preserve type signatures
5. **Use `expectTypeOf()`** for type-level assertions

### Playwright-Specific

1. **Use browser contexts** for test isolation
2. **Implement Page Object Model** for maintainable tests
3. **Use locators** for resilient element selection
4. **Enable trace on first retry** (already configured)
5. **Leverage parallel execution** for faster test runs (already enabled)

### React Testing Library

1. **Query by accessibility** - use `getByRole`, `getByLabel`
2. **Use userEvent over fireEvent** - more realistic interactions
3. **Wait for elements** - use `findBy*` for async elements
4. **Avoid `container.querySelector`** - prefer semantic queries
5. **Test user experience** - what users see and interact with

## Test Organization

### File Naming Conventions

- **Unit tests**: `*.spec.{ts,tsx}` - co-located with source files
- **Integration tests**: `*.integration.spec.{ts,tsx}` - in `tests/integration/`
- **E2E tests**: `*.spec.ts` - in `tests/e2e/`

### Directory Structure

```text
project-root/
├── src/
│   ├── components/
│   │   └── auth/
│   │       ├── PasswordStrengthIndicator.tsx
│   │       └── PasswordStrengthIndicator.spec.tsx  # Co-located unit test
│   ├── lib/
│   │   └── services/
│   │       ├── SkiSpecService.ts
│   │       └── SkiSpecService.spec.ts              # Co-located unit test
│   └── test/
│       ├── setup.ts              # Global test setup
│       └── test-utils.tsx        # Custom render functions
├── tests/
│   ├── integration/              # Integration tests
│   │   └── SkiSpecForm.integration.spec.tsx
│   ├── e2e/                      # E2E tests
│   │   ├── homepage.spec.ts
│   │   └── auth-login.spec.ts
│   └── fixtures/                 # Test fixtures and helpers
│       ├── test-fixtures.ts
│       └── accessibility.ts
├── vitest.config.ts              # Vitest configuration
└── playwright.config.ts          # Playwright configuration
```

**Key Principles**:

1. **Unit tests are co-located** with their source files for easy discoverability
2. **Integration tests are centralized** in `tests/integration/` to test cross-component interactions
3. **E2E tests are centralized** in `tests/e2e/` to test complete user workflows
4. **Test utilities and fixtures** are shared from dedicated directories

## Continuous Integration

Tests are automatically run in CI/CD pipeline (GitHub Actions).

**Configuration**:

- Unit/Integration tests run on every push
- E2E tests run on pull requests to main branch
- Coverage reports are generated and tracked
- Failed tests block merging

**CI Environment Variables**:

```bash
CI=true                    # Enables CI-specific behavior
PLAYWRIGHT_BASE_URL=...    # Base URL for E2E tests
```

## Troubleshooting

### Common Issues

**Issue**: Tests timeout or hang
**Solution**: Check for missing `await` keywords or infinite loops

**Issue**: "Cannot find module" errors
**Solution**: Ensure `tsconfig.json` includes test files and path aliases are configured

**Issue**: Playwright tests fail in CI but pass locally
**Solution**: Check for timing issues, add explicit waits, ensure test data is available

**Issue**: Coverage thresholds not met
**Solution**: Add tests for uncovered code paths or adjust thresholds in `vitest.config.ts`

### Debug Mode

**Vitest**:

```bash
# Run specific test file
pnpm vitest src/components/auth/PasswordStrengthIndicator.spec.tsx

# Run tests matching pattern
pnpm vitest -t "password strength"
```

**Playwright**:

```bash
# Debug specific test
pnpm test:e2e:debug tests/e2e/auth-login.spec.ts

# Run single test
pnpm test:e2e tests/e2e/auth-login.spec.ts:10  # Line number
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Accessibility Testing Guide](https://www.w3.org/WAI/test-evaluate/)

## Contributing

When adding new features:

1. Write unit tests for new components/functions
2. Add integration tests for component interactions
3. Create E2E tests for new user flows
4. Ensure accessibility tests pass
5. Maintain or improve coverage thresholds

For questions or issues with tests, please open a GitHub issue.
