// PR FF — re-infer diff. See docs/plans/pr-ff-reinfer-reconcile.md § "Diff algorithm".

import { describe, expect, it } from "vitest";
import type { IR, Node, ObjectNode } from "../../src/ir/types";
import { changeTargetPaths, computeReinferDiff } from "../../src/reinfer";

const str: Node = { kind: "string" };
const num: Node = { kind: "number" };

function obj(fields: Record<string, Node>, optional: string[] = []): ObjectNode {
  return {
    kind: "object",
    additional: false,
    fields: Object.fromEntries(
      Object.entries(fields).map(([k, type]) => [
        k,
        optional.includes(k) ? { type, optional: true } : { type },
      ]),
    ),
  };
}

describe("computeReinferDiff", () => {
  // Plan § "Test plan" — FF-D1
  it("FF-D1: identical IRs produce empty buckets", () => {
    const ir: IR = obj({ id: str, name: str });
    const diff = computeReinferDiff(ir, structuredClone(ir), new Set());
    expect(diff.autoChanges).toHaveLength(0);
    expect(diff.conflictChanges).toHaveLength(0);
  });

  // FF-D2 — fresh adds an untouched field → add-field in autoChanges.
  it("FF-D2: a newly inferred field the user never touched is an auto add-field", () => {
    const current: IR = obj({ id: str });
    const fresh: IR = obj({ id: str, email: str });
    const diff = computeReinferDiff(current, fresh, new Set());
    expect(diff.conflictChanges).toHaveLength(0);
    expect(diff.autoChanges).toEqual([
      { op: "add-field", path: [], name: "email", entry: { type: str } },
    ]);
  });

  // FF-D3 — fresh removes a field the user renamed → remove-field is a conflict
  // carrying the user's current node.
  it("FF-D3: removing a user-renamed field is a conflict with the existing node", () => {
    const current: IR = obj({ id: str, fullName: str }); // user renamed name → fullName
    const fresh: IR = obj({ id: str, name: str }); // data still has `name`
    // The rename touched both "name" and "fullName".
    const touched = new Set(["name", "fullName"]);
    const diff = computeReinferDiff(current, fresh, touched);
    const removal = diff.conflictChanges.find((c) => c.change.op === "remove-field");
    expect(removal?.change).toEqual({ op: "remove-field", path: [], name: "fullName" });
    expect(removal?.existing).toEqual(str);
  });

  // FF-D4 — fresh narrows a literal union the user widened → conflict, both nodes.
  it("FF-D4: narrowing a user-widened literal union is a conflict with both nodes", () => {
    const widened: Node = { kind: "string", literals: ["a", "b", "c", "d"] };
    const narrowed: Node = { kind: "string", literals: ["a", "b"] };
    const current: IR = obj({ status: widened });
    const fresh: IR = obj({ status: narrowed });
    const diff = computeReinferDiff(current, fresh, new Set(["status"]));
    expect(diff.autoChanges).toHaveLength(0);
    expect(diff.conflictChanges).toHaveLength(1);
    const c = diff.conflictChanges[0];
    expect(c?.change).toEqual({ op: "set-node", path: ["status"], node: narrowed });
    expect(c?.existing).toEqual(widened);
  });

  // FF-D5 — parent touched, child not → child change is auto, parent change conflict.
  it("FF-D5: per-path classification — touched parent conflicts, untouched child autos", () => {
    // `meta` object: user touched `meta.role` but not `meta.region`.
    const current: IR = obj({ meta: obj({ role: str, region: str }) });
    const fresh: IR = obj({ meta: obj({ role: num, region: num }) });
    const touched = new Set(["meta.role"]);
    const diff = computeReinferDiff(current, fresh, touched);
    expect(diff.autoChanges).toEqual([{ op: "set-node", path: ["meta", "region"], node: num }]);
    expect(diff.conflictChanges).toEqual([
      { change: { op: "set-node", path: ["meta", "role"], node: num }, existing: str },
    ]);
  });

  // Optionality shifts (a field that's now always present) surface as set-optional.
  it("FF-D7: a field that became always-present is a set-optional change", () => {
    const current: IR = obj({ id: str, nickname: str }, ["nickname"]); // optional now
    const fresh: IR = obj({ id: str, nickname: str }); // required in fresh
    const diff = computeReinferDiff(current, fresh, new Set());
    expect(diff.autoChanges).toContainEqual({
      op: "set-optional",
      path: [],
      name: "nickname",
      value: false,
    });
  });
});

describe("changeTargetPaths", () => {
  it("targets the field for field ops and flattens batches", () => {
    expect(changeTargetPaths({ op: "remove-field", path: ["meta"], name: "role" })).toEqual([
      "meta.role",
    ]);
    expect(changeTargetPaths({ op: "set-node", path: ["a", "b"], node: str })).toEqual(["a.b"]);
    expect(changeTargetPaths({ op: "rename-field", path: [], from: "x", to: "y" })).toEqual([
      "x",
      "y",
    ]);
    expect(
      changeTargetPaths({
        op: "batch",
        changes: [
          { op: "remove-field", path: [], name: "a" },
          { op: "set-node", path: ["b"], node: num },
        ],
      }),
    ).toEqual(["a", "b"]);
  });
});
