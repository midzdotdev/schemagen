// Build an IR from an observation tree. See docs/core-spec.md § "`infer`".

import type {
  ArrayNode,
  BooleanNode,
  FieldEntry,
  Node,
  NumberNode,
  ObjectNode,
  StringNode,
  UnionNode,
} from "../ir/types";
import { detectFormat } from "./formats";
import { detectBooleanLiterals, detectNumberLiterals, detectStringLiterals } from "./literals";
import type { Observation, ObservedType } from "./observe";
import type { ResolvedInferOptions } from "./options";

export function observationToNode(obs: Observation, opts: ResolvedInferOptions): Node {
  const types = obs.typeOrder;
  if (types.length === 0) return { kind: "unknown" };

  if (types.length === 1) {
    const t = types[0] as ObservedType;
    return buildSingleType(t, obs, opts);
  }

  // Multiple types -> conflict
  if (opts.onTypeConflict === "unknown") return { kind: "unknown" };

  const variants: Node[] = types.map((t) => buildSingleType(t, obs, opts));
  const union: UnionNode = { kind: "union", variants };
  return union;
}

function buildSingleType(t: ObservedType, obs: Observation, opts: ResolvedInferOptions): Node {
  switch (t) {
    case "string":
      return buildString(obs, opts);
    case "number":
      return buildNumber(obs, opts);
    case "boolean":
      return buildBoolean(obs, opts);
    case "array":
      return buildArray(obs, opts);
    case "object":
      return buildObject(obs, opts);
  }
}

function buildString(obs: Observation, opts: ResolvedInferOptions): StringNode {
  const node: StringNode = { kind: "string" };
  const values = obs.stringValues;
  if (values) {
    const literals = detectStringLiterals(values, opts.literals);
    if (literals !== undefined) node.literals = literals;
    if (node.literals === undefined) {
      const fmt = detectFormat(values.keys(), opts.formats.enable, opts.formats.detect);
      if (fmt !== undefined) node.format = fmt;
    }
  }
  return node;
}

function buildNumber(obs: Observation, opts: ResolvedInferOptions): NumberNode {
  const node: NumberNode = { kind: "number" };
  if (
    opts.numbers.integerDetection &&
    (obs.numberFloatCount ?? 0) === 0 &&
    (obs.numberIntegerCount ?? 0) > 0
  ) {
    node.integer = true;
  }
  const values = obs.numberValues;
  if (values) {
    const literals = detectNumberLiterals(values, opts.literals);
    if (literals !== undefined) node.literals = literals;
  }
  if (opts.numbers.rangeMode === "constraint") {
    if (obs.numberMin !== undefined) node.min = obs.numberMin;
    if (obs.numberMax !== undefined) node.max = obs.numberMax;
  }
  return node;
}

function buildBoolean(obs: Observation, opts: ResolvedInferOptions): BooleanNode {
  const node: BooleanNode = { kind: "boolean" };
  const literals = detectBooleanLiterals(
    obs.booleanTrueCount ?? 0,
    obs.booleanFalseCount ?? 0,
    opts.literals,
  );
  if (literals !== undefined) node.literals = literals;
  return node;
}

function buildArray(obs: Observation, opts: ResolvedInferOptions): ArrayNode {
  const item = obs.arrayItemObservation;
  let items: Node;
  if (item) {
    const itemNode = observationToNode(item, opts);
    // Nulls observed in array items become a union variant.
    const nullCount = (item as Observation & { nullCount?: number }).nullCount ?? 0;
    if (nullCount > 0 && itemNode.kind !== "unknown" && itemNode.kind !== "null") {
      // For arrays, nullable doesn't apply at item level (no FieldEntry).
      // Express as union with null.
      if (itemNode.kind === "union") {
        items = { kind: "union", variants: [...itemNode.variants, { kind: "null" }] };
      } else {
        items = { kind: "union", variants: [itemNode, { kind: "null" }] };
      }
    } else if (itemNode.kind === "unknown" && nullCount > 0) {
      items = { kind: "null" };
    } else {
      items = itemNode;
    }
  } else {
    items = { kind: "unknown" };
  }
  return { kind: "array", items };
}

export function buildObject(obs: Observation, opts: ResolvedInferOptions): ObjectNode {
  const fields: Record<string, FieldEntry> = {};
  if (obs.objectFieldOrder && obs.objectFields) {
    for (const name of obs.objectFieldOrder) {
      const fo = obs.objectFields.get(name);
      if (!fo) continue;
      const type = observationToNode(fo.valueObservation, opts);
      const presence = obs.count > 0 ? fo.presenceCount / obs.count : 0;
      const optional = presence < opts.objects.optionalThreshold;
      const nullable = fo.nullCount > 0;
      const entry: FieldEntry = { type };
      if (optional) entry.optional = true;
      if (nullable) entry.nullable = true;
      fields[name] = entry;
    }
  }
  return { kind: "object", fields, additional: !opts.objects.closed };
}
