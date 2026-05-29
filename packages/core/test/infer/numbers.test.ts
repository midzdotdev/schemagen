import { describe, expect, it } from "vitest";
import { infer } from "../../src/infer";
import type { NumberNode, ObjectNode } from "../../src/ir/types";

function numberField(ir: unknown, name: string): NumberNode {
  const root = ir as ObjectNode;
  const f = root.fields[name];
  if (!f) throw new Error(`missing ${name}`);
  if (f.type.kind !== "number") throw new Error("expected number");
  return f.type as NumberNode;
}

describe("number inference", () => {
  // Spec: docs/core-spec.md § "`infer`" — "integerDetection"
  it("IN1: all-integer samples => integer:true", () => {
    const samples = Array.from({ length: 10 }, (_, i) => ({ n: i }));
    expect(numberField(infer(samples), "n").integer).toBe(true);
  });

  // Spec: docs/core-spec.md § same
  it("IN2: any float sample => integer absent or false", () => {
    const samples = [{ n: 1 }, { n: 2 }, { n: 1.5 }, { n: 3 }];
    const node = numberField(infer(samples), "n");
    expect(node.integer ?? false).toBe(false);
  });

  // Spec: docs/core-spec.md § same
  it("IN3: integerDetection:false => never marks integer", () => {
    const samples = Array.from({ length: 100 }, (_, i) => ({ n: i }));
    const node = numberField(infer(samples, { numbers: { integerDetection: false } }), "n");
    expect(node.integer ?? false).toBe(false);
  });

  // Spec: docs/core-spec.md § "`infer`" — rangeMode
  it("IN4: rangeMode:'off' => no min/max in IR", () => {
    const samples = Array.from({ length: 100 }, (_, i) => ({ n: i }));
    const node = numberField(infer(samples, { numbers: { rangeMode: "off" } }), "n");
    expect(node.min).toBeUndefined();
    expect(node.max).toBeUndefined();
  });

  // Spec: docs/core-spec.md § same (default rangeMode)
  it("IN5: rangeMode:'evidence-only' (default) => no min/max in IR", () => {
    const samples = Array.from({ length: 100 }, (_, i) => ({ n: i }));
    const node = numberField(infer(samples), "n");
    expect(node.min).toBeUndefined();
    expect(node.max).toBeUndefined();
  });

  // Spec: docs/core-spec.md § same
  it("IN6: rangeMode:'constraint' => min/max populated from observed range", () => {
    const samples = Array.from({ length: 100 }, (_, i) => ({ n: i + 5 })); // 5..104
    const node = numberField(infer(samples, { numbers: { rangeMode: "constraint" } }), "n");
    expect(node.min).toBe(5);
    expect(node.max).toBe(104);
  });
});
