import { describe, expect, it } from "vitest";
import { infer } from "../../src/infer";

function hasEvidence(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasEvidence);
  if ("evidence" in value) return true;
  return Object.values(value).some(hasEvidence);
}

describe("infer produces no evidence in the IR", () => {
  // Spec: docs/ir-spec.md § "Evidence is computed, not stored"
  // + docs/core-spec.md § "`infer`" — "Evidence" subsection
  it("INE1: no `evidence` key appears anywhere in the inferred IR", () => {
    const samples = [
      { id: "a", status: "active", count: 1, optional_field: "x" },
      { id: "b", status: "pending", count: 2 },
      { id: "c", status: "active", count: 3, tags: ["a", "b"] },
    ];
    const ir = infer(samples);
    expect(hasEvidence(ir)).toBe(false);
  });
});
