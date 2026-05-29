// Public API surface for @schemagen/core.
// See docs/core-spec.md § "Module surface".
//
// Exports are added as each phase of the implementation goes from red to green.

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
