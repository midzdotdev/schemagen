// IR types. See docs/ir-spec.md § "Node kinds".

export type Path = (string | number)[];

export type Node =
  | UnknownNode
  | NullNode
  | BooleanNode
  | NumberNode
  | StringNode
  | ArrayNode
  | TupleNode
  | ObjectNode
  | RecordNode
  | UnionNode;

export type IR = Node;

export interface UnknownNode {
  kind: "unknown";
}

export interface NullNode {
  kind: "null";
}

export interface BooleanNode {
  kind: "boolean";
  literals?: boolean[];
}

export interface NumberNode {
  kind: "number";
  integer?: boolean;
  min?: number;
  max?: number;
  literals?: number[];
}

// Known formats — the standard JSON Schema format names, so emission is a direct passthrough.
// The IR `format` field is open-ended (`string`). See docs/ir-spec.md § "Node kinds" § "string".
export type FormatName =
  | "date"
  | "date-time"
  | "uuid"
  | "email"
  | "uri"
  | "hostname"
  | "ipv4"
  | "ipv6";

export interface StringNode {
  kind: "string";
  literals?: string[];
  format?: FormatName | (string & {});
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}

export interface ArrayNode {
  kind: "array";
  items: Node;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

export interface TupleNode {
  kind: "tuple";
  items: Node[];
  rest?: Node;
}

export interface FieldEntry {
  type: Node;
  optional?: boolean;
  nullable?: boolean;
}

export type AdditionalProperties = false | true | Node;

export interface ObjectNode {
  kind: "object";
  fields: Record<string, FieldEntry>;
  additional: AdditionalProperties;
}

export interface RecordNode {
  kind: "record";
  values: Node;
  keyPattern?: string;
}

export interface UnionNode {
  kind: "union";
  variants: Node[];
  discriminator?: string;
}

export const NODE_KINDS = [
  "unknown",
  "null",
  "boolean",
  "number",
  "string",
  "array",
  "tuple",
  "object",
  "record",
  "union",
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];
