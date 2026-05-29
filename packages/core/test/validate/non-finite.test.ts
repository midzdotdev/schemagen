import { describe, expect, it } from "vitest";
import type { IR } from "../../src/ir/types";
import { validate } from "../../src/validate";

// Spec: docs/ir-spec.md § "number" + docs/core-spec.md § "validate".
// NaN/Infinity are `typeof "number"` but are not valid JSON numbers; they slipped through every
// non-integer number node because `NaN < min` and `NaN > max` are both false.
describe("validate non-finite numbers", () => {
  it("V_NF1: NaN fails a plain number node", () => {
    const ir: IR = { kind: "number" };
    const r = validate(ir, Number.NaN);
    expect(r.ok).toBe(false);
    expect(r.mismatches[0]?.kind).toBe("type-mismatch");
  });

  it("V_NF2: Infinity / -Infinity fail a bounded number node", () => {
    const ir: IR = { kind: "number", min: 0, max: 100 };
    expect(validate(ir, Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(validate(ir, Number.NEGATIVE_INFINITY).ok).toBe(false);
  });

  it("V_NF3: finite numbers still pass", () => {
    const ir: IR = { kind: "number" };
    expect(validate(ir, 42).ok).toBe(true);
    expect(validate(ir, -1.5).ok).toBe(true);
  });
});
