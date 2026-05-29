import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { Change } from "../../src/changes/types";
import type { IR, ObjectNode } from "../../src/ir/types";

// Helper: build a rich IR exercising many ops in one shape.
function makeIR(): ObjectNode {
  return {
    kind: "object",
    fields: {
      name: { type: { kind: "string" } },
      age: { type: { kind: "number" } },
      tags: { type: { kind: "array", items: { kind: "string" } } },
      status: {
        type: {
          kind: "union",
          variants: [
            { kind: "string", literals: ["active"] },
            { kind: "string", literals: ["inactive"] },
            { kind: "string", literals: ["pending"] },
          ],
        },
      },
      meta: {
        type: { kind: "record", values: { kind: "string" } },
      },
    },
    additional: false,
  };
}

describe("applyChange api", () => {
  // Spec: docs/core-spec.md § "Invertibility"
  // One representative change per op kind; assert shape of return.
  const cases: Array<[string, Change]> = [
    ["set-node", { op: "set-node", path: ["name"], node: { kind: "string", format: "email" } }],
    [
      "set-field-type",
      { op: "set-field-type", path: ["name"], type: { kind: "string", format: "uuid" } },
    ],
    ["add-field", { op: "add-field", path: [], name: "newF", entry: { type: { kind: "string" } } }],
    ["remove-field", { op: "remove-field", path: [], name: "name" }],
    ["rename-field", { op: "rename-field", path: [], from: "name", to: "fullName" }],
    [
      "reorder-fields",
      { op: "reorder-fields", path: [], order: ["age", "name", "tags", "status", "meta"] },
    ],
    ["set-optional", { op: "set-optional", path: [], name: "name", value: true }],
    ["set-nullable", { op: "set-nullable", path: [], name: "age", value: true }],
    ["add-literal", { op: "add-literal", path: ["name"], value: "hello" }],
    ["remove-literal", { op: "remove-literal", path: ["status", 0], value: "active" }],
    ["clear-literals", { op: "clear-literals", path: ["status", 0] }],
    ["set-format", { op: "set-format", path: ["name"], format: "email" }],
    ["set-pattern", { op: "set-pattern", path: ["name"], pattern: "^[a-z]+$" }],
    ["set-bound", { op: "set-bound", path: ["age"], which: "min", value: 0 }],
    ["set-integer", { op: "set-integer", path: ["age"], value: true }],
    ["wrap-in-union", { op: "wrap-in-union", path: ["name"], with: { kind: "null" } }],
    ["add-union-variant", { op: "add-union-variant", path: ["status"], variant: { kind: "null" } }],
    ["remove-union-variant", { op: "remove-union-variant", path: ["status"], index: 2 }],
    ["set-discriminator", { op: "set-discriminator", path: ["status"], field: "type" }],
    ["wrap-in-array", { op: "wrap-in-array", path: ["name"] }],
    ["unwrap-array", { op: "unwrap-array", path: ["tags"] }],
    ["set-additional", { op: "set-additional", path: [], value: true }],
    [
      "batch",
      {
        op: "batch",
        changes: [
          { op: "set-optional", path: [], name: "name", value: true },
          { op: "set-nullable", path: [], name: "age", value: true },
        ],
      },
    ],
  ];

  // Spec: docs/core-spec.md § "Invertibility" — every op returns { ir, inverse }
  it.each(cases)("C_API1: %s returns { ir, inverse }", (_, change) => {
    const ir = makeIR();
    const result = applyChange(ir as IR, change);
    expect(result).toHaveProperty("ir");
    expect(result).toHaveProperty("inverse");
    expect(typeof (result.inverse as Change).op).toBe("string");
  });

  // Spec: docs/ir-spec.md § "Design properties" #5 — Immutable in transit
  it("C_API2: returned ir is a new object reference (when op actually changes the IR)", () => {
    const ir = makeIR();
    const change: Change = { op: "set-format", path: ["name"], format: "email" };
    const result = applyChange(ir as IR, change);
    expect(result.ir).not.toBe(ir);
  });

  // Spec: docs/ir-spec.md § "Design properties" #5 — Immutable in transit
  it("C_API3: input IR is not mutated by applyChange", () => {
    const ir = makeIR();
    const snapshot = JSON.parse(JSON.stringify(ir));
    applyChange(ir as IR, {
      op: "set-format",
      path: ["name"],
      format: "email",
    });
    expect(ir).toEqual(snapshot);
  });

  // Spec: docs/core-spec.md § "Structural validity" —
  //       "applyChange ... reject structurally invalid IRs"
  it("C_API4: throws on structurally invalid input IR", () => {
    const bad = { kind: "not-a-real-kind" } as unknown as IR;
    expect(() => applyChange(bad, { op: "set-format", path: [], format: null })).toThrow();
  });
});
