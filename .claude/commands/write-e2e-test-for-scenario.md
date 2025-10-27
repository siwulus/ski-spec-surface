You are an expert QA automation engineer. You will analyze a test scenario and create a single, comprehensive end-to-end (e2e) test using the Playwright framework that covers the entire scenario from start to finish.

The test scenario is located in conversation context in tags <e2e_test_scenario>

Your task is to create exactly ONE comprehensive e2e test that covers the complete scenario as described. Do not create multiple partial tests, atomic tests, or additional negative/alternative test cases - focus solely on implementing the specific scenario provided.

Before writing your code, wrap your analysis in <analysis> tags inside your thinking block to:
1. List out each step of the scenario explicitly, numbering them sequentially
2. Quote relevant parts of the scenario and identify specific components that need data-testid attributes
3. List each page/component that will need a Page Object Model and what methods each POM should have
4. Write out the test structure in pseudocode format, showing the flow from start to finish
5. Identify specific assertions needed and what each assertion should verify
6. Note any wait strategies, error handling, or edge cases that need to be addressed

It's OK for this section to be quite long as you work through all the details.

**Requirements for your implementation:**

**Playwright Best Practices:**
- Use async/await patterns consistently
- Implement proper waiting strategies (waitFor, expect with timeouts)
- Use Playwright's built-in assertions and expect methods
- Handle dynamic content with appropriate locator strategies
- Implement proper test isolation and cleanup
- Use descriptive test names that clearly indicate what is being tested

**Page Object Model Requirements:**
- Create or extend Page Object Models (POMs) for each page/component being tested
- Follow the rules for POM defined in @.cursor/rules/playwright-page-object-model.mdc
- Use helper methods inherited from @tests/poms/AbstractPage.ts
- Encapsulate page-specific locators and actions within POM classes
- Use meaningful method names that describe user actions (e.g., `clickSubmitButton()`, `fillLoginForm()`)
- Return appropriate types from POM methods (Page objects for navigation, data for queries)
- Keep test logic separate from page interaction logic

**Data-testid Requirements:**
- Add `data-testid` attributes to components that lack them for reliable element selection
- Use descriptive, kebab-case naming for data-testid values (e.g., `data-testid="login-submit-button"`)
- Prefer data-testid selectors over CSS selectors or text-based selectors for stability
- Document any new data-testid attributes you add

**Test Structure Requirements:**
- Write ONE comprehensive test that covers the entire scenario
- Use beforeEach/afterEach hooks appropriately for setup and cleanup
- Include proper test timeouts and retry logic
- Use meaningful variable names and comments for complex test logic
- Organize code with clear structure and proper indentation
- Use TypeScript types where applicable
- Include error handling for flaky scenarios

**Output Format:**

Structure your response with these sections:

**1. Modified Components** (if needed)
Show any components that need data-testid attributes added, with the specific attributes highlighted.

**2. Page Object Models**
Create new or extend existing POM classes with all necessary locators and methods.

**3. Test File**
Write one complete test file that includes:
- Import statements
- Test setup and teardown
- One comprehensive test case covering the entire scenario
- Proper assertions and error handling

**4. Test Configuration** (if needed)
Any additional Playwright configuration required.

Each section should use appropriate code blocks with language specification (e.g., ```typescript) and include explanatory text describing what the code does.

Remember: Create exactly one comprehensive test that covers the complete scenario from start to finish. Do not create multiple separate tests or additional test cases beyond what is specified in the scenario.

Your final output should consist only of the structured response with the four sections above and should not duplicate or rehash any of the analysis work you did in the thinking block.