// Persistence side effects: subscribe to the store and flush changes to Dexie.
// See docs/frontend-spec.md § "Persistence" — "Crash recovery via per-change Dexie flush".

import type { Store } from "../state/store";
import { type SchemaGenDB, db as defaultDb } from "./db";

export interface PersistOptions {
  db?: SchemaGenDB;
}

// Returns an unsubscribe function.
export function attachPersistence(
  useStore: { getState: () => Store; subscribe: (listener: () => void) => () => void },
  opts: PersistOptions = {},
): () => void {
  const dbInstance = opts.db ?? defaultDb();
  const persistedSeqs = new Set<number>();
  let lastIR = useStore.getState().ir;
  let lastEntries = useStore.getState().history.entries;
  let lastCursor = useStore.getState().history.cursor;

  // Initial snapshot
  const initial = useStore.getState();
  if (initial.ir) {
    void dbInstance.irs.put({ workspaceId: initial.workspaceId, ir: initial.ir });
  }
  void dbInstance.meta.put({
    workspaceId: initial.workspaceId,
    historyCursor: initial.history.cursor,
  });
  for (const e of initial.history.entries) {
    void dbInstance.changes.put({ workspaceId: initial.workspaceId, ...e });
    persistedSeqs.add(e.seq);
  }

  return useStore.subscribe(() => {
    const state = useStore.getState();
    const { workspaceId, ir, history } = state;

    // IR changes
    if (ir !== lastIR) {
      lastIR = ir;
      void dbInstance.irs.put({ workspaceId, ir });
    }

    // History entries: detect any change by reference (Zustand replaces the
    // array on every mutation). Compare against the persisted set of seqs.
    if (history.entries !== lastEntries) {
      lastEntries = history.entries;
      const currentSeqs = new Set(history.entries.map((e) => e.seq));
      // Delete seqs that were persisted but are no longer in state.
      const toDelete = Array.from(persistedSeqs).filter((s) => !currentSeqs.has(s));
      for (const s of toDelete) {
        void dbInstance.changes.delete([workspaceId, s]);
        persistedSeqs.delete(s);
      }
      // Upsert every current entry. put() with the compound key replaces in
      // place if the seq already existed (covers the "new change after undo
      // reuses the same seq" case).
      for (const e of history.entries) {
        void dbInstance.changes.put({ workspaceId, ...e });
        persistedSeqs.add(e.seq);
      }
    }

    // Cursor change (undo/redo)
    if (history.cursor !== lastCursor) {
      lastCursor = history.cursor;
      void dbInstance.meta.put({ workspaceId, historyCursor: history.cursor });
    }
  });
}
