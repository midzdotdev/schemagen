// Literal detection. See docs/core-spec.md § "`infer`" — literals subsection.

import type { ResolvedInferOptions } from "./options";

export function detectStringLiterals(
  values: Map<string, number>,
  opts: ResolvedInferOptions["literals"],
): string[] | undefined {
  if (!opts.enable) return undefined;
  let total = 0;
  for (const c of values.values()) total += c;
  if (total < opts.minSamples) return undefined;
  const cardinality = values.size;
  if (cardinality > opts.maxCardinality) return undefined;
  if (cardinality / total > opts.maxUniqueRatio) return undefined;
  return Array.from(values.keys()); // first-seen order (Map preserves insertion order)
}

export function detectNumberLiterals(
  values: Map<number, number>,
  opts: ResolvedInferOptions["literals"],
): number[] | undefined {
  if (!opts.enable) return undefined;
  let total = 0;
  for (const c of values.values()) total += c;
  if (total < opts.minSamples) return undefined;
  const cardinality = values.size;
  if (cardinality > opts.maxCardinality) return undefined;
  if (cardinality / total > opts.maxUniqueRatio) return undefined;
  return Array.from(values.keys());
}

export function detectBooleanLiterals(
  trueCount: number,
  falseCount: number,
  opts: ResolvedInferOptions["literals"],
): boolean[] | undefined {
  if (!opts.enable) return undefined;
  const total = trueCount + falseCount;
  if (total < opts.minSamples) return undefined;
  // Boolean is trivially low-cardinality. If only one value observed, propose [thatValue].
  if (trueCount > 0 && falseCount === 0) return [true];
  if (falseCount > 0 && trueCount === 0) return [false];
  return undefined;
}
