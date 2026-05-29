import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { IR, NumberNode } from "../../src/ir/types";

function numIR(extra: Partial<NumberNode> = {}): NumberNode {
  return { kind: "number", ...extra };
}

describe("applyChange number ops", () => {
  // Spec: docs/core-spec.md § Change op `set-integer`
  it("C_N1: set-integer toggles; inverse restores", () => {
    const ir = numIR();
    const r1 = applyChange(ir as IR, { op: "set-integer", path: [], value: true });
    expect((r1.ir as NumberNode).integer).toBe(true);
    expect(applyChange(r1.ir, r1.inverse).ir).toEqual(ir);

    const irInt = numIR({ integer: true });
    const r2 = applyChange(irInt as IR, { op: "set-integer", path: [], value: false });
    expect((r2.ir as NumberNode).integer).toBeUndefined();
    expect(applyChange(r2.ir, r2.inverse).ir).toEqual(irInt);
  });

  // Spec: parametric over node kind — literal ops apply to number too.
  it("C_N2: add-literal / remove-literal / clear-literals work on number nodes", () => {
    const ir = numIR({ literals: [1, 2] });
    const ra = applyChange(ir as IR, { op: "add-literal", path: [], value: 3 });
    expect((ra.ir as NumberNode).literals).toEqual([1, 2, 3]);
    expect(applyChange(ra.ir, ra.inverse).ir).toEqual(ir);

    const rr = applyChange(ir as IR, { op: "remove-literal", path: [], value: 1 });
    expect((rr.ir as NumberNode).literals).toEqual([2]);
    expect(applyChange(rr.ir, rr.inverse).ir).toEqual(ir);

    const rc = applyChange(ir as IR, { op: "clear-literals", path: [] });
    expect((rc.ir as NumberNode).literals).toBeUndefined();
    expect(applyChange(rc.ir, rc.inverse).ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change op `set-bound`
  it("C_N3: set-bound with min/max updates / clears; inverse restores", () => {
    const ir = numIR();
    const r1 = applyChange(ir as IR, {
      op: "set-bound",
      path: [],
      which: "min",
      value: 0,
    });
    expect((r1.ir as NumberNode).min).toBe(0);
    expect(applyChange(r1.ir, r1.inverse).ir).toEqual(ir);

    const irWithMax = numIR({ max: 100 });
    const r2 = applyChange(irWithMax as IR, {
      op: "set-bound",
      path: [],
      which: "max",
      value: null,
    });
    expect((r2.ir as NumberNode).max).toBeUndefined();
    expect(applyChange(r2.ir, r2.inverse).ir).toEqual(irWithMax);
  });
});
