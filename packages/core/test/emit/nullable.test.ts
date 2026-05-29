import { describe, expect, it } from "vitest";
import { emit } from "../../src/emit/json-schema";
import type { ObjectNode } from "../../src/ir/types";

describe("emit nullable", () => {
  // Spec: docs/core-spec.md § "emit" — "`nullable` is expressed by widening"
  it("EM_N1: field nullable:true on string -> property is {anyOf:[{type:'string'},{type:'null'}]}", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: {
        avatar: { type: { kind: "string" }, nullable: true },
      },
      additional: false,
    };
    const out = emit(ir, "json-schema") as Record<string, unknown>;
    const props = out.properties as Record<string, unknown>;
    expect(props.avatar).toEqual({ anyOf: [{ type: "string" }, { type: "null" }] });
  });

  // Spec: docs/core-spec.md § "emit" — "`nullable` is expressed by widening"
  it("EM_N2: field nullable:false -> no widening", () => {
    const ir: ObjectNode = {
      kind: "object",
      fields: {
        avatar: { type: { kind: "string" }, nullable: false },
      },
      additional: false,
    };
    const out = emit(ir, "json-schema") as Record<string, unknown>;
    const props = out.properties as Record<string, unknown>;
    expect(props.avatar).toEqual({ type: "string" });
  });
});
