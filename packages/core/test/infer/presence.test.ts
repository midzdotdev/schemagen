import { describe, expect, it } from "vitest";
import { infer } from "../../src/infer";
import type { ObjectNode } from "../../src/ir/types";

function root(ir: unknown): ObjectNode {
  return ir as ObjectNode;
}

describe("presence-based optional/nullable inference", () => {
  // Spec: docs/core-spec.md § "`infer`" — "optionalThreshold" (default 1.0)
  it("IP1: 100% present (default threshold) => optional:false", () => {
    const samples = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const ir = root(infer(samples));
    const f = ir.fields.id;
    if (!f) throw new Error();
    expect(f.optional ?? false).toBe(false);
  });

  // Spec: docs/core-spec.md § same
  it("IP2: missing in any sample (default threshold) => optional:true", () => {
    const samples = [{ id: 1, nickname: "a" }, { id: 2 }, { id: 3, nickname: "b" }];
    const ir = root(infer(samples));
    expect(ir.fields.nickname?.optional).toBe(true);
  });

  // Spec: docs/core-spec.md § same
  it("IP3: optionalThreshold:0.8 + 85% present => optional:false", () => {
    const samples = Array.from({ length: 100 }, (_, i) =>
      i < 85 ? { x: i } : ({} as Record<string, never>),
    );
    const ir = root(infer(samples, { objects: { optionalThreshold: 0.8 } }));
    expect(ir.fields.x?.optional ?? false).toBe(false);
  });

  // Spec: docs/core-spec.md § same
  it("IP4: optionalThreshold:0.8 + 75% present => optional:true", () => {
    const samples = Array.from({ length: 100 }, (_, i) =>
      i < 75 ? { x: i } : ({} as Record<string, never>),
    );
    const ir = root(infer(samples, { objects: { optionalThreshold: 0.8 } }));
    expect(ir.fields.x?.optional).toBe(true);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "object" — "optional and nullable are independent"
  it("IP5: sometimes-null field => nullable:true, type is the value type", () => {
    const samples = [
      { id: 1, avatar: "a.png" },
      { id: 2, avatar: null },
      { id: 3, avatar: "c.png" },
    ];
    const ir = root(infer(samples));
    const f = ir.fields.avatar;
    if (!f) throw new Error();
    expect(f.nullable).toBe(true);
    expect(f.type.kind).toBe("string");
  });
});
