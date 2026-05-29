import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { Change } from "../../src/changes/types";
import type { IR, ObjectNode } from "../../src/ir/types";

function obj(): ObjectNode {
  return {
    kind: "object",
    fields: {
      a: { type: { kind: "string" } },
      b: { type: { kind: "number" } },
    },
    additional: false,
  };
}

describe("applyChange generic ops", () => {
  // Spec: docs/core-spec.md § Change op `set-node` + "Invertibility"
  it("C_G1: set-node replaces node at path entirely; inverse restores prior", () => {
    const ir = obj();
    const r = applyChange(ir as IR, {
      op: "set-node",
      path: ["a"],
      node: { kind: "boolean" },
    });
    expect((r.ir as ObjectNode).fields.a?.type).toEqual({ kind: "boolean" });
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change op `set-field-type`
  it("C_G2: set-field-type replaces an object field's type; inverse restores", () => {
    const ir = obj();
    const r = applyChange(ir as IR, {
      op: "set-field-type",
      path: ["a"],
      type: { kind: "boolean" },
    });
    expect((r.ir as ObjectNode).fields.a?.type).toEqual({ kind: "boolean" });
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change op `batch` + "Invertibility"
  it("C_G3: batch applies children in order", () => {
    const ir = obj();
    const change: Change = {
      op: "batch",
      changes: [
        { op: "set-optional", path: [], name: "a", value: true },
        {
          op: "add-field",
          path: [],
          name: "c",
          entry: { type: { kind: "boolean" } },
        },
      ],
    };
    const r = applyChange(ir as IR, change);
    expect((r.ir as ObjectNode).fields.a?.optional).toBe(true);
    expect(Object.keys((r.ir as ObjectNode).fields)).toEqual(["a", "b", "c"]);
  });

  // Spec: docs/core-spec.md § "Invertibility"
  it("C_G4: batch is invertible — inverse reverses + inverts each child", () => {
    const ir = obj();
    const change: Change = {
      op: "batch",
      label: "do stuff",
      changes: [
        { op: "set-optional", path: [], name: "a", value: true },
        {
          op: "add-field",
          path: [],
          name: "c",
          entry: { type: { kind: "boolean" } },
        },
        { op: "set-format", path: ["a"], format: "email" },
      ],
    };
    const r = applyChange(ir as IR, change);
    expect((r.inverse as { op: string }).op).toBe("batch");
    const back = applyChange(r.ir, r.inverse);
    expect(back.ir).toEqual(ir);
  });
});
