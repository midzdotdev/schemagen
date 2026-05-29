import { describe, expect, it } from "vitest";
import { computeEvidence } from "../../src/evidence";
import type { ObjectNode } from "../../src/ir/types";

describe("computeEvidence partial credit", () => {
  // Spec: docs/core-spec.md § "`computeEvidence`" —
  //   "Records that don't match contribute partial evidence"
  // Interpretation: A record that mismatches at depth N still counts at every
  // node it reached up to and including depth N-1. The node where the
  // mismatch happens is not counted at the level past the mismatch.
  it("E_P1: a record that mismatches deep contributes evidence at depths above only", () => {
    // IR: object { outer: object { inner: string } }
    const ir: ObjectNode = {
      kind: "object",
      fields: {
        outer: {
          type: {
            kind: "object",
            fields: {
              inner: { type: { kind: "string" } },
            },
            additional: false,
          },
        },
      },
      additional: false,
    };

    const good = { outer: { inner: "hello" } };
    // mismatch: inner is a number, not a string
    const bad = { outer: { inner: 42 } };

    const ev = computeEvidence(ir, [good, bad]);

    expect(ev.kind).toBe("object");
    if (ev.kind !== "object") return;
    // Both records reached the root.
    expect(ev.count).toBe(2);

    const outerField = ev.fields.outer;
    expect(outerField?.presenceCount).toBe(2);

    const outerEv = outerField?.valueEvidence;
    expect(outerEv?.kind).toBe("object");
    if (outerEv?.kind !== "object") return;
    // Both records reached the outer object.
    expect(outerEv.count).toBe(2);

    const innerField = outerEv.fields.inner;
    // Both records had the `inner` key present.
    expect(innerField?.presenceCount).toBe(2);

    const innerEv = innerField?.valueEvidence;
    expect(innerEv?.kind).toBe("string");
    if (innerEv?.kind !== "string") return;
    // The string node sees both samples (count is incremented before
    // type-checking), but only the matching string contributes to values.
    expect(innerEv.count).toBe(2);
    // Only the good record was added to the string distribution.
    expect(innerEv.values.hello).toBe(1);
    expect(innerEv.cardinality).toBe(1);
    // The number value should not appear under any string key.
    expect(Object.keys(innerEv.values)).toEqual(["hello"]);
  });
});
