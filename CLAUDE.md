# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ski Surface Spec Extension is a web application for ski-tour and freeride enthusiasts that calculates and compares ski specifications, particularly **surface area** and **relative weight (g/cm²)** - metrics rarely published by manufacturers. Users can store specs, auto-calculate missing parameters, and compare up to 4 models side-by-side.

## Tech Stack

- **Runtime**: Node.js 22 with pnpm (≥10.18)
- **Framework**: Astro 5 (SSR mode) with React 19 for interactive components
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with Shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth)
- **Package Manager**: pnpm

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server (port 3000)
pnpm dev

# Production build
pnpm build

# Preview production build locally
pnpm preview

# Lint all files
pnpm lint

# Lint and auto-fix
pnpm lint:fix

# Format with Prettier
pnpm format

# Run Astro CLI commands
pnpm astro [command]
```

## Environment Setup

Required environment variables (see `.env.example`):

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `OPENROUTER_API_KEY` - For AI integrations

## Architecture Overview

### Project Structure

```
src/
├── components/          # Astro (static) and React (dynamic) components
│   └── ui/             # Shadcn/ui components
├── db/                 # Supabase clients and database types
│   ├── supabase.client.ts    # Initialized Supabase client
│   └── database.types.ts     # Generated DB types
├── layouts/            # Astro layouts
├── lib/                # Services and helpers
│   └── services/       # Business logic services (e.g., SkiSpecService)
├── middleware/         # Astro middleware (Supabase injection, auth)
├── pages/              # Astro pages and API routes
│   └── api/            # RESTful API endpoints
├── styles/             # Global CSS
└── types/              # TypeScript type definitions
    ├── db.types.ts     # Database entities
    └── api.types.ts    # DTOs, Commands, Queries, Responses
```

### Key Architectural Patterns

#### 1. Service Layer Pattern

All business logic is encapsulated in service classes (e.g., `SkiSpecService`). Services:

- Handle database interactions via Supabase client
- Perform calculations (surface area, relative weight)
- Enforce business rules and validation
- Are instantiated in middleware and injected via `context.locals`

**Example**:

```typescript
// Middleware injects service
context.locals.skiSpecService = new SkiSpecService(supabaseClient);

// API routes use service from locals
const { skiSpecService, userId } = locals;
const result = await skiSpecService.createSkiSpec(userId, command);
```

#### 2. Data Flow: Entity → DTO → Command/Query

- **Entities** (`db.types.ts`): Database table representations
- **DTOs** (`api.types.ts`): Data Transfer Objects for API responses (e.g., `SkiSpecDTO` includes `notes_count`)
- **Commands** (`api.types.ts`): Input for create/update operations (e.g., `CreateSkiSpecCommand`)
- **Queries** (`api.types.ts`): Validated query parameters (e.g., `ListSkiSpecsQuery`)

#### 3. Zod Validation

Every API type has a corresponding Zod schema for runtime validation:

```typescript
export const CreateSkiSpecCommandSchema = z.object({...});
export type CreateSkiSpecCommand = z.infer<typeof CreateSkiSpecCommandSchema>;
```

Compile-time type checks ensure schemas match types:

```typescript
expectTypeOf<z.infer<typeof Schema>>().toEqualTypeOf<Type>();
```

#### 4. API Route Structure

All API routes follow this pattern:

1. Extract data (body/query params) from request
2. Validate with Zod schema
3. Call service layer method
4. Return typed response or `ApiErrorResponse`

**Example** (`src/pages/api/ski-specs/index.ts`):

- `GET /api/ski-specs` - List with pagination, sorting, search
- `POST /api/ski-specs` - Create new specification

#### 5. Supabase Integration

- **Client initialization**: `src/db/supabase.client.ts` creates typed client
- **Middleware injection**: `src/middleware/index.ts` adds client to `context.locals.supabase`
- **Type safety**: Use `SupabaseClient` type from `src/db/supabase.client.ts`, NOT from `@supabase/supabase-js`
- **Access pattern**: Always use `context.locals.supabase` in routes, never import client directly

#### 6. Authentication

Authentication is implemented using Supabase Auth in the middleware:

- **Session Management**: Middleware extracts user from `supabase.auth.getUser()`
- **Route Protection**: Non-public routes redirect unauthenticated users to `/auth/login`
- **Guest-Only Routes**: Authenticated users are redirected from login/register pages to `/ski-specs`
- **Public Paths**: `/`, `/auth/login`, `/auth/register`, `/auth/reset-password`
- **Access Pattern**: User object is available via `context.locals.user` in all routes

#### 7. Component Architecture

- **Astro components** (`.astro`): For static content, layouts, pages
- **React components** (`.tsx`): Only when interactivity is needed
  - Use functional components with hooks (NO class components)
  - Extract logic into custom hooks in `src/components/hooks`
  - Use `React.FC<Props>` arrow function syntax
  - **Never use Next.js directives** like `"use client"` (this is Astro + React, not Next.js)
  - Optimize with `React.memo()`, `useCallback`, `useMemo`, `useTransition`

#### 8. Shadcn/ui Components

This project uses Shadcn/ui components located in `src/components/ui/`. To install additional components:

```bash
npx shadcn@latest add [component-name]
```

**Important**: Use `npx shadcn@latest`, not the deprecated `npx shadcn-ui@latest`

Commonly used components include: accordion, alert, alert-dialog, calendar, checkbox, form, popover, scroll-area, sheet, skeleton, slider, switch, table, textarea.

Project configuration (from `components.json`):

- Style variant: "new-york"
- Base color: "neutral"
- Theming: CSS variables

## Core Business Logic

### Ski Specification Calculations

The `SkiSpecService` implements these algorithms:

1. **Surface Area** (v1.0.0):

   ```typescript
   avgWidth = (tip + waist + tail) / 3;
   surfaceArea = (length * avgWidth) / 10; // cm²
   ```

2. **Relative Weight**:

   ```typescript
   relativeWeight = weight / surfaceArea; // g/cm²
   ```

3. **Algorithm Versioning**: Each calculation is versioned (`algorithm_version` field) to enable future recalculations if algorithms change.

### Security Patterns

- **IDOR Prevention**: All service methods verify `user_id` ownership before operations
- **Generic Error Messages**: Return "not found" for both non-existent and unauthorized resources to prevent information disclosure
- **Two-Level Verification**: For nested resources (e.g., notes), verify parent resource ownership first

### Notes Feature

- Each ski specification can have multiple notes
- Notes are managed through nested endpoints: `/api/ski-specs/[specId]/notes`
- Notes count is aggregated in `SkiSpecDTO` (`notes_count` field)
- Cascade delete: Deleting a ski spec automatically deletes associated notes

## Code Style Guidelines

### General

- Use arrow function notation where possible
- Prioritize error handling and edge cases at the beginning of functions
- Use early returns for error conditions (avoid nested if statements)
- Place the happy path last in functions
- Avoid unnecessary `else` statements (use if-return pattern)
- Use guard clauses for preconditions and invalid states

### TypeScript

- **Path alias**: Use `@/*` for imports (e.g., `@/types/api.types`)
- **Type safety**: Leverage TypeScript strict mode (extends `astro/tsconfigs/strict`)
- **Explicit types**: Always define return types for functions
- **No `any`**: Avoid `any` type; use `unknown` for uncertain types

### React

- Functional components only, with hooks
- Component signature: `const ComponentName: React.FC<Props> = (props) => {}`
- Extract reusable logic into custom hooks (`src/components/hooks`)
- Performance: Use `React.memo()`, `useCallback`, `useMemo` for optimization
- React Compiler ESLint plugin is enabled for automatic optimization detection
- Accessibility: Use `useId()` for unique IDs in ARIA attributes
- Existing custom hooks in `src/components/hooks/`:
  - `useSkiSpecs` - Fetching and managing ski specifications
  - `useAuth` - Authentication state management
  - `useFocusTrap` - Accessibility focus management
  - `useSkiSpecForm` - Form state for ski spec creation/editing
  - `useSkiSpecMutation` - Mutations for ski spec CRUD operations
  - `useSkiSpecsUrlState` - URL state synchronization for filters and sorting

### Tailwind CSS

- Use `@layer` directive for organizing styles (components, utilities, base)
- Prefer theme-aligned styling using design tokens exposed via CSS variables
- Use arbitrary values with square brackets (e.g., `w-[123px]`) only when theme values don't fit the use case
- Implement dark mode with `dark:` variant
- Use responsive variants (`sm:`, `md:`, `lg:`) for adaptive designs
- Leverage state variants (`hover:`, `focus-visible:`, `active:`)

### Accessibility (ARIA)

- Use ARIA landmarks to identify page regions (`main`, `navigation`, `search`)
- Apply appropriate ARIA roles to custom interface elements
- Set `aria-expanded` and `aria-controls` for expandable content
- Use `aria-live` regions for dynamic content updates
- Apply `aria-label` or `aria-labelledby` for elements without visible labels
- Use `aria-describedby` for form inputs or complex elements
- Avoid redundant ARIA that duplicates native HTML semantics

## API Design Patterns

### Response Formats

- **Success**: Return typed DTO or paginated response
- **Error**: Return `ApiErrorResponse` with:
  ```typescript
  {
    error: string,
    code?: string,
    details?: ValidationErrorDetail[],
    timestamp?: string
  }
  ```

### Pagination

All list endpoints return:

```typescript
{
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    total_pages: number
  }
}
```

### Comparison Feature

- Compare 2-4 ski specifications via `/api/ski-specs/compare?ids=uuid1,uuid2,...`
- Returns `SkiSpecComparisonDTO` (excludes metadata fields like `user_id`, timestamps)

## Important Development Notes

1. **Husky + lint-staged**: Pre-commit hooks run ESLint on `.ts`, `.tsx`, `.astro` files and Prettier on `.json`, `.css`, `.md` files

2. **Server-Side Rendering**: Astro is configured with `output: "server"` and Node.js adapter in standalone mode

3. **Port Configuration**: Dev server runs on port 3000

4. **Database Migrations**: Use Supabase CLI for migrations (check `.cursor/rules/db-supabase-migrations.mdc` for guidelines)

5. **CSV Import/Export**: MVP includes CSV validation with detailed error reporting (see `ImportResponse` type in `api.types.ts`)

6. **Algorithm Version Tracking**: Always set `algorithm_version` when creating/updating specs to enable future recalculation auditing

7. **Service Layer TODO**: `listSkiSpecs` currently uses N+1 pattern for notes count aggregation - optimize with single query if performance becomes an issue

8. **Testing**: No test framework is currently configured. When adding tests, consider Vitest for unit tests and Playwright for E2E tests (both have good Astro integration)
