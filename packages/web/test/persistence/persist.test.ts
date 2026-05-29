import type { Change, IR } from "@schemagen/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type SchemaGenDB, createDb } from "../../src/persistence/db";
import { attachPersistence } from "../../src/persistence/persist";
import { useStore } from "../../src/state/store";

let db: SchemaGenDB;
let dbCounter = 0;
let unsubscribe: () => void;

const baseIR: IR = {
  kind: "object",
  fields: { name: { type: { kind: "string" } } },
  additional: false,
};

beforeEach(() => {
  useStore.getState().resetForTests();
  db = createDb(`schemagen-persist-${++dbCounter}`);
  unsubscribe = attachPersistence(useStore, { db });
});

afterEach(async () => {
  unsubscribe();
  await db.delete();
});

async function flush(): Promise<void> {
  // Allow async Dexie writes to settle.
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("attachPersistence", () => {
  // Spec: docs/frontend-spec.md § "Persistence" — IR changes flush to Dexie
  it("W1-P1: setIR writes the IR to Dexie", async () => {
    useStore.getState().setIR(baseIR);
    await flush();
    const row = await db.irs.get("default");
    expect(row?.ir).toEqual(baseIR);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — per-change flush
  it("W1-P2: applyChange persists a history row", async () => {
    useStore.getState().setIR(baseIR);
    const change: Change = { op: "set-optional", path: [], name: "name", value: true };
    useStore.getState().applyChange(change);
    await flush();
    const rows = await db.changes.where("workspaceId").equals("default").toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.change).toEqual(change);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — cursor reflects undo/redo
  it("W1-P3: undo/redo updates historyCursor in meta", async () => {
    useStore.getState().setIR(baseIR);
    useStore.getState().applyChange({ op: "set-optional", path: [], name: "name", value: true });
    await flush();
    useStore.getState().undo();
    await flush();
    const meta = await db.meta.get("default");
    expect(meta?.historyCursor).toBe(0);
  });

  // Spec: docs/frontend-spec.md § "History" — truncated redo entries are removed
  it("W1-P4: truncated entries are deleted from Dexie after a new change overrides redo", async () => {
    useStore.getState().setIR(baseIR);
    useStore.getState().applyChange({ op: "set-optional", path: [], name: "name", value: true });
    useStore.getState().applyChange({ op: "set-optional", path: [], name: "name", value: false });
    await flush();
    useStore.getState().undo();
    await flush();
    useStore.getState().applyChange({ op: "set-nullable", path: [], name: "name", value: true });
    await flush();
    const rows = await db.changes.where("workspaceId").equals("default").sortBy("seq");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.change.op)).toEqual(["set-optional", "set-nullable"]);
  });
});
