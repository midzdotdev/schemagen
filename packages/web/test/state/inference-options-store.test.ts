// PR Z — workspace-scoped inference options.
// Plan: docs/plans/pr-z-inference-options.md

import type { InferOptions } from "@schemagen/core";
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/state/store";

beforeEach(() => {
  useStore.getState().resetForTests();
});

describe("inference options store slice", () => {
  // Plan: § "Persistence" — "Store action setInferenceOptions ... updates a slice"
  it("Z-S1: setInferenceOptions stores the value", () => {
    const opts: InferOptions = { literals: { maxCardinality: 30 } };
    useStore.getState().setInferenceOptions(opts);
    expect(useStore.getState().inferenceOptions).toEqual(opts);
  });

  // Plan: § "Surfaces" — "Reset button: 'Reset to defaults' — clears the workspace's overrides"
  // Interpretation #5: reset writes null to the store.
  it("Z-S2: setInferenceOptions(null) clears the stored value", () => {
    useStore.getState().setInferenceOptions({ literals: { maxCardinality: 30 } });
    useStore.getState().setInferenceOptions(null);
    expect(useStore.getState().inferenceOptions).toBeNull();
  });

  // Mechanical — preserves test isolation (matches identity-store.test.ts pattern).
  it("Z-S3: resetForTests resets inferenceOptions to null", () => {
    useStore.getState().setInferenceOptions({ literals: { maxCardinality: 30 } });
    useStore.getState().resetForTests();
    expect(useStore.getState().inferenceOptions).toBeNull();
  });
});
