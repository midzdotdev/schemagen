// Zustand store. Pure state transitions; persistence is a separate concern.
// See docs/frontend-spec.md § "Persistence" + § "History".

import { type Change, type IR, type Path, applyChange as applyChangeCore } from "@schemagen/core";
import { create } from "zustand";
import { DEFAULT_WORKSPACE_ID } from "../persistence/db";
import type { AppState, ApplyChangeOptions, HistoryEntry } from "./types";

export interface StoreActions {
  setIR: (ir: IR | null) => void;
  addRecords: (records: unknown[]) => void;
  setRecords: (records: unknown[]) => void;
  applyChange: (change: Change, options?: ApplyChangeOptions) => HistoryEntry;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  setSelectedPath: (path: Path | null) => void;
  hydrate: (snapshot: Partial<AppState>) => void;
  resetForTests: () => void;
}

export type Store = AppState & StoreActions;

export const INITIAL_STATE: AppState = {
  workspaceId: DEFAULT_WORKSPACE_ID,
  ir: null,
  records: [],
  history: { entries: [], cursor: 0 },
  selectedPath: null,
};

let nowFn: () => number = () => Date.now();
export function setNowForTests(fn: () => number): void {
  nowFn = fn;
}

export const useStore = create<Store>((set, get) => ({
  ...INITIAL_STATE,

  setIR: (ir) => set({ ir }),

  addRecords: (records) => set((s) => ({ records: [...s.records, ...records] })),

  setRecords: (records) => set({ records }),

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
