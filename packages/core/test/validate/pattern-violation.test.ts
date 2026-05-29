import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate pattern-violation", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `pattern-violation`
  it("V_PV1: string pattern '^[a-z]+$', value 'Abc' => pattern-violation", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { slug: { type: { kind: "string", pattern: "^[a-z]+$" } } },
      additional: false,
    };
    const result = validate(ir, { slug: "Abc" });
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]?.kind).toBe("pattern-violation");
    expect(result.mismatches[0]?.path).toEqual(["slug"]);
  });

  // Spec: docs/core-spec.md § "MismatchKind" — `pattern-violation`
  it("V_PV2: match => ok", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { slug: { type: { kind: "string", pattern: "^[a-z]+$" } } },
      additional: false,
    };
    const result = validate(ir, { slug: "abc" });
    expect(result.ok).toBe(true);
  });
});
