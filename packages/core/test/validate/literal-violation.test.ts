import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate literal-violation", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `literal-violation`
  it("V_LV1: IR string with literals; value is non-literal string => literal-violation", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { status: { type: { kind: "string", literals: ["active", "inactive"] } } },
      additional: false,
    };
    const result = validate(ir, { status: "pending" });
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]?.kind).toBe("literal-violation");
    expect(result.mismatches[0]?.path).toEqual(["status"]);
  });

  // Spec: docs/core-spec.md § "MismatchKind" — `literal-violation`
  it("V_LV2: same for boolean and number literals", () => {
    const irBool: ObjectNode = {
      kind: "object",
      fields: { flag: { type: { kind: "boolean", literals: [true] } } },
      additional: false,
    };
    const rBool = validate(irBool, { flag: false });
    expect(rBool.ok).toBe(false);
    expect(rBool.mismatches[0]?.kind).toBe("literal-violation");

    const irNum: ObjectNode = {
      kind: "object",
      fields: { code: { type: { kind: "number", literals: [200, 404] } } },
      additional: false,
    };
    const rNum = validate(irNum, { code: 500 });
    expect(rNum.ok).toBe(false);
    expect(rNum.mismatches[0]?.kind).toBe("literal-violation");
  });

  // Spec: docs/core-spec.md § "Mismatch" — `expected: string`
  it("V_LV3: expected description includes the literal set", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { color: { type: { kind: "string", literals: ["red", "green", "blue"] } } },
      additional: false,
    };
    const result = validate(ir, { color: "purple" });
    const expected = result.mismatches[0]?.expected ?? "";
    expect(expected).toContain("red");
    expect(expected).toContain("green");
    expect(expected).toContain("blue");
  });
});
