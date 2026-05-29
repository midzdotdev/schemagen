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
  return tree;
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

// Walk a single sample value against the IR + evidence tree in lockstep.
// Increments count at every node the sample reaches; on type mismatch,
// no further descent.
function walk(node: Node, value: unknown, ev: EvidenceTree): void {
  ev.count++;
  switch (node.kind) {
    case "unknown":
    case "null":
      return;

    case "boolean":
      if (ev.kind !== "boolean") return;
      if (value === true) ev.trueCount++;
      else if (value === false) ev.falseCount++;
      return;

    case "number":
      if (ev.kind !== "number") return;
      if (typeof value !== "number") return;
      if (ev.min === undefined || value < ev.min) ev.min = value;
      if (ev.max === undefined || value > ev.max) ev.max = value;
      if (Number.isInteger(value)) ev.integerCount++;
      else ev.floatCount++;
      if (ev.sampleValues.length < NUMBER_SAMPLE_LIMIT) ev.sampleValues.push(value);
      return;

    case "string": {
      if (ev.kind !== "string") return;
      if (typeof value !== "string") return;
      if (ev.values[value] === undefined) {
        if (Object.keys(ev.values).length < STRING_TOP_K) {
          ev.values[value] = 1;
          ev.cardinality = Object.keys(ev.values).length;
        }
        if (ev.sampleValues.length < STRING_FREE_SAMPLE_LIMIT) {
          ev.sampleValues.push(value);
        }
      } else {
        ev.values[value]++;
      }
      const len = value.length;
      if (ev.minLength === undefined || len < ev.minLength) ev.minLength = len;
      if (ev.maxLength === undefined || len > ev.maxLength) ev.maxLength = len;
      return;
    }

    case "array": {
      if (ev.kind !== "array") return;
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
      return;
    }

    case "tuple": {
      if (ev.kind !== "tuple") return;
      if (!Array.isArray(value)) return;
      for (let i = 0; i < node.items.length; i++) {
        const subNode = node.items[i] as Node;
        const subEv = ev.items[i] as EvidenceTree;
        walk(subNode, value[i], subEv);
      }
      if (node.rest !== undefined && ev.rest !== undefined) {
        for (let i = node.items.length; i < value.length; i++) {
          walk(node.rest, value[i], ev.rest);
        }
      }
      return;
    }

    case "object": {
      if (ev.kind !== "object") return;
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
      return;
    }

    case "record": {
      if (ev.kind !== "record") return;
      if (value === null || typeof value !== "object" || Array.isArray(value)) return;
      const obj = value as Record<string, unknown>;
      for (const v of Object.values(obj)) walk(node.values, v, ev.values);
      return;
    }

    case "union": {
      if (ev.kind !== "union") return;
      // Find the first variant that fully accepts this value.
      for (let i = 0; i < node.variants.length; i++) {
        const variant = node.variants[i] as Node;
        const result = validate(variant, value);
        if (result.ok) {
          ev.variantCounts[i] = (ev.variantCounts[i] ?? 0) + 1;
          const subEv = ev.variants[i] as EvidenceTree;
          // We already incremented this union's count; descending into the variant
          // increments the variant's count too via walk().
          walk(variant, value, subEv);
          return;
        }
      }
      // No variant accepted — no per-variant credit.
      return;
    }
  }
}
