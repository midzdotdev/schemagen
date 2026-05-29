import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate out-of-range", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `out-of-range`
  it("V_OR1: number with min:0, value -1 => out-of-range", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { n: { type: { kind: "number", min: 0 } } },
      additional: false,
    };
    const result = validate(ir, { n: -1 });
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]?.kind).toBe("out-of-range");
    expect(result.mismatches[0]?.path).toEqual(["n"]);
  });

  // Spec: docs/core-spec.md § "MismatchKind" — `out-of-range`
  it("V_OR2: number with max:100, value 101 => out-of-range", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { n: { type: { kind: "number", max: 100 } } },
      additional: false,
    };
    const result = validate(ir, { n: 101 });
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]?.kind).toBe("out-of-range");
  });

  // Spec: docs/core-spec.md § "MismatchKind" — `out-of-range`
  it("V_OR3: both bounds: value within range => ok", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { n: { type: { kind: "number", min: 0, max: 100 } } },
      additional: false,
    };
    const result = validate(ir, { n: 50 });
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });
});
