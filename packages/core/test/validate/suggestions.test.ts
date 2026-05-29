import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate suggestions", () => {
  // Spec: docs/core-spec.md § "Suggestions and Changes"
  it("V_SG1: each mismatch carries suggestions with the spec-implied change op", () => {
    // literal-violation => add-literal
    const irLit: ObjectNode = {
      kind: "object",
      fields: { status: { type: { kind: "string", literals: ["active", "inactive"] } } },
      additional: false,
    };
    const litResult = validate(irLit, { status: "pending" });
    const litMismatch = litResult.mismatches.find((m) => m.kind === "literal-violation");
    expect(litMismatch?.suggestions.length).toBeGreaterThan(0);
    expect(litMismatch?.suggestions[0]?.change.op).toBe("add-literal");

    // missing-required-field => set-optional
    const irMissing: ObjectNode = {
      kind: "object",
      fields: { id: { type: { kind: "string" } } },
      additional: false,
    };
    const missingResult = validate(irMissing, {});
    const missingMismatch = missingResult.mismatches.find(
      (m) => m.kind === "missing-required-field",
    );
    expect(missingMismatch?.suggestions[0]?.change.op).toBe("set-optional");

    // type-mismatch => wrap-in-union
    const irType: ObjectNode = {
      kind: "object",
      fields: { name: { type: { kind: "string" } } },
      additional: false,
    };
    const typeResult = validate(irType, { name: 42 });
    const typeMismatch = typeResult.mismatches.find((m) => m.kind === "type-mismatch");
    expect(typeMismatch?.suggestions[0]?.change.op).toBe("wrap-in-union");

    // unexpected-field => add-field
    const irUnex: ObjectNode = {
      kind: "object",
      fields: { id: { type: { kind: "string" } } },
      additional: false,
    };
    const unexResult = validate(irUnex, { id: "a", extra: 1 });
    const unexMismatch = unexResult.mismatches.find((m) => m.kind === "unexpected-field");
    expect(unexMismatch?.suggestions[0]?.change.op).toBe("add-field");
  });

  // Spec: docs/core-spec.md § "Suggestion" type block
  it("V_SG2: each Suggestion has label, rationale, change with op", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: { name: { type: { kind: "string" } } },
      additional: false,
    };
    const result = validate(ir, { name: 42 });
    for (const m of result.mismatches) {
      for (const s of m.suggestions) {
        expect(typeof s.label).toBe("string");
        expect(s.label.length).toBeGreaterThan(0);
        expect(typeof s.rationale).toBe("string");
        expect(s.rationale.length).toBeGreaterThan(0);
        expect(typeof s.change).toBe("object");
        expect(typeof s.change.op).toBe("string");
      }
    }
  });

  // Spec: docs/core-spec.md § "Mismatch" — "ordered, most-recommended first"
  // Interpretation: ordered most-recommended-first implies deterministic ordering across calls with identical inputs.
  it("V_SG3: suggestions are deterministic across calls", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: {
        status: { type: { kind: "string", literals: ["active", "inactive"] } },
        name: { type: { kind: "string" } },
      },
      additional: false,
    };
    const data = { status: "pending", name: 7, extra: true };
    const a = validate(ir, data);
    const b = validate(ir, data);
    expect(b.mismatches).toEqual(a.mismatches);
  });
});
