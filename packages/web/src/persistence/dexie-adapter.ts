// DexieWorkspaceAdapter — the v1 implementation of WorkspaceAdapter.
// Wraps a SchemaGenDB instance. Consolidates hydration + persistence so the
// store and components only depend on the WorkspaceAdapter interface.

import type { IR } from "@schemagen/core";
import type { Store } from "../state/store";
import type { WorkspaceAdapter, WorkspaceSnapshot } from "./adapter";
import { getClientId } from "./client-id";
import { type SchemaGenDB, db as defaultDb } from "./db";

export interface DexieAdapterOptions {
  db?: SchemaGenDB;
  now?: () => number;
}

export function createDexieAdapter(opts: DexieAdapterOptions = {}): WorkspaceAdapter {
  const dbInstance = opts.db ?? defaultDb();
  const now = opts.now ?? Date.now;

  return {
    async listWorkspaces() {
      return await dbInstance.workspaces.toArray();
    },

    async createWorkspace(name) {
      const id = randomUuid();
      const ts = now();
      const row = {
        id,
        name: name ?? "Workspace",
        createdAt: ts,
        updatedAt: ts,
      };
      await dbInstance.workspaces.put(row);
      return row;
    },

    async hydrate(workspaceId) {
      const [irRow, meta, changeRows, recordRows] = await Promise.all([
        dbInstance.irs.get(workspaceId),
        dbInstance.meta.get(workspaceId),
        dbInstance.changes.where("workspaceId").equals(workspaceId).sortBy("seq"),
        dbInstance.records.where("workspaceId").equals(workspaceId).sortBy("addedAt"),
      ]);

      const snapshot: WorkspaceSnapshot = {
        workspaceId,
        ir: irRow?.ir ?? null,
        records: recordRows.map((r) => r.content),
        history: {
          entries: changeRows.map((row) => ({
            seq: row.seq,
            change: row.change,
            inverse: row.inverse,
            label: row.label,
            source: row.source,
            appliedAt: row.appliedAt,
            clientId: row.clientId,
          })),
          cursor: meta?.historyCursor ?? changeRows.length,
        },
        selectedPath: null,
      };
      return snapshot;
    },

    async setIR(workspaceId, ir) {
      await dbInstance.irs.put({ workspaceId, ir });
      await dbInstance.workspaces.where("id").equals(workspaceId).modify({ updatedAt: now() });
    },

    async setRecords(workspaceId, records) {
      await dbInstance.transaction("rw", dbInstance.records, async () => {
        await dbInstance.records.where("workspaceId").equals(workspaceId).delete();
        if (records.length === 0) return;
        const ts = now();
        await dbInstance.records.bulkPut(
          records.map((r, i) => ({
            id: `${workspaceId}:${i}:${ts}`,
            workspaceId,
            content: r,
            addedAt: ts + i,
          })),
        );
      });
    },

    async applyChange(workspaceId, entry) {
      await dbInstance.changes.put({
        workspaceId,
        seq: entry.seq,
        change: entry.change,
        inverse: entry.inverse,
        label: entry.label,
        source: entry.source,
        appliedAt: entry.appliedAt,
        clientId: entry.clientId,
      });
    },

    async deleteChange(workspaceId, seq) {
      await dbInstance.changes.delete([workspaceId, seq]);
    },

    async setHistoryCursor(workspaceId, cursor) {
      const existing = await dbInstance.meta.get(workspaceId);
      await dbInstance.meta.put({
        workspaceId,
        historyCursor: cursor,
        ...(existing?.syncCursor !== undefined ? { syncCursor: existing.syncCursor } : {}),
      });
    },

    async setSyncCursor(workspaceId, cursor) {
      const existing = await dbInstance.meta.get(workspaceId);
      await dbInstance.meta.put({
        workspaceId,
        historyCursor: existing?.historyCursor ?? 0,
        syncCursor: cursor,
      });
    },
  };
}

// Subscribe the store to the adapter and stream every change through.
// Returns an unsubscribe function.
export function attachPersistence(
  useStore: { getState: () => Store; subscribe: (l: () => void) => () => void },
  adapter: WorkspaceAdapter,
): () => void {
  const persistedSeqs = new Set<number>();
  let lastIR: IR | null = useStore.getState().ir;
  let lastEntries = useStore.getState().history.entries;
  let lastCursor = useStore.getState().history.cursor;
  let lastRecords = useStore.getState().records;
  const initial = useStore.getState();

  // Track which entries were hydrated so we don't re-write them. Hydration
  // delivered them from Dexie, so they're already persisted.
  for (const entry of initial.history.entries) {
    persistedSeqs.add(entry.seq);
  }

  return useStore.subscribe(() => {
    const state = useStore.getState();
    const { workspaceId, ir, history, records } = state;
    if (!workspaceId) return;

    if (ir !== lastIR) {
      lastIR = ir;
      void adapter.setIR(workspaceId, ir);
    }

    if (records !== lastRecords) {
      lastRecords = records;
      void adapter.setRecords(workspaceId, records);
    }

    if (history.entries !== lastEntries) {
      lastEntries = history.entries;
      const currentSeqs = new Set(history.entries.map((e) => e.seq));
      // Surgical delete for seqs no longer in state (handles redo-branch truncation).
      for (const seq of Array.from(persistedSeqs)) {
        if (!currentSeqs.has(seq)) {
          void adapter.deleteChange(workspaceId, seq);
          persistedSeqs.delete(seq);
        }
      }
      // Upsert every current entry. applyChange's put-by-compound-key is
      // idempotent and replaces the row when a new edit lands on the same
      // seq (the "new change after undo" case).
      for (const entry of history.entries) {
        void adapter.applyChange(workspaceId, entry);
        persistedSeqs.add(entry.seq);
      }
    }

    if (history.cursor !== lastCursor) {
      lastCursor = history.cursor;
      void adapter.setHistoryCursor(workspaceId, history.cursor);
    }
  });
}

function randomUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join("-");
}

// Keep the per-browser ID importable here for convenience.
export { getClientId };
