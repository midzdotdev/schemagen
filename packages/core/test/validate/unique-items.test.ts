import { describe, expect, it } from "vitest";
import type { IR } from "../../src/ir/types";
import { validate } from "../../src/validate";

// The arrays under test are wrapped in an object field so each record is a single object —
// passing a bare array to validate() would treat its elements as separate records.
function arrIr(uniqueItems: boolean): IR {
  return {
    kind: "object",
    fields: {
      tags: {
        type: { kind: "array", items: { kind: "number" }, ...(uniqueItems && { uniqueItems }) },
      },
    },
    additional: false,
  };
}

describe("validate uniqueItems", () => {
  // Spec: docs/ir-spec.md § "array" (uniqueItems) + docs/core-spec.md § "validate"
  it("V_UI1: duplicate primitive items violate uniqueItems", () => {
    const result = validate(arrIr(true), { tags: [1, 2, 2, 3] });
    expect(result.ok).toBe(false);
    const m = result.mismatches.find((x) => x.kind === "duplicate-items");
    expect(m).toBeDefined();
    expect(m?.path).toEqual(["tags"]);
    expect(m?.suggestions.length).toBeGreaterThan(0);
  });

  // Spec: docs/ir-spec.md § "array" — uniqueItems
  it("V_UI2: a unique array passes", () => {
    expect(validate(arrIr(true), { tags: [1, 2, 3] }).ok).toBe(true);
  });

  // Spec: docs/ir-spec.md § "array" — uniqueItems uses structural (value) equality,
  // independent of object key order.
  it("V_UI3: structural equality ignores object key order", () => {
    const ir: IR = {
      kind: "object",
      fields: {
        rows: {
          type: {
            kind: "array",
            items: {
              kind: "object",
              fields: { a: { type: { kind: "number" } }, b: { type: { kind: "number" } } },
              additional: false,
            },
            uniqueItems: true,
          },
        },
      },
      additional: false,
    };
    const result = validate(ir, {
      rows: [
        { a: 1, b: 2 },
        { b: 2, a: 1 },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.mismatches.some((x) => x.kind === "duplicate-items")).toBe(true);
  });

  // Spec: docs/ir-spec.md § "array" — uniqueItems is opt-in
  it("V_UI4: without uniqueItems, duplicates are allowed", () => {
    expect(validate(arrIr(false), { tags: [1, 1, 1] }).ok).toBe(true);
  });
});
