import type { IR } from "@schemagen/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type SchemaGenDB } from "@/persistence/db";
import { createDexieAdapter } from "@/persistence/dexie-adapter";
import { initWorkspace, loadWorkspaceBundle } from "@/state/init";
import { useStore } from "@/state/store";

let db: SchemaGenDB;
let dbCounter = 0;

beforeEach(() => {
  db = createDb(`schemagen-loadsession-${++dbCounter}`);
  useStore.getState().resetForTests();
});

afterEach(async () => {
  await new Promise((r) => setTimeout(r, 5));
  await db.delete();
});

const ir: IR = {
  kind: "object",
  fields: { id: { type: { kind: "string" } } },
  additional: false,
};

describe("loadWorkspaceBundle", () => {
  // Spec: docs/frontend-spec.md § "Export panel" — session import creates a new workspace
  it("X4-LS1: creates a new workspace, persists state under it, switches store", async () => {
    const adapter = createDexieAdapter({ db });
    await initWorkspace(adapter);
    const originalWorkspaceId = useStore.getState().workspaceId;

    const { workspaceId } = await loadWorkspaceBundle({
      version: 1,
      exportedAt: 1000,
      originClientId: "origin",
      workspaceName: "imported",
      ir,
      records: [{ id: "a" }, { id: "b" }],
      history: [],
      identityConfig: null,
    });

    expect(workspaceId).not.toBe(originalWorkspaceId);
    expect(useStore.getState().workspaceId).toBe(workspaceId);
    expect(useStore.getState().ir).toEqual(ir);
    expect(useStore.getState().records).toEqual([{ id: "a" }, { id: "b" }]);
  });
});
