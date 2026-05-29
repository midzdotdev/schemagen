import type { Change } from "@schemagen/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type SchemaGenDB, createDb } from "../../src/persistence/db";

let db: SchemaGenDB;
let dbCounter = 0;

beforeEach(() => {
  db = createDb(`schemagen-test-${++dbCounter}`);
});

afterEach(async () => {
  await db.delete();
});

describe("Dexie schema", () => {
  // Spec: docs/frontend-spec.md § "Persistence"
  it("W1-DB1: schema has the expected tables", () => {
    expect(db.workspaces).toBeDefined();
    expect(db.records).toBeDefined();
    expect(db.changes).toBeDefined();
    expect(db.irs).toBeDefined();
    expect(db.meta).toBeDefined();
  });

  // Spec: docs/frontend-spec.md § "Persistence"
  it("W1-DB2: workspace round-trips", async () => {
    await db.workspaces.put({
      id: "default",
      name: "x",
      createdAt: 100,
      updatedAt: 200,
    });
    const fetched = await db.workspaces.get("default");
    expect(fetched?.name).toBe("x");
  });

  // Spec: docs/frontend-spec.md § "Persistence" — records persist
  it("W1-DB3: records persist keyed by canonical hash", async () => {
    await db.records.put({ id: "h1", workspaceId: "default", content: { a: 1 }, addedAt: 1 });
    await db.records.put({ id: "h2", workspaceId: "default", content: { a: 2 }, addedAt: 2 });
    const rows = await db.records.where("workspaceId").equals("default").toArray();
    expect(rows).toHaveLength(2);
  });

  // Spec: docs/frontend-spec.md § "Persistence" — history persists
  it("W1-DB4: changes persist with workspaceId + seq indexes", async () => {
    const change: Change = { op: "set-node", path: [], node: { kind: "unknown" } };
    const inverse: Change = { op: "set-node", path: [], node: { kind: "unknown" } };
    await db.changes.bulkAdd([
      {
        workspaceId: "default",
        seq: 0,
        change,
        inverse,
        label: "x",
        source: "manual",
        appliedAt: 1,
        clientId: "test-client",
      },
      {
        workspaceId: "default",
        seq: 1,
        change,
        inverse,
        label: "y",
        source: "manual",
        appliedAt: 2,
        clientId: "test-client",
      },
    ]);
    const rows = await db.changes.where("workspaceId").equals("default").sortBy("seq");
    expect(rows.map((r) => r.label)).toEqual(["x", "y"]);
  });

  // Spec: docs/frontend-spec.md § "Persistence"
  it("W1-DB5: IR round-trips", async () => {
    await db.irs.put({
      workspaceId: "default",
      ir: { kind: "object", fields: {}, additional: false },
    });
    const fetched = await db.irs.get("default");
    expect(fetched?.ir).toEqual({ kind: "object", fields: {}, additional: false });
  });
});
