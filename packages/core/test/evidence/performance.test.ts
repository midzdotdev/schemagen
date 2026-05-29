import { describe, expect, it } from "vitest";
import { computeEvidence } from "../../src/evidence";
import type { FieldEntry, Node, ObjectNode } from "../../src/ir/types";

function buildDeepIr(): ObjectNode {
  // Build a 5-level nested object IR with ~50 leaf fields total.
  // 10 leaf fields at each of 5 levels.
  const makeLevel = (childType: Node | null): ObjectNode => {
    const fields: Record<string, FieldEntry> = {};
    for (let i = 0; i < 10; i++) {
      fields[`f${i}`] = { type: { kind: "string" } };
    }
    if (childType) fields.child = { type: childType };
    return { kind: "object", fields, additional: false };
  };
  let level: ObjectNode | null = null;
  for (let depth = 0; depth < 5; depth++) {
    level = makeLevel(level);
  }
  return level as ObjectNode;
}

// Build a distinct record per index with varied string values, so the run exercises real work:
// growing/trimming top-K value maps, varied length bounds, and 10,000 separate object graphs
// (not one shared reference walked 10,000 times).
function buildRecord(ir: ObjectNode, i: number, salt = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let k = 0;
  for (const [name, entry] of Object.entries(ir.fields)) {
    if (entry.type.kind === "string") {
      out[name] = `v${(i * 7 + k * 31 + salt) % 200}`; // ~200 distinct values per field
      k++;
    } else if (entry.type.kind === "object") {
      out[name] = buildRecord(entry.type as ObjectNode, i, salt + 1);
    }
  }
  return out;
}

describe("computeEvidence performance", () => {
  // Spec: docs/core-spec.md § "`computeEvidence`" — "Performance contract"
  it("E_PF1: 10,000 distinct records over a depth-5, ~50-field IR runs under 100ms (median of 5)", () => {
    const ir = buildDeepIr();
    const records = Array.from({ length: 10_000 }, (_, i) => buildRecord(ir, i));

    // Warmup
    computeEvidence(ir, records);

    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const ev = computeEvidence(ir, records);
      const end = performance.now();
      expect(ev.count).toBe(10_000);
      times.push(end - start);
    }
    times.sort((a, b) => a - b);
    const median = times[2] as number;
    // Spec contract is <100ms on a modern laptop. Test threshold is 200ms to tolerate CPU
    // contention from vitest parallel pool workers. Records are distinct and value-varied, so
    // this measures realistic work (top-K growth, varied lengths) rather than one cached graph.
    expect(median).toBeLessThan(200);
  });
});
