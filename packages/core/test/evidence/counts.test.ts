import { describe, expect, it } from "vitest";
import { computeEvidence } from "../../src/evidence";
import type { IR, ObjectNode } from "../../src/ir/types";

describe("computeEvidence counts", () => {
  // Spec: docs/ir-spec.md § "Evidence" — "All: count"
  // Interpretation: A node's `count` reflects how many samples reached that node.
  it("E_C1: every reached evidence node has count incremented per sample", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: {
        name: { type: { kind: "string" } },
        scores: { type: { kind: "array", items: { kind: "number" } } },
      },
      additional: false,
    };

    const samples = [
      { name: "a", scores: [1, 2, 3] },
      { name: "b", scores: [10] },
      { name: "c", scores: [] },
    ];

    const ev = computeEvidence(ir, samples);
    expect(ev.count).toBe(3);
    if (ev.kind !== "object") throw new Error("expected object");

    expect(ev.fields.name?.valueEvidence.count).toBe(3);
    const arr = ev.fields.scores?.valueEvidence;
    expect(arr?.kind).toBe("array");
    if (arr?.kind !== "array") return;
    expect(arr.count).toBe(3);
    // items.count = total array entries walked
    expect(arr.items.count).toBe(4);
  });

  // Spec: docs/ir-spec.md § "Evidence" — string
  it("E_C2: string evidence has top-K values, cardinality, length bounds", () => {
    const ir: IR = { kind: "string" };
    const samples = ["apple", "apple", "apple", "banana", "banana", "cherry", "d", "elephant"];
    const ev = computeEvidence(ir, samples);
    expect(ev.kind).toBe("string");
    if (ev.kind !== "string") return;
    expect(ev.count).toBe(8);
    expect(ev.values.apple).toBe(3);
    expect(ev.values.banana).toBe(2);
    expect(ev.values.cherry).toBe(1);
    expect(ev.cardinality).toBe(5);
    expect(ev.minLength).toBe(1); // "d"
    expect(ev.maxLength).toBe(8); // "elephant"
  });

  // Spec: docs/ir-spec.md § "Evidence" — string evidence carries "top-K values, cardinality".
  // cardinality is the distinct count (not bounded by K), and `values` must hold the most
  // frequent values, not merely the first K distinct ones seen.
  it("E_C8: cardinality counts all distinct values; values keeps the top-K by frequency", () => {
    const ir: IR = { kind: "string" };
    const samples: string[] = [];
    for (let i = 0; i < 25; i++) samples.push(`v${i}`); // 25 one-off values
    for (let i = 0; i < 100; i++) samples.push("hot"); // one hot value, seen last
    const ev = computeEvidence(ir, samples);
    expect(ev.kind).toBe("string");
    if (ev.kind !== "string") return;
    // 26 distinct values — cardinality is not capped at the top-K bound of 20.
    expect(ev.cardinality).toBe(26);
    // The most frequent value is retained even though it was first observed after the cap.
    expect(ev.values.hot).toBe(100);
    // `values` is trimmed to the top-K (20) entries.
    expect(Object.keys(ev.values).length).toBe(20);
  });

  // Spec: docs/ir-spec.md § "Evidence" — number
  it("E_C3: number evidence has min/max, integerCount, floatCount", () => {
    const ir: IR = { kind: "number" };
    const samples = [1, 2, 3, 4.5, -1.5, 100];
    const ev = computeEvidence(ir, samples);
    expect(ev.kind).toBe("number");
    if (ev.kind !== "number") return;
    expect(ev.count).toBe(6);
    expect(ev.min).toBe(-1.5);
    expect(ev.max).toBe(100);
    expect(ev.integerCount).toBe(4); // 1, 2, 3, 100
    expect(ev.floatCount).toBe(2); // 4.5, -1.5
  });

  // Spec: docs/ir-spec.md § "Evidence" — boolean
  it("E_C4: boolean evidence has trueCount and falseCount", () => {
    const ir: IR = { kind: "boolean" };
    const samples = [true, true, false, true, false];
    const ev = computeEvidence(ir, samples);
    expect(ev.kind).toBe("boolean");
    if (ev.kind !== "boolean") return;
    expect(ev.count).toBe(5);
    expect(ev.trueCount).toBe(3);
    expect(ev.falseCount).toBe(2);
  });

  // Spec: docs/ir-spec.md § "Evidence" — object
  // Interpretation: `fieldPresence` is `field.presenceCount` per the type
  // declaration. Optional/missing fields don't bump presence.
  it("E_C5: object evidence tracks per-field presenceCount and nullCount", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: {
        a: { type: { kind: "string" }, optional: true },
        b: { type: { kind: "string" }, nullable: true },
      },
      additional: false,
    };
    const samples = [
      { a: "x", b: "y" },
      { b: "z" }, // a missing
      { a: "q", b: null }, // b null
      { a: "r", b: null }, // b null
    ];
    const ev = computeEvidence(ir, samples);
    expect(ev.kind).toBe("object");
    if (ev.kind !== "object") return;

    expect(ev.fields.a?.presenceCount).toBe(3);
    expect(ev.fields.b?.presenceCount).toBe(4);
    expect(ev.fields.b?.nullCount).toBe(2);
    expect(ev.fields.a?.nullCount).toBe(0);
  });

  // Spec: docs/ir-spec.md § "Evidence" — array
  it("E_C6: array evidence reports lengths {min, max, mean}", () => {
    const ir: IR = { kind: "array", items: { kind: "number" } };
    const samples = [[1], [1, 2, 3], [1, 2], []]; // lengths 1, 3, 2, 0 -> mean 1.5
    const ev = computeEvidence(ir, samples);
    expect(ev.kind).toBe("array");
    if (ev.kind !== "array") return;
    expect(ev.count).toBe(4);
    expect(ev.lengths.min).toBe(0);
    expect(ev.lengths.max).toBe(3);
    expect(ev.lengths.mean).toBeCloseTo(1.5, 5);
  });

  // Spec: docs/ir-spec.md § "Evidence" — union
  it("E_C7: union evidence tracks per-variant counts and per-variant subtrees", () => {
    const ir: IR = {
      kind: "union",
      variants: [{ kind: "string" }, { kind: "number" }],
    };
    const samples = ["x", "y", 1, 2, 3, "z"];
    const ev = computeEvidence(ir, samples);
    expect(ev.kind).toBe("union");
    if (ev.kind !== "union") return;
    expect(ev.count).toBe(6);
    expect(ev.variantCounts).toEqual([3, 3]); // 3 strings, 3 numbers

    const v0 = ev.variants[0];
    const v1 = ev.variants[1];
    expect(v0?.kind).toBe("string");
    expect(v1?.kind).toBe("number");
    if (v0?.kind === "string") {
      expect(v0.count).toBe(3);
      expect(v0.cardinality).toBe(3);
    }
    if (v1?.kind === "number") {
      expect(v1.count).toBe(3);
      expect(v1.min).toBe(1);
      expect(v1.max).toBe(3);
    }
  });
});
