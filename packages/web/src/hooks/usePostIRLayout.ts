// Persisted post-IR three-pane layout (records / schema / inspector).
//
// Mirrors usePaneLayout for the cold-start three-pane shape, but the post-IR
// shape uses a different first panel (records vs data), so it gets its own
// key. Global, not per-workspace — the user's preferred working shape
// doesn't change between datasets.
//
// Only the expanded mode is persisted; the collapsed strip + 2-pane group
// uses its built-in defaults. That keeps the surface tiny and avoids the
// "which ratio applies when?" footgun of straddling collapse states.

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export type PostIRLayout = {
  records: number;
  schema: number;
  inspector: number;
};

const STORAGE_KEY = "schemagen.postIRLayout.v1";

export const DEFAULT_POST_IR_LAYOUT: PostIRLayout = {
  records: 22,
  schema: 56,
  inspector: 22,
};

const KEYS: ReadonlyArray<keyof PostIRLayout> = ["records", "schema", "inspector"];

function isCompleteLayout(value: { [id: string]: number }): value is PostIRLayout {
  return KEYS.every((k) => typeof value[k] === "number" && Number.isFinite(value[k]));
}

export function usePostIRLayout(): [PostIRLayout, (layout: { [id: string]: number }) => void] {
  const [stored, setStored] = useLocalStorage<PostIRLayout>(STORAGE_KEY, DEFAULT_POST_IR_LAYOUT);

  const setLayout = useCallback(
    (next: { [id: string]: number }) => {
      if (!isCompleteLayout(next)) return;
      setStored({ records: next.records, schema: next.schema, inspector: next.inspector });
    },
    [setStored],
  );

  return [stored, setLayout];
}
