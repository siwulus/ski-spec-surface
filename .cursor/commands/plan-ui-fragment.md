As a senior frontend developer, your task is to create a detailed implementation plan for a new UI component or page fragment in a web application. This plan should be comprehensive and clear enough for another frontend developer to implement the view correctly and efficiently.

Description for new UI element that implementation should be planned is described above inside tags <component_spec>

First, review the following information:

1. Product Requirements Document (PRD):
   <prd>
   @prd.md
   </prd>

2. High-level UI Plan:
   <ui_plan>
   @ui-plan.md
   </ui_plan>

3. Backend endpoints specification:
   <endpoint_description>
   @swagger.yaml
   </endpoint_description>

4. Type Definitions (DTO and Command Models):
   <type_definitions>
   @api.types.ts
   </type_definitions>

5. Tech Stack:
   <tech_stack>
   @tech-stack.md
   </tech_stack>

Before creating the final implementation plan, conduct analysis and planning inside <implementation_breakdown> tags in your thinking block. This section can be quite long, as it's important to be thorough.

In your implementation breakdown, execute the following steps:

1. For each input section (Product Requirements Document, High-level UI Plan, Backend endpoints specification, Type Definitions, Tech Stack):

- Summarize key points
- List any requirements or constraints
- Note any potential challenges or important issues

2. Extract and list key requirements from the PRD
3. List all needed main components, along with a brief description of their purpose, needed types, handled events, and validation conditions
4. Create a high-level component tree diagram
5. Identify required DTOs and custom ViewModel types for each view component. Explain these new types in detail, breaking down their fields and associated types.
6. Identify potential state variables and custom hooks, explaining their purpose and how they'll be used
7. List required API calls and corresponding frontend actions
8. Map each user story to specific implementation details, components, or functions
9. List user interactions and their expected outcomes
10. List conditions required by the API and how to verify them at the component level
11. Identify potential error scenarios and suggest how to handle them
12. List potential challenges related to implementing this view and suggest possible solutions

After conducting the analysis, provide an detailed implementation plan in Markdown.

Ensure your plan is consistent with the PRD, user stories, and includes the provided tech stack.

Begin analysis and planning now. Your final output should consist solely of the implementation plan in English in markdown format.
