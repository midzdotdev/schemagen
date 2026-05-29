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

// Changes
export type { Change } from "./changes/types";
export { applyChange } from "./changes";

// Validate
export type { Mismatch, MismatchKind, Suggestion, ValidationResult } from "./validate";
export { validate } from "./validate";

// Evidence
export type { EvidenceTree, FieldEvidence, RecordRef } from "./evidence";
export { computeEvidence } from "./evidence";
export { findExamples } from "./evidence/examples";

// Identity
export type { IdentityConfig, IdentityProposal } from "./identity/types";
export { proposeIdentityKey } from "./identity/propose";
export { dedupeByIdentity } from "./identity/dedupe";
