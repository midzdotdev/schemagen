import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate null-not-allowed", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `null-not-allowed` + ir-spec § "`object`"
  it("V_NN1: field type string, value null, nullable:false => null-not-allowed", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { name: { type: { kind: "string" }, nullable: false } },
      additional: false,
    };
    const result = validate(ir, { name: null });
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]?.kind).toBe("null-not-allowed");
    expect(result.mismatches[0]?.path).toEqual(["name"]);
  });

  // Spec: docs/core-spec.md § "MismatchKind" — `null-not-allowed` + ir-spec § "`object`"
  it("V_NN2: same field with nullable:true => ok", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { name: { type: { kind: "string" }, nullable: true } },
      additional: false,
    };
    const result = validate(ir, { name: null });
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });
});
