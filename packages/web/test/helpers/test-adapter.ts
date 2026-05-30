// Test helper: build a no-op WorkspaceAdapter with sensible defaults and
// optional per-test overrides. Replaces the verbose inline fakeAdapter blocks
// that breaks every time the WorkspaceAdapter interface grows a method.

import { vi } from "vitest";
import type { WorkspaceAdapter } from "@/persistence/adapter";

export interface TestWorkspaceRow {
  id: string;
  name: string;
}

export interface CreateTestAdapterOptions {
  // Seed the workspace list; createdAt/updatedAt default to 0 / 100 each.
  rows?: TestWorkspaceRow[];
  // Override any subset of adapter methods (e.g. swap in a custom hydrate).
  overrides?: Partial<WorkspaceAdapter>;
}

// Returns a WorkspaceAdapter whose every method is a vi.fn() — so tests can
// inspect calls via toHaveBeenCalledWith — with defaults that resolve
// successfully and return shape-correct empty values.
export function createTestAdapter(opts: CreateTestAdapterOptions = {}): WorkspaceAdapter {
  const rows = (opts.rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: 0,
    updatedAt: 100,
  }));

  const defaults: WorkspaceAdapter = {
    listWorkspaces: vi.fn(async () => rows),
    createWorkspace: vi.fn(async (name?: string) => ({
      id: `new-${Math.random().toString(36).slice(2, 10)}`,
      name: name ?? "Untitled workspace",
      createdAt: 0,
      updatedAt: 100,
    })),
    renameWorkspace: vi.fn(async () => {}),
    deleteWorkspace: vi.fn(async () => {}),
    hydrate: vi.fn(async (workspaceId: string) => ({ workspaceId, workspaceName: "" })),
    setIR: vi.fn(async () => {}),
    setRecords: vi.fn(async () => {}),
    applyChange: vi.fn(async () => {}),
    deleteChange: vi.fn(async () => {}),
    setHistoryCursor: vi.fn(async () => {}),
    setSyncCursor: vi.fn(async () => {}),
    patchMeta: vi.fn(async () => {}),
  };

  return { ...defaults, ...opts.overrides };
}
