// Load a workspace from Dexie into the store on app start.
// Creates an empty workspace if none exists.

import type { AppState } from "../state/types";
import { DEFAULT_WORKSPACE_ID, type SchemaGenDB, db as defaultDb } from "./db";

export interface HydrateOptions {
  db?: SchemaGenDB;
  workspaceId?: string;
  now?: () => number;
}

export async function hydrateWorkspace(opts: HydrateOptions = {}): Promise<Partial<AppState>> {
  const dbInstance = opts.db ?? defaultDb();
  const workspaceId = opts.workspaceId ?? DEFAULT_WORKSPACE_ID;
  const now = opts.now ?? Date.now;

  const existing = await dbInstance.workspaces.get(workspaceId);
  if (!existing) {
    const ts = now();
    await dbInstance.workspaces.put({
      id: workspaceId,
      name: "Workspace",
      createdAt: ts,
      updatedAt: ts,
    });
    return {
      workspaceId,
      ir: null,
      records: [],
      history: { entries: [], cursor: 0 },
      selectedPath: null,
    };
  }

  const [irRow, meta, changeRows, recordRows] = await Promise.all([
    dbInstance.irs.get(workspaceId),
    dbInstance.meta.get(workspaceId),
    dbInstance.changes.where("workspaceId").equals(workspaceId).sortBy("seq"),
    dbInstance.records.where("workspaceId").equals(workspaceId).sortBy("addedAt"),
  ]);

  return {
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
      })),
      cursor: meta?.historyCursor ?? changeRows.length,
    },
    selectedPath: null,
  };
}
