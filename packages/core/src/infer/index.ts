// `infer` — build an IR from a list of sample records.
// See docs/core-spec.md § "`infer`".

import type { FieldEntry, IR, Node, ObjectNode, UnionNode } from "../ir/types";
import { buildObject, observationToNode } from "./build";
import { detectDiscriminator } from "./discriminator";
import { createObservation, type Observation, observeInto } from "./observe";
import { type InferOptions, resolveOptions } from "./options";

export type { InferOptions, ResolvedInferOptions } from "./options";
export { resolveOptions } from "./options";

export function infer(samples: unknown[], options?: InferOptions): IR {
  const opts = resolveOptions(options);

  if (opts.discriminators.enable && samples.length >= 2) {
    const shapes = collectObjectShapes(samples);
    if (shapes) {
      const result = detectDiscriminator(shapes, opts.discriminators);
      if (result) {
        const variants: Node[] = [];
        for (const [tag, indices] of result.groups) {
          const subset = indices.map((i) => samples[i]);
          const subObs = createObservation();
          for (const s of subset) observeInto(subObs, s);
          const variant = buildObject(subObs, opts);
          variants.push(withDiscriminatorLiteral(variant, result.field, tag));
        }
        const union: UnionNode = { kind: "union", variants, discriminator: result.field };
        return union;
      }
    }
  }

  const obs: Observation = createObservation();
  for (const s of samples) {
    observeInto(obs, s);
  }
  return observationToNode(obs, opts);
}

function withDiscriminatorLiteral(node: ObjectNode, field: string, tag: string): ObjectNode {
  const fields: Record<string, FieldEntry> = {};
  for (const [name, entry] of Object.entries(node.fields)) {
    if (name === field && entry.type.kind === "string") {
      fields[name] = { ...entry, type: { ...entry.type, literals: [tag] } };
    } else {
      fields[name] = entry;
    }
  }
  return { ...node, fields };
}

function collectObjectShapes(
  samples: unknown[],
): Array<{ fieldNames: Set<string>; discriminators: Map<string, string> }> | undefined {
  const shapes: Array<{ fieldNames: Set<string>; discriminators: Map<string, string> }> = [];
  for (const s of samples) {
    if (s === null || typeof s !== "object" || Array.isArray(s)) return undefined;
    const fieldNames = new Set<string>();
    const discriminators = new Map<string, string>();
    for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
      fieldNames.add(k);
      if (typeof v === "string") discriminators.set(k, v);
    }
    shapes.push({ fieldNames, discriminators });
  }
  return shapes;
}
