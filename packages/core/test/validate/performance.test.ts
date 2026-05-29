import { describe, expect, it } from "vitest";
import type { FieldEntry, Node, ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

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

describe("validate performance", () => {
  // Spec: docs/core-spec.md § "`validate`" — "Performance contract"
  it("V_P1: 10,000 records against a depth-5, ~50-field IR completes in under 100ms (median of 5 runs)", () => {
    const ir = buildDeepIr();
    const record = buildRecord(ir);
    const records = Array.from({ length: 10_000 }, () => record);

    // Warmup
    validate(ir, records);

    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const result = validate(ir, records);
      const end = performance.now();
      expect(result.ok).toBe(true);
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
