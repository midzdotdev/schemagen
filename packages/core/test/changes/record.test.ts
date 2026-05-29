import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/changes";
import type { IR, RecordNode } from "../../src/ir/types";

describe("applyChange record ops", () => {
  // Spec: docs/core-spec.md § Change op (path) — record "values" segment addresses value type.
  it("C_R1: set-field-type at ['values'] replaces the value type", () => {
    const ir: RecordNode = { kind: "record", values: { kind: "string" } };
    const r = applyChange(ir as IR, {
      op: "set-field-type",
      path: ["values"],
      type: { kind: "number" },
    });
    expect((r.ir as RecordNode).values).toEqual({ kind: "number" });
    expect(applyChange(r.ir, r.inverse).ir).toEqual(ir);
  });

  // Spec: docs/core-spec.md § Change op `set-pattern`
  // Interpretation: `set-pattern` is reused for both string.pattern and record.keyPattern.
  it("C_R2: set-pattern at a record node sets keyPattern; null clears; inverse restores", () => {
    const ir: RecordNode = { kind: "record", values: { kind: "string" } };
    const r1 = applyChange(ir as IR, {
      op: "set-pattern",
      path: [],
      pattern: "^x_[a-z]+$",
    });
    expect((r1.ir as RecordNode).keyPattern).toBe("^x_[a-z]+$");
    expect(applyChange(r1.ir, r1.inverse).ir).toEqual(ir);

    const irWithKP: RecordNode = { ...ir, keyPattern: "abc" };
    const r2 = applyChange(irWithKP as IR, {
      op: "set-pattern",
      path: [],
      pattern: null,
    });
    expect((r2.ir as RecordNode).keyPattern).toBeUndefined();
    expect(applyChange(r2.ir, r2.inverse).ir).toEqual(irWithKP);
  });
});
