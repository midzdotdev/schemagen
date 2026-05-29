import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { IR, StringNode } from "../../src/ir/types";

function strIR(extra: Partial<StringNode> = {}): StringNode {
  return { kind: "string", ...extra };
}

describe("applyChange string ops", () => {
  // Spec: docs/core-spec.md § Change op `add-literal`
  // Interpretation: appends; re-adding an existing literal is a no-op.
  it("C_S1: add-literal appends; idempotent when value already present", () => {
    const ir = strIR({ literals: ["a", "b"] });
    const r1 = applyChange(ir as IR, { op: "add-literal", path: [], value: "c" });
    expect((r1.ir as StringNode).literals).toEqual(["a", "b", "c"]);
    expect(applyChange(r1.ir, r1.inverse).ir).toEqual(ir);

    // Re-adding existing value is a no-op.
    const r2 = applyChange(ir as IR, { op: "add-literal", path: [], value: "a" });
    expect((r2.ir as StringNode).literals).toEqual(["a", "b"]);
  });

  // Spec: docs/core-spec.md § "Invertibility"
  it("C_S2: remove-literal removes; inverse restores literals to original form", () => {
    const ir = strIR({ literals: ["a", "b", "c"] });
    const r = applyChange(ir as IR, { op: "remove-literal", path: [], value: "b" });
    expect((r.ir as StringNode).literals).toEqual(["a", "c"]);
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § "Invertibility" — "destroyed data"
  it("C_S3: clear-literals drops the literals field entirely; inverse restores", () => {
    const ir = strIR({ literals: ["a", "b"] });
    const r = applyChange(ir as IR, { op: "clear-literals", path: [] });
    expect((r.ir as StringNode).literals).toBeUndefined();
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change op `set-format`
  it("C_S4: set-format string sets, null clears, inverse restores prior", () => {
    const ir = strIR();
    const r1 = applyChange(ir as IR, { op: "set-format", path: [], format: "email" });
    expect((r1.ir as StringNode).format).toBe("email");
    expect(applyChange(r1.ir, r1.inverse).ir).toEqual(ir);

    const irWithFormat = strIR({ format: "uuid" });
    const r2 = applyChange(irWithFormat as IR, {
      op: "set-format",
      path: [],
      format: null,
    });
    expect((r2.ir as StringNode).format).toBeUndefined();
    expect(applyChange(r2.ir, r2.inverse).ir).toEqual(irWithFormat);
  });

  // Spec: docs/core-spec.md § Change ops `set-pattern`, `set-bound`
  it("C_S5: set-pattern and set-bound mirror set-format semantics", () => {
    // pattern: set
    const ir = strIR();
    const rp1 = applyChange(ir as IR, {
      op: "set-pattern",
      path: [],
      pattern: "^[a-z]+$",
    });
    expect((rp1.ir as StringNode).pattern).toBe("^[a-z]+$");
    expect(applyChange(rp1.ir, rp1.inverse).ir).toEqual(ir);

    // pattern: clear
    const irWithPat = strIR({ pattern: "abc" });
    const rp2 = applyChange(irWithPat as IR, {
      op: "set-pattern",
      path: [],
      pattern: null,
    });
    expect((rp2.ir as StringNode).pattern).toBeUndefined();
    expect(applyChange(rp2.ir, rp2.inverse).ir).toEqual(irWithPat);

    // bound: minLength set
    const rb1 = applyChange(ir as IR, {
      op: "set-bound",
      path: [],
      which: "minLength",
      value: 3,
    });
    expect((rb1.ir as StringNode).minLength).toBe(3);
    expect(applyChange(rb1.ir, rb1.inverse).ir).toEqual(ir);

    // bound: maxLength clear
    const irWithMax = strIR({ maxLength: 10 });
    const rb2 = applyChange(irWithMax as IR, {
      op: "set-bound",
      path: [],
      which: "maxLength",
      value: null,
    });
    expect((rb2.ir as StringNode).maxLength).toBeUndefined();
    expect(applyChange(rb2.ir, rb2.inverse).ir).toEqual(irWithMax);
  });
});
