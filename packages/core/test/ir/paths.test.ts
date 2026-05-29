import { describe, expect, it } from "vitest";
import { getNodeAt, setNodeAt } from "../../src/ir/paths";
import type { Node } from "../../src/ir/types";

const sample: Node = {
  kind: "object",
  fields: {
    id: { type: { kind: "string", format: "uuid" } },
    tags: { type: { kind: "array", items: { kind: "string" } } },
    coord: {
      type: { kind: "tuple", items: [{ kind: "number" }, { kind: "number" }] },
    },
    u: {
      type: { kind: "union", variants: [{ kind: "string" }, { kind: "number" }] },
    },
    map: { type: { kind: "record", values: { kind: "string" } } },
  },
  additional: false,
};

describe("paths", () => {
  // Spec: docs/core-spec.md § "Suggestions and Changes" — `Path is (string | number)[]`
  it("SP1: getNodeAt with empty path returns the root", () => {
    expect(getNodeAt(sample, [])).toBe(sample);
  });

  // Spec: docs/core-spec.md § "Suggestions and Changes" — Path semantics per node kind
  it("SP2: getNodeAt traverses object/array/tuple/union/record correctly", () => {
    expect(getNodeAt(sample, ["id"])).toEqual({ kind: "string", format: "uuid" });
    expect(getNodeAt(sample, ["tags", "items"])).toEqual({ kind: "string" });
    expect(getNodeAt(sample, ["coord", 1])).toEqual({ kind: "number" });
    expect(getNodeAt(sample, ["u", 0])).toEqual({ kind: "string" });
    expect(getNodeAt(sample, ["map", "values"])).toEqual({ kind: "string" });
  });

  // Spec: docs/core-spec.md § same — helper contract (returns undefined, never throws)
  it("SP3: getNodeAt returns undefined for non-existent paths", () => {
    expect(getNodeAt(sample, ["missing"])).toBeUndefined();
    expect(getNodeAt(sample, ["id", "items"])).toBeUndefined();
    expect(getNodeAt(sample, ["coord", 99])).toBeUndefined();
    expect(() => getNodeAt(sample, ["does", "not", "exist"])).not.toThrow();
  });

  // Spec: docs/ir-spec.md § "Design properties" #5 "Immutable in transit"
  it("SP4: setNodeAt returns a new IR; input is unchanged", () => {
    const snapshot = JSON.parse(JSON.stringify(sample));
    const result = setNodeAt(sample, ["id"], { kind: "string", format: "email" });
    expect(result).not.toBe(sample);
    expect(sample).toEqual(snapshot);
  });

  // Spec: docs/core-spec.md § same
  it("SP5: setNodeAt at [] replaces the root", () => {
    const replaced: Node = { kind: "number" };
    expect(setNodeAt(sample, [], replaced)).toBe(replaced);
  });

  // Spec: docs/ir-spec.md § "Design properties" #3 "Field-order-preserving"
  it("SP6: setNodeAt preserves sibling object-field insertion order", () => {
    const result = setNodeAt(sample, ["tags"], {
      kind: "array",
      items: { kind: "number" },
    });
    if (result.kind !== "object") throw new Error("expected object root");
    expect(Object.keys(result.fields)).toEqual(["id", "tags", "coord", "u", "map"]);
  });
});
