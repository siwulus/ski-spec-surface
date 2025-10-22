import { useState, useEffect } from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useAuth } from "@/components/hooks/useAuth";

interface NavigationProps {
  currentPath: string;
}

interface NavigationItem {
  label: string;
  href: string;
  /** Whether this item should only be shown to authenticated users */
  requiresAuth?: boolean;
  /** Whether this item should only be shown to unauthenticated users */
  guestOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "Ski Specs", href: "/ski-specs", requiresAuth: true },
];

export default function Navigation({ currentPath }: NavigationProps) {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="h-9 w-full max-w-xs" aria-hidden="true" />;
  }

  // Filter navigation items based on authentication status
  const visibleItems = navigationItems.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.guestOnly && isAuthenticated) return false;
    return true;
  });

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {visibleItems.map((item) => {
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
