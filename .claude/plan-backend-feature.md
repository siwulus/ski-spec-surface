As a senior backend developer, your task is to create a detailed implementation plan for new backend business logic functionality. This plan should be comprehensive and clear enough for another backend developer to implement the business logic correctly and efficiently.

The specification for the new backend functionality that needs to be implementedis located in conversation context in tags <component_spec>

Here is the relevant project context including PRD, API specifications, data models, and tech stack:

<project_context>

<prd>
@.ai/prd.md  
</prd>

<api>
@public/swagger.yaml  
</api>

<db>
@.ai/db-plan.md  
</db>

<tech-stack>
@.ai/tech-stack.md  
</tech-stack>

</project_context>

Before creating the final implementation plan, conduct thorough analysis and planning inside <implementation_breakdown> tags. This section should be comprehensive and detailed.

In your implementation breakdown, execute the following steps:

1. **Context Analysis**: For each section in the project context:
   - Summarize key points relevant to backend implementation
   - List any business rules, constraints, or requirements
   - Note any potential challenges or important technical considerations

2. **Requirements Extraction**: Extract and list key business logic requirements from the specification

3. **Service Architecture**: Identify all needed service classes, repositories, and business logic components along with:
   - Brief description of their purpose and responsibilities
   - Key methods and their signatures
   - Dependencies and relationships between components

4. **Data Model Analysis**:
   - Identify required entities, DTOs, and domain models
   - Explain new data structures in detail, breaking down their fields and relationships
   - Map database schema requirements if applicable

5. **Business Logic Flow**:
   - Identify required business processes and workflows
   - Map out the flow of data through different layers (controller → service → repository)
   - Define validation rules and business constraints

6. **API Integration**:
   - List required API endpoints and their specifications
   - Define request/response models
   - Identify authentication and authorization requirements

7. **Implementation Mapping**: Map each business requirement to specific:
   - Service methods
   - Validation logic
   - Data transformations
   - External integrations

8. **Error Handling**:
   - Identify potential error scenarios in business logic
   - Define custom exceptions and error responses
   - Suggest error handling strategies

9. **Performance Considerations**:
   - Identify potential performance bottlenecks
   - Suggest optimization strategies
   - Consider caching requirements

10. **Testing Strategy**:
    - Identify key business logic that needs unit testing
    - Suggest integration test scenarios
    - Define test data requirements

11. **Technical Challenges**:
    - List potential implementation challenges
    - Suggest possible solutions and alternatives

After conducting the analysis, provide a detailed implementation plan in Markdown format that includes:

- **Service Layer Design**: Detailed breakdown of service classes and their methods
- **Data Layer Implementation**: Repository patterns, entity mappings, and database interactions
- **Business Logic Implementation**: Core algorithms, validation rules, and processing workflows
- **API Controller Design**: Endpoint implementations and request/response handling
- **Error Handling Strategy**: Exception handling and error response patterns
- **Testing Approach**: Unit and integration testing strategies
- **Performance Optimization**: Caching, database optimization, and scalability considerations

Ensure your plan is consistent with the business requirements, follows backend best practices, and includes the provided tech stack.

Your final output should consist solely of the detailed backend implementation plan in English in Markdown format. Do not include the implementation breakdown analysis in your final response.
