import type { Change, IR } from "@schemagen/core";
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../../src/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

const ir: IR = {
  kind: "object",
  fields: { id: { type: { kind: "string" } } },
  additional: false,
};

describe("store.resetWorkspace", () => {
  // Spec: PR C — Reset clears content but preserves workspace identity.
  it("clears ir/records/history/identity but keeps workspaceId and workspaceName", () => {
    const store = useStore.getState();
    // Seed the workspace
    store.hydrate({ workspaceId: "ws-1", workspaceName: "GitHub issues" });
    store.setIR(ir);
    store.setRecords([{ id: "a" }]);
    store.applyChange({
      op: "add-field",
      path: [],
      name: "name",
      entry: { type: { kind: "string" } },
    } as Change);
    store.setSelectedPath(["id"]);
    store.setIdentityConfig({ fields: [["id"]], onDuplicate: "replace" });

    useStore.getState().resetWorkspace();

    const after = useStore.getState();
    expect(after.workspaceId).toBe("ws-1");
    expect(after.workspaceName).toBe("GitHub issues");
    expect(after.ir).toBeNull();
    expect(after.records).toEqual([]);
    expect(after.history.entries).toHaveLength(0);
    expect(after.history.cursor).toBe(0);
    expect(after.selectedPath).toBeNull();
    expect(after.identityConfig).toBeNull();
  });
});
