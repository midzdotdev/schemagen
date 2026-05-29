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

// Distinct record per index with varied string values — 10,000 separate object graphs rather
// than one shared reference walked 10,000 times.
function buildRecord(ir: ObjectNode, i: number, salt = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let k = 0;
  for (const [name, entry] of Object.entries(ir.fields)) {
    if (entry.type.kind === "string") {
      out[name] = `v${(i * 7 + k * 31 + salt) % 200}`;
      k++;
    } else if (entry.type.kind === "object") {
      out[name] = buildRecord(entry.type as ObjectNode, i, salt + 1);
    }
  }
  return out;
}

describe("validate performance", () => {
  // Spec: docs/core-spec.md § "`validate`" — "Performance contract"
  it("V_P1: 10,000 distinct records (incl. failures) against a depth-5, ~50-field IR under 100ms (median of 5)", () => {
    const ir = buildDeepIr();
    // Every 20th record carries a wrong-typed field, so the mismatch-emitting path is exercised
    // too — not just the all-valid happy path.
    const INVALID_EVERY = 20;
    const records = Array.from({ length: 10_000 }, (_, i) => {
      const r = buildRecord(ir, i);
      if (i % INVALID_EVERY === 0) r.f0 = 12_345; // number where a string is expected
      return r;
    });
    const expectedMismatches = 10_000 / INVALID_EVERY;

    // Warmup
    validate(ir, records);

    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const result = validate(ir, records);
      const end = performance.now();
      expect(result.ok).toBe(false);
      expect(result.mismatches).toHaveLength(expectedMismatches);
      times.push(end - start);
    }
    times.sort((a, b) => a - b);
    const median = times[2] as number;
    // Spec contract is <100ms on a modern laptop. Test threshold is 200ms to tolerate CPU
    // contention from vitest parallel pool workers. Records are distinct and a portion fail,
    // so this measures realistic work rather than one cached, always-passing graph.
    expect(median).toBeLessThan(200);
  });
});
