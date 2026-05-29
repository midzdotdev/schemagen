import { describe, expect, it } from "vitest";
import { emit } from "../../src/emit/json-schema";
import type {
  ArrayNode,
  BooleanNode,
  IR,
  NumberNode,
  ObjectNode,
  RecordNode,
  StringNode,
  TupleNode,
  UnionNode,
} from "../../src/ir/types";

// Strip $schema/$id and any other emit-attached top-level keys to inspect
// the "body" of the emitted schema where the IR maps onto a structured form.
function stripMeta(s: Record<string, unknown>): Record<string, unknown> {
  const {
    $schema: _s,
    $id: _i,
    ...rest
  } = s as { $schema?: unknown; $id?: unknown } & Record<string, unknown>;
  void _s;
  void _i;
  return rest;
}

describe("emit IR -> JSON Schema mapping", () => {
  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — `unknown` row
  it("EM_M1: unknown -> empty object at root (with $schema)", () => {
    const ir: IR = { kind: "unknown" };
    const out = emit(ir, "json-schema");
    expect(out.$schema).toBeDefined();
    // Interpretation: at root, `unknown` becomes the empty object (no body keys),
    // not the literal `true`. The body keys (minus $schema/$id) should be empty.
    const body = stripMeta(out);
    expect(Object.keys(body)).toHaveLength(0);
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — `null` row
  it("EM_M2: null -> {type:'null'}", () => {
    const ir: IR = { kind: "null" };
    const out = emit(ir, "json-schema");
    expect(stripMeta(out)).toEqual({ type: "null" });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — boolean (no literals)
  it("EM_M3: boolean (no literals) -> {type:'boolean'}", () => {
    const ir: IR = { kind: "boolean" };
    const out = emit(ir, "json-schema");
    expect(stripMeta(out)).toEqual({ type: "boolean" });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — boolean (literals)
  it("EM_M4: boolean with one literal -> {const:x}; multiple -> enum", () => {
    const irOne: BooleanNode = { kind: "boolean", literals: [true] };
    const outOne = emit(irOne, "json-schema");
    expect(stripMeta(outOne)).toEqual({ const: true });

    const irMany: BooleanNode = { kind: "boolean", literals: [true, false] };
    const outMany = emit(irMany, "json-schema");
    const bodyMany = stripMeta(outMany);
    expect(bodyMany.type).toBe("boolean");
    expect(bodyMany.enum).toEqual([true, false]);
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — string (free)
  it("EM_M5: string free -> {type:'string', ...constraints}", () => {
    const baseline: StringNode = { kind: "string" };
    expect(stripMeta(emit(baseline, "json-schema"))).toEqual({ type: "string" });

    const withMin: StringNode = { kind: "string", minLength: 3 };
    expect(stripMeta(emit(withMin, "json-schema"))).toEqual({ type: "string", minLength: 3 });

    const withMax: StringNode = { kind: "string", maxLength: 9 };
    expect(stripMeta(emit(withMax, "json-schema"))).toEqual({ type: "string", maxLength: 9 });

    const withPattern: StringNode = { kind: "string", pattern: "^[a-z]+$" };
    expect(stripMeta(emit(withPattern, "json-schema"))).toEqual({
      type: "string",
      pattern: "^[a-z]+$",
    });

    const withFormat: StringNode = { kind: "string", format: "uuid" };
    expect(stripMeta(emit(withFormat, "json-schema"))).toEqual({
      type: "string",
      format: "uuid",
    });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping". The IR's format vocabulary IS the
  // standard JSON Schema vocabulary, so emit passes every recognized format through unchanged —
  // no translation layer (which would be a place for names to drift).
  it("EM_M5b: recognized format names are emitted unchanged", () => {
    const formats = ["date", "date-time", "uuid", "email", "uri", "hostname", "ipv4", "ipv6"];
    for (const format of formats) {
      const node: StringNode = { kind: "string", format };
      expect(stripMeta(emit(node, "json-schema"))).toEqual({ type: "string", format });
    }
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — string (literals)
  it("EM_M6: string with literals -> {type:'string', enum:[...]} or const for single", () => {
    const single: StringNode = { kind: "string", literals: ["only"] };
    expect(stripMeta(emit(single, "json-schema"))).toEqual({ type: "string", const: "only" });

    const many: StringNode = { kind: "string", literals: ["a", "b"] };
    expect(stripMeta(emit(many, "json-schema"))).toEqual({ type: "string", enum: ["a", "b"] });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — number rows
  it("EM_M7: number integer -> 'integer', else 'number'; bounds applied", () => {
    const intIR: NumberNode = { kind: "number", integer: true, min: 1, max: 9 };
    expect(stripMeta(emit(intIR, "json-schema"))).toEqual({
      type: "integer",
      minimum: 1,
      maximum: 9,
    });

    const numIR: NumberNode = { kind: "number", min: -1.5 };
    expect(stripMeta(emit(numIR, "json-schema"))).toEqual({ type: "number", minimum: -1.5 });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — array row
  it("EM_M8: array -> {type:'array', items:...}", () => {
    const ir: ArrayNode = { kind: "array", items: { kind: "string" } };
    expect(stripMeta(emit(ir, "json-schema"))).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — tuple row
  it("EM_M9: tuple with rest -> items:<rest>; without rest -> items:false", () => {
    const noRest: TupleNode = { kind: "tuple", items: [{ kind: "string" }, { kind: "number" }] };
    expect(stripMeta(emit(noRest, "json-schema"))).toEqual({
      type: "array",
      prefixItems: [{ type: "string" }, { type: "number" }],
      items: false,
    });

    const withRest: TupleNode = {
      kind: "tuple",
      items: [{ kind: "string" }],
      rest: { kind: "boolean" },
    };
    expect(stripMeta(emit(withRest, "json-schema"))).toEqual({
      type: "array",
      prefixItems: [{ type: "string" }],
      items: { type: "boolean" },
    });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — object row
  it("EM_M10: object -> properties/required/additionalProperties; required omitted when empty", () => {
    const objClosed: ObjectNode = {
      kind: "object",
      fields: {
        id: { type: { kind: "string" } },
        nickname: { type: { kind: "string" }, optional: true },
      },
      additional: false,
    };
    const out = stripMeta(emit(objClosed, "json-schema"));
    expect(out).toMatchObject({
      type: "object",
      properties: {
        id: { type: "string" },
        nickname: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    });

    // No required fields -> `required` key omitted
    const objAllOpt: ObjectNode = {
      kind: "object",
      fields: { a: { type: { kind: "string" }, optional: true } },
      additional: true,
    };
    const allOpt = stripMeta(emit(objAllOpt, "json-schema"));
    expect(allOpt.required).toBeUndefined();
    expect(allOpt.additionalProperties).toBe(true);

    // additionalProperties as a Node -> emits the sub-schema
    const objAddNode: ObjectNode = {
      kind: "object",
      fields: { a: { type: { kind: "string" } } },
      additional: { kind: "number" },
    };
    const addNode = stripMeta(emit(objAddNode, "json-schema"));
    expect(addNode.additionalProperties).toEqual({ type: "number" });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — record row
  it("EM_M11: record -> {type:'object', additionalProperties, propertyNames:{pattern}}", () => {
    const ir: RecordNode = {
      kind: "record",
      values: { kind: "string" },
      keyPattern: "^[a-z]+$",
    };
    expect(stripMeta(emit(ir, "json-schema"))).toEqual({
      type: "object",
      additionalProperties: { type: "string" },
      propertyNames: { pattern: "^[a-z]+$" },
    });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — union (no discriminator)
  it("EM_M12: union no discriminator -> {anyOf:[...]}", () => {
    const ir: UnionNode = {
      kind: "union",
      variants: [{ kind: "string" }, { kind: "number" }],
    };
    const out = stripMeta(emit(ir, "json-schema"));
    expect(out).toEqual({ anyOf: [{ type: "string" }, { type: "number" }] });
  });

  // Spec: docs/core-spec.md § "IR → JSON Schema mapping" — union (discriminator)
  it("EM_M13: union with discriminator -> {oneOf:[...]} + per-variant const on discriminator field", () => {
    const ir: UnionNode = {
      kind: "union",
      discriminator: "kind",
      variants: [
        {
          kind: "object",
          fields: {
            kind: { type: { kind: "string", literals: ["a"] } },
            x: { type: { kind: "number" } },
          },
          additional: false,
        },
        {
          kind: "object",
          fields: {
            kind: { type: { kind: "string", literals: ["b"] } },
            y: { type: { kind: "string" } },
          },
          additional: false,
        },
      ],
    };
    const out = stripMeta(emit(ir, "json-schema"));
    expect(out.oneOf).toBeDefined();
    const variants = out.oneOf as Array<Record<string, unknown>>;
    expect(variants).toHaveLength(2);
    const v0Props = (variants[0]?.properties ?? {}) as Record<string, unknown>;
    const v1Props = (variants[1]?.properties ?? {}) as Record<string, unknown>;
    expect(v0Props.kind).toEqual({ type: "string", const: "a" });
    expect(v1Props.kind).toEqual({ type: "string", const: "b" });
  });
});
