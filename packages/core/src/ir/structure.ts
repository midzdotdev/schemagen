// Structural validity. See docs/ir-spec.md § "Structural validity".

import type { IR, Path } from "./types";
import { NODE_KINDS } from "./types";

export interface StructureError {
  path: Path;
  message: string;
}

export function checkStructure(ir: IR): StructureError[] {
  const errors: StructureError[] = [];
  walk(ir, [], errors);
  return errors;
}

export function isValid(ir: IR): boolean {
  return checkStructure(ir).length === 0;
}

function walk(node: unknown, path: Path, errors: StructureError[]): void {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    errors.push({ path, message: "node must be a plain object" });
    return;
  }
  const n = node as { kind?: unknown } & Record<string, unknown>;
  if (typeof n.kind !== "string") {
    errors.push({ path, message: "missing or non-string 'kind'" });
    return;
  }
  if (!(NODE_KINDS as readonly string[]).includes(n.kind)) {
    errors.push({ path, message: `unrecognized kind '${n.kind}'` });
    return;
  }

  switch (n.kind) {
    case "unknown":
    case "null":
      return;

    case "boolean":
      checkLiterals(n, path, "boolean", errors);
      return;

    case "number":
      checkLiterals(n, path, "number", errors);
      checkBounds(n, path, "min", "max", errors);
      return;

    case "string":
      checkLiterals(n, path, "string", errors);
      checkBounds(n, path, "minLength", "maxLength", errors);
      return;

    case "array":
      if (!("items" in n)) {
        errors.push({ path, message: "array requires 'items'" });
      } else {
        walk(n.items, [...path, "items"], errors);
      }
      checkBounds(n, path, "minItems", "maxItems", errors);
      return;

    case "tuple":
      if (!Array.isArray(n.items)) {
        errors.push({ path, message: "tuple requires 'items' array" });
      } else if (n.items.length === 0) {
        errors.push({ path, message: "tuple 'items' must be non-empty" });
      } else {
        n.items.forEach((item, i) => {
          walk(item, [...path, "items", i], errors);
        });
      }
      if ("rest" in n && n.rest !== undefined) {
        walk(n.rest, [...path, "rest"], errors);
      }
      return;

    case "object":
      if (n.fields === undefined) {
        errors.push({ path, message: "object requires 'fields'" });
      } else if (n.fields === null || typeof n.fields !== "object" || Array.isArray(n.fields)) {
        errors.push({ path, message: "object 'fields' must be a plain object" });
      } else {
        for (const [name, raw] of Object.entries(n.fields)) {
          // Keys are strings by JS guarantee; the spec rule "fields keys are strings"
          // is enforced at the runtime layer (here) by tolerating only string keys.
          // Object.entries always yields string keys, so the spec rule holds by construction.
          // Field entry checks:
          if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
            errors.push({
              path: [...path, "fields", name],
              message: "field entry must be a plain object",
            });
            continue;
          }
          const entry = raw as { type?: unknown; optional?: unknown; nullable?: unknown };
          if (entry.type === undefined) {
            errors.push({
              path: [...path, "fields", name, "type"],
              message: "field entry requires 'type'",
            });
          } else {
            walk(entry.type, [...path, "fields", name, "type"], errors);
          }
          if (entry.optional !== undefined && typeof entry.optional !== "boolean") {
            errors.push({
              path: [...path, "fields", name, "optional"],
              message: "'optional' must be a boolean",
            });
          }
          if (entry.nullable !== undefined && typeof entry.nullable !== "boolean") {
            errors.push({
              path: [...path, "fields", name, "nullable"],
              message: "'nullable' must be a boolean",
            });
          }
        }
      }
      checkAdditional(n, path, errors);
      return;

    case "record":
      if (n.values === undefined) {
        errors.push({ path, message: "record requires 'values'" });
      } else {
        walk(n.values, [...path, "values"], errors);
      }
      if (n.keyPattern !== undefined && typeof n.keyPattern !== "string") {
        errors.push({ path: [...path, "keyPattern"], message: "'keyPattern' must be a string" });
      }
      return;

    case "union":
      if (!Array.isArray(n.variants)) {
        errors.push({ path, message: "union requires 'variants' array" });
      } else if (n.variants.length < 2) {
        errors.push({ path, message: "union 'variants' must have at least 2 entries" });
      } else {
        n.variants.forEach((v, i) => {
          walk(v, [...path, "variants", i], errors);
        });
      }
      if (n.discriminator !== undefined && typeof n.discriminator !== "string") {
        errors.push({
          path: [...path, "discriminator"],
          message: "'discriminator' must be a string",
        });
      }
      return;
  }
}

function checkLiterals(
  n: Record<string, unknown>,
  path: Path,
  expected: "boolean" | "number" | "string",
  errors: StructureError[],
): void {
  if (!("literals" in n) || n.literals === undefined) return;
  if (!Array.isArray(n.literals)) {
    errors.push({ path: [...path, "literals"], message: "'literals' must be an array" });
    return;
  }
  if (n.literals.length === 0) {
    // Interpretation flagged in plan (ST4): empty literals is degenerate; matches no value.
    errors.push({ path: [...path, "literals"], message: "'literals' must not be empty" });
    return;
  }
  const checkers = {
    boolean: (v: unknown) => typeof v === "boolean",
    number: (v: unknown) => typeof v === "number",
    string: (v: unknown) => typeof v === "string",
  } as const;
  if (!n.literals.every(checkers[expected])) {
    errors.push({
      path: [...path, "literals"],
      message: `'literals' must contain only ${expected}s`,
    });
  }
}

function checkBounds(
  n: Record<string, unknown>,
  path: Path,
  lo: string,
  hi: string,
  errors: StructureError[],
): void {
  const loVal = n[lo];
  const hiVal = n[hi];
  if (typeof loVal === "number" && typeof hiVal === "number" && loVal > hiVal) {
    errors.push({ path, message: `'${lo}' must not exceed '${hi}'` });
  }
}

function checkAdditional(n: Record<string, unknown>, path: Path, errors: StructureError[]): void {
  if (n.additional === undefined) {
    // Spec: "false = closed (default)". Tolerate omission as equivalent to false.
    return;
  }
  if (n.additional === false || n.additional === true) {
    return;
  }
  // Must be a Node — recurse.
  walk(n.additional, [...path, "additional"], errors);
}
