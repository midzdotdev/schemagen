import { describe, expect, it } from "vitest";
import type { ObjectNode, UnionNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate type-mismatch", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `type-mismatch`
  it("V_TM1: IR string, value number => type-mismatch with correct path", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { name: { type: { kind: "string" } } },
      additional: false,
    };
    const result = validate(ir, { name: 42 });
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    const m = result.mismatches[0];
    expect(m?.kind).toBe("type-mismatch");
    expect(m?.path).toEqual(["name"]);
  });

  // Spec: docs/core-spec.md § "MismatchKind" — `type-mismatch`
  // Interpretation: A union mismatch (no variant matches the value) surfaces as a single type-mismatch at the union's path.
  it("V_TM2: IR union; value matches no variant => type-mismatch at the union's path", () => {
    const union: UnionNode = {
      kind: "union",
      variants: [{ kind: "string" }, { kind: "number" }],
    };
    const ir: ObjectNode = {
      kind: "object",
      fields: { val: { type: union } },
      additional: false,
    };
    const result = validate(ir, { val: true });
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    const m = result.mismatches[0];
    expect(m?.kind).toBe("type-mismatch");
    expect(m?.path).toEqual(["val"]);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "`unknown`"
  it("V_TM3: IR unknown => never triggers type-mismatch", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { anything: { type: { kind: "unknown" } } },
      additional: false,
    };
    for (const v of [1, "x", true, null, [], {}, undefined]) {
      const result = validate(ir, { anything: v });
      const typeMismatches = result.mismatches.filter((m) => m.kind === "type-mismatch");
      expect(typeMismatches).toEqual([]);
    }
  });
});
