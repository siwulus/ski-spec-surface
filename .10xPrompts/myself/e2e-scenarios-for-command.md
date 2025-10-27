You are given three inputs: @test-plan.md, @prd.md, and @ui-plan.md. Produce a list of end-to-end (E2E) test scenarios to be used one-by-one as inputs to @write-e2e-test-for-scenario.md command, which will generate Playwright tests.

Each scenario should be build with:

Scenario ID and title

Description

Preconditions

Test steps (the clue part should be easy to follow for LLM to create test steps one by one to realize the scenario)

Expected results (the success criteria easy to validate with Playwright)

Mapped user stories/test cases

Save the scenarios for later in Markdown document in Artifacts