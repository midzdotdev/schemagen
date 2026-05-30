// Workspace-scoped UI preferences in localStorage.
//
// Each workspace gets its own pref bag (mismatch filter chips, schema-tree
// filter query, etc.) so switching workspaces restores that workspace's view.
// localStorage is the right tier here — these are display-only and shouldn't
// survive a session import or fight a sync layer for the workspace identity.

import { useCallback, useEffect, useState } from "react";

export interface UIPrefs {
  // PR I — selected mismatch kinds (empty set = all)
  mismatchActiveKinds: string[];
  // PR I — collapsed mismatch group pathKeys
  mismatchCollapsedGroups: string[];
  // PR J — schema-tree filter query
  schemaFilter: string;
}

const DEFAULT_PREFS: UIPrefs = {
  mismatchActiveKinds: [],
  mismatchCollapsedGroups: [],
  schemaFilter: "",
};

function storageKey(workspaceId: string): string {
  return `schemagen.uiPrefs.${workspaceId}`;
}

function read(workspaceId: string): UIPrefs {
  if (!workspaceId || typeof localStorage === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<UIPrefs>;
    return {
      mismatchActiveKinds: parsed.mismatchActiveKinds ?? DEFAULT_PREFS.mismatchActiveKinds,
      mismatchCollapsedGroups:
        parsed.mismatchCollapsedGroups ?? DEFAULT_PREFS.mismatchCollapsedGroups,
      schemaFilter: parsed.schemaFilter ?? DEFAULT_PREFS.schemaFilter,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function write(workspaceId: string, prefs: UIPrefs): void {
  if (!workspaceId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(prefs));
  } catch {
    // Quota / disabled storage — silently drop. Prefs are best-effort UX, not
    // load-bearing state, so a write failure shouldn't bubble up.
  }
}

// Read + persist a single pref key. Subscribers to the same workspace stay in
// sync within the tab via the returned setter; cross-tab sync is out of scope.
export function useUIPref<K extends keyof UIPrefs>(
  workspaceId: string,
  key: K,
): [UIPrefs[K], (value: UIPrefs[K]) => void] {
  const [value, setValue] = useState<UIPrefs[K]>(() => read(workspaceId)[key]);

  // Re-read when the workspace identity changes (switcher).
  useEffect(() => {
    setValue(read(workspaceId)[key]);
  }, [workspaceId, key]);

  const set = useCallback(
    (next: UIPrefs[K]) => {
      setValue(next);
      const current = read(workspaceId);
      write(workspaceId, { ...current, [key]: next });
    },
    [workspaceId, key],
  );

  return [value, set];
}
