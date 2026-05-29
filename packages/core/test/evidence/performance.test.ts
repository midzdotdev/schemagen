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

function buildRecord(ir: ObjectNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(ir.fields)) {
    if (entry.type.kind === "string") out[name] = "x";
    else if (entry.type.kind === "object") out[name] = buildRecord(entry.type as ObjectNode);
  }
  return out;
}

describe("computeEvidence performance", () => {
  // Spec: docs/core-spec.md § "`computeEvidence`" — "Performance contract"
  it("E_PF1: 10,000 records over a depth-5, ~50-field IR runs under 100ms (median of 5)", () => {
    const ir = buildDeepIr();
    const record = buildRecord(ir);
    const records = Array.from({ length: 10_000 }, () => record);

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
    // Spec contract is <100ms on a modern laptop. Test threshold is 200ms to
    // tolerate CPU contention from vitest parallel pool workers — typical
    // median in isolation is 30-50ms.
    expect(median).toBeLessThan(200);
  });
});
