import { describe, expect, it } from "vitest";
import { emit } from "../../src/emit/json-schema";
import type { ObjectNode } from "../../src/ir/types";

describe("emit optional", () => {
  // Spec: docs/core-spec.md § "emit" — "`optional` is expressed by omission from `required`"
  it("EM_O1: optional fields omitted from required; required fields included", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: {
        id: { type: { kind: "string" } },
        nickname: { type: { kind: "string" }, optional: true },
        email: { type: { kind: "string" } },
      },
      additional: false,
    };
    const out = emit(ir, "json-schema") as Record<string, unknown>;
    const required = out.required as string[];
    expect(required).toEqual(expect.arrayContaining(["id", "email"]));
    expect(required).not.toContain("nickname");
  });
});
