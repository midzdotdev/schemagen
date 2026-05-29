import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { Change } from "../../src/changes/types";
import type { IR, ObjectNode } from "../../src/ir/types";

function obj(): ObjectNode {
  return {
    kind: "object",
    fields: {
      a: { type: { kind: "string" } },
      b: { type: { kind: "number" } },
      c: { type: { kind: "boolean" } },
    },
    additional: false,
  };
}

describe("applyChange object ops", () => {
  // Spec: docs/core-spec.md § Change op `add-field`
  it("C_O1: add-field appends at end by default; with position inserts at index", () => {
    const ir = obj();
    const r1 = applyChange(ir as IR, {
      op: "add-field",
      path: [],
      name: "x",
      entry: { type: { kind: "string" } },
    });
    expect(Object.keys((r1.ir as ObjectNode).fields)).toEqual(["a", "b", "c", "x"]);

    const r2 = applyChange(ir as IR, {
      op: "add-field",
      path: [],
      name: "x",
      entry: { type: { kind: "string" } },
      position: 1,
    });
    expect(Object.keys((r2.ir as ObjectNode).fields)).toEqual(["a", "x", "b", "c"]);
  });

  // Spec: docs/core-spec.md § "Invertibility"
  it("C_O2: add-field inverse is remove-field of the same name", () => {
    const ir = obj();
    const r = applyChange(ir as IR, {
      op: "add-field",
      path: [],
      name: "x",
      entry: { type: { kind: "string" } },
    });
    expect(r.inverse).toEqual({ op: "remove-field", path: [], name: "x" });

    const back = applyChange(r.ir, r.inverse);
    expect(back.ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § "Invertibility" — "destroyed data"
  it("C_O3: remove-field inverse restores field at original position", () => {
    const ir = obj();
    const r = applyChange(ir as IR, { op: "remove-field", path: [], name: "b" });
    expect(Object.keys((r.ir as ObjectNode).fields)).toEqual(["a", "c"]);

    // inverse must be an add-field carrying the entry and original index
    expect((r.inverse as { op: string }).op).toBe("add-field");
    expect((r.inverse as { name: string }).name).toBe("b");
    expect((r.inverse as { position?: number }).position).toBe(1);

    const back = applyChange(r.ir, r.inverse);
    expect(back.ir).toEqual(ir);
    expect(Object.keys((back.ir as ObjectNode).fields)).toEqual(["a", "b", "c"]);
  });

  // Spec: docs/core-spec.md § Change op `rename-field` + "Invertibility"
  it("C_O4: rename-field preserves position and entry; inverse renames back", () => {
    const ir = obj();
    const r = applyChange(ir as IR, {
      op: "rename-field",
      path: [],
      from: "b",
      to: "bb",
    });
    expect(Object.keys((r.ir as ObjectNode).fields)).toEqual(["a", "bb", "c"]);
    expect((r.ir as ObjectNode).fields.bb).toEqual(ir.fields.b);

    const back = applyChange(r.ir, r.inverse);
    expect(back.ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change op `reorder-fields`
  // Interpretation: `order` must be a permutation of existing field names.
  // Length mismatch and unknown names both throw.
  it("C_O5: reorder-fields requires permutation of existing field names", () => {
    const ir = obj();
    // Valid permutation works and is invertible.
    const r = applyChange(ir as IR, {
      op: "reorder-fields",
      path: [],
      order: ["c", "a", "b"],
    });
    expect(Object.keys((r.ir as ObjectNode).fields)).toEqual(["c", "a", "b"]);
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);

    // Length mismatch throws.
    expect(() =>
      applyChange(ir as IR, { op: "reorder-fields", path: [], order: ["a", "b"] }),
    ).toThrow();

    // Unknown name throws.
    expect(() =>
      applyChange(ir as IR, {
        op: "reorder-fields",
        path: [],
        order: ["a", "b", "zzz"],
      }),
    ).toThrow();
  });

  // Spec: docs/core-spec.md § Change ops `set-optional`, `set-nullable`
  it.each([
    ["set-optional", "optional"],
    ["set-nullable", "nullable"],
  ] as const)("C_O6: %s toggles the field's flag; inverse restores", (op, flagName) => {
    const ir = obj();
    const change: Change =
      op === "set-optional"
        ? { op: "set-optional", path: [], name: "a", value: true }
        : { op: "set-nullable", path: [], name: "a", value: true };
    const r = applyChange(ir as IR, change);
    expect((r.ir as ObjectNode).fields.a?.[flagName]).toBe(true);

    const back = applyChange(r.ir, r.inverse);
    expect(back.ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change op `set-additional`
  it("C_O7: set-additional accepts false / true / Node; inverse restores prior", () => {
    const ir = obj();

    const r1 = applyChange(ir as IR, { op: "set-additional", path: [], value: true });
    expect((r1.ir as ObjectNode).additional).toBe(true);
    expect(applyChange(r1.ir, r1.inverse).ir).toEqual(ir);

    const r2 = applyChange(ir as IR, {
      op: "set-additional",
      path: [],
      value: { kind: "string" },
    });
    expect((r2.ir as ObjectNode).additional).toEqual({ kind: "string" });
    expect(applyChange(r2.ir, r2.inverse).ir).toEqual(ir);

    // From a non-false starting state, can set back to false and restore.
    const ir2 = applyChange(ir as IR, { op: "set-additional", path: [], value: true }).ir;
    const r3 = applyChange(ir2, { op: "set-additional", path: [], value: false });
    expect((r3.ir as ObjectNode).additional).toBe(false);
    expect(applyChange(r3.ir, r3.inverse).ir).toEqual(ir2);
  });
});
