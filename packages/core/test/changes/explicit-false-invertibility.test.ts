import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { IR } from "../../src/ir/types";

// Spec: docs/core-spec.md § "Invertibility" — applying the returned inverse to the new IR must
// produce an IR equal to the original by DEEP VALUE EQUALITY. A field/node may legitimately
// carry an explicit `false` (checkStructure accepts it; the IR is hand-editable), and that must
// survive the round-trip — a boolean-valued inverse that deletes the key on `false` cannot tell
// "absent" from "explicitly false" and so loses it.
describe("invertibility of explicit false flags", () => {
  it("C_EF1: set-integer round-trips a node with explicit integer:false", () => {
    const ir: IR = { kind: "number", integer: false };
    const r = applyChange(ir, { op: "set-integer", path: [], value: true });
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  it("C_EF2: set-optional round-trips a field with explicit optional:false", () => {
    const ir: IR = {
      kind: "object",
      additional: false,
      fields: { a: { type: { kind: "string" }, optional: false } },
    };
    const r = applyChange(ir, { op: "set-optional", path: [], name: "a", value: true });
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  it("C_EF3: set-nullable round-trips a field with explicit nullable:false", () => {
    const ir: IR = {
      kind: "object",
      additional: false,
      fields: { a: { type: { kind: "string" }, nullable: false } },
    };
    const r = applyChange(ir, { op: "set-nullable", path: [], name: "a", value: true });
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });
});
