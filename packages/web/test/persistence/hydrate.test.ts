import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type SchemaGenDB, createDb } from "../../src/persistence/db";
import { hydrateWorkspace } from "../../src/persistence/hydrate";

let db: SchemaGenDB;
let dbCounter = 0;

beforeEach(() => {
  db = createDb(`schemagen-hydrate-${++dbCounter}`);
});

afterEach(async () => {
  await db.delete();
});

describe("hydrateWorkspace", () => {
  // Spec: docs/frontend-spec.md § "Persistence" — auto-create workspace
  it("W1-HY1: creates an empty workspace when none exists", async () => {
    const snap = await hydrateWorkspace({ db, now: () => 42 });
    expect(snap.ir).toBeNull();
    expect(snap.records).toEqual([]);
    expect(snap.history?.entries).toEqual([]);
    expect(snap.history?.cursor).toBe(0);
    const row = await db.workspaces.get("default");
    expect(row).toBeDefined();
    expect(row?.createdAt).toBe(42);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — load existing state
  it("W1-HY2: loads IR, records, and history from an existing workspace", async () => {
    await db.workspaces.put({
      id: "default",
      name: "Workspace",
      createdAt: 1,
      updatedAt: 1,
    });
    await db.irs.put({
      workspaceId: "default",
      ir: { kind: "object", fields: { x: { type: { kind: "string" } } }, additional: false },
    });
    await db.records.bulkPut([
      { id: "a", workspaceId: "default", content: { x: "1" }, addedAt: 1 },
      { id: "b", workspaceId: "default", content: { x: "2" }, addedAt: 2 },
    ]);
    await db.changes.bulkAdd([
      {
        workspaceId: "default",
        seq: 0,
        change: { op: "set-node", path: [], node: { kind: "unknown" } },
        inverse: { op: "set-node", path: [], node: { kind: "unknown" } },
        label: "l",
        source: "manual",
        appliedAt: 1,
      },
    ]);
    await db.meta.put({ workspaceId: "default", historyCursor: 1 });

    const snap = await hydrateWorkspace({ db });
    expect((snap.ir as { kind: string })?.kind).toBe("object");
    expect(snap.records).toHaveLength(2);
    expect(snap.history?.entries).toHaveLength(1);
    expect(snap.history?.cursor).toBe(1);
  });
});
