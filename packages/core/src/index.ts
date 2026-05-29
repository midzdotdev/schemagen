// Public API surface for @schemagen/core.
// See docs/core-spec.md § "Module surface".

// IR
export type {
  AdditionalProperties,
  ArrayNode,
  BooleanNode,
  FieldEntry,
  FormatName,
  IR,
  Node,
  NodeKind,
  NullNode,
  NumberNode,
  ObjectNode,
  Path,
  RecordNode,
  StringNode,
  TupleNode,
  UnionNode,
  UnknownNode,
} from "./ir/types";
export { NODE_KINDS } from "./ir/types";

// Structural validity
export type { StructureError } from "./ir/structure";
export { checkStructure, isValid } from "./ir/structure";

// Paths
export { getNodeAt, setNodeAt } from "./ir/paths";

// Inference
export type { InferOptions } from "./infer";
export { infer } from "./infer";

// Changes (types only; dispatcher in Phase 4)
export type { Change } from "./changes/types";

// Validate
export type { Mismatch, MismatchKind, Suggestion, ValidationResult } from "./validate";
export { validate } from "./validate";
