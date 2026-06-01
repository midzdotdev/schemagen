// Sets the records filter AND ensures the sidebar is visible so the user
// sees the result of their click. Used by inspector / mismatch panel
// buttons that surface matching records.

import { useCallback } from "react";
import { useStore } from "@/state/store";
import type { RecordsFilter } from "@/state/types";
import { useUIPref } from "./useUIPrefs";

export function useShowRecordsFilter(): (filter: RecordsFilter) => void {
  const workspaceId = useStore((s) => s.workspaceId);
  const setRecordsFilter = useStore((s) => s.setRecordsFilter);
  const [, setCollapsed] = useUIPref(workspaceId, "recordsSidebarCollapsed");

  return useCallback(
    (filter: RecordsFilter) => {
      setRecordsFilter(filter);
      setCollapsed(false);
    },
    [setRecordsFilter, setCollapsed],
  );
}
