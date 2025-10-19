<!-- 03a7dab3-fb13-463d-a29b-89eef02ed5b4 6eadaab6-7967-4ddc-97c5-1c5f28b8ae4e -->
# Ski Specifications List View - Implementation Plan

## Overview

Implement a simplified version of the Ski Specifications List View that displays ski specs as cards in a responsive grid layout. This initial version focuses on data presentation only, omitting pagination controls, toolbar, modals, and import/export functionality.

## Component Architecture

### 1. Page Component

**File:** `src/pages/ski-specs.astro` (modify existing)

Replace the current ToastTest section with:

```astro
---
import Layout from "../layouts/Layout.astro";
import SkiSpecList from "../components/SkiSpecList";
---

<Layout title="Ski Specifications">
  <div class="space-y-6">
    <header>
      <h1 class="text-3xl font-bold text-foreground">Ski Specifications</h1>
      <p class="mt-2 text-muted-foreground">
        Manage your ski specifications and compare different models.
      </p>
    </header>

    <SkiSpecList client:load />
  </div>
</Layout>
```

### 2. Main List Component

**File:** `src/components/SkiSpecList.tsx` (new)

**Purpose:** Container component that fetches and manages ski spec data, handles loading and empty states.

**Key Responsibilities:**

- Fetch ski specs from API endpoint on mount
- Manage loading, error, and data states
- Render grid of spec cards or empty state
- Handle error scenarios with toast notifications

**State Management:**

```typescript
- specs: SkiSpecDTO[] | null
- isLoading: boolean
- error: Error | null
```

**API Integration:**

- Endpoint: `GET /api/ski-specs?page=1&limit=100&sort_by=created_at&sort_order=desc`
- Use fetch API with error handling
- Ignore authentication it will be added in next steps

**Layout Structure:**

```tsx
{isLoading ? (
  <SkiSpecGridSkeleton />
) : specs && specs.length > 0 ? (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {specs.map(spec => <SkiSpecCard key={spec.id} spec={spec} />)}
  </div>
) : (
  <EmptyState />
)}
```

### 3. Individual Spec Card Component

**File:** `src/components/SkiSpecCard.tsx` (new)

**Purpose:** Display individual ski specification in card format using shadcn/ui Card components.

**Props:**

```typescript
interface SkiSpecCardProps {
  spec: SkiSpecDTO;
}
```

**Card Structure:**

```tsx
<Card>
  <CardHeader>
    <CardTitle>{spec.name}</CardTitle>
  </CardHeader>
  
  <CardContent className="space-y-4">
    {/* Dimensions Section */}
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Dimensions</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <SpecValue label="Length" value={spec.length} unit="cm" />
        <SpecValue label="Radius" value={spec.radius} unit="m" />
        <SpecValue label="Tip" value={spec.tip} unit="mm" />
        <SpecValue label="Waist" value={spec.waist} unit="mm" />
        <SpecValue label="Tail" value={spec.tail} unit="mm" />
        <SpecValue label="Weight" value={spec.weight} unit="g" />
      </div>
    </div>

    {/* Calculated Metrics Section */}
    <div className="space-y-2 border-t border-border pt-4">
      <h3 className="text-sm font-medium text-muted-foreground">Calculated Metrics</h3>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          Surface: {spec.surface_area.toFixed(2)} cm²
        </Badge>
        <Badge variant="secondary">
          Rel. Weight: {spec.relative_weight.toFixed(2)} g/cm²
        </Badge>
      </div>
    </div>
  </CardContent>

  <CardFooter className="border-t">
    <div className="flex items-center justify-between w-full">
      <span className="text-sm text-muted-foreground">
        {spec.notes_count} {spec.notes_count === 1 ? 'note' : 'notes'}
      </span>
    </div>
  </CardFooter>
</Card>
```

### 4. Spec Value Display Component

**File:** `src/components/SkiSpecCard.tsx` (inline helper)

**Purpose:** Consistent display of specification values with labels and units.

```typescript
interface SpecValueProps {
  label: string;
  value: number;
  unit: string;
}

const SpecValue: React.FC<SpecValueProps> = ({ label, value, unit }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}:</span>
    <span className="font-medium">
      {value} <span className="text-xs text-muted-foreground">{unit}</span>
    </span>
  </div>
);
```

### 5. Loading Skeleton Component

**File:** `src/components/SkiSpecGridSkeleton.tsx` (new)

**Purpose:** Display loading state with skeleton cards while fetching data.

**Implementation:**

- Render 6 skeleton cards in grid layout (2 rows of 3)
- Use `bg-muted animate-pulse` for skeleton effect
- Match card structure dimensions
```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {Array.from({ length: 6 }).map((_, index) => (
    <Card key={index}>
      <CardHeader>
        <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```


### 6. Empty State Component

**File:** `src/components/SkiSpecList.tsx` (inline)

**Purpose:** Display when no specifications exist (US-016).

**Structure:**

```tsx
<div className="flex flex-col items-center justify-center py-12 px-4">
  <div className="text-center space-y-4 max-w-md">
    <h2 className="text-2xl font-semibold text-foreground">
      No specifications yet
    </h2>
    <p className="text-muted-foreground">
      Get started by adding your first ski specification to compare different models
      and analyze their characteristics.
    </p>
    <div className="text-sm text-muted-foreground mt-2">
      Add button coming in next iteration
    </div>
  </div>
</div>
```

## API Integration

### Endpoint Configuration

**URL:** `/api/ski-specs`

**Method:** GET

**Query Parameters:**

- `page=1` (default)
- `limit=100` (fetch all for simplified version)
- `sort_by=created_at`
- `sort_order=desc`

### Fetch Implementation

```typescript
const fetchSkiSpecs = async (): Promise<SkiSpecDTO[]> => {
  const response = await fetch(
    '/api/ski-specs?page=1&limit=100&sort_by=created_at&sort_order=desc',
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch ski specifications');
  }

  const data: SkiSpecListResponse = await response.json();
  return data.data;
};
```

### Error Handling

- **401 Unauthorized:** Display error toast, redirect to login (future)
- **Network errors:** Display error toast with retry suggestion
- **500 Server errors:** Display generic error message
- All errors should use toast notifications from sonner

## Type Definitions

### Import Statements

```typescript
import type { SkiSpecDTO } from "@/types/api.types";
import type { SkiSpecListResponse } from "@/types/api.types";
```

### Component Props

All types are already defined in `src/types/api.types.ts`, no new types needed.

## Styling Guidelines

### Responsive Grid

```css
/* Mobile: 1 column */
grid-cols-1

/* Tablet (≥640px): 2 columns */
sm:grid-cols-2

/* Desktop (≥1024px): 3 columns */
lg:grid-cols-3
```

### Card Spacing

```css
/* Grid gap */
gap-6

/* Card internal spacing */
space-y-4 (between sections)
space-y-2 (within sections)
```

### Typography

- **Card title:** default weight from CardTitle component
- **Section headings:** `text-sm font-medium text-muted-foreground`
- **Values:** `font-medium`
- **Labels:** `text-muted-foreground`
- **Units:** `text-xs text-muted-foreground`

### Color Tokens

- Use `bg-card`, `text-card-foreground` for cards
- Use `text-muted-foreground` for secondary text
- Use `border-border` for dividers
- Use Badge `variant="secondary"` for calculated metrics

## Accessibility Considerations

### Semantic HTML

- Use `<h1>` for page title
- Use `<h2>` for empty state heading  
- Use `<h3>` for card section headings
- Maintain proper heading hierarchy

### ARIA Labels

- Card title should be main heading for screen readers
- Spec values should have proper label-value association
- Notes count should be announced properly

### Keyboard Navigation

- Cards should be focusable if they become interactive
- Maintain logical tab order

## Error Scenarios

### Network Failure

```typescript
catch (error) {
  console.error('Failed to fetch ski specs:', error);
  toast.error('Failed to load ski specifications', {
    description: 'Please check your connection and try again',
  });
  setError(error as Error);
}
```

### Empty Response

- Display EmptyState component
- Provide clear messaging
- Mention that add functionality is coming

### Implementation Steps

1. **Create SkiSpecCard.tsx**

   - Implement SpecValue helper component
   - Build card layout with all sections
   - Add proper styling and spacing

2. **Create SkiSpecGridSkeleton.tsx**

   - Implement loading skeleton
   - Match card dimensions and layout

3. **Create SkiSpecList.tsx**

   - Set up state management (specs, loading, error)
   - Implement fetch logic with useEffect
   - Add error handling with toast
   - Implement conditional rendering (loading/data/empty)

4. **Update ski-specs.astro**

   - Replace ToastTest with SkiSpecList
   - Add `client:load` directive

## Future Enhancements (Out of Scope)

- Pagination controls
- Search/filter toolbar
- Checkboxes for comparison selection
- Action buttons (edit, delete, compare)
- Create/Edit modals
- Import/Export functionality

## Notes

- Authentication is currently mocked in middleware with hardcoded userId
- Actual authentication flow will be implemented later
- Component uses `client:load` for data fetching on mount
- All API calls use relative URLs (assumes same-origin)