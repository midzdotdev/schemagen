import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { IR, UnionNode } from "../../src/ir/types";

describe("applyChange union ops", () => {
  // Spec: docs/core-spec.md § Change op `wrap-in-union`
  it("C_U1: wrap-in-union produces union with variants:[current, with]", () => {
    const ir: IR = { kind: "string" };
    const r = applyChange(ir, {
      op: "wrap-in-union",
      path: [],
      with: { kind: "number" },
    });
    expect(r.ir).toEqual({
      kind: "union",
      variants: [{ kind: "string" }, { kind: "number" }],
    });
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change ops `add-union-variant`, `remove-union-variant`
  it("C_U2: add-union-variant appends; remove-union-variant removes by index", () => {
    const ir: UnionNode = {
      kind: "union",
      variants: [{ kind: "string" }, { kind: "number" }, { kind: "boolean" }],
    };

    const ra = applyChange(ir as IR, {
      op: "add-union-variant",
      path: [],
      variant: { kind: "null" },
    });
    expect((ra.ir as UnionNode).variants).toEqual([
      { kind: "string" },
      { kind: "number" },
      { kind: "boolean" },
      { kind: "null" },
    ]);
    expect(applyChange(ra.ir, ra.inverse).ir).toEqual(ir);

    const rr = applyChange(ir as IR, {
      op: "remove-union-variant",
      path: [],
      index: 1,
    });
    expect((rr.ir as UnionNode).variants).toEqual([{ kind: "string" }, { kind: "boolean" }]);
    expect(applyChange(rr.ir, rr.inverse).ir).toEqual(ir);
  });

  // Spec: docs/ir-spec.md § "Structural validity" — "union.variants.length >= 2"
  it("C_U3: removing variant from a 2-variant union throws", () => {
    const ir: UnionNode = {
      kind: "union",
      variants: [{ kind: "string" }, { kind: "number" }],
    };
    expect(() =>
      applyChange(ir as IR, { op: "remove-union-variant", path: [], index: 0 }),
    ).toThrow();
  });

  // Spec: docs/core-spec.md § Change op `set-discriminator`
  it("C_U4: set-discriminator sets/clears the discriminator field name", () => {
    const ir: UnionNode = {
      kind: "union",
      variants: [{ kind: "string" }, { kind: "number" }],
    };
    const r1 = applyChange(ir as IR, {
      op: "set-discriminator",
      path: [],
      field: "type",
    });
    expect((r1.ir as UnionNode).discriminator).toBe("type");
    expect(applyChange(r1.ir, r1.inverse).ir).toEqual(ir);

    const irWithDisc: UnionNode = { ...ir, discriminator: "kind" };
    const r2 = applyChange(irWithDisc as IR, {
      op: "set-discriminator",
      path: [],
      field: null,
    });
    expect((r2.ir as UnionNode).discriminator).toBeUndefined();
    expect(applyChange(r2.ir, r2.inverse).ir).toEqual(irWithDisc);
  });
});
