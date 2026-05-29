// Discriminated-union detection. See docs/core-spec.md § "`infer`" — discriminator detection.

import type { ResolvedInferOptions } from "./options";

export interface DiscriminatorResult {
  field: string;
  groups: Map<string, number[]>; // discriminator value -> indices of records in that group
}

// Given a list of per-record shapes (fieldNames + discriminator candidate values),
// find a field whose value perfectly partitions the records by their shape.
export function detectDiscriminator(
  shapes: Array<{ fieldNames: Set<string>; discriminators: Map<string, string> }>,
  opts: ResolvedInferOptions["discriminators"],
): DiscriminatorResult | undefined {
  if (!opts.enable) return undefined;
  if (shapes.length < 2) return undefined;

  // Candidate fields: from options, or any string field present in every record.
  let candidates: string[];
  if (opts.fields) {
    candidates = opts.fields;
  } else {
    candidates = [];
    const universal = new Set<string>(shapes[0]?.discriminators.keys() ?? []);
    for (const shape of shapes) {
      for (const key of Array.from(universal)) {
        if (!shape.discriminators.has(key)) universal.delete(key);
      }
    }
    candidates = Array.from(universal);
  }

  for (const field of candidates) {
    const groups = new Map<string, number[]>();
    let valid = true;
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i];
      if (!s) {
        valid = false;
        break;
      }
      const value = s.discriminators.get(field);
      if (value === undefined) {
        valid = false;
        break;
      }
      const arr = groups.get(value) ?? [];
      arr.push(i);
      groups.set(value, arr);
    }
    if (!valid) continue;

    // Now check that within each group, the fieldNames sets are identical, AND
    // across groups, the fieldNames sets differ.
    let perfectPartition = true;
    const groupSignatures: string[] = [];
    for (const [, indices] of groups) {
      const first = shapes[indices[0] as number]?.fieldNames;
      if (!first) {
        perfectPartition = false;
        break;
      }
      const signature = Array.from(first).sort().join(",");
      groupSignatures.push(signature);
      for (const idx of indices) {
        const s = shapes[idx];
        if (!s) {
          perfectPartition = false;
          break;
        }
        if (s.fieldNames.size !== first.size) {
          perfectPartition = false;
          break;
        }
        for (const f of first) {
          if (!s.fieldNames.has(f)) {
            perfectPartition = false;
            break;
          }
        }
        if (!perfectPartition) break;
      }
      if (!perfectPartition) break;
    }
    if (!perfectPartition) continue;

    // Across-group signatures must not all be identical.
    const uniqueSignatures = new Set(groupSignatures);
    if (uniqueSignatures.size < 2) continue;

    // Every proposed variant must be substantiated by at least 2 records.
    // Otherwise the "discriminator" is just a near-unique label that happens
    // to correlate with shape (e.g. an issue title where one value repeats).
    let allGroupsHaveAtLeastTwo = true;
    for (const [, indices] of groups) {
      if (indices.length < 2) {
        allGroupsHaveAtLeastTwo = false;
        break;
      }
    }
    if (!allGroupsHaveAtLeastTwo) continue;

    return { field, groups };
  }
  return undefined;
}
