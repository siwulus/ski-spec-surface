You are acting as a software architect tasked with generating a comprehensive OpenAPI specification. You will be provided with an API plan document and TypeScript type definitions that you must use to create a well-structured swagger.yaml file.

Here is the API plan document:
<api_plan>
{{API_PLAN}}
</api_plan>

Here are the TypeScript type definitions with zod validations:
<types>
{{TYPES}}
</types>

Your task is to generate a complete OpenAPI 3.0 specification based on these inputs. Follow these requirements and best practices:

**OpenAPI Specification Requirements:**

- Use OpenAPI 3.0.x format
- Include proper info section with title, description, and version
- Define all endpoints mentioned in the API plan with correct HTTP methods
- Map TypeScript types to appropriate OpenAPI schema definitions
- Include request/response schemas for all endpoints
- Add proper status codes (200, 201, 400, 401, 404, 500, etc.)
- Include parameter definitions (path, query, header parameters)
- Add authentication/security schemes if mentioned in the plan

**Best Practices to Follow:**

- Use consistent naming conventions (camelCase for properties, kebab-case for paths)
- Include meaningful descriptions for all endpoints, parameters, and schemas
- Define reusable components in the components section
- Use appropriate data types and formats (string, integer, boolean, date-time, etc.)
- Include examples where helpful
- Add validation constraints (required fields, min/max values, patterns)
- Use proper HTTP status codes for different scenarios
- Include error response schemas
- Group related endpoints with tags
- Follow RESTful conventions where applicable

**Schema Mapping Guidelines:**

- Convert TypeScript interfaces to OpenAPI schema objects
- Map TypeScript union types to oneOf/anyOf constructs
- Handle optional properties correctly with required arrays
- Convert TypeScript enums to OpenAPI enum constraints
- Map array types appropriately
- Handle nested objects and references

Before generating the specification, use the scratchpad below to plan your approach:

<scratchpad>
Plan your OpenAPI specification structure here:
1. Analyze the API plan to identify all endpoints, methods, and functionality
2. Review the TypeScript types to understand data structures
3. Map endpoints to OpenAPI paths
4. Identify reusable schemas from the types
5. Plan the overall structure and organization
</scratchpad>

Generate the complete OpenAPI specification and save it as swagger.yaml. Your output should be the complete YAML content that can be directly saved to a file. The specification should be production-ready and follow all the best practices mentioned above.

Your final output should contain only the YAML specification content, properly formatted and ready to be saved as swagger.yaml.
