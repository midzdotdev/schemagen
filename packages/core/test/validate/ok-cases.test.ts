import { describe, expect, it } from "vitest";
import type { ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

const ir: ObjectNode = {
  kind: "object",
  fields: {
    id: { type: { kind: "string" } },
    age: { type: { kind: "number", integer: true } },
    active: { type: { kind: "boolean" } },
    tags: { type: { kind: "array", items: { kind: "string" } } },
  },
  additional: false,
};

const record = { id: "abc", age: 30, active: true, tags: ["a", "b"] };

describe("validate ok cases", () => {
  // Spec: docs/core-spec.md § "`validate`" — ValidationResult
  it("V_OK1: a record that satisfies every IR node => ok", () => {
    const result = validate(ir, record);
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  // Spec: docs/core-spec.md § "`validate`" — ValidationResult
  it("V_OK2: an array of fully-matching records => ok", () => {
    const result = validate(ir, [record, record, record]);
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  // Spec: docs/core-spec.md § "`validate`" — "If given an array..."
  it("V_OK3: single record vs single-element array yield equivalent ok; only array case carries recordIndex on mismatches", () => {
    const bad = { id: 123, age: 30, active: true, tags: [] };
    const single = validate(ir, bad);
    const arr = validate(ir, [bad]);
    expect(single.ok).toBe(false);
    expect(arr.ok).toBe(false);
    expect(single.mismatches[0]?.recordIndex).toBeUndefined();
    expect(arr.mismatches[0]?.recordIndex).toBe(0);
  });
});
