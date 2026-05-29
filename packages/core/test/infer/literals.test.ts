import { describe, expect, it } from "vitest";
import { infer } from "../../src/infer";
import type { ObjectNode, StringNode } from "../../src/ir/types";

function rootObject(ir: unknown): ObjectNode {
  if ((ir as { kind: string }).kind !== "object") throw new Error("expected object root");
  return ir as ObjectNode;
}

function stringField(obj: ObjectNode, name: string): StringNode {
  const f = obj.fields[name];
  if (!f) throw new Error(`missing field ${name}`);
  if (f.type.kind !== "string") throw new Error(`expected string at ${name}`);
  return f.type as StringNode;
}

describe("literal detection", () => {
  // Spec: docs/core-spec.md § "`infer`" — "literals" + README walk-through
  it("IL1: low-cardinality string field gets literals", () => {
    const samples = Array.from({ length: 20 }, (_, i) => ({
      status: i % 2 === 0 ? "active" : "pending",
    }));
    const ir = rootObject(infer(samples));
    expect(stringField(ir, "status").literals).toEqual(["active", "pending"]);
  });

  // Spec: docs/core-spec.md § "`infer`" — "maxCardinality"
  it("IL2: cardinality above maxCardinality => no literals", () => {
    const samples = Array.from({ length: 100 }, (_, i) => ({ x: `v_${i}` }));
    const ir = rootObject(infer(samples));
    expect(stringField(ir, "x").literals).toBeUndefined();
  });

  // Spec: docs/core-spec.md § "`infer`" — "maxUniqueRatio"
  it("IL3: ratio above maxUniqueRatio => no literals", () => {
    // 10 samples, 5 distinct values => 0.5 > 0.3
    const samples = [
      { x: "a" },
      { x: "b" },
      { x: "c" },
      { x: "d" },
      { x: "e" },
      { x: "a" },
      { x: "b" },
      { x: "c" },
      { x: "d" },
      { x: "e" },
    ];
    const ir = rootObject(infer(samples));
    expect(stringField(ir, "x").literals).toBeUndefined();
  });

  // Spec: docs/core-spec.md § "`infer`" — "minSamples"
  it("IL4: below minSamples => no literals", () => {
    const samples = [{ x: "a" }, { x: "b" }, { x: "a" }];
    const ir = rootObject(infer(samples));
    expect(stringField(ir, "x").literals).toBeUndefined();
  });

  // Spec: docs/ir-spec.md § "Design properties" #3 (extends to literal lists by analogy)
  // Interpretation flagged in plan (IL5).
  it("IL5: literal order matches first-seen order across samples", () => {
    const samples = [
      ...Array.from({ length: 4 }, () => ({ s: "first" })),
      ...Array.from({ length: 3 }, () => ({ s: "second" })),
    ];
    const ir = rootObject(infer(samples));
    expect(stringField(ir, "s").literals).toEqual(["first", "second"]);
  });

  // Spec: docs/core-spec.md § "`infer`" — `enable` flag
  it("IL6: literals.enable:false => literals never proposed", () => {
    const samples = Array.from({ length: 20 }, () => ({ s: "active" }));
    const ir = rootObject(infer(samples, { literals: { enable: false } }));
    expect(stringField(ir, "s").literals).toBeUndefined();
  });

  // Spec: docs/core-spec.md § "`infer`" + ir-spec § boolean/number literals
  // Interpretation flagged in plan (IL7).
  it("IL7: literal detection also applies to booleans and numbers", () => {
    const bools = Array.from({ length: 10 }, () => ({ active: true }));
    const irBool = rootObject(infer(bools));
    const bf = irBool.fields.active;
    if (!bf) throw new Error();
    if (bf.type.kind !== "boolean") throw new Error("expected boolean");
    expect(bf.type.literals).toEqual([true]);

    const nums = Array.from({ length: 12 }, (_, i) => ({ n: (i % 3) + 1 }));
    const irNum = rootObject(infer(nums));
    const nf = irNum.fields.n;
    if (!nf) throw new Error();
    if (nf.type.kind !== "number") throw new Error("expected number");
    expect(nf.type.literals).toEqual([1, 2, 3]);
  });
});
