import { describe, expect, it } from "vitest";
import type { Node } from "../../src/ir/types";

const fixtures: Node[] = [
  { kind: "string" },
  { kind: "string", literals: ["a", "b"], format: "iso-date" },
  { kind: "number", integer: true, min: 0, max: 10 },
  { kind: "boolean", literals: [true, false] },
  {
    kind: "array",
    items: { kind: "string" },
    minItems: 1,
    maxItems: 5,
  },
  {
    kind: "tuple",
    items: [{ kind: "string" }, { kind: "number" }],
    rest: { kind: "boolean" },
  },
  {
    kind: "object",
    fields: {
      id: { type: { kind: "string", format: "uuid" } },
      name: { type: { kind: "string" }, optional: true },
      avatar: { type: { kind: "string" }, nullable: true },
    },
    additional: false,
  },
  { kind: "record", values: { kind: "string" }, keyPattern: "^k_" },
  {
    kind: "union",
    variants: [{ kind: "string" }, { kind: "number" }],
    discriminator: "type",
  },
];

function walk(value: unknown, fn: (v: object) => void): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const x of value) walk(x, fn);
    return;
  }
  fn(value);
  for (const x of Object.values(value)) walk(x, fn);
}

describe("serialization", () => {
  // Spec: docs/ir-spec.md § "Design properties" #1 + § "Serialization"
  it.each(fixtures.map((ir, idx) => ({ idx, ir })))(
    "SE1: fixture $idx round-trips through JSON",
    ({ ir }) => {
      expect(JSON.parse(JSON.stringify(ir))).toEqual(ir);
    },
  );

  // Spec: docs/ir-spec.md § "Design properties" #3 + § "Serialization"
  // — "object keys preserved in insertion order"
  it("SE2: object field insertion order survives JSON round-trip", () => {
    const ir: Node = {
      kind: "object",
      fields: {
        z: { type: { kind: "string" } },
        m: { type: { kind: "string" } },
        a: { type: { kind: "string" } },
      },
      additional: false,
    };
    const round = JSON.parse(JSON.stringify(ir)) as {
      fields: Record<string, unknown>;
    };
    expect(Object.keys(round.fields)).toEqual(["z", "m", "a"]);
  });

  // Spec: docs/ir-spec.md § "Serialization" + § "Evidence is computed, not stored"
  it("SE3: no fixture IR contains 'evidence' or '$version'", () => {
    for (const ir of fixtures) {
      walk(ir, (node) => {
        const obj = node as Record<string, unknown>;
        expect(obj.evidence).toBeUndefined();
        expect(obj.$version).toBeUndefined();
      });
    }
  });
});
