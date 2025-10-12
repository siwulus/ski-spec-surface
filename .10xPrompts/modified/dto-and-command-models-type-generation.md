You are a qualified TypeScript developer creating a library of DTO (Data Transfer Object) and Command Model types for an application. Your task is to analyze database model definitions and API specifications, then generate TypeScript type definitions along with corresponding Zod validation schemas.

Here are the database model definitions:

<database_models>
{{db-models}}
</database_models>

Here is the API plan containing the DTO specifications:

<api_plan>
{{api-plan}}
</api_plan>

Your task is to create TypeScript type definitions and Zod schemas for all DTOs and Command Models specified in the API plan. These types must be derived from the database models and include proper validation.

## Requirements

1. **Type Generation**: Create TypeScript DTO and Command Model types based on the API plan, using database entity definitions as the foundation
2. **Zod Schema Generation**: For each DTO and Command Model, create a corresponding Zod schema that aligns 1:1 with the TypeScript type
3. **Type Validation**: Use `expectTypeOf` from the `expect-type` library to validate compatibility between Zod schemas and TypeScript types
4. **Database Compatibility**: Ensure all DTOs and Command Models connect to database entities using appropriate TypeScript utilities (Pick, Omit, Partial, etc.)
5. **Documentation**: Add clear comments explaining complex type manipulations or relationships

## Process

Before creating the final output, work through your analysis systematically in <analysis> tags inside your thinking block:

1. **Inventory**: List all DTOs and Command Models defined in the API plan. Write them out one by one, numbering each item. It's OK for this section to be quite long.
2. **Mapping**: For each DTO/Command Model identified, specify:
   - The corresponding database entities it relates to
   - The exact fields that need to be included
   - Any field transformations or type modifications needed
3. **Type Strategy**: For each type, describe which TypeScript utilities you'll use (Pick, Omit, Partial, etc.) and why
4. **Schema Design**: Plan the Zod schema structure for each type, noting any special validation requirements
5. **Validation Plan**: List out each expectTypeOf assertion you'll need to ensure type compatibility

## Output Format

Your final output should include:

```typescript
// Example structure (replace with actual types):

import { z } from 'zod';
import { expectTypeOf } from 'expect-type';

// DTO Type Definition
export interface UserCreateDto {
  name: string;
  email: string;
  age?: number;
}

// Corresponding Zod Schema
export const UserCreateDtoSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
});

// Compile-time type assertion
expectTypeOf<z.infer<typeof UserCreateDtoSchema>>()
  .toEqualTypeOf<UserCreateDto>();

// Command Model example
export interface UpdateUserCommand {
  id: string;
  updates: Partial<Pick<User, 'name' | 'email' | 'age'>>;
}

export const UpdateUserCommandSchema = z.object({
  id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    age: z.number().optional(),
  }),
});

expectTypeOf<z.infer<typeof UpdateUserCommandSchema>>()
  .toEqualTypeOf<UpdateUserCommand>();
```

Provide complete type definitions and schemas that would go in the `src/types.ts` file, ensuring every DTO and Command Model from the API plan is included with its corresponding Zod schema and type validation. Your final output should consist only of the complete TypeScript code and should not duplicate or rehash any of the analysis work you did in the thinking block.