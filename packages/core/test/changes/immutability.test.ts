import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { Change } from "../../src/changes/types";
import type { IR, ObjectNode } from "../../src/ir/types";

function makeIR(): ObjectNode {
  return {
    kind: "object",
    fields: {
      a: { type: { kind: "string" } },
      b: { type: { kind: "number" } },
      tags: { type: { kind: "array", items: { kind: "string" } } },
      status: {
        type: {
          kind: "union",
          variants: [{ kind: "string" }, { kind: "number" }, { kind: "boolean" }],
        },
      },
    },
    additional: false,
  };
}

// One representative op per family. Each row is [label, change].
const reps: Array<[string, Change]> = [
  ["set-node", { op: "set-node", path: ["a"], node: { kind: "boolean" } }],
  ["set-field-type", { op: "set-field-type", path: ["a"], type: { kind: "boolean" } }],
  ["add-field", { op: "add-field", path: [], name: "new", entry: { type: { kind: "string" } } }],
  ["remove-field", { op: "remove-field", path: [], name: "b" }],
  ["rename-field", { op: "rename-field", path: [], from: "a", to: "aa" }],
  ["reorder-fields", { op: "reorder-fields", path: [], order: ["b", "a", "tags", "status"] }],
  ["set-optional", { op: "set-optional", path: [], name: "a", value: true }],
  ["set-nullable", { op: "set-nullable", path: [], name: "b", value: true }],
  ["add-literal", { op: "add-literal", path: ["a"], value: "x" }],
  ["clear-literals", { op: "clear-literals", path: ["a"] }],
  ["set-format", { op: "set-format", path: ["a"], format: "email" }],
  ["set-pattern", { op: "set-pattern", path: ["a"], pattern: "^x$" }],
  ["set-bound", { op: "set-bound", path: ["b"], which: "min", value: 0 }],
  ["set-integer", { op: "set-integer", path: ["b"], value: true }],
  ["wrap-in-union", { op: "wrap-in-union", path: ["a"], with: { kind: "null" } }],
  ["add-union-variant", { op: "add-union-variant", path: ["status"], variant: { kind: "null" } }],
  ["set-discriminator", { op: "set-discriminator", path: ["status"], field: "t" }],
  ["wrap-in-array", { op: "wrap-in-array", path: ["a"] }],
  ["unwrap-array", { op: "unwrap-array", path: ["tags"] }],
  ["set-additional", { op: "set-additional", path: [], value: true }],
  [
    "batch",
    {
      op: "batch",
      changes: [
        { op: "set-optional", path: [], name: "a", value: true },
        { op: "set-format", path: ["a"], format: "email" },
      ],
    },
  ],
];

describe("applyChange immutability", () => {
  // Spec: docs/ir-spec.md § "Design properties" #5 — Immutable in transit
  it.each(reps)("C_IM1[%s]: applyChange does not mutate the input IR", (_label, change) => {
    const ir = makeIR();
    const snapshot = JSON.parse(JSON.stringify(ir));
    applyChange(ir as IR, change);
    expect(ir).toEqual(snapshot);
  });
});
