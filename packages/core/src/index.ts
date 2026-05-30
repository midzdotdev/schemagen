// Public API surface for @schemagen/core.
// See docs/core-spec.md § "Module surface".

export { applyChange } from "./changes";
// Changes
export type { Change } from "./changes/types";
// Emit
export type { EmitOptions, JsonSchemaObject, JsonSchemaValue } from "./emit/json-schema";
export { emit } from "./emit/json-schema";
// Evidence
export type { EvidenceTree, FieldEvidence, RecordRef } from "./evidence";
export { computeEvidence } from "./evidence";
export { findExamples } from "./evidence/examples";
export { dedupeByIdentity } from "./identity/dedupe";
export { proposeIdentityKey } from "./identity/propose";
// Identity
export type { IdentityConfig, IdentityProposal } from "./identity/types";
// Inference
export type { InferOptions } from "./infer";
export { infer } from "./infer";
// Paths
export { getNodeAt, setNodeAt } from "./ir/paths";
// Structural validity
export type { StructureError } from "./ir/structure";
export { checkStructure, isValid } from "./ir/structure";
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

// Merge
export type { MergeOptions, MergeResult } from "./merge";
export { merge } from "./merge";
// Validate
export type { Mismatch, MismatchKind, Suggestion, ValidationResult } from "./validate";
export { validate } from "./validate";
