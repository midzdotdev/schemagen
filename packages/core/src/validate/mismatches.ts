// Mismatch + Suggestion types and factories.
// See docs/core-spec.md § "`validate`" + § "Suggestions and Changes".

import type { Change } from "../changes/types";
import type { Node, Path } from "../ir/types";

export type MismatchKind =
  | "type-mismatch"
  | "literal-violation"
  | "missing-required-field"
  | "unexpected-field"
  | "out-of-range"
  | "pattern-violation"
  | "format-violation"
  | "wrong-length"
  | "null-not-allowed"
  | "non-integer";

export interface Mismatch {
  path: Path;
  recordIndex?: number;
  kind: MismatchKind;
  expected: string;
  actual: { value: unknown; description: string };
  suggestions: Suggestion[];
}

export interface Suggestion {
  label: string;
  rationale: string;
  change: Change;
}

export interface ValidationResult {
  ok: boolean;
  mismatches: Mismatch[];
}

// ----- Suggestion factories -----

export function suggestForLiteralViolation(
  path: Path,
  value: string | number | boolean,
): Suggestion[] {
  return [
    {
      label: `Add ${JSON.stringify(value)} to literals`,
      rationale: "Widens the literal set to accept this observed value.",
      change: { op: "add-literal", path, value },
    },
    {
      label: "Clear literals (accept any value of this type)",
      rationale: "Removes the literal restriction; widens to a free value of the same type.",
      change: { op: "clear-literals", path },
    },
  ];
}

export function suggestForMissingRequiredField(parentPath: Path, name: string): Suggestion[] {
  return [
    {
      label: `Mark '${name}' optional`,
      rationale: "Records may omit this field.",
      change: { op: "set-optional", path: parentPath, name, value: true },
    },
  ];
}

export function suggestForUnexpectedField(
  parentPath: Path,
  name: string,
  inferredType: Node,
): Suggestion[] {
  return [
    {
      label: `Add field '${name}'`,
      rationale: "Brings this field into the schema as optional.",
      change: {
        op: "add-field",
        path: parentPath,
        name,
        entry: { type: inferredType, optional: true },
      },
    },
    {
      label: "Open the object (set additional: true)",
      rationale: "Tolerates any unrecognized field.",
      change: { op: "set-additional", path: parentPath, value: true },
    },
  ];
}

export function suggestForTypeMismatch(path: Path, observedNode: Node): Suggestion[] {
  return [
    {
      label: `Widen to a union with ${observedNode.kind}`,
      rationale: "Adds the observed type as an additional variant.",
      change: { op: "wrap-in-union", path, with: observedNode },
    },
  ];
}

export function suggestForOutOfRange(
  path: Path,
  which: "min" | "max",
  observed: number,
): Suggestion[] {
  return [
    {
      label: `Set ${which} = ${observed}`,
      rationale: "Widens the bound to include the observed value.",
      change: { op: "set-bound", path, which, value: observed },
    },
    {
      label: `Clear ${which}`,
      rationale: "Removes the bound entirely.",
      change: { op: "set-bound", path, which, value: null },
    },
  ];
}

export function suggestForPatternViolation(path: Path): Suggestion[] {
  return [
    {
      label: "Clear pattern",
      rationale: "Removes the regex constraint.",
      change: { op: "set-pattern", path, pattern: null },
    },
  ];
}

export function suggestForFormatViolation(path: Path): Suggestion[] {
  return [
    {
      label: "Clear format",
      rationale: "Stops enforcing the declared format.",
      change: { op: "set-format", path, format: null },
    },
  ];
}

export function suggestForWrongLength(
  path: Path,
  which: "minLength" | "maxLength" | "minItems" | "maxItems",
  observed: number,
): Suggestion[] {
  return [
    {
      label: `Set ${which} = ${observed}`,
      rationale: "Widens the length constraint to include the observed value.",
      change: { op: "set-bound", path, which, value: observed },
    },
    {
      label: `Clear ${which}`,
      rationale: "Removes the length constraint.",
      change: { op: "set-bound", path, which, value: null },
    },
  ];
}

export function suggestForNullNotAllowed(parentPath: Path, name: string): Suggestion[] {
  return [
    {
      label: `Mark '${name}' nullable`,
      rationale: "Allows null in addition to the declared type.",
      change: { op: "set-nullable", path: parentPath, name, value: true },
    },
  ];
}

export function suggestForNonInteger(path: Path): Suggestion[] {
  return [
    {
      label: "Allow non-integer numbers",
      rationale: "Removes the integer-only constraint.",
      change: { op: "set-integer", path, value: false },
    },
  ];
}

export function describeValue(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string") return `string: ${JSON.stringify(value)}`;
  if (t === "number" || t === "boolean") return `${t}: ${String(value)}`;
  if (Array.isArray(value)) return `array (length ${value.length})`;
  if (t === "object") return "object";
  return t;
}

// Best-effort inference of a value's IR node shape (used in suggestions).
export function inferLeafNode(value: unknown): Node {
  if (value === null) return { kind: "null" };
  switch (typeof value) {
    case "string":
      return { kind: "string" };
    case "number":
      return { kind: "number", ...(Number.isInteger(value) ? { integer: true } : {}) };
    case "boolean":
      return { kind: "boolean" };
    default:
      if (Array.isArray(value)) return { kind: "array", items: { kind: "unknown" } };
      return { kind: "unknown" };
  }
}
