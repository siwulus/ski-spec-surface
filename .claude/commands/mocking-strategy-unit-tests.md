<mocking_strategy>

# Unit Test Mocking Strategy

When writing unit tests, follow these guidelines for what to mock.

## What to Mock
- **External Third-Party Libraries**: Any dependencies managed via `package.json` that are not part of this project's source code.
- **External APIs & Services**: Any modules that make network requests or connect to external systems (e.g., database clients, REST API clients).
- **Internal Business Logic**: Services and classes containing business logic external to tested scope should generally be mocked. Mock also logic when they have external dependencies that are difficult to set up in a test environment or depended from third-party services.

## What NOT to Mock
- **Internal Utilities & Helpers**: All local utility functions and helpers within the `/src/lib/utils` directory should be imported and used directly. For example, functions from `@/lib/utils` or `@/lib/helpers` should not be mocked.

</mocking_strategy>