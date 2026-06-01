// Workspace-scoped UI preferences in localStorage.
//
// Each workspace gets its own pref bag (mismatch filter chips, schema-tree
// filter query, etc.) so switching workspaces restores that workspace's view.
// localStorage is the right tier here — these are display-only and shouldn't
// survive a session import or fight a sync layer for the workspace identity.

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface UIPrefs {
  // PR I — selected mismatch kinds (empty array = all)
  mismatchActiveKinds: string[];
  // PR I — collapsed mismatch group pathKeys
  mismatchCollapsedGroups: string[];
  // PR J — schema-tree filter query
  schemaFilter: string;
  // Records sidebar — collapsed (strip) vs expanded (full pane). Defaults
  // collapsed so the schema dominates until the user asks to see records.
  recordsSidebarCollapsed: boolean;
  // New-workspace onboarding wizard — true once the user has finished or
  // skipped it. Per-workspace localStorage so the worst case after a clear
  // is seeing it once more.
  wizardCompleted: boolean;
}

const DEFAULT_PREFS: UIPrefs = {
  mismatchActiveKinds: [],
  mismatchCollapsedGroups: [],
  schemaFilter: "",
  recordsSidebarCollapsed: true,
  wizardCompleted: false,
};

function storageKey(workspaceId: string): string {
  return `schemagen.uiPrefs.${workspaceId}`;
}

// Read + persist a single pref key. The whole pref bag is stored under one
// key per workspace; we just slice/patch on access.
export function useUIPref<K extends keyof UIPrefs>(
  workspaceId: string,
  key: K,
): [UIPrefs[K], (value: UIPrefs[K]) => void] {
  const [bag, setBag] = useLocalStorage<UIPrefs>(storageKey(workspaceId), DEFAULT_PREFS);

  const value = bag[key] ?? DEFAULT_PREFS[key];
  const set = useCallback(
    (next: UIPrefs[K]) => {
      setBag({ ...bag, [key]: next });
    },
    [bag, key, setBag],
  );
  return [value, set];
}
