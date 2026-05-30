import type { IR } from "@schemagen/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type SchemaGenDB } from "@/persistence/db";
import { createDexieAdapter } from "@/persistence/dexie-adapter";
import { initWorkspace } from "@/state/init";
import { useStore } from "@/state/store";

let db: SchemaGenDB;
let dbCounter = 0;
let pendingDisposer: (() => void) | null = null;

beforeEach(() => {
  db = createDb(`schemagen-init-${++dbCounter}`);
  useStore.getState().resetForTests();
  pendingDisposer = null;
});

afterEach(async () => {
  pendingDisposer?.();
  pendingDisposer = null;
  // Let any in-flight Dexie writes complete before we delete the database.
  await new Promise((r) => setTimeout(r, 5));
  await db.delete();
});

describe("initWorkspace", () => {
  // Spec: docs/frontend-spec.md § "Persistence" — on first boot, create workspace
  it("X1-I1: creates a new workspace when none exists", async () => {
    const adapter = createDexieAdapter({ db });
    const { workspaceId, disposer } = await initWorkspace(adapter);
    pendingDisposer = disposer;
    expect(workspaceId).not.toBe("");
    expect(useStore.getState().workspaceId).toBe(workspaceId);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — hydrate existing on second boot
  it("X1-I2: hydrates an existing workspace's IR and records", async () => {
    const adapter = createDexieAdapter({ db });
    const ws = await adapter.createWorkspace("seeded");
    const ir: IR = {
      kind: "object",
      fields: { x: { type: { kind: "string" } } },
      additional: false,
    };
    await adapter.setIR(ws.id, ir);
    await adapter.setRecords(ws.id, [{ x: "a" }, { x: "b" }]);

    const { workspaceId, disposer } = await initWorkspace(adapter);
    pendingDisposer = disposer;
    expect(workspaceId).toBe(ws.id);
    expect(useStore.getState().ir).toEqual(ir);
    expect(useStore.getState().records).toEqual([{ x: "a" }, { x: "b" }]);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — most-recent wins when multiple exist
  it("X1-I3: picks the most-recently-updated workspace when multiple exist", async () => {
    const adapter = createDexieAdapter({ db, now: () => 100 });
    const older = await adapter.createWorkspace("older");
    await db.workspaces.update(older.id, { updatedAt: 100 });
    const adapter2 = createDexieAdapter({ db, now: () => 200 });
    const newer = await adapter2.createWorkspace("newer");
    await db.workspaces.update(newer.id, { updatedAt: 200 });

    const { workspaceId, disposer } = await initWorkspace(createDexieAdapter({ db }));
    pendingDisposer = disposer;
    expect(workspaceId).toBe(newer.id);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — store mutations persist back
  it("X1-I4: applying a change after init persists to the adapter", async () => {
    const adapter = createDexieAdapter({ db });
    const { workspaceId, disposer } = await initWorkspace(adapter);
    pendingDisposer = disposer;

    useStore.getState().setIR({
      kind: "object",
      fields: { id: { type: { kind: "string" } } },
      additional: false,
    });
    // Let the persist subscriber flush.
    await new Promise((r) => setTimeout(r, 20));

    const irRow = await db.irs.get(workspaceId);
    expect(irRow?.ir).not.toBeNull();
  });
});
