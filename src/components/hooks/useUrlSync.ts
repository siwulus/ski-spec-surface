import { useEffect } from "react";

/**
 * Custom hook for synchronizing modal open state with URL
 * without triggering page reload
 *
 * @param open - Current modal open state
 * @param onOpenChange - Handler to change open state
 */
export const useUrlSync = (open: boolean, onOpenChange: (open: boolean) => void) => {
  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const isNewPath = window.location.pathname === "/ski-specs/new";
      onOpenChange(isNewPath);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [onOpenChange]);

  // Update URL when modal open state changes
  useEffect(() => {
    if (open && window.location.pathname !== "/ski-specs/new") {
      window.history.pushState({}, "", "/ski-specs/new");
    } else if (!open && window.location.pathname === "/ski-specs/new") {
      window.history.pushState({}, "", "/ski-specs");
    }
  }, [open]);
};
