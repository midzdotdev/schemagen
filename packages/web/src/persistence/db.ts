// Dexie schema. See docs/frontend-spec.md § "Persistence".

import type { Change, IR } from "@schemagen/core";
import Dexie, { type Table } from "dexie";

export interface WorkspaceRow {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface RecordRow {
  id: string; // canonical hash
  workspaceId: string;
  content: unknown;
  addedAt: number;
}

export interface ChangeRow {
  workspaceId: string;
  seq: number;
  change: Change;
  inverse: Change;
  label: string;
  source: "manual" | "suggestion" | "inferred";
  appliedAt: number;
}

export interface IRRow {
  workspaceId: string;
  ir: IR | null;
}

export interface MetaRow {
  workspaceId: string;
  historyCursor: number;
}

export interface SchemaGenDB extends Dexie {
  workspaces: Table<WorkspaceRow, string>;
  records: Table<RecordRow, string>;
  changes: Table<ChangeRow, [string, number]>;
  irs: Table<IRRow, string>;
  meta: Table<MetaRow, string>;
}

export function createDb(name = "schemagen"): SchemaGenDB {
  const db = new Dexie(name) as SchemaGenDB;
  db.version(1).stores({
    workspaces: "id, updatedAt",
    records: "id, workspaceId",
    changes: "[workspaceId+seq], workspaceId, seq",
    irs: "workspaceId",
    meta: "workspaceId",
  });
  return db;
}

// Single shared instance (lazy so tests can use isolated databases).
let _db: SchemaGenDB | null = null;
export function db(): SchemaGenDB {
  if (!_db) _db = createDb();
  return _db;
}

// Reset for tests.
export async function resetDb(): Promise<void> {
  if (_db) {
    await _db.delete();
    _db = null;
  }
}

export const DEFAULT_WORKSPACE_ID = "default";
