import { describe, expect, it } from "vitest";
import { emit } from "../../src/emit/json-schema";
import type { ObjectNode } from "../../src/ir/types";

const ir: ObjectNode = {
  kind: "object",
  fields: { id: { type: { kind: "string" } } },
  additional: false,
};

describe("emit options", () => {
  // Spec: docs/core-spec.md § "EmitOptions"
  it("EM_OP1: default $schema is the 2020-12 URI", () => {
    const out = emit(ir, "json-schema");
    expect(out.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
  });

  // Spec: docs/core-spec.md § "EmitOptions"
  it("EM_OP2: $id and $schema options propagate to emitted root", () => {
    const out = emit(ir, "json-schema", {
      $id: "https://example.com/user.schema.json",
      $schema: "https://example.com/draft",
    });
    expect(out.$id).toBe("https://example.com/user.schema.json");
    expect(out.$schema).toBe("https://example.com/draft");
  });
});
