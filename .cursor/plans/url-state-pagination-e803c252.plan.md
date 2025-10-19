<!-- e803c252-62e1-403c-9585-8f2f79ec0541 2a8d00f6-e7d1-4509-ae2a-2a22a6cebd40 -->
# Add URL State Management for Ski Specs Pagination

## Overview

Implement client-side URL state management using Browser's History API to handle pagination, sorting, and search parameters without page reloads. This iteration focuses on state management infrastructure without UI controls.

## Implementation Steps

### 1. Create URL State Management Hook

Create `src/components/hooks/useURLState.ts` with:

- Custom hook that reads URL search params on mount
- State management for: page, limit, sort_by, sort_order, search
- Function to update URL without page reload using `window.history.pushState`
- Handle browser back/forward navigation with `popstate` event listener
- Default values: page=1, limit=20, sort_by='created_at', sort_order='desc', search=''

### 2. Update SkiSpecList Component

Modify `src/components/SkiSpecList.tsx`:

- Replace hardcoded pagination values with `useURLState` hook
- Pass URL state values to `useSkiSpecs` hook
- Component will re-render when URL state changes
- Remove hardcoded values: `page: 1, limit: 100`

### 3. Sync URL on Initial Load

In `src/pages/ski-specs.astro`:

- Keep existing implementation (no changes needed)
- React component will handle URL state client-side

## Key Files to Modify

- **New file**: `src/components/hooks/useURLState.ts` - URL state management hook
- **Update**: `src/components/SkiSpecList.tsx` - Replace hardcoded values with URL state

## Technical Details

The hook will:

- Initialize state from URL search params on component mount
- Sync URL changes without triggering page reload
- Support browser navigation (back/forward buttons)
- Maintain type safety with TypeScript
- Handle SSR safety checks (`typeof window !== 'undefined'`)

##

### To-dos

- [ ] Create useURLState hook in src/components/hooks/useURLState.ts with URL state management logic
- [ ] Update SkiSpecList component to use useURLState hook instead of hardcoded values
- [ ] Test URL state management works correctly without page reloads