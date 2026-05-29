// IR -> JSON Schema 2020-12. See docs/core-spec.md § "emit" + "IR → JSON Schema mapping".

import type {
  ArrayNode,
  BooleanNode,
  IR,
  Node,
  NumberNode,
  ObjectNode,
  RecordNode,
  StringNode,
  TupleNode,
  UnionNode,
} from "../ir/types";

export interface EmitOptions {
  draft?: "2020-12";
  preserveFieldOrder?: boolean;
  $id?: string;
  $schema?: string;
}

const DEFAULT_SCHEMA_URI = "https://json-schema.org/draft/2020-12/schema";

export type JsonSchemaValue = JsonSchemaObject | boolean;

export interface JsonSchemaObject {
  [key: string]: unknown;
}

export function emit(ir: IR, target: "json-schema", options?: EmitOptions): JsonSchemaObject {
  if (target !== "json-schema") {
    throw new Error(`emit: target '${target}' is not supported (only "json-schema")`);
  }
  const body = toJsonSchema(ir);
  const root: JsonSchemaObject = isPlainSchemaObject(body) ? { ...body } : { allOf: [body] };
  // Always object at the root so we can attach $schema/$id. For root `unknown`,
  // body is `true`; we represent it as the equivalent empty object {} that
  // accepts anything.
  if (body === true) {
    // empty schema accepts any value
    for (const k of Object.keys(root)) delete root[k];
  } else if (body === false) {
    // never schema; preserve as not: {}
    for (const k of Object.keys(root)) delete root[k];
    root.not = {};
  }
  root.$schema = options?.$schema ?? DEFAULT_SCHEMA_URI;
  if (options?.$id !== undefined) root.$id = options.$id;
  return root;
}

function isPlainSchemaObject(v: unknown): v is JsonSchemaObject {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function toJsonSchema(node: Node): JsonSchemaValue {
  switch (node.kind) {
    case "unknown":
      return true;
    case "null":
      return { type: "null" };
    case "boolean":
      return booleanToSchema(node);
    case "number":
      return numberToSchema(node);
    case "string":
      return stringToSchema(node);
    case "array":
      return arrayToSchema(node);
    case "tuple":
      return tupleToSchema(node);
    case "object":
      return objectToSchema(node);
    case "record":
      return recordToSchema(node);
    case "union":
      return unionToSchema(node);
  }
}

function booleanToSchema(n: BooleanNode): JsonSchemaObject {
  if (n.literals !== undefined && n.literals.length === 1) {
    return { const: n.literals[0] };
  }
  if (n.literals !== undefined) {
    return { type: "boolean", enum: n.literals };
  }
  return { type: "boolean" };
}

function numberToSchema(n: NumberNode): JsonSchemaObject {
  const type = n.integer ? "integer" : "number";
  if (n.literals !== undefined && n.literals.length === 1) {
    return { type, const: n.literals[0] };
  }
  if (n.literals !== undefined) {
    return { type, enum: n.literals };
  }
  const out: JsonSchemaObject = { type };
  if (n.min !== undefined) out.minimum = n.min;
  if (n.max !== undefined) out.maximum = n.max;
  return out;
}

function stringToSchema(n: StringNode): JsonSchemaObject {
  if (n.literals !== undefined && n.literals.length === 1) {
    return { type: "string", const: n.literals[0] };
  }
  if (n.literals !== undefined) {
    return { type: "string", enum: n.literals };
  }
  const out: JsonSchemaObject = { type: "string" };
  // IR format names are the standard JSON Schema names, so this is a direct passthrough.
  if (n.format !== undefined) out.format = n.format;
  if (n.pattern !== undefined) out.pattern = n.pattern;
  if (n.minLength !== undefined) out.minLength = n.minLength;
  if (n.maxLength !== undefined) out.maxLength = n.maxLength;
  return out;
}

function arrayToSchema(n: ArrayNode): JsonSchemaObject {
  const out: JsonSchemaObject = { type: "array", items: toJsonSchema(n.items) };
  if (n.minItems !== undefined) out.minItems = n.minItems;
  if (n.maxItems !== undefined) out.maxItems = n.maxItems;
  if (n.uniqueItems) out.uniqueItems = true;
  return out;
}

function tupleToSchema(n: TupleNode): JsonSchemaObject {
  const out: JsonSchemaObject = {
    type: "array",
    prefixItems: n.items.map((it) => toJsonSchema(it)),
  };
  out.items = n.rest === undefined ? false : toJsonSchema(n.rest);
  return out;
}

function objectToSchema(n: ObjectNode): JsonSchemaObject {
  const properties: Record<string, JsonSchemaValue> = {};
  const required: string[] = [];
  for (const [name, entry] of Object.entries(n.fields)) {
    let prop: JsonSchemaValue = toJsonSchema(entry.type);
    if (entry.nullable) {
      prop = { anyOf: [prop, { type: "null" }] };
    }
    properties[name] = prop;
    if (!(entry.optional ?? false)) required.push(name);
  }
  const out: JsonSchemaObject = { type: "object", properties };
  if (required.length > 0) out.required = required;
  if (n.additional === false) out.additionalProperties = false;
  else if (n.additional === true) out.additionalProperties = true;
  else out.additionalProperties = toJsonSchema(n.additional);
  return out;
}

function recordToSchema(n: RecordNode): JsonSchemaObject {
  const out: JsonSchemaObject = {
    type: "object",
    additionalProperties: toJsonSchema(n.values),
  };
  if (n.keyPattern !== undefined) out.propertyNames = { pattern: n.keyPattern };
  return out;
}

function unionToSchema(n: UnionNode): JsonSchemaObject {
  const variants = n.variants.map((v) => toJsonSchema(v));
  if (n.discriminator !== undefined) {
    return { oneOf: variants };
  }
  return { anyOf: variants };
}
