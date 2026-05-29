// computeEvidence. See docs/core-spec.md § "`computeEvidence`".

import type { IR, Node } from "../ir/types";
import { validate } from "../validate";
import type { EvidenceTree, FieldEvidence } from "./types";

export type { EvidenceTree, FieldEvidence, RecordRef } from "./types";

const STRING_TOP_K = 20;
const NUMBER_SAMPLE_LIMIT = 20;
const STRING_FREE_SAMPLE_LIMIT = 5;

export function computeEvidence(ir: IR, samples: unknown[]): EvidenceTree {
  const tree = makeEmpty(ir);
  for (const sample of samples) {
    walk(ir, sample, tree);
  }
  finalize(tree);
  return tree;
}

// Trim every string node's `values` map to the top-K entries by frequency. Done once after
// the walk so the retained set reflects the most frequent values across all records, not the
// first K distinct ones encountered. `cardinality` is left as the full distinct count.
// Ties keep first-seen order (Array.prototype.sort is stable), so the result is deterministic.
function finalize(ev: EvidenceTree): void {
  switch (ev.kind) {
    case "string": {
      const entries = Object.entries(ev.values);
      if (entries.length <= STRING_TOP_K) return;
      entries.sort((a, b) => b[1] - a[1]);
      ev.values = Object.fromEntries(entries.slice(0, STRING_TOP_K));
      return;
    }
    case "array":
      finalize(ev.items);
      return;
    case "tuple":
      for (const item of ev.items) finalize(item);
      if (ev.rest !== undefined) finalize(ev.rest);
      return;
    case "object":
      for (const field of Object.values(ev.fields)) finalize(field.valueEvidence);
      return;
    case "record":
      finalize(ev.values);
      return;
    case "union":
      for (const variant of ev.variants) finalize(variant);
      return;
  }
}

function makeEmpty(node: Node): EvidenceTree {
  switch (node.kind) {
    case "unknown":
      return { kind: "unknown", count: 0 };
    case "null":
      return { kind: "null", count: 0 };
    case "boolean":
      return { kind: "boolean", count: 0, trueCount: 0, falseCount: 0 };
    case "number":
      return {
        kind: "number",
        count: 0,
        integerCount: 0,
        floatCount: 0,
        sampleValues: [],
      };
    case "string":
      return {
        kind: "string",
        count: 0,
        values: {},
        cardinality: 0,
        sampleValues: [],
      };
    case "array":
      return {
        kind: "array",
        count: 0,
        lengths: { min: 0, max: 0, mean: 0 },
        items: makeEmpty(node.items),
      };
    case "tuple": {
      const items = node.items.map(makeEmpty);
      const out: EvidenceTree = {
        kind: "tuple",
        count: 0,
        items,
      };
      if (node.rest !== undefined) {
        (out as { rest?: EvidenceTree }).rest = makeEmpty(node.rest);
      }
      return out;
    }
    case "object": {
      const fields: Record<string, FieldEvidence> = {};
      for (const [name, entry] of Object.entries(node.fields)) {
        fields[name] = {
          presenceCount: 0,
          nullCount: 0,
          valueEvidence: makeEmpty(entry.type),
        };
      }
      return { kind: "object", count: 0, fields };
    }
    case "record":
      return { kind: "record", count: 0, values: makeEmpty(node.values) };
    case "union":
      return {
        kind: "union",
        count: 0,
        variants: node.variants.map(makeEmpty),
        variantCounts: node.variants.map(() => 0),
      };
  }
}

// Node and EvidenceTree are discriminated unions that share the same `kind` literals, so each
// node kind has exactly one corresponding node type and evidence type.
type NodeFor<K extends Node["kind"]> = Extract<Node, { kind: K }>;
type EvidenceFor<K extends Node["kind"]> = Extract<EvidenceTree, { kind: K }>;

// One walker per node kind, each fully typed. Because makeEmpty() builds the evidence node from
// the same IR node, the evidence handed to a walker is always the matching variant — so the
// pairing is expressed once, here in the table's type, instead of via a per-case `ev.kind` guard
// in every branch. Walkers still bail on a value/type mismatch (partial evidence: the node was
// counted on entry, but a mismatched value contributes nothing else).
type Walkers = {
  [K in Node["kind"]]: (node: NodeFor<K>, value: unknown, ev: EvidenceFor<K>) => void;
};

const WALKERS: Walkers = {
  unknown: () => {},
  null: () => {},
  boolean: (_node, value, ev) => {
    if (value === true) ev.trueCount++;
    else if (value === false) ev.falseCount++;
  },
  number: (_node, value, ev) => {
    if (typeof value !== "number") return;
    if (ev.min === undefined || value < ev.min) ev.min = value;
    if (ev.max === undefined || value > ev.max) ev.max = value;
    if (Number.isInteger(value)) ev.integerCount++;
    else ev.floatCount++;
    if (ev.sampleValues.length < NUMBER_SAMPLE_LIMIT) ev.sampleValues.push(value);
  },
  string: (_node, value, ev) => {
    if (typeof value !== "string") return;
    if (ev.values[value] === undefined) {
      // Count every distinct value: cardinality is the true distinct count, and we need full
      // frequencies to pick the genuine top-K in finalize(). The map is trimmed to STRING_TOP_K
      // once, at the end, rather than dropping late-arriving frequent values.
      ev.values[value] = 1;
      ev.cardinality++;
      if (ev.sampleValues.length < STRING_FREE_SAMPLE_LIMIT) {
        ev.sampleValues.push(value);
      }
    } else {
      ev.values[value]++;
    }
    const len = value.length;
    if (ev.minLength === undefined || len < ev.minLength) ev.minLength = len;
    if (ev.maxLength === undefined || len > ev.maxLength) ev.maxLength = len;
  },
  array: (node, value, ev) => {
    if (!Array.isArray(value)) return;
    const len = value.length;
    if (ev.count === 1) {
      ev.lengths = { min: len, max: len, mean: len };
    } else {
      ev.lengths.min = Math.min(ev.lengths.min, len);
      ev.lengths.max = Math.max(ev.lengths.max, len);
      ev.lengths.mean = ev.lengths.mean + (len - ev.lengths.mean) / ev.count;
    }
    for (const item of value) walk(node.items, item, ev.items);
  },
  tuple: (node, value, ev) => {
    if (!Array.isArray(value)) return;
    // A short array only reaches its first `value.length` positions; iterate the lesser of
    // declared positions and actual length so absent positions aren't counted.
    const reached = Math.min(node.items.length, value.length);
    for (let i = 0; i < reached; i++) {
      walk(node.items[i] as Node, value[i], ev.items[i] as EvidenceTree);
    }
    if (node.rest !== undefined && ev.rest !== undefined) {
      for (let i = node.items.length; i < value.length; i++) {
        walk(node.rest, value[i], ev.rest);
      }
    }
  },
  object: (node, value, ev) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return;
    const obj = value as Record<string, unknown>;
    for (const [name, entry] of Object.entries(node.fields)) {
      const hasKey = Object.prototype.hasOwnProperty.call(obj, name);
      if (!hasKey) continue;
      const fieldEv = ev.fields[name];
      if (!fieldEv) continue;
      fieldEv.presenceCount++;
      const sub = obj[name];
      if (sub === null) {
        fieldEv.nullCount++;
        continue;
      }
      walk(entry.type, sub, fieldEv.valueEvidence);
    }
  },
  record: (node, value, ev) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return;
    const obj = value as Record<string, unknown>;
    for (const v of Object.values(obj)) walk(node.values, v, ev.values);
  },
  union: (node, value, ev) => {
    // Find the first variant that fully accepts this value.
    for (let i = 0; i < node.variants.length; i++) {
      const variant = node.variants[i] as Node;
      const result = validate(variant, value);
      if (result.ok) {
        ev.variantCounts[i] = (ev.variantCounts[i] ?? 0) + 1;
        // We already incremented this union's count; descending into the variant
        // increments the variant's count too via walk().
        walk(variant, value, ev.variants[i] as EvidenceTree);
        return;
      }
    }
    // No variant accepted — no per-variant credit.
  },
};

// Walk a single sample value against the IR + evidence tree in lockstep, incrementing the count
// at every node the sample reaches and dispatching to the matching walker.
function walk(node: Node, value: unknown, ev: EvidenceTree): void {
  ev.count++;
  // ev is always makeEmpty(node), so ev.kind === node.kind. This single assertion encodes that
  // invariant; every walker above is then fully typed without its own ev.kind guard.
  (WALKERS[node.kind] as (n: Node, v: unknown, e: EvidenceTree) => void)(node, value, ev);
}
