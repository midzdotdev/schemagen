// Dexie schema. See docs/frontend-spec.md § "Persistence".

import type { Change, IdentityConfig, InferOptions, IR } from "@schemagen/core";
import Dexie, { type Table } from "dexie";
import { getClientId } from "./client-id";

export interface WorkspaceRow {
  id: string; // UUID — never the literal "default" in v2+
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
  clientId: string; // per-browser UUID; identifies "who edited this"
}

export interface IRRow {
  workspaceId: string;
  ir: IR | null;
}

export interface MetaRow {
  workspaceId: string;
  historyCursor: number;
  // syncCursor marks the last `seq` considered settled for a future sync layer.
  // Declared in v2 so we never have to migrate Dexie when sync ships. Optional
  // because it is not materialized for greenfield workspaces.
  syncCursor?: number;
  // X2: identity-key configuration + per-workspace dismissal of the suggestion banner.
  identityConfig?: IdentityConfig;
  identityProposalDismissed?: boolean;
  // Z: cold-start inference overrides. Absent on pre-v3 workspaces; hydrates to null.
  // `| undefined` lets the subscription pass `undefined` through patchMeta to clear
  // the field — required under exactOptionalPropertyTypes.
  inferenceOptions?: InferOptions | undefined;
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

  // v1: original schema.
  db.version(1).stores({
    workspaces: "id, updatedAt",
    records: "id, workspaceId",
    changes: "[workspaceId+seq], workspaceId, seq",
    irs: "workspaceId",
    meta: "workspaceId",
  });

  // v2: ChangeRow gains clientId; MetaRow gains optional syncCursor.
  // Workspace ID literal "default" gets renamed to a UUID so multiple
  // browsers never collide. The upgrade transactionally renames the row
  // and updates every dependent table.
  db.version(2)
    .stores({
      workspaces: "id, updatedAt",
      records: "id, workspaceId",
      changes: "[workspaceId+seq], workspaceId, seq",
      irs: "workspaceId",
      meta: "workspaceId",
    })
    .upgrade(async (tx) => {
      const clientId = getClientId();
      const oldId = "default";
      const oldWorkspace = await tx.table("workspaces").get(oldId);
      if (oldWorkspace) {
        const newId = generateUuid();
        await tx.table("workspaces").delete(oldId);
        await tx.table("workspaces").put({ ...oldWorkspace, id: newId });

        // Reparent every dependent row.
        await tx.table("records").where("workspaceId").equals(oldId).modify({ workspaceId: newId });
        await tx
          .table("changes")
          .where("workspaceId")
          .equals(oldId)
          .modify((row) => {
            row.workspaceId = newId;
            // Backfill clientId for pre-v2 rows.
            if (row.clientId === undefined) row.clientId = clientId;
          });
        await tx.table("irs").where("workspaceId").equals(oldId).modify({ workspaceId: newId });
        await tx.table("meta").where("workspaceId").equals(oldId).modify({ workspaceId: newId });
      } else {
        // No "default" workspace — just backfill clientId on any existing
        // changes rows (defensive; in practice they shouldn't exist without
        // a workspace row).
        await tx
          .table("changes")
          .toCollection()
          .modify((row) => {
            if (row.clientId === undefined) row.clientId = clientId;
          });
      }
    });

  // v3: MetaRow gains optional `inferenceOptions`. Purely additive — no schema
  // string change, no upgrade function needed. The version bump tags the change
  // so future migrations can anchor against it.
  db.version(3).stores({
    workspaces: "id, updatedAt",
    records: "id, workspaceId",
    changes: "[workspaceId+seq], workspaceId, seq",
    irs: "workspaceId",
    meta: "workspaceId",
  });

  return db;
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join("-");
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
