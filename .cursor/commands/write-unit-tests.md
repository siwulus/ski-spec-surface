You will be writing comprehensive unit tests for a piece of code. Your goal is to create thorough, well-structured unit tests that cover all functionality, edge cases, and potential failure scenarios.

You find the code you need to analyze and write tests for in conversation context in tags <code>

You find the mocking strategy guidelines, you should follow, in conversation context in tags <mocking_strategy> (if it was added)

Before writing any tests, you must first thoroughly analyze the code to build a comprehensive understanding of what needs to be tested. Use the scratchpad below to work through your analysis.

<scratchpad>
In this section, analyze the code systematically:

1. **Code Responsibilities**: What is the primary purpose of this code? What are its main functions, methods, or operations? What inputs does it expect and what outputs does it produce?

2. **Dependencies and Interactions**: What external dependencies does the code have? Does it interact with databases, APIs, file systems, or other modules? How should these be mocked or stubbed in tests?
   Use the provided mocking strategy guidelines to determine what should be mocked versus used as-is in your tests.

3. **Edge Cases and Corner Cases**: What are the boundary conditions? What happens with empty inputs, null values, extremely large or small values, invalid data types, or malformed data?

4. **Error Conditions**: What exceptions or errors can the code throw? Under what circumstances do these occur? How should the code behave when things go wrong?

5. **State Changes**: Does the code modify any state? Are there side effects that need to be verified?
   </scratchpad>

After completing your analysis, write comprehensive unit tests that cover:

**Test Coverage Requirements:**

- **Happy Path Testing**: Test all normal, expected use cases with valid inputs
- **Edge Case Testing**: Test boundary conditions, empty/null inputs, minimum/maximum values
- **Error Handling**: Test all error conditions and exception scenarios
- **Input Validation**: Test with invalid inputs, wrong data types, malformed data
- **State Verification**: Verify any state changes or side effects
- **Integration Points**: Test interactions with dependencies (using appropriate mocks/stubs)

**Test Structure Guidelines:**

- Use clear, descriptive test names that explain what is being tested
- Follow the Arrange-Act-Assert pattern
- Include setup and teardown as needed
- Group related tests logically
- Add comments explaining complex test scenarios
- Use appropriate assertions that provide meaningful error messages

**Code Quality:**

- Write clean, readable test code
- Avoid test duplication while ensuring comprehensive coverage
- Make tests independent of each other
- Use appropriate test data and fixtures

Your final response should include:

1. A brief summary of what the code does and key testing considerations
2. The complete unit test suite with all necessary imports, setup, and test methods
3. Any additional notes about testing approach or assumptions made

Write your unit tests in a format appropriate for the programming language used in the provided code. Your output should be production-ready test code that can be immediately used in a testing framework.
