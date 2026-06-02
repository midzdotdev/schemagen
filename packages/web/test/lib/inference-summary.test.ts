// PR II (revised) — inference-summary helpers.
// See docs/plans/pr-ii-revised-onboarding-wizard.md (interpretation #10).

import { describe, expect, it } from "vitest";
import {
  hasNonDefaultOptions,
  inferenceOverrideCount,
  summariseOptions,
} from "@/lib/inference-summary";

describe("inferenceOverrideCount", () => {
  it("counts zero for null / strict defaults", () => {
    expect(inferenceOverrideCount(null)).toBe(0);
    expect(inferenceOverrideCount({})).toBe(0);
  });

  // Previously undercounted: these two literal knobs were ignored.
  it("counts literals.maxUniqueRatio and literals.minSamples overrides", () => {
    expect(inferenceOverrideCount({ literals: { maxUniqueRatio: 0.5 } })).toBe(1);
    expect(inferenceOverrideCount({ literals: { minSamples: 10 } })).toBe(1);
    expect(inferenceOverrideCount({ literals: { maxUniqueRatio: 0.5, minSamples: 10 } })).toBe(2);
  });

  it("summariseOptions mentions the newly-counted knobs", () => {
    expect(summariseOptions({ literals: { maxUniqueRatio: 0.5 } })).toMatch(
      /max unique ratio 50%/i,
    );
    expect(summariseOptions({ literals: { minSamples: 10 } })).toMatch(/min samples 10/i);
  });
});

describe("hasNonDefaultOptions", () => {
  it("is false for null and for defaults-equal values", () => {
    expect(hasNonDefaultOptions(null)).toBe(false);
    expect(hasNonDefaultOptions({})).toBe(false);
  });

  it("is true when any knob resolves away from the strict defaults", () => {
    expect(hasNonDefaultOptions({ literals: { maxCardinality: 30 } })).toBe(true);
    // Catches a knob the heuristic override-count could miss.
    expect(hasNonDefaultOptions({ literals: { maxUniqueRatio: 0.9 } })).toBe(true);
  });
});
