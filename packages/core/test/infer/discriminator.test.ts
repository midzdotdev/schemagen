import { describe, expect, it } from "vitest";
import { infer } from "../../src/infer";
import type { ObjectNode, StringNode, UnionNode } from "../../src/ir/types";

describe("discriminator detection", () => {
  const partitioned = [
    { type: "purchase", amount: 100, currency: "USD" },
    { type: "purchase", amount: 200, currency: "EUR" },
    { type: "refund", reason: "defect" },
    { type: "refund", reason: "wrong-item" },
  ];

  // Spec: docs/core-spec.md § "`infer`" — discriminator detection
  it("IDC1: tag field partitioning shapes => union with discriminator", () => {
    const ir = infer(partitioned);
    expect(ir.kind).toBe("union");
    const u = ir as UnionNode;
    expect(u.discriminator).toBe("type");
    expect(u.variants.length).toBe(2);
  });

  // Spec: docs/core-spec.md § same
  it("IDC2: imperfect partition => no discriminator", () => {
    const samples = [
      { type: "purchase", amount: 100 },
      { type: "purchase", reason: "defect" }, // same tag, different shape
      { type: "refund", reason: "x" },
    ];
    const ir = infer(samples);
    expect(ir.kind).not.toBe("union");
  });

  // Spec: docs/core-spec.md § "`infer`" — `fields` list
  it("IDC3: discriminators.fields restricts candidates", () => {
    // type partitions perfectly but the dev restricts to 'kind' which doesn't exist
    const ir = infer(partitioned, { discriminators: { fields: ["kind"] } });
    expect(ir.kind).not.toBe("union");
  });

  // Spec: docs/core-spec.md § same
  it("IDC4: discriminators.enable:false => discriminator never set", () => {
    const ir = infer(partitioned, { discriminators: { enable: false } });
    expect(ir.kind).not.toBe("union");
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "union" — discriminator semantics
  it("IDC5: each variant is an object carrying the discriminator literal", () => {
    const ir = infer(partitioned);
    if (ir.kind !== "union") throw new Error("expected union");
    expect(ir.discriminator).toBe("type");
    const tagValues = new Set<string>();
    for (const v of ir.variants) {
      expect(v.kind).toBe("object");
      const obj = v as ObjectNode;
      const tagEntry = obj.fields.type;
      if (!tagEntry) throw new Error("expected `type` field");
      const tag = tagEntry.type as StringNode;
      expect(tag.kind).toBe("string");
      expect(tag.literals?.length).toBe(1);
      const lit = tag.literals?.[0];
      if (!lit) throw new Error();
      tagValues.add(lit);
    }
    expect(tagValues).toEqual(new Set(["purchase", "refund"]));
  });
});
