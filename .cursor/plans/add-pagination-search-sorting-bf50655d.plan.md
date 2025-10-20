<!-- bf50655d-233f-4ef6-bded-e90317fd445e 0cec713d-181c-4adc-926c-1c887d71c856 -->

# Implementation Plan: Pagination, Search, and Sorting UI for Ski Specs List

## Overview

Add interactive controls for pagination, search, and sorting to the ski specifications list page. All controls will synchronize with URL query parameters using the existing `useSkiSpecsQueryUrlState` hook.

## Current State Analysis

**Existing Components:**

- `SkiSpecGrid.tsx` - Main grid component displaying spec cards
- `useSkiSpecsQueryUrlState.ts` - URL state management (page, limit, sort_by, sort_order, search)
- `useSkiSpecs.ts` - Data fetching hook that returns `{ specs, pagination, isLoading, error, refetch }`

**Installed shadcn/ui components:** button, card, badge, tooltip, separator, sonner, navigation-menu

**Missing components needed:** input, select, pagination

## Implementation Steps

### 1. Install Required shadcn/ui Components

```bash
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add pagination
```

These will be added to `src/components/ui/`.

### 2. Create SkiSpecToolbar Component

**File:** `src/components/SkiSpecToolbar.tsx`

**Purpose:** Render search input and sorting controls above the grid

**Component Structure:**

```tsx
interface SkiSpecToolbarProps {
  search: string;
  sortBy: ListSkiSpecsQuery["sort_by"];
  sortOrder: ListSkiSpecsQuery["sort_order"];
  onSearchChange: (value: string) => void;
  onSortByChange: (value: ListSkiSpecsQuery["sort_by"]) => void;
  onSortOrderChange: (value: ListSkiSpecsQuery["sort_order"]) => void;
}
```

**Implementation Details:**

1. **Search Input:**
   - Use shadcn `Input` component with search icon
   - Implement 300ms debounce using `useDebouncedCallback` from `use-debounce` package (install if needed) or custom debounce hook
   - Position: left side of toolbar
   - Placeholder: "Search by name or description..."
   - Clear button when search has value

2. **Sort By Select:**
   - Use shadcn `Select` component
   - Options (from API types):
     - "created_at" → "Date Added"
     - "name" → "Name"
     - "length" → "Length"
     - "surface_area" → "Surface Area"
     - "relative_weight" → "Relative Weight"
   - Label: "Sort by"
   - Default: "created_at"

3. **Sort Order Toggle:**
   - Use two `Button` components with variant="outline" or "ghost"
   - One button for "asc" (↑ icon), one for "desc" (↓ icon)
   - Highlight active sort order with variant="secondary"
   - Alternative: Use a `Select` with "Ascending" / "Descending" options
   - Recommendation: **Icon buttons** for better UX and space efficiency

4. **Layout:**
   - Flexbox layout: `flex flex-row items-center justify-between gap-4`
   - Left: Search input (flex-grow)
   - Right: Sort controls grouped together
   - Mobile: Stack vertically with `flex-col sm:flex-row`

**Example JSX Structure:**

```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
  <div className="relative w-full sm:w-96">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="search"
      placeholder="Search by name or description..."
      value={localSearch}
      onChange={handleSearchChange}
      className="pl-10"
    />
  </div>
  <div className="flex items-center gap-2">
    <Select value={sortBy} onValueChange={onSortByChange}>
      {/* Select options */}
    </Select>
    <div className="flex border rounded-md">
      <Button variant={sortOrder === "asc" ? "secondary" : "ghost"} size="sm" onClick={() => onSortOrderChange("asc")}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        variant={sortOrder === "desc" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onSortOrderChange("desc")}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
```

**Debounce Implementation:**

- Install `use-debounce`: `pnpm add use-debounce`
- Use `useDebouncedCallback` from the library
- Store immediate search value in local state
- Call `onSearchChange` (which updates URL) after 300ms delay

```tsx
import { useDebouncedCallback } from "use-debounce";

const [localSearch, setLocalSearch] = useState(search);

const debouncedSearchChange = useDebouncedCallback((value: string) => {
  onSearchChange(value);
}, 300);

const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setLocalSearch(value);
  debouncedSearchChange(value);
};
```

**Icons needed:**

- `Search` from lucide-react
- `ArrowUp` from lucide-react
- `ArrowDown` from lucide-react

### 3. Create SkiSpecPagination Component

**File:** `src/components/SkiSpecPagination.tsx`

**Purpose:** Render pagination controls below the grid

**Component Structure:**

```tsx
interface SkiSpecPaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}
```

**Implementation Details:**

1. Use shadcn `Pagination` component with its sub-components:
   - `PaginationContent`
   - `PaginationItem`
   - `PaginationLink`
   - `PaginationPrevious`
   - `PaginationNext`
   - `PaginationEllipsis`

2. **Display Logic:**
   - Show current page and total pages
   - Show Previous/Next buttons
   - Show page numbers with ellipsis for large ranges
   - Disable Previous on page 1
   - Disable Next on last page

3. **Layout:**
   - Position: `flex justify-end mt-6` (bottom right)
   - Add text summary: "Page X of Y" alongside controls

4. **Page Range Logic:**
   - Always show first page, last page, current page
   - Show 2 pages before and after current (if available)
   - Use ellipsis for gaps

**Example JSX Structure:**

```tsx
<div className="flex items-center justify-end gap-4 mt-6">
  <p className="text-sm text-muted-foreground">
    Page {pagination.page} of {pagination.total_pages}
  </p>
  <Pagination>
    <PaginationContent>
      <PaginationItem>
        <PaginationPrevious onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1} />
      </PaginationItem>
      {/* Page numbers with ellipsis logic */}
      <PaginationItem>
        <PaginationNext
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.total_pages}
        />
      </PaginationItem>
    </PaginationContent>
  </Pagination>
</div>
```

**Edge Cases:**

- Handle when `total_pages === 0` (no results): hide pagination
- Handle when `total_pages === 1` (single page): optional - can hide or disable controls

### 4. Update SkiSpecGrid Component

**File:** `src/components/SkiSpecGrid.tsx`

**Changes:**

1. Import new components:

```tsx
import { SkiSpecToolbar } from "@/components/SkiSpecToolbar";
import { SkiSpecPagination } from "@/components/SkiSpecPagination";
```

2. Destructure `updateState` from `useSkiSpecsQueryUrlState`:

```tsx
const { state, updateState } = useSkiSpecsQueryUrlState();
```

3. Create handler functions:

```tsx
const handleSearchChange = (search: string) => {
  updateState({ search, page: 1 }); // Reset to page 1 on new search
};

const handleSortByChange = (sort_by: ListSkiSpecsQuery["sort_by"]) => {
  updateState({ sort_by });
};

const handleSortOrderChange = (sort_order: ListSkiSpecsQuery["sort_order"]) => {
  updateState({ sort_order });
};

const handlePageChange = (page: number) => {
  updateState({ page });
  // Optional: scroll to top after page change
  window.scrollTo({ top: 0, behavior: "smooth" });
};
```

4. Update JSX structure:

```tsx
return (
  <>
    <SkiSpecToolbar
      search={state.search}
      sortBy={state.sort_by}
      sortOrder={state.sort_order}
      onSearchChange={handleSearchChange}
      onSortByChange={handleSortByChange}
      onSortOrderChange={handleSortOrderChange}
    />

    {/* Existing loading/error/empty state logic */}
    {isLoading && <SkiSpecGridSkeleton />}
    {error && <ErrorState />}
    {!specs || specs.length === 0 ? (
      <EmptyState />
    ) : (
      <>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {specs.map((spec) => (
            <SkiSpecCard key={spec.id} spec={spec} />
          ))}
        </div>

        {pagination && pagination.total_pages > 1 && (
          <SkiSpecPagination pagination={pagination} onPageChange={handlePageChange} />
        )}
      </>
    )}
  </>
);
```

### 5. Optional: Add Items Per Page Selector

**Enhancement:** Allow users to change the `limit` parameter

**Implementation:**

- Add a `Select` component in `SkiSpecToolbar`
- Options: 5, 10, 20, 50
- Label: "Show per page"
- Position: Between search and sort controls, or at the end
- Update handler:

```tsx
const handleLimitChange = (limit: number) => {
  updateState({ limit, page: 1 }); // Reset to page 1 on limit change
};
```

## Type Safety

All types are already defined in `@/types/api.types.ts`:

- `ListSkiSpecsQuery` - for state and parameters
- `PaginationMeta` - for pagination data
- Import these types in new components

## Accessibility (a11y)

1. **Search input:**
   - `aria-label="Search ski specifications"`
   - Clear button with `aria-label="Clear search"`

2. **Sort controls:**
   - Label for Select: use `<Label>` component or aria-label
   - Button aria-labels: "Sort ascending", "Sort descending"

3. **Pagination:**
   - Proper button labels for screen readers
   - Current page marked with `aria-current="page"`
   - Disabled state properly communicated

4. **Keyboard navigation:**
   - All controls accessible via Tab
   - Enter/Space to activate buttons
   - Arrow keys work in Select dropdowns

## Styling Guidelines

**Follow Tailwind theme tokens:**

- Use `text-muted-foreground` for secondary text
- Use `border` and `border-border` for borders
- Use responsive classes: `sm:`, `md:`, `lg:`
- Use `gap-4` or `gap-6` for consistent spacing
- Use `rounded-md` or `rounded-lg` for corners

**Component spacing:**

- Toolbar: `mb-6` below it
- Pagination: `mt-6` above it
- Card grid: no margin (as it is now)

## Error Handling

No new error handling needed - existing error handling in `useSkiSpecs` covers API errors. Errors are displayed by existing `ErrorState` component in `SkiSpecGrid`.

## Dependencies to Install

```bash
pnpm add use-debounce
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add pagination
```

## Files to Create/Modify

**New files:**

1. `src/components/SkiSpecToolbar.tsx` - Search and sorting controls
2. `src/components/SkiSpecPagination.tsx` - Pagination controls

**Modified files:**

1. `src/components/SkiSpecGrid.tsx` - Integrate toolbar and pagination
2. `src/components/ui/input.tsx` - Auto-generated by shadcn
3. `src/components/ui/select.tsx` - Auto-generated by shadcn
4. `src/components/ui/pagination.tsx` - Auto-generated by shadcn

**Total estimated time:** 3-4 hours

## Visual Layout Reference

```
┌──────────────────────────────────────────────────────────┐
│ [Search input...................] [Sort▼] [↑][↓]        │  ← Toolbar
├──────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐                        │
│ │ Card 1 │ │ Card 2 │ │ Card 3 │                        │  ← Grid
│ └────────┘ └────────┘ └────────┘                        │
│ ┌────────┐ ┌────────┐ ┌────────┐                        │
│ │ Card 4 │ │ Card 5 │ │ Card 6 │                        │
│ └────────┘ └────────┘ └────────┘                        │
├──────────────────────────────────────────────────────────┤
│                        Page 1 of 3  [◀][1][2][3][▶]     │  ← Pagination
└──────────────────────────────────────────────────────────┘
```

## User Stories Coverage

This implementation addresses:

- **US-008:** Przeglądanie zapisanych specyfikacji - adds sorting and filtering
- **US-015:** Obsługa błędów walidacji - existing error handling continues to work
- **US-016:** Obsługa pustej listy specyfikacji - maintained in current implementation

## API Integration

No changes to API calls needed. The existing `useSkiSpecs` hook already accepts all required parameters:

```typescript
const { specs, pagination, isLoading, error } = useSkiSpecs({
  page: state.page,
  limit: state.limit,
  sort_by: state.sort_by,
  sort_order: state.sort_order,
  search: state.search,
});
```

The `updateState` function from `useSkiSpecsQueryUrlState` automatically:

1. Updates local React state
2. Updates URL query parameters
3. Triggers re-render
4. `useSkiSpecs` hook re-fetches with new parameters

### To-dos

- [x] Install required dependencies: use-debounce package and shadcn components (input, select, pagination)
- [x] Create SkiSpecToolbar component with search input (debounced), sort by select, and sort order toggle buttons
- [x] Create SkiSpecPagination component with page navigation controls and page summary
- [x] Update SkiSpecGrid to integrate SkiSpecToolbar above grid and SkiSpecPagination below grid with proper state handlers
- [x] Add optional items per page selector (10, 20, 50, 100) to SkiSpecToolbar
- [ ] Test all functionality: search debounce, sorting, pagination, items per page, URL state sync, edge cases, and accessibility
