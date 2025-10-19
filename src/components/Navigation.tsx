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

interface NavigationItem {
  label: string;
  href: string;
}

const navigationItems: NavigationItem[] = [
  { label: "Home", href: "/" },
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
    return <div className="h-9 w-full max-w-xs" aria-hidden="true" />;
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
