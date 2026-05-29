import { describe, expect, it } from "vitest";
import { infer } from "../../src/infer";
import type { ObjectNode, UnionNode } from "../../src/ir/types";

describe("type conflict handling", () => {
  // Spec: docs/core-spec.md § "`infer`" — onTypeConflict (default "union")
  it("IT1: default union: mixed string/number => union of both", () => {
    const samples = [{ x: "a" }, { x: 1 }, { x: "b" }, { x: 2 }];
    const root = infer(samples) as ObjectNode;
    const f = root.fields.x;
    if (!f) throw new Error();
    expect(f.type.kind).toBe("union");
    const u = f.type as UnionNode;
    const kinds = u.variants.map((v) => v.kind).sort();
    expect(kinds).toEqual(["number", "string"]);
  });

  // Spec: docs/core-spec.md § same
  it("IT2: onTypeConflict:'unknown' => mixed-type field becomes unknown", () => {
    const samples = [{ x: "a" }, { x: 1 }];
    const root = infer(samples, { onTypeConflict: "unknown" }) as ObjectNode;
    expect(root.fields.x?.type.kind).toBe("unknown");
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "object" — nullable is field-level
  it("IT3: mixed types with null => union of value types and nullable:true (no null variant)", () => {
    const samples = [{ x: "a" }, { x: 1 }, { x: null }];
    const root = infer(samples) as ObjectNode;
    const f = root.fields.x;
    if (!f) throw new Error();
    expect(f.nullable).toBe(true);
    expect(f.type.kind).toBe("union");
    const u = f.type as UnionNode;
    for (const v of u.variants) {
      expect(v.kind).not.toBe("null");
    }
  });
});
