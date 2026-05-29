// `validate`. See docs/core-spec.md § "`validate`".

import { FORMAT_MATCHERS } from "../infer/formats";
import { checkStructure } from "../ir/structure";
import type { FormatName, IR, Node, NumberNode, Path, StringNode } from "../ir/types";
import {
  type Mismatch,
  type ValidationResult,
  describeValue,
  inferLeafNode,
  suggestForFormatViolation,
  suggestForLiteralViolation,
  suggestForMissingRequiredField,
  suggestForNonInteger,
  suggestForNullNotAllowed,
  suggestForOutOfRange,
  suggestForPatternViolation,
  suggestForTypeMismatch,
  suggestForUnexpectedField,
  suggestForWrongLength,
} from "./mismatches";

export type { Mismatch, MismatchKind, Suggestion, ValidationResult } from "./mismatches";

export function validate(ir: IR, data: unknown | unknown[]): ValidationResult {
  const structErrors = checkStructure(ir);
  if (structErrors.length > 0) {
    throw new Error(
      `validate: IR is structurally invalid (first error: ${structErrors[0]?.message})`,
    );
  }

  const mismatches: Mismatch[] = [];

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      walkNode(ir, data[i], [], i, mismatches);
    }
  } else {
    walkNode(ir, data, [], undefined, mismatches);
  }

  return { ok: mismatches.length === 0, mismatches };
}

type MismatchBase = Omit<Mismatch, "recordIndex">;

function emit(mismatches: Mismatch[], recordIndex: number | undefined, base: MismatchBase): void {
  if (recordIndex === undefined) {
    mismatches.push(base);
  } else {
    mismatches.push({ ...base, recordIndex });
  }
}

function walkNode(
  node: Node,
  value: unknown,
  path: Path,
  recordIndex: number | undefined,
  mismatches: Mismatch[],
): void {
  switch (node.kind) {
    case "unknown":
      return;

    case "null":
      if (value !== null) emitTypeMismatch(node, value, path, recordIndex, mismatches);
      return;

    case "boolean":
      if (typeof value !== "boolean") {
        emitTypeMismatch(node, value, path, recordIndex, mismatches);
        return;
      }
      if (node.literals && !node.literals.includes(value)) {
        emit(mismatches, recordIndex, {
          path,
          kind: "literal-violation",
          expected: `boolean in {${node.literals.join(", ")}}`,
          actual: { value, description: describeValue(value) },
          suggestions: suggestForLiteralViolation(path, value),
        });
      }
      return;

    case "number":
      validateNumber(node, value, path, recordIndex, mismatches);
      return;

    case "string":
      validateString(node, value, path, recordIndex, mismatches);
      return;

    case "array": {
      if (!Array.isArray(value)) {
        emitTypeMismatch(node, value, path, recordIndex, mismatches);
        return;
      }
      if (node.minItems !== undefined && value.length < node.minItems) {
        emit(mismatches, recordIndex, {
          path,
          kind: "wrong-length",
          expected: `array of length >= ${node.minItems}`,
          actual: { value: value.length, description: `array of length ${value.length}` },
          suggestions: suggestForWrongLength(path, "minItems", value.length),
        });
      }
      if (node.maxItems !== undefined && value.length > node.maxItems) {
        emit(mismatches, recordIndex, {
          path,
          kind: "wrong-length",
          expected: `array of length <= ${node.maxItems}`,
          actual: { value: value.length, description: `array of length ${value.length}` },
          suggestions: suggestForWrongLength(path, "maxItems", value.length),
        });
      }
      for (let i = 0; i < value.length; i++) {
        walkNode(node.items, value[i], [...path, i], recordIndex, mismatches);
      }
      return;
    }

    case "tuple": {
      if (!Array.isArray(value)) {
        emitTypeMismatch(node, value, path, recordIndex, mismatches);
        return;
      }
      for (let i = 0; i < node.items.length; i++) {
        const sub = node.items[i] as Node;
        walkNode(sub, value[i], [...path, i], recordIndex, mismatches);
      }
      for (let i = node.items.length; i < value.length; i++) {
        if (node.rest === undefined) {
          emit(mismatches, recordIndex, {
            path: [...path, i],
            kind: "wrong-length",
            expected: `tuple of length ${node.items.length}`,
            actual: { value: value.length, description: `array of length ${value.length}` },
            suggestions: [],
          });
        } else {
          walkNode(node.rest, value[i], [...path, i], recordIndex, mismatches);
        }
      }
      return;
    }

    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        emitTypeMismatch(node, value, path, recordIndex, mismatches);
        return;
      }
      const obj = value as Record<string, unknown>;
      for (const [name, entry] of Object.entries(node.fields)) {
        const hasKey = Object.prototype.hasOwnProperty.call(obj, name);
        if (!hasKey) {
          if (!(entry.optional ?? false)) {
            emit(mismatches, recordIndex, {
              path: [...path, name],
              kind: "missing-required-field",
              expected: `required field '${name}'`,
              actual: { value: undefined, description: "missing" },
              suggestions: suggestForMissingRequiredField(path, name),
            });
          }
          continue;
        }
        const sub = obj[name];
        if (sub === null) {
          if (!(entry.nullable ?? false)) {
            emit(mismatches, recordIndex, {
              path: [...path, name],
              kind: "null-not-allowed",
              expected: `non-null value for '${name}'`,
              actual: { value: null, description: "null" },
              suggestions: suggestForNullNotAllowed(path, name),
            });
          }
          continue;
        }
        walkNode(entry.type, sub, [...path, name], recordIndex, mismatches);
      }
      const known = new Set(Object.keys(node.fields));
      for (const k of Object.keys(obj)) {
        if (known.has(k)) continue;
        if (node.additional === false) {
          emit(mismatches, recordIndex, {
            path: [...path, k],
            kind: "unexpected-field",
            expected: "no additional fields",
            actual: { value: obj[k], description: describeValue(obj[k]) },
            suggestions: suggestForUnexpectedField(path, k, inferLeafNode(obj[k])),
          });
        } else if (node.additional === true) {
          // anything goes
        } else {
          walkNode(node.additional, obj[k], [...path, k], recordIndex, mismatches);
        }
      }
      return;
    }

    case "record": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        emitTypeMismatch(node, value, path, recordIndex, mismatches);
        return;
      }
      const obj = value as Record<string, unknown>;
      const keyRe = node.keyPattern ? new RegExp(node.keyPattern) : undefined;
      for (const [k, v] of Object.entries(obj)) {
        if (keyRe && !keyRe.test(k)) {
          emit(mismatches, recordIndex, {
            path: [...path, k],
            kind: "pattern-violation",
            expected: `key matching /${node.keyPattern}/`,
            actual: { value: k, description: `key: ${JSON.stringify(k)}` },
            suggestions: [],
          });
        }
        walkNode(node.values, v, [...path, k], recordIndex, mismatches);
      }
      return;
    }

    case "union": {
      if (node.discriminator) {
        const tagField = node.discriminator;
        const discValue =
          value !== null && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)[tagField]
            : undefined;
        const matched = node.variants.find((v) => {
          if (v.kind !== "object") return false;
          const tagEntry = v.fields[tagField];
          if (!tagEntry) return false;
          if (tagEntry.type.kind === "string" && tagEntry.type.literals) {
            return tagEntry.type.literals.includes(discValue as string);
          }
          return false;
        });
        if (matched) {
          walkNode(matched, value, path, recordIndex, mismatches);
          return;
        }
      }
      const variantMismatches = node.variants.map((v) => {
        const subList: Mismatch[] = [];
        walkNode(v, value, path, recordIndex, subList);
        return subList;
      });
      const ok = variantMismatches.find((m) => m.length === 0);
      if (ok) return;
      emit(mismatches, recordIndex, {
        path,
        kind: "type-mismatch",
        expected: `union of ${node.variants.length} variants`,
        actual: { value, description: describeValue(value) },
        suggestions: suggestForTypeMismatch(path, inferLeafNode(value)),
      });
      return;
    }
  }
}

function validateNumber(
  node: NumberNode,
  value: unknown,
  path: Path,
  recordIndex: number | undefined,
  mismatches: Mismatch[],
): void {
  if (typeof value !== "number") {
    emitTypeMismatch(node, value, path, recordIndex, mismatches);
    return;
  }
  if (node.integer && !Number.isInteger(value)) {
    emit(mismatches, recordIndex, {
      path,
      kind: "non-integer",
      expected: "integer",
      actual: { value, description: `number: ${String(value)}` },
      suggestions: suggestForNonInteger(path),
    });
  }
  if (node.min !== undefined && value < node.min) {
    emit(mismatches, recordIndex, {
      path,
      kind: "out-of-range",
      expected: `>= ${node.min}`,
      actual: { value, description: `number: ${String(value)}` },
      suggestions: suggestForOutOfRange(path, "min", value),
    });
  }
  if (node.max !== undefined && value > node.max) {
    emit(mismatches, recordIndex, {
      path,
      kind: "out-of-range",
      expected: `<= ${node.max}`,
      actual: { value, description: `number: ${String(value)}` },
      suggestions: suggestForOutOfRange(path, "max", value),
    });
  }
  if (node.literals && !node.literals.includes(value)) {
    emit(mismatches, recordIndex, {
      path,
      kind: "literal-violation",
      expected: `number in {${node.literals.join(", ")}}`,
      actual: { value, description: `number: ${String(value)}` },
      suggestions: suggestForLiteralViolation(path, value),
    });
  }
}

const KNOWN_FORMATS = new Set<string>([
  "iso-date",
  "iso-datetime",
  "uuid",
  "email",
  "url",
  "hostname",
  "ipv4",
  "ipv6",
]);

function validateString(
  node: StringNode,
  value: unknown,
  path: Path,
  recordIndex: number | undefined,
  mismatches: Mismatch[],
): void {
  if (typeof value !== "string") {
    emitTypeMismatch(node, value, path, recordIndex, mismatches);
    return;
  }
  if (node.literals && !node.literals.includes(value)) {
    emit(mismatches, recordIndex, {
      path,
      kind: "literal-violation",
      expected: `string in {${node.literals.map((l) => JSON.stringify(l)).join(", ")}}`,
      actual: { value, description: describeValue(value) },
      suggestions: suggestForLiteralViolation(path, value),
    });
  }
  if (node.minLength !== undefined && value.length < node.minLength) {
    emit(mismatches, recordIndex, {
      path,
      kind: "wrong-length",
      expected: `string of length >= ${node.minLength}`,
      actual: { value, description: describeValue(value) },
      suggestions: suggestForWrongLength(path, "minLength", value.length),
    });
  }
  if (node.maxLength !== undefined && value.length > node.maxLength) {
    emit(mismatches, recordIndex, {
      path,
      kind: "wrong-length",
      expected: `string of length <= ${node.maxLength}`,
      actual: { value, description: describeValue(value) },
      suggestions: suggestForWrongLength(path, "maxLength", value.length),
    });
  }
  if (node.pattern !== undefined) {
    const re = new RegExp(node.pattern);
    if (!re.test(value)) {
      emit(mismatches, recordIndex, {
        path,
        kind: "pattern-violation",
        expected: `string matching /${node.pattern}/`,
        actual: { value, description: describeValue(value) },
        suggestions: suggestForPatternViolation(path),
      });
    }
  }
  if (node.format !== undefined && KNOWN_FORMATS.has(node.format)) {
    const matcher = FORMAT_MATCHERS[node.format as FormatName];
    if (matcher && !matcher(value)) {
      emit(mismatches, recordIndex, {
        path,
        kind: "format-violation",
        expected: `string in format '${node.format}'`,
        actual: { value, description: describeValue(value) },
        suggestions: suggestForFormatViolation(path),
      });
    }
  }
}

function emitTypeMismatch(
  node: Node,
  value: unknown,
  path: Path,
  recordIndex: number | undefined,
  mismatches: Mismatch[],
): void {
  emit(mismatches, recordIndex, {
    path,
    kind: "type-mismatch",
    expected: node.kind,
    actual: { value, description: describeValue(value) },
    suggestions: suggestForTypeMismatch(path, inferLeafNode(value)),
  });
}
