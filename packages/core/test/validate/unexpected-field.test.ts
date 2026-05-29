import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate unexpected-field", () => {
  // Spec: docs/core-spec.md § "MismatchKind" — `unexpected-field`
  it("V_UF1: additional:false object + unknown key => unexpected-field", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { id: { type: { kind: "string" } } },
      additional: false,
    };
    const result = validate(ir, { id: "abc", extra: 1 });
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]?.kind).toBe("unexpected-field");
    expect(result.mismatches[0]?.path).toEqual(["extra"]);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "`object`" — `additional: true`
  it("V_UF2: additional:true => unknown keys never trigger mismatches", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { id: { type: { kind: "string" } } },
      additional: true,
    };
    const result = validate(ir, { id: "abc", random: 1, junk: "x" });
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "`object`" — `additional: Node`
  it("V_UF3: additional:<node> => unknown keys validated against that node; failures produce type-mismatch", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { id: { type: { kind: "string" } } },
      additional: { kind: "number" },
    };
    const result = validate(ir, { id: "abc", count: 5, badness: "oops" });
    const unexpected = result.mismatches.filter((m) => m.kind === "unexpected-field");
    expect(unexpected).toEqual([]);
    const typeMismatches = result.mismatches.filter((m) => m.kind === "type-mismatch");
    expect(typeMismatches).toHaveLength(1);
    expect(typeMismatches[0]?.path).toEqual(["badness"]);
  });
});
