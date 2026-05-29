import { describe, expect, it } from "vitest";
import { infer } from "../../src/infer";

describe("infer determinism", () => {
  const samples = [
    { id: 1, status: "active", tags: ["a", "b"] },
    { id: 2, status: "pending", tags: ["c"] },
    { id: 3, status: "active", tags: [] },
  ];

  // Spec: docs/core-spec.md § "Module surface" — "All functions are deterministic"
  it("ID1: same samples + options produce deep-equal IRs", () => {
    const a = infer(samples);
    const b = infer(samples);
    expect(a).toEqual(b);
  });

  // Spec: docs/core-spec.md § same
  it("ID2: independent calls do not share mutable state", () => {
    const a = infer(samples) as unknown as Record<string, unknown>;
    const b = infer(samples) as unknown as Record<string, unknown>;
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
