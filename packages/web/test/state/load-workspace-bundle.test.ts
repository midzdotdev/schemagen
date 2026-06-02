import type { IR } from "@schemagen/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type SchemaGenDB } from "@/persistence/db";
import { createDexieAdapter } from "@/persistence/dexie-adapter";
import { initWorkspace, loadWorkspaceBundle } from "@/state/init";
import { useStore } from "@/state/store";

let db: SchemaGenDB;
let dbCounter = 0;
let pendingDisposer: (() => void) | null = null;

beforeEach(() => {
  db = createDb(`schemagen-loadsession-${++dbCounter}`);
  useStore.getState().resetForTests();
  pendingDisposer = null;
});

afterEach(async () => {
  // Tear down the persistence subscriber before closing the db, else the next
  // test's resetForTests() fires a write against a closed database.
  pendingDisposer?.();
  pendingDisposer = null;
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
    pendingDisposer = (await initWorkspace(adapter)).disposer;
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

  // PR II — onboarding review page. See docs/plans/pr-ii-onboarding-review-page.md.
  // Plan § "Trigger" — a restored bundle represents a fully-onboarded workspace,
  // so it never routes through the review page even when it carries no IR.
  it("II-A3: a records-only bundle marks the new workspace onboardingCompleted", async () => {
    const adapter = createDexieAdapter({ db });
    pendingDisposer = (await initWorkspace(adapter)).disposer;

    const { workspaceId } = await loadWorkspaceBundle({
      version: 1,
      exportedAt: 1000,
      originClientId: "origin",
      workspaceName: "records-only",
      ir: null,
      records: [{ id: "a" }],
      history: [],
      identityConfig: null,
    });

    const bag = JSON.parse(window.localStorage.getItem(`schemagen.uiPrefs.${workspaceId}`) ?? "{}");
    expect(bag.onboardingCompleted).toBe(true);
    expect(useStore.getState().ir).toBeNull();
  });

  // Plan § "Trigger" — a bundle with an IR also marks onboarding done; IR
  // presence is what routes it to the post-IR shell, but the flag is set either way.
  it("II-A4: an IR-bearing bundle also marks the new workspace onboardingCompleted", async () => {
    const adapter = createDexieAdapter({ db });
    pendingDisposer = (await initWorkspace(adapter)).disposer;

    const { workspaceId } = await loadWorkspaceBundle({
      version: 1,
      exportedAt: 1000,
      originClientId: "origin",
      workspaceName: "with-ir",
      ir,
      records: [{ id: "a" }],
      history: [],
      identityConfig: null,
    });

    const bag = JSON.parse(window.localStorage.getItem(`schemagen.uiPrefs.${workspaceId}`) ?? "{}");
    expect(bag.onboardingCompleted).toBe(true);
    expect(useStore.getState().ir).toEqual(ir);
  });
});
