// WorkspaceAdapter — the boundary between the store and durable storage.
//
// The store never talks to Dexie directly. It calls the adapter, which today
// is implemented exclusively by DexieWorkspaceAdapter. A future sync adapter
// (REST + offline reconciliation, Yjs, etc.) fits the same shape without
// touching the store or any component.
//
// Sync-readiness commitments embedded here:
//   - Workspace identity: UUID, never the literal "default".
//   - Per-edit identity: ChangeRow / HistoryEntry carry `clientId`.
//   - Cursor for future sync: MetaRow.syncCursor (declared, unused in v1).

import type { IR } from "@schemagen/core";
import type { AppState, HistoryEntry } from "../state/types";
import type { MetaRow, WorkspaceRow } from "./db";

export interface WorkspaceSnapshot extends Partial<AppState> {
  workspaceId: string;
}

export interface WorkspaceAdapter {
  listWorkspaces(): Promise<WorkspaceRow[]>;
  createWorkspace(name?: string): Promise<WorkspaceRow>;
  hydrate(workspaceId: string): Promise<WorkspaceSnapshot>;

  // Mutations — async so a future remote adapter can await network I/O.
  setIR(workspaceId: string, ir: IR | null): Promise<void>;
  setRecords(workspaceId: string, records: unknown[]): Promise<void>;
  applyChange(workspaceId: string, entry: HistoryEntry): Promise<void>;
  deleteChange(workspaceId: string, seq: number): Promise<void>;
  setHistoryCursor(workspaceId: string, cursor: number): Promise<void>;
  setSyncCursor(workspaceId: string, cursor: number): Promise<void>;
  // Generic meta merge — set any subset of meta fields. Other fields are
  // preserved. Used for identityConfig / identityProposalDismissed in X2.
  patchMeta(workspaceId: string, partial: Partial<MetaRow>): Promise<void>;
}
