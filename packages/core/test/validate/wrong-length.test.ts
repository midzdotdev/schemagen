import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate wrong-length", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `wrong-length`
  it("V_WL1: string minLength:5, length 4 => wrong-length", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { s: { type: { kind: "string", minLength: 5 } } },
      additional: false,
    };
    const result = validate(ir, { s: "abcd" });
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]?.kind).toBe("wrong-length");
    expect(result.mismatches[0]?.path).toEqual(["s"]);
  });

  // Spec: docs/core-spec.md § "MismatchKind" — `wrong-length`
  // Interpretation: a single `wrong-length` kind covers both string-length and array-length violations.
  it("V_WL2: array minItems/maxItems violations => wrong-length", () => {
    const irMin: ObjectNode = {
      kind: "object",
      fields: { xs: { type: { kind: "array", items: { kind: "number" }, minItems: 2 } } },
      additional: false,
    };
    const rMin = validate(irMin, { xs: [1] });
    expect(rMin.ok).toBe(false);
    expect(rMin.mismatches[0]?.kind).toBe("wrong-length");

    const irMax: ObjectNode = {
      kind: "object",
      fields: { xs: { type: { kind: "array", items: { kind: "number" }, maxItems: 1 } } },
      additional: false,
    };
    const rMax = validate(irMax, { xs: [1, 2, 3] });
    expect(rMax.ok).toBe(false);
    expect(rMax.mismatches[0]?.kind).toBe("wrong-length");
  });
});
