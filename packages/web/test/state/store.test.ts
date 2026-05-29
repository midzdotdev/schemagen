import type { Change, IR } from "@schemagen/core";
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../../src/state/store";

function freshStore(): void {
  useStore.getState().resetForTests();
}

const baseIR: IR = {
  kind: "object",
  fields: {
    id: { type: { kind: "string" } },
    name: { type: { kind: "string" } },
  },
  additional: false,
};

describe("store: basic transitions", () => {
  beforeEach(freshStore);

  // Spec: docs/frontend-spec.md § "Persistence"
  it("W1-S1: setIR replaces the current IR", () => {
    useStore.getState().setIR(baseIR);
    expect(useStore.getState().ir).toEqual(baseIR);
  });

  // Spec: docs/frontend-spec.md § "Data panel"
  it("W1-S2: addRecords appends; setRecords replaces", () => {
    useStore.getState().addRecords([{ a: 1 }]);
    useStore.getState().addRecords([{ b: 2 }]);
    expect(useStore.getState().records).toEqual([{ a: 1 }, { b: 2 }]);
    useStore.getState().setRecords([{ c: 3 }]);
    expect(useStore.getState().records).toEqual([{ c: 3 }]);
  });

  // Spec: docs/frontend-spec.md § "Schema tree"
  it("W1-S3: setSelectedPath updates the selection", () => {
    useStore.getState().setSelectedPath(["name"]);
    expect(useStore.getState().selectedPath).toEqual(["name"]);
    useStore.getState().setSelectedPath(null);
    expect(useStore.getState().selectedPath).toBeNull();
  });
});

describe("store: applyChange + history", () => {
  beforeEach(() => {
    freshStore();
    useStore.getState().setIR(baseIR);
  });

  // Spec: docs/frontend-spec.md § "Inspector" + § "History"
  it("W1-H1: applyChange mutates IR and records an entry", () => {
    const change: Change = { op: "set-optional", path: [], name: "name", value: true };
    const entry = useStore.getState().applyChange(change);
    const state = useStore.getState();
    expect(state.ir).not.toEqual(baseIR);
    expect(state.history.entries).toHaveLength(1);
    expect(state.history.cursor).toBe(1);
    expect(entry.seq).toBe(0);
    expect(entry.source).toBe("manual");
    expect(entry.label).toMatch(/optional/i);
  });

  // Spec: docs/frontend-spec.md § "History" — undo applies the inverse
  it("W1-H2: undo reverses the latest change", () => {
    const change: Change = { op: "set-optional", path: [], name: "name", value: true };
    useStore.getState().applyChange(change);
    const undone = useStore.getState().undo();
    expect(undone).not.toBeNull();
    expect(useStore.getState().ir).toEqual(baseIR);
    expect(useStore.getState().history.cursor).toBe(0);
  });

  // Spec: docs/frontend-spec.md § "History" — redo reapplies
  it("W1-H3: redo reapplies an undone change", () => {
    const change: Change = { op: "set-optional", path: [], name: "name", value: true };
    useStore.getState().applyChange(change);
    const afterApply = useStore.getState().ir;
    useStore.getState().undo();
    useStore.getState().redo();
    expect(useStore.getState().ir).toEqual(afterApply);
    expect(useStore.getState().history.cursor).toBe(1);
  });

  // Spec: docs/frontend-spec.md § "History"
  it("W1-H4: undo at cursor 0 is a no-op (returns null)", () => {
    expect(useStore.getState().undo()).toBeNull();
  });

  // Spec: docs/frontend-spec.md § "History"
  it("W1-H5: redo past the end is a no-op (returns null)", () => {
    expect(useStore.getState().redo()).toBeNull();
  });

  // Spec: docs/frontend-spec.md § "History"
  // Interpretation: a new change after undo truncates the redo branch.
  it("W1-H6: a new change after undo truncates the redo entries", () => {
    const change1: Change = { op: "set-optional", path: [], name: "name", value: true };
    const change2: Change = { op: "set-optional", path: [], name: "id", value: true };
    useStore.getState().applyChange(change1);
    useStore.getState().undo();
    useStore.getState().applyChange(change2);
    const { history } = useStore.getState();
    expect(history.entries).toHaveLength(1);
    expect(history.cursor).toBe(1);
    expect(history.entries[0]?.change).toEqual(change2);
  });

  // Spec: docs/frontend-spec.md § "Inspector" — operations always available
  it("W1-H7: applyChange throws when no IR is set", () => {
    freshStore();
    const change: Change = { op: "set-node", path: [], node: baseIR };
    expect(() => useStore.getState().applyChange(change)).toThrow(/no IR/i);
  });
});
