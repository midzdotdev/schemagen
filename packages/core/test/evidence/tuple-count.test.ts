import { describe, expect, it } from "vitest";
import { computeEvidence } from "../../src/evidence";
import type { IR } from "../../src/ir/types";

describe("computeEvidence tuple counts", () => {
  // Spec: docs/core-spec.md § "computeEvidence" + docs/ir-spec.md § "Evidence" — a node's `count`
  // is "how many records reached this node". A tuple position absent in a short array was NOT
  // reached, so it must not be counted (the walker incremented count before checking presence).
  it("E_TC1: tuple positions absent in a short array are not counted", () => {
    const ir: IR = { kind: "tuple", items: [{ kind: "number" }, { kind: "number" }] };
    const samples = [[1], [10, 20]]; // first array only reaches position 0
    const ev = computeEvidence(ir, samples);
    if (ev.kind !== "tuple") throw new Error("expected tuple evidence");
    expect(ev.count).toBe(2);
    expect(ev.items[0]?.count).toBe(2); // position 0 present in both
    expect(ev.items[1]?.count).toBe(1); // position 1 present only in the second array
  });
});
