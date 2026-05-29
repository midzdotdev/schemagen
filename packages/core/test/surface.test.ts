import { describe, expect, it } from "vitest";
import * as schemagen from "../src/index";

describe("public API surface", () => {
  // Spec: docs/core-spec.md § "Module surface"
  // Skipped until Phase 6 completes the full export surface. Phases 1-5 each
  // add their part of the API; this test is unblocked when all 11 exist.
  it.skip("S1: exports the public API functions", () => {
    const api = schemagen as Record<string, unknown>;
    const fns = [
      "infer",
      "validate",
      "applyChange",
      "merge",
      "emit",
      "computeEvidence",
      "findExamples",
      "proposeIdentityKey",
      "dedupeByIdentity",
      "checkStructure",
      "isValid",
    ];
    for (const name of fns) {
      expect(typeof api[name], `${name} should be a function`).toBe("function");
    }
  });

  // Spec: docs/core-spec.md § "Module surface" — "All functions are deterministic"
  // Activated once the relevant exports exist (Phase 1+).
  it.skip("S3: all exported functions are deterministic on sampled inputs", () => {
    /* implemented after exports exist */
  });
});
