// Persisted three-pane layout sizes (percent of viewport width).
//
// Layout sizes are global (not per-workspace) — the user's preferred working
// shape doesn't change when they switch between datasets. Stored under a
// single localStorage key so opening a second workspace just inherits the
// layout the user has already tuned.
//
// react-resizable-panels v4 represents a layout as a map of panel id →
// percentage; we match that shape exactly so the hook value drops straight
// into Group's `defaultLayout`.

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export type PaneLayout = {
  data: number;
  schema: number;
  inspector: number;
};

const STORAGE_KEY = "schemagen.paneLayout.v1";

// Defaults roughly mirror the previous CSS grid (20rem / flex / 24rem) at
// typical 1440-wide viewports. Both side panels stay readable; centre takes
// the bulk of the space.
export const DEFAULT_PANE_LAYOUT: PaneLayout = {
  data: 22,
  schema: 56,
  inspector: 22,
};

const KEYS: ReadonlyArray<keyof PaneLayout> = ["data", "schema", "inspector"];

// Defensive: ensure an incoming layout is a sane three-key map. Anything else
// (wrong keys, missing values) gets ignored so we never persist garbage.
function isCompleteLayout(value: { [id: string]: number }): value is PaneLayout {
  return KEYS.every((k) => typeof value[k] === "number" && Number.isFinite(value[k]));
}

export function usePaneLayout(): [PaneLayout, (layout: { [id: string]: number }) => void] {
  const [stored, setStored] = useLocalStorage<PaneLayout>(STORAGE_KEY, DEFAULT_PANE_LAYOUT);

  const setLayout = useCallback(
    (next: { [id: string]: number }) => {
      if (!isCompleteLayout(next)) return;
      setStored({ data: next.data, schema: next.schema, inspector: next.inspector });
    },
    [setStored],
  );

  return [stored, setLayout];
}
