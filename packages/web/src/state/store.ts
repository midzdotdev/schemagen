// Zustand store. Pure state transitions; persistence is a separate concern.
// See docs/frontend-spec.md § "Persistence" + § "History".

import {
  applyChange as applyChangeCore,
  type Change,
  dedupeByIdentity,
  type IdentityConfig,
  type IdentityProposal,
  type InferOptions,
  type IR,
  infer,
  type Path,
} from "@schemagen/core";
import { create } from "zustand";
import { getClientId } from "../persistence/client-id";
import type { ApplyChangeOptions, AppState, HistoryEntry, RecordsFilter } from "./types";

export interface StoreActions {
  setIR: (ir: IR | null) => void;
  setWorkspaceName: (name: string) => void;
  resetWorkspace: () => void;
  addRecords: (records: unknown[]) => void;
  setRecords: (records: unknown[]) => void;
  applyChange: (change: Change, options?: ApplyChangeOptions) => HistoryEntry;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  setSelectedPath: (path: Path | null) => void;
  hydrate: (snapshot: Partial<AppState>) => void;
  resetForTests: () => void;
  // X2: identity-key actions
  setIdentityProposal: (proposal: IdentityProposal | null) => void;
  setIdentityConfig: (config: IdentityConfig | null) => { droppedCount: number };
  dismissIdentitySuggestion: () => void;
  // Records sidebar filter (label + indices). null = clear.
  setRecordsFilter: (filter: RecordsFilter | null) => void;
  // Z: cold-start inference overrides
  setInferenceOptions: (options: InferOptions | null) => void;
  // AA: explicit cold-start infer. No-op if an IR exists or records are empty.
  inferSchema: () => void;
}

export type Store = AppState & StoreActions;

// The empty workspaceId is a placeholder until initWorkspace() runs and
// hydrates the store. UI code that touches workspaceId must wait until
// HydrationGate has resolved.
export const INITIAL_STATE: AppState = {
  workspaceId: "",
  workspaceName: "",
  ir: null,
  records: [],
  history: { entries: [], cursor: 0 },
  selectedPath: null,
  identityConfig: null,
  identityProposal: null,
  identityProposalDismissed: false,
  recordsFilter: null,
  inferenceOptions: null,
};

let nowFn: () => number = () => Date.now();
export function setNowForTests(fn: () => number): void {
  nowFn = fn;
}

export const useStore = create<Store>((set, get) => ({
  ...INITIAL_STATE,

  setIR: (ir) => set({ ir }),

  setWorkspaceName: (name) => set({ workspaceName: name }),

  // Reset workspace content while preserving the workspace identity.
  // Clears IR + records + history + identity + selection; keeps workspaceId
  // and workspaceName so the user knows which workspace they emptied.
  resetWorkspace: () =>
    set((s) => ({
      ...INITIAL_STATE,
      workspaceId: s.workspaceId,
      workspaceName: s.workspaceName,
    })),

  // Clear the filter when the record list changes — stale indices would
  // either point at the wrong rows or drop newly imported ones silently.
  addRecords: (records) =>
    set((s) => ({ records: [...s.records, ...records], recordsFilter: null })),

  setRecords: (records) => set({ records, recordsFilter: null }),

  applyChange: (change, options) => {
    const { ir, history } = get();
    if (!ir) {
      throw new Error("applyChange: no IR set; call setIR or hydrate first");
    }
    const { ir: nextIR, inverse } = applyChangeCore(ir, change);
    const truncated = history.entries.slice(0, history.cursor);
    const seq = (truncated[truncated.length - 1]?.seq ?? -1) + 1;
    const entry: HistoryEntry = {
      seq,
      change,
      inverse,
      label: options?.label ?? labelFor(change),
      source: options?.source ?? "manual",
      appliedAt: nowFn(),
      clientId: getClientId(),
    };
    set({
      ir: nextIR,
      history: { entries: [...truncated, entry], cursor: truncated.length + 1 },
    });
    return entry;
  },

  undo: () => {
    const { ir, history } = get();
    if (history.cursor === 0 || !ir) return null;
    const entry = history.entries[history.cursor - 1];
    if (!entry) return null;
    const { ir: prevIR } = applyChangeCore(ir, entry.inverse);
    set({ ir: prevIR, history: { ...history, cursor: history.cursor - 1 } });
    return entry;
  },

  redo: () => {
    const { ir, history } = get();
    if (history.cursor >= history.entries.length || !ir) return null;
    const entry = history.entries[history.cursor];
    if (!entry) return null;
    const { ir: nextIR } = applyChangeCore(ir, entry.change);
    set({ ir: nextIR, history: { ...history, cursor: history.cursor + 1 } });
    return entry;
  },

  setSelectedPath: (path) => set({ selectedPath: path }),

  hydrate: (snapshot) => set({ ...INITIAL_STATE, ...snapshot }),

  resetForTests: () => set(INITIAL_STATE),

  setIdentityProposal: (proposal) => set({ identityProposal: proposal }),

  setIdentityConfig: (config) => {
    const { records } = get();
    if (!config) {
      set({ identityConfig: null });
      return { droppedCount: 0 };
    }
    // Re-dedupe the current record set under the new config.
    const { kept, dropped } = dedupeByIdentity(records, config);
    set({ identityConfig: config, records: kept });
    return { droppedCount: dropped.length };
  },

  dismissIdentitySuggestion: () => set({ identityProposalDismissed: true }),

  setRecordsFilter: (filter) => set({ recordsFilter: filter }),

  setInferenceOptions: (options) => set({ inferenceOptions: options }),

  inferSchema: () => {
    const { ir, records, inferenceOptions } = get();
    if (ir !== null) return; // post-IR is sacred — use re-infer (PR FF) instead.
    if (records.length === 0) return;
    set({ ir: infer(records, inferenceOptions ?? undefined) });
  },
}));

export function labelFor(change: Change): string {
  switch (change.op) {
    case "set-node":
      return `Replace node at ${formatPath(change.path)}`;
    case "set-field-type":
      return `Change type at ${formatPath(change.path)}`;
    case "add-field":
      return `Add field '${change.name}'`;
    case "remove-field":
      return `Remove field '${change.name}'`;
    case "rename-field":
      return `Rename '${change.from}' to '${change.to}'`;
    case "reorder-fields":
      return "Reorder fields";
    case "set-optional":
      return `${change.value ? "Mark" : "Unmark"} '${change.name}' optional`;
    case "set-nullable":
      return `${change.value ? "Mark" : "Unmark"} '${change.name}' nullable`;
    case "add-literal":
      return `Add literal ${JSON.stringify(change.value)}`;
    case "remove-literal":
      return `Remove literal ${JSON.stringify(change.value)}`;
    case "clear-literals":
      return "Clear literals";
    case "set-format":
      return change.format === null ? "Clear format" : `Set format '${change.format}'`;
    case "set-pattern":
      return change.pattern === null ? "Clear pattern" : "Set pattern";
    case "set-bound":
      return change.value === null
        ? `Clear ${change.which}`
        : `Set ${change.which} = ${change.value}`;
    case "set-integer":
      return change.value ? "Mark integer" : "Allow non-integer";
    case "wrap-in-union":
      return "Wrap in union";
    case "add-union-variant":
      return "Add union variant";
    case "remove-union-variant":
      return `Remove union variant ${change.index}`;
    case "set-discriminator":
      return change.field === null ? "Clear discriminator" : `Set discriminator '${change.field}'`;
    case "wrap-in-array":
      return "Wrap in array";
    case "unwrap-array":
      return "Unwrap array";
    case "set-additional":
      return "Set additional-properties";
    case "batch":
      return change.label ?? `Batch (${change.changes.length})`;
  }
}

function formatPath(path: Path): string {
  if (path.length === 0) return "root";
  return path.map((s) => (typeof s === "number" ? `[${s}]` : s)).join(".");
}
