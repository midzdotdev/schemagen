import { describe, expect, it } from "vitest";
import * as schemagen from "../src/index";

describe("public API surface", () => {
  // Spec: docs/core-spec.md § "Module surface"
  it("S1: exports the public API functions", () => {
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
  it("S3: all exported functions are deterministic on sampled inputs", () => {
    const ir = schemagen.infer([
      { id: "a", n: 1 },
      { id: "b", n: 2 },
    ]);
    const r1 = schemagen.validate(ir, { id: "x", n: 1 });
    const r2 = schemagen.validate(ir, { id: "x", n: 1 });
    expect(r1).toEqual(r2);

    const e1 = schemagen.emit(ir, "json-schema");
    const e2 = schemagen.emit(ir, "json-schema");
    expect(e1).toEqual(e2);

    const ev1 = schemagen.computeEvidence(ir, [{ id: "a", n: 1 }]);
    const ev2 = schemagen.computeEvidence(ir, [{ id: "a", n: 1 }]);
    expect(ev1).toEqual(ev2);
  });
});
