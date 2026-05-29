import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

const ir: ObjectNode = {
  kind: "object",
  fields: { id: { type: { kind: "string" } } },
  additional: false,
};

describe("validate recordIndex", () => {
  // Spec: docs/core-spec.md § "`validate`" — "If given an array..."
  it("V_RI1: array input => every mismatch carries recordIndex matching the triggering record", () => {
    const result = validate(ir, [{ id: "ok" }, { id: 123 }, { id: "ok2" }, { id: true }]);
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(2);
    expect(result.mismatches[0]?.recordIndex).toBe(1);
    expect(result.mismatches[1]?.recordIndex).toBe(3);
  });

  // Spec: docs/core-spec.md § "`validate`" — "If given an array..."
  it("V_RI2: single-record input => recordIndex property is absent (not just undefined)", () => {
    const result = validate(ir, { id: 123 });
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    const m = result.mismatches[0] as unknown as Record<string, unknown>;
    expect(Object.hasOwn(m, "recordIndex")).toBe(false);
  });
});
