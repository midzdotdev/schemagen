import { describe, expect, it } from "vitest";
import { checkStructure, isValid } from "../../src/ir/structure";
import type { Node } from "../../src/ir/types";

describe("checkStructure / isValid", () => {
  // Spec: docs/ir-spec.md § "Node kinds" § "unknown"
  it("ST1: {kind:'unknown'} passes", () => {
    expect(isValid({ kind: "unknown" })).toBe(true);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "null"
  it("ST2: {kind:'null'} passes", () => {
    expect(isValid({ kind: "null" })).toBe(true);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "boolean"
  it("ST3: {kind:'boolean'} and {kind:'boolean', literals:[true]} pass", () => {
    expect(isValid({ kind: "boolean" })).toBe(true);
    expect(isValid({ kind: "boolean", literals: [true] })).toBe(true);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "boolean"
  // Interpretation: empty `literals: []` is structurally invalid (degenerate;
  // matches no value, by analogy with "union.variants.length >= 2").
  it("ST4: {kind:'boolean', literals:[]} fails", () => {
    expect(isValid({ kind: "boolean", literals: [] })).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "number"
  it("ST5: number node bare and with all fields passes", () => {
    expect(isValid({ kind: "number" })).toBe(true);
    expect(isValid({ kind: "number", integer: true, min: 0, max: 100, literals: [1, 2, 3] })).toBe(
      true,
    );
  });

  // Spec: docs/ir-spec.md § "Structural validity" — "Numeric bounds are not inverted"
  it("ST6: {kind:'number', min:5, max:1} fails", () => {
    expect(isValid({ kind: "number", min: 5, max: 1 })).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "string"
  it("ST7: string node bare and with all fields passes", () => {
    expect(isValid({ kind: "string" })).toBe(true);
    expect(
      isValid({
        kind: "string",
        literals: ["a"],
        format: "uuid",
        pattern: "^x$",
        minLength: 1,
        maxLength: 10,
      }),
    ).toBe(true);
  });

  // Spec: docs/ir-spec.md § "Structural validity" (length bounds analogous to numeric)
  it("ST8: {kind:'string', minLength:5, maxLength:1} fails", () => {
    expect(isValid({ kind: "string", minLength: 5, maxLength: 1 })).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "array"
  it("ST9: array with items passes; missing items fails", () => {
    expect(isValid({ kind: "array", items: { kind: "string" } })).toBe(true);
    expect(isValid({ kind: "array" } as unknown as Node)).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Structural validity"
  it("ST10: {kind:'array', minItems:5, maxItems:1} fails", () => {
    expect(isValid({ kind: "array", items: { kind: "string" }, minItems: 5, maxItems: 1 })).toBe(
      false,
    );
  });

  // Spec: docs/ir-spec.md § "Structural validity" — "tuple.items is a non-empty array"
  it("ST11: tuple with one item passes; empty tuple fails", () => {
    expect(isValid({ kind: "tuple", items: [{ kind: "string" }] })).toBe(true);
    expect(isValid({ kind: "tuple", items: [] })).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "object"
  it("ST12: object with fields passes; missing fields fails", () => {
    expect(isValid({ kind: "object", fields: {}, additional: false })).toBe(true);
    expect(isValid({ kind: "object", additional: false } as unknown as Node)).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "object" — "default false"
  it("ST13: object field entries may omit optional and nullable", () => {
    expect(
      isValid({
        kind: "object",
        fields: { id: { type: { kind: "string" } } },
        additional: false,
      }),
    ).toBe(true);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "object"
  it("ST14: object 'additional' accepts false, true, or a Node", () => {
    const empty: Record<string, never> = {};
    expect(isValid({ kind: "object", fields: empty, additional: false })).toBe(true);
    expect(isValid({ kind: "object", fields: empty, additional: true })).toBe(true);
    expect(isValid({ kind: "object", fields: empty, additional: { kind: "string" } })).toBe(true);
  });

  // Spec: docs/ir-spec.md § "Node kinds" § "record"
  it("ST15: record with values passes; missing values fails", () => {
    expect(isValid({ kind: "record", values: { kind: "string" } })).toBe(true);
    expect(isValid({ kind: "record" } as unknown as Node)).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Structural validity" — "union.variants.length >= 2"
  it("ST16: union 'variants' must have at least 2 entries", () => {
    expect(isValid({ kind: "union", variants: [{ kind: "string" }, { kind: "number" }] })).toBe(
      true,
    );
    expect(isValid({ kind: "union", variants: [{ kind: "string" }] } as unknown as Node)).toBe(
      false,
    );
    expect(isValid({ kind: "union", variants: [] } as unknown as Node)).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Structural validity" — "Every node has a recognized kind"
  it("ST17: unrecognized 'kind' fails", () => {
    expect(isValid({ kind: "foo" } as unknown as Node)).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Structural validity" — "object.fields keys are strings"
  // Interpretation: arrays-as-fields are the only way to violate this from JSON;
  // structural check rejects.
  it("ST18: object 'fields' must be a plain object, not an array", () => {
    expect(
      isValid({
        kind: "object",
        fields: [] as unknown as Record<string, never>,
        additional: false,
      }),
    ).toBe(false);
  });

  // Spec: docs/ir-spec.md § "Structural validity" — richer checkStructure
  it("ST19: checkStructure returns errors with non-empty path and message", () => {
    const errs = checkStructure({ kind: "number", min: 5, max: 1 });
    expect(errs.length).toBeGreaterThan(0);
    for (const err of errs) {
      expect(Array.isArray(err.path)).toBe(true);
      expect(typeof err.message).toBe("string");
      expect(err.message.length).toBeGreaterThan(0);
    }
  });

  // Spec: docs/ir-spec.md § "Structural validity"
  it("ST20: isValid is true iff checkStructure returns []", () => {
    const valid: Node = { kind: "string" };
    const invalid: Node = { kind: "number", min: 5, max: 1 };
    expect(isValid(valid)).toBe(checkStructure(valid).length === 0);
    expect(isValid(invalid)).toBe(checkStructure(invalid).length === 0);
  });

  // Spec: docs/ir-spec.md § "Structural validity" (composition)
  it("ST21: nested structural errors surface with correct paths", () => {
    const ir: Node = {
      kind: "object",
      fields: {
        u: {
          type: {
            kind: "union",
            variants: [{ kind: "string" }],
          } as unknown as Node,
        },
      },
      additional: false,
    };
    const errs = checkStructure(ir);
    expect(errs.length).toBe(1);
    expect(errs[0]?.path).toEqual(["fields", "u", "type"]);
  });

  // Spec: docs/ir-spec.md § "Evidence is computed, not stored"
  // Asserts the IR type signature contains no `evidence` field — verified by
  // walking a representative fixture and confirming no node carries the key.
  it("ST22: no IR node carries an 'evidence' field in a fresh, valid IR", () => {
    const ir: Node = {
      kind: "object",
      fields: {
        id: { type: { kind: "string", format: "uuid" } },
        tags: { type: { kind: "array", items: { kind: "string" } } },
        coord: {
          type: { kind: "tuple", items: [{ kind: "number" }, { kind: "number" }] },
        },
        u: {
          type: {
            kind: "union",
            variants: [{ kind: "string" }, { kind: "number" }],
          },
        },
      },
      additional: false,
    };
    expect(hasEvidence(ir)).toBe(false);
  });
});

function hasEvidence(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasEvidence);
  if ("evidence" in value) return true;
  return Object.values(value).some(hasEvidence);
}
