// Workspace-scoped UI preferences in localStorage.
//
// Each workspace gets its own pref bag (mismatch filter chips, schema-tree
// filter query, etc.) so switching workspaces restores that workspace's view.
// localStorage is the right tier here — these are display-only and shouldn't
// survive a session import or fight a sync layer for the workspace identity.

import { useCallback } from "react";
import { localStorageHelpers, useLocalStorage } from "./useLocalStorage";

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
  // PR II — onboarding review page: true once the user has generated a schema
  // (or restored a bundle) for this workspace. Per-workspace localStorage so
  // the worst case after a clear is seeing the review page once more.
  // Renamed from `wizardCompleted` (PR HH); useUIPref reads the legacy key as
  // a fallback and writeUIPrefBag retires it on the next write.
  onboardingCompleted: boolean;
  // PR II — first-Generate orientation hint dismissed for this workspace.
  orientationHintDismissed: boolean;
}

// Stable module-level reference — useLocalStorage keys its effects on the
// default value, so this must not be re-created per call.
export const DEFAULT_PREFS: UIPrefs = {
  mismatchActiveKinds: [],
  mismatchCollapsedGroups: [],
  schemaFilter: "",
  recordsSidebarCollapsed: true,
  onboardingCompleted: false,
  orientationHintDismissed: false,
};

// Shape of a pre-PR-II bag, which carried `wizardCompleted` instead of
// `onboardingCompleted`. Only used to read the legacy value through.
interface LegacyUIPrefs {
  wizardCompleted?: boolean;
}

function storageKey(workspaceId: string): string {
  return `schemagen.uiPrefs.${workspaceId}`;
}

// Resolve a pref value with the PR HH→II rename fallback. `onboardingCompleted`
// falls back to the legacy `wizardCompleted` key when absent, using `??`
// semantics so an explicit stored `false` is preserved (never re-defaulted).
function resolvePref<K extends keyof UIPrefs>(bag: UIPrefs, key: K): UIPrefs[K] {
  const stored = bag[key];
  if (stored !== undefined) return stored;
  if (key === "onboardingCompleted") {
    const legacy = (bag as LegacyUIPrefs).wizardCompleted;
    if (typeof legacy === "boolean") return legacy as UIPrefs[K];
  }
  return DEFAULT_PREFS[key];
}

// Read + persist a single pref key. The whole pref bag is stored under one
// key per workspace; we just slice/patch on access.
export function useUIPref<K extends keyof UIPrefs>(
  workspaceId: string,
  key: K,
): [UIPrefs[K], (value: UIPrefs[K]) => void] {
  const [bag, setBag] = useLocalStorage<UIPrefs>(storageKey(workspaceId), DEFAULT_PREFS);

  const value = resolvePref(bag, key);
  const set = useCallback(
    (next: UIPrefs[K]) => {
      setBag({ ...bag, [key]: next });
    },
    [bag, key, setBag],
  );
  return [value, set];
}

// Patch several pref keys at once. Unlike a chain of useUIPref setters — each
// of which closes over its own (possibly stale) bag snapshot and would clobber
// a sibling write — this reads the bag fresh from storage, merges, and writes
// once. The shared write path notifies in-process subscribers, so any mounted
// useUIPref hooks re-render. Used by the ReviewPage Generate handler and the
// bundle-restore path, which both need to flip multiple keys atomically.
export function writeUIPrefBag(workspaceId: string, partial: Partial<UIPrefs>): void {
  const key = storageKey(workspaceId);
  const current = localStorageHelpers.read<UIPrefs>(
    key,
    DEFAULT_PREFS,
    (raw) => JSON.parse(raw) as UIPrefs,
  );
  const merged: Record<string, unknown> = { ...current, ...partial };
  // The legacy onboarding key self-retires once we write a fresh bag, so later
  // reads no longer depend on resolvePref's fallback.
  delete merged.wizardCompleted;
  localStorageHelpers.write(key, merged, (v) => JSON.stringify(v));
}
