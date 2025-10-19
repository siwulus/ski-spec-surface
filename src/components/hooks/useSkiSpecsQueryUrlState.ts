import { useState, useEffect, useCallback } from "react";
import type { ListSkiSpecsQuery } from "@/types/api.types";
const DEFAULT_STATE: ListSkiSpecsQuery = {
  page: 1,
  limit: 20,
  sort_by: "created_at",
  sort_order: "desc",
  search: "",
};

/**
 * Custom hook for managing URL state with Browser's History API
 * Handles pagination, sorting, and search parameters without page reloads
 */
export const useSkiSpecsQueryUrlState = () => {
  const [state, setState] = useState<ListSkiSpecsQuery>(() => {
    // Initialize from URL on client-side only
    if (typeof window === "undefined") {
      return DEFAULT_STATE;
    }

    const params = new URLSearchParams(window.location.search);
    return {
      page: parseInt(params.get("page") || String(DEFAULT_STATE.page), 10),
      limit: parseInt(params.get("limit") || String(DEFAULT_STATE.limit), 10),
      sort_by: (params.get("sort_by") as ListSkiSpecsQuery["sort_by"]) || DEFAULT_STATE.sort_by,
      sort_order: (params.get("sort_order") as ListSkiSpecsQuery["sort_order"]) || DEFAULT_STATE.sort_order,
      search: params.get("search") || DEFAULT_STATE.search,
    };
  });

  /**
   * Update URL without page reload using History API
   */
  const updateURL = useCallback((newState: ListSkiSpecsQuery) => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const params = url.searchParams;

    // Update or remove parameters based on default values
    if (newState.page !== DEFAULT_STATE.page) {
      params.set("page", String(newState.page));
    } else {
      params.delete("page");
    }

    if (newState.limit !== DEFAULT_STATE.limit) {
      params.set("limit", String(newState.limit));
    } else {
      params.delete("limit");
    }

    if (newState.sort_by !== DEFAULT_STATE.sort_by) {
      params.set("sort_by", newState.sort_by);
    } else {
      params.delete("sort_by");
    }

    if (newState.sort_order !== DEFAULT_STATE.sort_order) {
      params.set("sort_order", newState.sort_order);
    } else {
      params.delete("sort_order");
    }

    if (newState.search) {
      params.set("search", newState.search);
    } else {
      params.delete("search");
    }

    // Update URL without page reload
    window.history.pushState({}, "", url.toString());
  }, []);

  /**
   * Update state and sync with URL
   */
  const updateState = useCallback(
    (updates: Partial<ListSkiSpecsQuery>) => {
      const newState = { ...state, ...updates };
      setState(newState);
      updateURL(newState);
    },
    [state, updateURL]
  );

  /**
   * Handle browser back/forward navigation
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setState({
        page: parseInt(params.get("page") || String(DEFAULT_STATE.page), 10),
        limit: parseInt(params.get("limit") || String(DEFAULT_STATE.limit), 10),
        sort_by: (params.get("sort_by") as ListSkiSpecsQuery["sort_by"]) || DEFAULT_STATE.sort_by,
        sort_order: (params.get("sort_order") as ListSkiSpecsQuery["sort_order"]) || DEFAULT_STATE.sort_order,
        search: params.get("search") || DEFAULT_STATE.search,
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return {
    state,
    updateState,
  };
};
