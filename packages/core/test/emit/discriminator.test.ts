import { describe, expect, it } from "vitest";
import { emit } from "../../src/emit/json-schema";
import type { UnionNode } from "../../src/ir/types";

describe("emit discriminator", () => {
  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — "per-variant `const`
  // on the discriminator field"
  it("EM_D1: discriminated union -> per-variant const on the discriminator field", () => {
    const ir: UnionNode = {
      kind: "union",
      discriminator: "type",
      variants: [
        {
          kind: "object",
          fields: {
            type: { type: { kind: "string", literals: ["circle"] } },
            radius: { type: { kind: "number" } },
          },
          additional: false,
        },
        {
          kind: "object",
          fields: {
            type: { type: { kind: "string", literals: ["square"] } },
            side: { type: { kind: "number" } },
          },
          additional: false,
        },
      ],
    };
    const out = emit(ir, "json-schema") as Record<string, unknown>;
    expect(out.oneOf).toBeDefined();
    const variants = out.oneOf as Array<Record<string, unknown>>;
    expect(variants).toHaveLength(2);

    const circleProps = variants[0]?.properties as Record<string, unknown>;
    const squareProps = variants[1]?.properties as Record<string, unknown>;
    expect(circleProps.type).toMatchObject({ const: "circle" });
    expect(squareProps.type).toMatchObject({ const: "square" });
  });
});
