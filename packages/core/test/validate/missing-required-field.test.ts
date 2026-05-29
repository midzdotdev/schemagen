import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate missing-required-field", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `missing-required-field`
  it("V_MR1: required field 'id' not present => missing-required-field at [\"id\"]", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { id: { type: { kind: "string" } } },
      additional: false,
    };
    const result = validate(ir, {});
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]?.kind).toBe("missing-required-field");
    expect(result.mismatches[0]?.path).toEqual(["id"]);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "`object`" — optional semantics
  it("V_MR2: an optional field's absence does NOT produce this mismatch", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: {
        id: { type: { kind: "string" } },
        nickname: { type: { kind: "string" }, optional: true },
      },
      additional: false,
    };
    const result = validate(ir, { id: "abc" });
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });
});
