import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { ArrayNode, IR } from "../../src/ir/types";

function arr(items: ArrayNode["items"], extra: Partial<ArrayNode> = {}): ArrayNode {
  return { kind: "array", items, ...extra };
}

describe("applyChange array ops", () => {
  // Spec: docs/core-spec.md § Change op `set-field-type`
  // Interpretation: `set-field-type` at ["items"] replaces an array's element type
  // (path semantics: array's "items" segment addresses the element node).
  it("C_A1: set-field-type at ['items'] replaces items type", () => {
    const ir = arr({ kind: "string" });
    const r = applyChange(ir as IR, {
      op: "set-field-type",
      path: ["items"],
      type: { kind: "number" },
    });
    expect((r.ir as ArrayNode).items).toEqual({ kind: "number" });
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change ops `wrap-in-array`, `unwrap-array`
  it("C_A2: wrap-in-array replaces node with {kind:'array', items:<original>}; inverse restores", () => {
    const ir: IR = { kind: "string" };
    const r = applyChange(ir, { op: "wrap-in-array", path: [] });
    expect(r.ir).toEqual({ kind: "array", items: { kind: "string" } });
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change op `unwrap-array`
  // Interpretation: unwrapping a non-array throws.
  it("C_A3: unwrap-array on a non-array node throws", () => {
    const ir: IR = { kind: "string" };
    expect(() => applyChange(ir, { op: "unwrap-array", path: [] })).toThrow();
  });

  // Spec: docs/core-spec.md § Change op `set-bound`
  // Interpretation: `uniqueItems` is a boolean (not in BoundName union) — skip it here.
  it("C_A4: set-bound with minItems/maxItems updates / clears", () => {
    const ir = arr({ kind: "string" });
    const r1 = applyChange(ir as IR, {
      op: "set-bound",
      path: [],
      which: "minItems",
      value: 1,
    });
    expect((r1.ir as ArrayNode).minItems).toBe(1);
    expect(applyChange(r1.ir, r1.inverse).ir).toEqual(ir);

    const irWithMax = arr({ kind: "string" }, { maxItems: 10 });
    const r2 = applyChange(irWithMax as IR, {
      op: "set-bound",
      path: [],
      which: "maxItems",
      value: null,
    });
    expect((r2.ir as ArrayNode).maxItems).toBeUndefined();
    expect(applyChange(r2.ir, r2.inverse).ir).toEqual(irWithMax);
  });
});
