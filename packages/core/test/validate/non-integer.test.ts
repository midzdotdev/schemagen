import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate non-integer", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `non-integer`
  it("V_NI1: number integer:true, value 1.5 => non-integer", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { n: { type: { kind: "number", integer: true } } },
      additional: false,
    };
    const result = validate(ir, { n: 1.5 });
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]?.kind).toBe("non-integer");
    expect(result.mismatches[0]?.path).toEqual(["n"]);
  });
});
