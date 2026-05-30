import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type SchemaGenDB } from "@/persistence/db";

let dbCounter = 0;
let dbName: string;
let openedDbs: Array<Dexie | SchemaGenDB> = [];

beforeEach(() => {
  dbName = `schemagen-migration-${++dbCounter}`;
  openedDbs = [];
});

afterEach(async () => {
  for (const d of openedDbs) {
    try {
      await d.delete();
    } catch {
      // ignore
    }
  }
});

describe("Dexie v1 -> v2 migration", () => {
  // Spec: docs/frontend-spec.md § "Persistence" — workspace UUIDs, clientId backfill
  it("X1-M1: a 'default' workspace gets renamed to a UUID; deps are reparented", async () => {
    // Open as v1 explicitly to seed the legacy shape.
    const v1 = new Dexie(dbName);
    v1.version(1).stores({
      workspaces: "id, updatedAt",
      records: "id, workspaceId",
      changes: "[workspaceId+seq], workspaceId, seq",
      irs: "workspaceId",
      meta: "workspaceId",
    });
    await v1.open();
    openedDbs.push(v1);

    await v1.table("workspaces").put({ id: "default", name: "Old", createdAt: 1, updatedAt: 1 });
    await v1
      .table("records")
      .put({ id: "h1", workspaceId: "default", content: { a: 1 }, addedAt: 1 });
    await v1.table("irs").put({
      workspaceId: "default",
      ir: { kind: "object", fields: {}, additional: false },
    });
    await v1.table("meta").put({ workspaceId: "default", historyCursor: 0 });
    await v1.table("changes").put({
      workspaceId: "default",
      seq: 0,
      change: { op: "set-node", path: [], node: { kind: "unknown" } },
      inverse: { op: "set-node", path: [], node: { kind: "unknown" } },
      label: "x",
      source: "manual",
      appliedAt: 1,
      // clientId missing — v1 row
    });
    v1.close();

    // Re-open with the v2 schema; the upgrade should rename "default" to a UUID
    // and backfill clientId on changes.
    const v2 = createDb(dbName);
    await v2.open();
    openedDbs.push(v2);

    const workspaces = await v2.workspaces.toArray();
    expect(workspaces).toHaveLength(1);
    const newId = workspaces[0]?.id;
    expect(newId).not.toBe("default");

    const records = await v2.records
      .where("workspaceId")
      .equals(newId as string)
      .toArray();
    expect(records).toHaveLength(1);

    const changes = await v2.changes
      .where("workspaceId")
      .equals(newId as string)
      .toArray();
    expect(changes).toHaveLength(1);
    expect(changes[0]?.clientId).toBeDefined();
    expect(typeof changes[0]?.clientId).toBe("string");

    const irRow = await v2.irs.get(newId as string);
    expect(irRow?.ir).toBeDefined();
  });
});
