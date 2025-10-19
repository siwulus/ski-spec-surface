<!-- ea817858-ce56-494b-8374-55b812f0ce84 017aaed1-ae8c-4de0-80e2-6a23e4115065 -->
# Main Application Layout Implementation Plan

## Overview

Implement the main skeleton layout for the Ski Surface Spec Extension application, including a header with logo and navigation, content area, and global toast notifications. The layout uses Astro 5 for the static structure with React 19 islands for interactive components (Navigation Menu and Sonner toasts). Authentication is excluded from this implementation.

## Prerequisites

### 1. Install shadcn/ui Components

Add required shadcn/ui components to the project:

```bash
npx shadcn@latest add navigation-menu sonner
```

**Note**: The shadcn/ui Sonner component is a wrapper around the `sonner` package that provides proper styling integration with shadcn/ui themes.

### 2. Verify Assets

Ensure logo exists at `/public/ski-surface-wordmark-only.svg` (already present in project).

## Component Structure

```
src/
├── layouts/
│   └── Layout.astro (update)
├── components/
│   ├── Header.astro (new)
│   ├── Navigation.tsx (new)
│   └── ui/
│       ├── navigation-menu.tsx (from shadcn)
│       └── sonner.tsx (from shadcn)
└── lib/
    └── toast.ts (new)
```

## Implementation Steps

### Step 1: Update Layout.astro

**File**: `src/layouts/Layout.astro`

Update the main layout to include header and toast provider:

```astro
---
import "../styles/global.css";
import Header from "@/components/Header.astro";
import { Toaster } from "@/components/ui/sonner";

interface Props {
  title?: string;
}

const { title = "Ski Surface Spec" } = Astro.props;
const currentPath = Astro.url.pathname;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
  </head>
  <body class="relative w-full mx-auto min-h-screen flex flex-col">
    <Header currentPath={currentPath} />
    <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
    <Toaster client:only="react" />
  </body>
</html>
```

**Key Points**:

- Pass `currentPath` to Header for active link highlighting
- Use `client:only="react"` for Toaster (no SSR needed)
- Main content area with responsive padding and max-width
- Flexbox layout for sticky footer support (future)

### Step 2: Create Header Component

**File**: `src/components/Header.astro`

```astro
---
import Navigation from "@/components/Navigation";

interface Props {
  currentPath: string;
}

const { currentPath } = Astro.props;
---

<header class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div class="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
    <div class="flex items-center gap-6">
      <a href="/ski-specs" class="flex items-center space-x-2" aria-label="Home">
        <img 
          src="/ski-surface-wordmark-only.svg" 
          alt="Ski Surface Spec" 
          class="h-8 w-auto"
        />
      </a>
      <Navigation currentPath={currentPath} client:load />
    </div>
  </div>
</header>
```

**Key Points**:

- Sticky header with backdrop blur effect
- Logo links to `/ski-specs` (main landing page)
- Pass `currentPath` to Navigation component
- Use `client:load` for Navigation to ensure interactivity
- Responsive container with consistent padding

### Step 3: Create Navigation Component

**File**: `src/components/Navigation.tsx`

```typescript
import { useState, useEffect } from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

interface NavigationProps {
  currentPath: string;
}

type NavigationItem = {
  label: string;
  href: string;
};

const navigationItems: NavigationItem[] = [
  { label: "Ski Specs", href: "/ski-specs" },
  { label: "Account", href: "/account" },
];

export default function Navigation({ currentPath }: NavigationProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="h-10 w-48" aria-hidden="true" />;
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {navigationItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuLink
                href={item.href}
                className={navigationMenuTriggerStyle()}
                active={isActive}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
```

**Key Points**:

- Uses shadcn NavigationMenu component
- Highlights active route with `aria-current`
- Handles hydration with mounted state
- Simple navigation without auth logic

### Step 4: Create Toast Utility

**File**: `src/lib/toast.ts`

```typescript
import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, { description });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, { description });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, { description });
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, { description });
  },
};
```

**Usage in components**:

```typescript
import { toast } from "@/lib/toast";

// Success toast
toast.success("Specification created", "Your ski spec was saved successfully");

// Error toast
toast.error("Failed to save", "Please check your input and try again");
```

## Accessibility Considerations

1. **Semantic HTML**: Use `<header>`, `<nav>`, `<main>` elements
2. **ARIA Labels**: 

   - Logo link has `aria-label="Home"`
   - Active nav link has `aria-current="page"`

3. **Keyboard Navigation**: NavigationMenu component handles focus management
4. **Skip Links** (future): Add skip-to-content link for keyboard users
5. **Color Contrast**: Ensure WCAG AA compliance with Tailwind color tokens

## Responsive Design

- **Mobile**: Stacked layout, hamburger menu (future enhancement)
- **Tablet**: Horizontal navigation with adequate spacing
- **Desktop**: Full navigation with max-width container

Current implementation shows all nav items horizontally. For mobile optimization in future iterations, consider:

- Hamburger menu for < 768px
- Slide-out drawer with NavigationMenu items
- Touch-friendly tap targets (min 44x44px)

## Testing Checklist

- [ ] Logo displays correctly and links to /ski-specs
- [ ] Navigation items show correctly
- [ ] Active route is highlighted
- [ ] Toast notifications appear and dismiss
- [ ] Layout is responsive on mobile/tablet/desktop
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Screen reader announces navigation correctly
- [ ] No hydration errors in console

## Future Enhancements

1. **Mobile Hamburger Menu**: Add responsive drawer for small screens
2. **Authentication Integration**: Add auth state management and conditional navigation
3. **User Avatar**: Show user profile picture in header when authenticated
4. **Breadcrumbs**: Add breadcrumb navigation for detail pages
5. **Footer**: Add footer with links and copyright
6. **Theme Toggle**: Dark/light mode switcher

### To-dos

- [ ] Install shadcn/ui Sheet and Toast components via CLI
- [ ] Create navigation configuration file with NavItem types
- [ ] Create Header component with logo and navigation integration
- [ ] Create Navigation component with conditional Compare link logic
- [ ] Create MobileMenu component using Sheet with accessibility features
- [ ] Create ToastProvider wrapper component
- [ ] Update Layout.astro with Header, ToastProvider, and modal portal
- [ ] Test layout functionality, responsiveness, and accessibility