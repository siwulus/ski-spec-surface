import { useState, useEffect, useCallback } from "react";
import type { ListSkiSpecsQuery } from "@/types/api.types";

const DEFAULT_QUERY_STATE: ListSkiSpecsQuery = {
  page: 1,
  limit: 20,
  sort_by: "created_at",
  sort_order: "desc",
  search: "",
};

type DialogAction = "new" | null;

interface SkiSpecsUrlState {
  queryState: ListSkiSpecsQuery;
  updateQueryState: (updates: Partial<ListSkiSpecsQuery>) => void;
  dialogAction: DialogAction;
  setDialogAction: (action: DialogAction) => void;
  openDialog: () => void;
  closeDialog: () => void;
}

/**
 * Unified hook for managing all URL state for ski-specs page
 * Handles both grid parameters (pagination, sorting, search) and dialog state
 */
export const useSkiSpecsUrlState = (): SkiSpecsUrlState => {
  // Initialize state from URL on client-side only
  const [queryState, setQueryState] = useState<ListSkiSpecsQuery>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_QUERY_STATE;
    }

    const params = new URLSearchParams(window.location.search);
    return {
      page: parseInt(params.get("page") || String(DEFAULT_QUERY_STATE.page), 10),
      limit: parseInt(params.get("limit") || String(DEFAULT_QUERY_STATE.limit), 10),
      sort_by: (params.get("sort_by") as ListSkiSpecsQuery["sort_by"]) || DEFAULT_QUERY_STATE.sort_by,
      sort_order: (params.get("sort_order") as ListSkiSpecsQuery["sort_order"]) || DEFAULT_QUERY_STATE.sort_order,
      search: params.get("search") || DEFAULT_QUERY_STATE.search,
    };
  });

  const [dialogAction, setDialogActionState] = useState<DialogAction>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "new" ? "new" : null;
  });

  /**
   * Update URL without page reload using History API
   * Manages all URL parameters in one place
   */
  const updateURL = useCallback((newQueryState: ListSkiSpecsQuery, newDialogAction: DialogAction) => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams();

    // Add dialog action parameter
    if (newDialogAction === "new") {
      params.set("action", "new");
    }

    // Add query parameters (only non-default values)
    if (newQueryState.page !== DEFAULT_QUERY_STATE.page) {
      params.set("page", String(newQueryState.page));
    }

    if (newQueryState.limit !== DEFAULT_QUERY_STATE.limit) {
      params.set("limit", String(newQueryState.limit));
    }

    if (newQueryState.sort_by !== DEFAULT_QUERY_STATE.sort_by) {
      params.set("sort_by", newQueryState.sort_by);
    }

    if (newQueryState.sort_order !== DEFAULT_QUERY_STATE.sort_order) {
      params.set("sort_order", newQueryState.sort_order);
    }

    if (newQueryState.search) {
      params.set("search", newQueryState.search);
    }

    // Build new URL
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;

    // Update URL without page reload
    window.history.pushState({}, "", newUrl);
  }, []);

  /**
   * Update query state and sync with URL
   */
  const updateQueryState = useCallback(
    (updates: Partial<ListSkiSpecsQuery>) => {
      const newState = { ...queryState, ...updates };
      setQueryState(newState);
      updateURL(newState, dialogAction);
    },
    [queryState, dialogAction, updateURL]
  );

  /**
   * Update dialog action and sync with URL
   */
  const setDialogAction = useCallback(
    (action: DialogAction) => {
      setDialogActionState(action);
      updateURL(queryState, action);
    },
    [queryState, updateURL]
  );

  /**
   * Convenience method to open dialog
   */
  const openDialog = useCallback(() => {
    setDialogAction("new");
  }, [setDialogAction]);

  /**
   * Convenience method to close dialog
   */
  const closeDialog = useCallback(() => {
    setDialogAction(null);
  }, [setDialogAction]);

  /**
   * Handle browser back/forward navigation
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);

      // Update query state from URL
      setQueryState({
        page: parseInt(params.get("page") || String(DEFAULT_QUERY_STATE.page), 10),
        limit: parseInt(params.get("limit") || String(DEFAULT_QUERY_STATE.limit), 10),
        sort_by: (params.get("sort_by") as ListSkiSpecsQuery["sort_by"]) || DEFAULT_QUERY_STATE.sort_by,
        sort_order: (params.get("sort_order") as ListSkiSpecsQuery["sort_order"]) || DEFAULT_QUERY_STATE.sort_order,
        search: params.get("search") || DEFAULT_QUERY_STATE.search,
      });

      // Update dialog action from URL
      setDialogActionState(params.get("action") === "new" ? "new" : null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return {
    queryState,
    updateQueryState,
    dialogAction,
    setDialogAction,
    openDialog,
    closeDialog,
  };
};
