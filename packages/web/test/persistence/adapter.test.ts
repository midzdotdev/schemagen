import type { Change, IR } from "@schemagen/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WorkspaceAdapter } from "../../src/persistence/adapter";
import { type SchemaGenDB, createDb } from "../../src/persistence/db";
import { createDexieAdapter } from "../../src/persistence/dexie-adapter";
import type { HistoryEntry } from "../../src/state/types";

let db: SchemaGenDB;
let adapter: WorkspaceAdapter;
let dbCounter = 0;
let workspaceId: string;

beforeEach(async () => {
  db = createDb(`schemagen-adapter-${++dbCounter}`);
  adapter = createDexieAdapter({ db, now: () => 1 });
  const ws = await adapter.createWorkspace("test");
  workspaceId = ws.id;
});

afterEach(async () => {
  await db.delete();
});

const ir: IR = {
  kind: "object",
  fields: { id: { type: { kind: "string" } } },
  additional: false,
};

const entry: HistoryEntry = {
  seq: 0,
  change: { op: "set-node", path: [], node: ir } as Change,
  inverse: { op: "set-node", path: [], node: { kind: "unknown" } } as Change,
  label: "test",
  source: "manual",
  appliedAt: 100,
  clientId: "test-client",
};

describe("WorkspaceAdapter (Dexie impl)", () => {
  // Spec: docs/frontend-spec.md § "Persistence" — UUID workspaces
  it("X1-A1: createWorkspace mints a UUID-ish id, not 'default'", () => {
    expect(workspaceId).not.toBe("default");
    expect(workspaceId.length).toBeGreaterThanOrEqual(8);
  });

  // Spec: docs/frontend-spec.md § "Persistence"
  it("X1-A2: listWorkspaces returns created workspaces", async () => {
    const list = await adapter.listWorkspaces();
    expect(list.map((w) => w.id)).toContain(workspaceId);
  });

  // Spec: docs/frontend-spec.md § "Persistence"
  it("X1-A3: hydrate returns an empty snapshot for a fresh workspace", async () => {
    const snap = await adapter.hydrate(workspaceId);
    expect(snap.ir).toBeNull();
    expect(snap.records).toEqual([]);
    expect(snap.history?.entries).toEqual([]);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — IR round-trip
  it("X1-A4: setIR + hydrate round-trip", async () => {
    await adapter.setIR(workspaceId, ir);
    const snap = await adapter.hydrate(workspaceId);
    expect(snap.ir).toEqual(ir);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — records round-trip
  it("X1-A5: setRecords + hydrate round-trip", async () => {
    const records = [{ id: 1 }, { id: 2 }];
    await adapter.setRecords(workspaceId, records);
    const snap = await adapter.hydrate(workspaceId);
    expect(snap.records).toEqual(records);
  });

  // Spec: docs/frontend-spec.md § "History" + sync-readiness clientId
  it("X1-A6: applyChange persists clientId on each row", async () => {
    await adapter.applyChange(workspaceId, entry);
    const snap = await adapter.hydrate(workspaceId);
    expect(snap.history?.entries).toHaveLength(1);
    expect(snap.history?.entries[0]?.clientId).toBe("test-client");
  });

  // Spec: docs/frontend-spec.md § "History" — surgical delete
  it("X1-A7: deleteChange removes a single seq", async () => {
    await adapter.applyChange(workspaceId, entry);
    await adapter.applyChange(workspaceId, { ...entry, seq: 1 });
    await adapter.deleteChange(workspaceId, 0);
    const snap = await adapter.hydrate(workspaceId);
    expect(snap.history?.entries.map((e) => e.seq)).toEqual([1]);
  });

  // Spec: docs/frontend-spec.md § "History" — historyCursor
  it("X1-A8: setHistoryCursor persists and is hydrated", async () => {
    await adapter.applyChange(workspaceId, entry);
    await adapter.setHistoryCursor(workspaceId, 0);
    const snap = await adapter.hydrate(workspaceId);
    expect(snap.history?.cursor).toBe(0);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — syncCursor declared, unused
  it("X1-A9: setSyncCursor persists separately from historyCursor", async () => {
    await adapter.setHistoryCursor(workspaceId, 5);
    await adapter.setSyncCursor(workspaceId, 3);
    const row = await db.meta.get(workspaceId);
    expect(row?.historyCursor).toBe(5);
    expect(row?.syncCursor).toBe(3);
  });
});
