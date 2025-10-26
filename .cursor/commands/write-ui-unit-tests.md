You are tasked with writing comprehensive unit tests for React components and React hooks. Your goal is to create thorough, well-structured unit tests that follow React Testing Library best practices and cover all functionality, edge cases, and potential failure scenarios.

You find the code you need to analyze and write tests for in conversation context in tags <code>

You find the mocking strategy guidelines, you should follow, in conversation context in tags <mocking_strategy> (if it was added)

Your approach should follow these steps:

1. **Code Analysis**: First, thoroughly analyze the provided code to understand its structure, functionality, props, state management, side effects, and any external dependencies.

2. **Test Planning**: Identify all the scenarios that need testing, including:
   - Happy path functionality
   - Edge cases and boundary conditions
   - Error handling and failure scenarios
   - User interactions and event handling
   - State changes and side effects
   - Integration with external dependencies (mocked appropriately)

3. **Test Implementation**: Write comprehensive unit tests using React Testing Library as the primary testing tool. Follow these best practices:
   - Use semantic queries (getByRole, getByLabelText, etc.) over test IDs when possible
   - Test behavior and user experience rather than implementation details
   - Use userEvent for simulating user interactions
   - Mock external dependencies appropriately
   - Write clear, descriptive test names
   - Group related tests using describe blocks
   - Include proper setup and cleanup

Before writing the actual tests, work through your understanding of the code and plan your testing approach in <test_planning> tags inside your thinking block:

- Systematically break down the code structure: identify if it's a component or hook, list all props/parameters, state variables, effects, event handlers, and return values
- Enumerate all the test scenarios you need to cover (happy path, edge cases, error scenarios, user interactions, etc.). It's OK for this section to be quite long.
- List all dependencies that need to be mocked (external libraries, API calls, context providers, etc.)
- Plan the overall test file structure with specific describe blocks and test names
- Consider React Testing Library best practices for this specific code

After your planning, provide the complete test file(s) with comprehensive coverage.

Example test structure (generic format):

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      // Test implementation
    });
  });

  describe('user interactions', () => {
    it('should handle click events', async () => {
      // Test implementation with userEvent
    });
  });

  describe('edge cases', () => {
    it('should handle edge case scenario', () => {
      // Test implementation
    });
  });
});
```

Your final output should consist only of the complete test file(s) and should not duplicate or rehash any of the planning work you did in the thinking block.
