// applyChange dispatcher. See docs/core-spec.md § "Suggestions and Changes"
// + § "Invertibility".

import { getNodeAt, setNodeAt } from "../ir/paths";
import { isValid } from "../ir/structure";
import type {
  BooleanNode,
  FieldEntry,
  IR,
  Node,
  NumberNode,
  ObjectNode,
  Path,
  StringNode,
  UnionNode,
} from "../ir/types";
import type { Change } from "./types";

export type { Change } from "./types";

export function applyChange(ir: IR, change: Change): { ir: IR; inverse: Change } {
  if (!isValid(ir)) {
    throw new Error("applyChange: input IR is structurally invalid");
  }
  return dispatch(ir, change);
}

function dispatch(ir: IR, change: Change): { ir: IR; inverse: Change } {
  switch (change.op) {
    case "set-node":
      return setNode(ir, change.path, change.node);

    case "set-field-type":
      return setFieldType(ir, change.path, change.type);

    case "add-field":
      return addField(ir, change.path, change.name, change.entry, change.position);

    case "remove-field":
      return removeField(ir, change.path, change.name);

    case "rename-field":
      return renameField(ir, change.path, change.from, change.to);

    case "reorder-fields":
      return reorderFields(ir, change.path, change.order);

    case "set-optional":
      return setFieldFlag(ir, change.path, change.name, "optional", change.value);

    case "set-nullable":
      return setFieldFlag(ir, change.path, change.name, "nullable", change.value);

    case "add-literal":
      return addLiteral(ir, change.path, change.value);

    case "remove-literal":
      return removeLiteral(ir, change.path, change.value);

    case "clear-literals":
      return clearLiterals(ir, change.path);

    case "set-format":
      return setFormat(ir, change.path, change.format);

    case "set-pattern":
      return setPatternish(ir, change.path, change.pattern);

    case "set-bound":
      return setBound(ir, change.path, change.which, change.value);

    case "set-integer":
      return setIntegerFlag(ir, change.path, change.value);

    case "wrap-in-union":
      return wrapInUnion(ir, change.path, change.with);

    case "add-union-variant":
      return addUnionVariant(ir, change.path, change.variant);

    case "remove-union-variant":
      return removeUnionVariant(ir, change.path, change.index);

    case "set-discriminator":
      return setDiscriminator(ir, change.path, change.field);

    case "wrap-in-array":
      return wrapInArray(ir, change.path);

    case "unwrap-array":
      return unwrapArray(ir, change.path);

    case "set-additional":
      return setAdditional(ir, change.path, change.value);

    case "batch": {
      let cur = ir;
      const inverses: Change[] = [];
      for (const child of change.changes) {
        const { ir: next, inverse } = dispatch(cur, child);
        cur = next;
        inverses.push(inverse);
      }
      const inverseChange: Change = change.label
        ? { op: "batch", changes: inverses.reverse(), label: `undo ${change.label}` }
        : { op: "batch", changes: inverses.reverse() };
      return { ir: cur, inverse: inverseChange };
    }
  }
}

// ----- helpers -----

function nodeAt(ir: IR, path: Path): Node {
  const n = getNodeAt(ir, path);
  if (!n) throw new Error(`no node at path ${JSON.stringify(path)}`);
  return n;
}

function expectObject(ir: IR, path: Path): ObjectNode {
  const n = nodeAt(ir, path);
  if (n.kind !== "object") {
    throw new Error(`expected object at ${JSON.stringify(path)}, got ${n.kind}`);
  }
  return n;
}

function expectUnion(ir: IR, path: Path): UnionNode {
  const n = nodeAt(ir, path);
  if (n.kind !== "union") {
    throw new Error(`expected union at ${JSON.stringify(path)}, got ${n.kind}`);
  }
  return n;
}

// ----- ops -----

function setNode(ir: IR, path: Path, node: Node): { ir: IR; inverse: Change } {
  const oldNode = nodeAt(ir, path);
  return { ir: setNodeAt(ir, path, node), inverse: { op: "set-node", path, node: oldNode } };
}

function setFieldType(ir: IR, path: Path, type: Node): { ir: IR; inverse: Change } {
  // path addresses the field's value-node directly (per Path semantics, object
  // field name -> fields[name].type). set-field-type is therefore equivalent
  // to set-node at that path, but kept distinct as an explicit op for history.
  const oldNode = nodeAt(ir, path);
  return {
    ir: setNodeAt(ir, path, type),
    inverse: { op: "set-field-type", path, type: oldNode },
  };
}

function withFields(obj: ObjectNode, fields: Record<string, FieldEntry>): ObjectNode {
  return { ...obj, fields };
}

function insertAt<T>(
  arr: Array<[string, T]>,
  idx: number,
  key: string,
  val: T,
): Array<[string, T]> {
  const cp = arr.slice();
  cp.splice(idx, 0, [key, val]);
  return cp;
}

function addField(
  ir: IR,
  parentPath: Path,
  name: string,
  entry: FieldEntry,
  position?: number,
): { ir: IR; inverse: Change } {
  const obj = expectObject(ir, parentPath);
  if (Object.prototype.hasOwnProperty.call(obj.fields, name)) {
    throw new Error(`field '${name}' already exists`);
  }
  const entries = Object.entries(obj.fields);
  const pos = position === undefined ? entries.length : position;
  const next = insertAt(entries, pos, name, entry);
  const fields: Record<string, FieldEntry> = {};
  for (const [k, v] of next) fields[k] = v;
  const newObj = withFields(obj, fields);
  const newIR = setNodeAt(ir, parentPath, newObj);
  return {
    ir: newIR,
    inverse: { op: "remove-field", path: parentPath, name },
  };
}

function removeField(ir: IR, parentPath: Path, name: string): { ir: IR; inverse: Change } {
  const obj = expectObject(ir, parentPath);
  const entries = Object.entries(obj.fields);
  const idx = entries.findIndex(([k]) => k === name);
  if (idx === -1) throw new Error(`field '${name}' not found`);
  const removed = entries[idx]?.[1] as FieldEntry;
  const next = entries.slice(0, idx).concat(entries.slice(idx + 1));
  const fields: Record<string, FieldEntry> = {};
  for (const [k, v] of next) fields[k] = v;
  const newObj = withFields(obj, fields);
  return {
    ir: setNodeAt(ir, parentPath, newObj),
    inverse: { op: "add-field", path: parentPath, name, entry: removed, position: idx },
  };
}

function renameField(
  ir: IR,
  parentPath: Path,
  from: string,
  to: string,
): { ir: IR; inverse: Change } {
  const obj = expectObject(ir, parentPath);
  if (!Object.prototype.hasOwnProperty.call(obj.fields, from)) {
    throw new Error(`field '${from}' not found`);
  }
  if (from === to) {
    return { ir, inverse: { op: "rename-field", path: parentPath, from: to, to: from } };
  }
  if (Object.prototype.hasOwnProperty.call(obj.fields, to)) {
    throw new Error(`field '${to}' already exists`);
  }
  const fields: Record<string, FieldEntry> = {};
  for (const [k, v] of Object.entries(obj.fields)) {
    fields[k === from ? to : k] = v;
  }
  return {
    ir: setNodeAt(ir, parentPath, withFields(obj, fields)),
    inverse: { op: "rename-field", path: parentPath, from: to, to: from },
  };
}

function reorderFields(ir: IR, parentPath: Path, order: string[]): { ir: IR; inverse: Change } {
  const obj = expectObject(ir, parentPath);
  const oldOrder = Object.keys(obj.fields);
  // Validate: order must be a permutation of existing fields
  if (order.length !== oldOrder.length) {
    throw new Error("reorder-fields: order length must match existing fields");
  }
  const oldSet = new Set(oldOrder);
  for (const k of order) {
    if (!oldSet.has(k)) throw new Error(`reorder-fields: unknown field '${k}'`);
  }
  const fields: Record<string, FieldEntry> = {};
  for (const k of order) fields[k] = obj.fields[k] as FieldEntry;
  return {
    ir: setNodeAt(ir, parentPath, withFields(obj, fields)),
    inverse: { op: "reorder-fields", path: parentPath, order: oldOrder },
  };
}

function setFieldFlag(
  ir: IR,
  parentPath: Path,
  name: string,
  flag: "optional" | "nullable",
  value: boolean,
): { ir: IR; inverse: Change } {
  const obj = expectObject(ir, parentPath);
  const entry = obj.fields[name];
  if (!entry) throw new Error(`field '${name}' not found`);
  const oldValue = entry[flag] ?? false;
  const newEntry: FieldEntry = { ...entry };
  if (value === false) delete newEntry[flag];
  else newEntry[flag] = value;
  const fields = { ...obj.fields, [name]: newEntry };
  return {
    ir: setNodeAt(ir, parentPath, withFields(obj, fields)),
    inverse:
      flag === "optional"
        ? { op: "set-optional", path: parentPath, name, value: oldValue }
        : { op: "set-nullable", path: parentPath, name, value: oldValue },
  };
}

type LiteralValue = string | number | boolean;
type LiteralKind = StringNode | NumberNode | BooleanNode;

function isLiteralKind(n: Node): n is LiteralKind {
  return n.kind === "string" || n.kind === "number" || n.kind === "boolean";
}

function literalsOf(n: LiteralKind): LiteralValue[] {
  return n.literals ?? [];
}

function withLiterals(n: LiteralKind, literals: LiteralValue[] | undefined): LiteralKind {
  // Build a new node, narrowing on kind so the literals type matches.
  switch (n.kind) {
    case "string": {
      const next: StringNode = { ...n };
      if (literals === undefined) delete next.literals;
      else next.literals = literals as string[];
      return next;
    }
    case "number": {
      const next: NumberNode = { ...n };
      if (literals === undefined) delete next.literals;
      else next.literals = literals as number[];
      return next;
    }
    case "boolean": {
      const next: BooleanNode = { ...n };
      if (literals === undefined) delete next.literals;
      else next.literals = literals as boolean[];
      return next;
    }
  }
}

function addLiteral(ir: IR, path: Path, value: LiteralValue): { ir: IR; inverse: Change } {
  const n = nodeAt(ir, path);
  if (!isLiteralKind(n)) throw new Error(`add-literal not applicable to ${n.kind}`);
  const existing = literalsOf(n);
  if (existing.includes(value)) {
    // No-op: already present. Inverse must also be a no-op.
    return { ir, inverse: { op: "batch", changes: [] } };
  }
  const newNode = withLiterals(n, [...existing, value]);
  return {
    ir: setNodeAt(ir, path, newNode),
    inverse: { op: "set-node", path, node: n },
  };
}

function removeLiteral(ir: IR, path: Path, value: LiteralValue): { ir: IR; inverse: Change } {
  const n = nodeAt(ir, path);
  if (!isLiteralKind(n)) throw new Error(`remove-literal not applicable to ${n.kind}`);
  const existing = literalsOf(n);
  if (!existing.includes(value)) {
    return { ir, inverse: { op: "batch", changes: [] } };
  }
  const filtered = existing.filter((v) => v !== value);
  const newNode = withLiterals(n, filtered.length === 0 ? undefined : filtered);
  return {
    ir: setNodeAt(ir, path, newNode),
    inverse: { op: "set-node", path, node: n },
  };
}

function clearLiterals(ir: IR, path: Path): { ir: IR; inverse: Change } {
  const n = nodeAt(ir, path);
  if (!isLiteralKind(n)) throw new Error(`clear-literals not applicable to ${n.kind}`);
  const newNode = withLiterals(n, undefined);
  return {
    ir: setNodeAt(ir, path, newNode),
    inverse: { op: "set-node", path, node: n },
  };
}

function setFormat(ir: IR, path: Path, value: string | null): { ir: IR; inverse: Change } {
  const n = nodeAt(ir, path);
  if (n.kind !== "string") throw new Error("set-format requires a string node");
  const old = n.format;
  const newNode: StringNode = { ...n };
  if (value === null) delete newNode.format;
  else newNode.format = value;
  return {
    ir: setNodeAt(ir, path, newNode),
    inverse: { op: "set-format", path, format: old === undefined ? null : old },
  };
}

function setPatternish(ir: IR, path: Path, pattern: string | null): { ir: IR; inverse: Change } {
  const n = nodeAt(ir, path);
  if (n.kind === "string") {
    const old = n.pattern;
    const newNode: StringNode = { ...n };
    if (pattern === null) delete newNode.pattern;
    else newNode.pattern = pattern;
    return {
      ir: setNodeAt(ir, path, newNode),
      inverse: { op: "set-pattern", path, pattern: old === undefined ? null : old },
    };
  }
  if (n.kind === "record") {
    const old = n.keyPattern;
    const newNode = { ...n };
    if (pattern === null) delete newNode.keyPattern;
    else newNode.keyPattern = pattern;
    return {
      ir: setNodeAt(ir, path, newNode),
      inverse: { op: "set-pattern", path, pattern: old === undefined ? null : old },
    };
  }
  throw new Error("set-pattern requires a string or record node");
}

type BoundName = "min" | "max" | "minLength" | "maxLength" | "minItems" | "maxItems";

function setBound(
  ir: IR,
  path: Path,
  which: BoundName,
  value: number | null,
): { ir: IR; inverse: Change } {
  const n = nodeAt(ir, path);
  switch (n.kind) {
    case "number":
      if (which !== "min" && which !== "max") {
        throw new Error(`set-bound '${which}' not applicable to number`);
      }
      return setNumberBound(ir, path, n, which, value);
    case "string":
      if (which !== "minLength" && which !== "maxLength") {
        throw new Error(`set-bound '${which}' not applicable to string`);
      }
      return setStringLengthBound(ir, path, n, which, value);
    case "array":
      if (which !== "minItems" && which !== "maxItems") {
        throw new Error(`set-bound '${which}' not applicable to array`);
      }
      return setArrayLengthBound(ir, path, n, which, value);
    default:
      throw new Error(`set-bound not applicable to ${n.kind}`);
  }
}

function setNumberBound(
  ir: IR,
  path: Path,
  n: NumberNode,
  which: "min" | "max",
  value: number | null,
): { ir: IR; inverse: Change } {
  const old = n[which];
  const newNode: NumberNode = { ...n };
  if (value === null) delete newNode[which];
  else newNode[which] = value;
  return {
    ir: setNodeAt(ir, path, newNode),
    inverse: { op: "set-bound", path, which, value: old === undefined ? null : old },
  };
}

function setStringLengthBound(
  ir: IR,
  path: Path,
  n: StringNode,
  which: "minLength" | "maxLength",
  value: number | null,
): { ir: IR; inverse: Change } {
  const old = n[which];
  const newNode: StringNode = { ...n };
  if (value === null) delete newNode[which];
  else newNode[which] = value;
  return {
    ir: setNodeAt(ir, path, newNode),
    inverse: { op: "set-bound", path, which, value: old === undefined ? null : old },
  };
}

function setArrayLengthBound(
  ir: IR,
  path: Path,
  n: { kind: "array"; items: Node; minItems?: number; maxItems?: number; uniqueItems?: boolean },
  which: "minItems" | "maxItems",
  value: number | null,
): { ir: IR; inverse: Change } {
  const old = n[which];
  const newNode = { ...n };
  if (value === null) delete newNode[which];
  else newNode[which] = value;
  return {
    ir: setNodeAt(ir, path, newNode),
    inverse: { op: "set-bound", path, which, value: old === undefined ? null : old },
  };
}

function setIntegerFlag(ir: IR, path: Path, value: boolean): { ir: IR; inverse: Change } {
  const n = nodeAt(ir, path);
  if (n.kind !== "number") throw new Error("set-integer requires a number node");
  const old = n.integer ?? false;
  const newNode: NumberNode = { ...n };
  if (value === false) delete newNode.integer;
  else newNode.integer = value;
  return {
    ir: setNodeAt(ir, path, newNode),
    inverse: { op: "set-integer", path, value: old },
  };
}

function wrapInUnion(ir: IR, path: Path, variant: Node): { ir: IR; inverse: Change } {
  const current = nodeAt(ir, path);
  const union: UnionNode = { kind: "union", variants: [current, variant] };
  return {
    ir: setNodeAt(ir, path, union),
    inverse: { op: "set-node", path, node: current },
  };
}

function addUnionVariant(ir: IR, path: Path, variant: Node): { ir: IR; inverse: Change } {
  const u = expectUnion(ir, path);
  const newUnion: UnionNode = { ...u, variants: [...u.variants, variant] };
  return {
    ir: setNodeAt(ir, path, newUnion),
    inverse: { op: "remove-union-variant", path, index: u.variants.length },
  };
}

function removeUnionVariant(ir: IR, path: Path, index: number): { ir: IR; inverse: Change } {
  const u = expectUnion(ir, path);
  if (index < 0 || index >= u.variants.length) {
    throw new Error(`remove-union-variant: index ${index} out of range`);
  }
  if (u.variants.length <= 2) {
    throw new Error("remove-union-variant: would leave union with <2 variants");
  }
  const newVariants = u.variants.slice(0, index).concat(u.variants.slice(index + 1));
  return {
    ir: setNodeAt(ir, path, { ...u, variants: newVariants }),
    // Use set-node for safe inverse (preserves discriminator, ordering, etc.)
    inverse: { op: "set-node", path, node: u },
  };
}

function setDiscriminator(ir: IR, path: Path, field: string | null): { ir: IR; inverse: Change } {
  const u = expectUnion(ir, path);
  const old = u.discriminator;
  const newUnion: UnionNode = { ...u };
  if (field === null) delete newUnion.discriminator;
  else newUnion.discriminator = field;
  return {
    ir: setNodeAt(ir, path, newUnion),
    inverse: {
      op: "set-discriminator",
      path,
      field: old === undefined ? null : old,
    },
  };
}

function wrapInArray(ir: IR, path: Path): { ir: IR; inverse: Change } {
  const current = nodeAt(ir, path);
  const wrapped: Node = { kind: "array", items: current };
  return {
    ir: setNodeAt(ir, path, wrapped),
    inverse: { op: "set-node", path, node: current },
  };
}

function unwrapArray(ir: IR, path: Path): { ir: IR; inverse: Change } {
  const current = nodeAt(ir, path);
  if (current.kind !== "array") throw new Error("unwrap-array: not an array node");
  return {
    ir: setNodeAt(ir, path, current.items),
    inverse: { op: "set-node", path, node: current },
  };
}

function setAdditional(
  ir: IR,
  path: Path,
  value: false | true | Node,
): { ir: IR; inverse: Change } {
  const obj = expectObject(ir, path);
  const old = obj.additional;
  return {
    ir: setNodeAt(ir, path, { ...obj, additional: value }),
    inverse: { op: "set-additional", path, value: old },
  };
}
