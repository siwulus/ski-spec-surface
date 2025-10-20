<!-- b66472e8-8150-4062-b290-b1dabc13a547 45d8f9ac-ccbb-4da5-b507-c3e2253dd991 -->

# Refactor Ski Dimensions Section with Visual Diagram

## Overview

Transform the dimensions display from a grid layout to a visual ski diagram with measurements positioned to match the SVG arrows, adding tooltips and icons for better UX.

## Implementation Steps

### 1. Install Tooltip Component

Install the shadcn/ui Tooltip component which is required but not currently in the project:

```bash
npx shadcn@latest add tooltip
```

### 2. Refactor SkiSpecCard Component

Update `src/components/SkiSpecCard.tsx` to implement the new design:

#### Import Changes

Add imports for:

- `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` from `@/components/ui/tooltip`
- `CircleDot` (for radius) and `Dumbbell` (for weight) icons from `lucide-react`

#### Replace Dimensions Section (lines 33-44)

Replace the current grid layout with:

1. **Container Structure**
   - Outer wrapper with `space-y-3` for vertical spacing
   - Title: "Dimensions" heading remains

2. **Visual Ski Diagram**
   - Container: `relative` positioned wrapper with appropriate padding
   - **Width values above ski**: Horizontal flex container with three values:
     - Tail (left): `{spec.tail} mm` with tooltip "Tail"
     - Waist (center): `{spec.waist} mm` with tooltip "Waist"
     - Tip (right): `{spec.tip} mm` with tooltip "Tip"
     - Use `justify-between` or `justify-around` to align with SVG arrows
     - Style: text-sm, font-medium

   - **Ski SVG**: `<img src="/ski-spec.svg" alt="Ski dimensions diagram" />` with appropriate sizing (e.g., `w-full h-auto`)

   - **Length below ski**: Centered value `{spec.length} cm` with tooltip "Length"
     - Style: text-sm, font-medium, text-center

3. **Bottom Row with Radius and Weight**
   - Flex container with `justify-between` and `items-center`
   - **Radius (left)**:
     - Icon: `<CircleDot className="h-4 w-4" />`
     - Value: `{spec.radius} m`
     - Tooltip: "Radius"
     - Style: flex items-center gap-1, text-sm

   - **Weight (right)**:
     - Icon: `<Dumbbell className="h-4 w-4" />`
     - Value: `{spec.weight} g`
     - Tooltip: "Weight"
     - Style: flex items-center gap-1, text-sm

#### Tooltip Implementation Pattern

Wrap each value with TooltipProvider and Tooltip:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help">
        {value} {unit}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 3. Styling Details

- Use semantic color classes: `text-foreground` for values, `text-muted-foreground` for icons
- Ensure proper spacing with Tailwind utilities: `space-y-2`, `gap-1`, etc.
- Add hover states where appropriate
- Maintain consistent font sizes: `text-sm` for most values

### 4. SpecValue Component

Use the `SpecValue` component for displaaing the values, this is the intended component for displaing value + unit

## Files to Modify

- `src/components/SkiSpecCard.tsx` - Main refactoring work
- `src/components/ui/tooltip.tsx` - Will be created by shadcn CLI

## Visual Layout Reference

```
Dimensions
┌─────────────────────────────┐
│  110mm    98mm      125mm   │  ← Width values with tooltips
│  ─────────────────────────  │
│  ╱                       ╲  │  ← SVG ski image
│ ╱                         ╲ │
│ ───────────────────────────│
│          182 cm             │  ← Length with tooltip
│                             │
│  ⊙ 15 m          🏋 1200 g │  ← Radius & Weight with icons/tooltips
└─────────────────────────────┘
```
