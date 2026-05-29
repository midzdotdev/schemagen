import { describe, expect, it } from "vitest";
import type { IR, ObjectNode } from "../../src/ir/types";
import { validate } from "../../src/validate";

describe("validate structural-invalid throws", () => {
  // Spec: docs/core-spec.md § "`validate`" — "throws only if the IR is structurally invalid"
  it("V_SI1: passing a structurally invalid IR throws", () => {
    const badIr = { kind: "not-a-real-kind" } as unknown as IR;
    expect(() => validate(badIr, {})).toThrow();
  });

  // Spec: docs/core-spec.md § "`validate`" — "never throws on semantic mismatch"
  it("V_SI2: valid IR + data that rejects everywhere does NOT throw; returns ok:false", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: {
        a: { type: { kind: "string" } },
        b: { type: { kind: "number" } },
        c: { type: { kind: "boolean" } },
      },
      additional: false,
    };
    let result: ReturnType<typeof validate> | undefined;
    expect(() => {
      result = validate(ir, { a: 1, b: "x", c: "nope", extra: true });
    }).not.toThrow();
    expect(result?.ok).toBe(false);
    expect(result?.mismatches.length).toBeGreaterThan(0);
  });
});
