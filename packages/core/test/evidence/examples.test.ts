import { describe, expect, it } from "vitest";
import { findExamples } from "../../src/evidence/examples";
import type { IR, ObjectNode } from "../../src/ir/types";

const ir: ObjectNode = {
  kind: "object",
  fields: {
    name: { type: { kind: "string" } },
    tags: { type: { kind: "array", items: { kind: "string" } } },
  },
  additional: false,
};

describe("findExamples", () => {
  // Spec: docs/core-spec.md § "`findExamples`"
  it("E_E1: without predicate, returns records where the value at path exists", () => {
    const samples = [
      { name: "a", tags: ["x"] },
      { name: "b", tags: [] }, // tags[0] does not exist
      { tags: ["y"] }, // name missing
      { name: "c", tags: ["z"] },
    ];
    const refs = findExamples(ir, samples, ["name"]);
    expect(refs.map((r) => r.index)).toEqual([0, 1, 3]);
  });

  // Spec: docs/core-spec.md § "`findExamples`"
  it("E_E2: with predicate, returns only matching records", () => {
    const samples = [
      { name: "alpha", tags: [] },
      { name: "beta", tags: [] },
      { name: "alpaca", tags: [] },
      { name: "gamma", tags: [] },
    ];
    const refs = findExamples(
      ir,
      samples,
      ["name"],
      (v) => typeof v === "string" && v.startsWith("al"),
    );
    expect(refs.map((r) => r.index)).toEqual([0, 2]);
  });

  // Spec: docs/core-spec.md § "`findExamples`" — "up to `limit` records (default 5)"
  it("E_E3: default limit is 5", () => {
    const samples = Array.from({ length: 10 }, (_, i) => ({
      name: `n${i}`,
      tags: [],
    }));
    const refs = findExamples(ir, samples, ["name"]);
    expect(refs).toHaveLength(5);
    expect(refs.map((r) => r.index)).toEqual([0, 1, 2, 3, 4]);
  });

  // Spec: docs/core-spec.md § "`findExamples`" — "up to `limit` records"
  it("E_E4: respects a custom limit", () => {
    const samples = Array.from({ length: 10 }, (_, i) => ({
      name: `n${i}`,
      tags: [],
    }));
    const refs = findExamples(ir, samples, ["name"], undefined, 3);
    expect(refs).toHaveLength(3);
    expect(refs.map((r) => r.index)).toEqual([0, 1, 2]);
  });

  // Spec: docs/core-spec.md § "RecordRef" type block
  it("E_E5: each RecordRef has { index, record }", () => {
    // Also exercises array-index path segments.
    const arrIr: IR = { kind: "array", items: { kind: "string" } };
    const samples: unknown[] = [["a", "b"], ["c"], []];
    const refs = findExamples(arrIr, samples, [0]);
    expect(refs).toHaveLength(2);
    expect(refs[0]).toEqual({ index: 0, record: ["a", "b"] });
    expect(refs[1]).toEqual({ index: 1, record: ["c"] });
  });
});
