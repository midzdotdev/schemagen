// Human-readable summaries of the workspace InferOptions overrides + a
// defaults check. Used by GenerateSchemaCard's cold-start panel (the full
// sentence) and the inference dialog (hasNonDefaultOptions, to auto-open the
// Advanced disclosure).

import { type InferOptions, resolveOptions } from "@schemagen/core";

// True when the stored options resolve to anything other than the strict
// defaults. Compares the fully-resolved option objects directly (not the
// heuristic override count) so it can't drift if a default changes in core —
// the inference dialog uses it to auto-open the Advanced disclosure.
export function hasNonDefaultOptions(opts: InferOptions | null): boolean {
  if (!opts) return false;
  return JSON.stringify(resolveOptions(opts)) !== JSON.stringify(resolveOptions(undefined));
}

// Count how many knobs deviate from schemagen's strict defaults. 0 ⇒ "strict
// defaults"; the inline summary line uses this for "N overrides".
export function inferenceOverrideCount(opts: InferOptions | null): number {
  if (!opts) return 0;
  let n = 0;
  if (opts.literals?.maxCardinality !== undefined) n += 1;
  if (opts.literals?.maxUniqueRatio !== undefined) n += 1;
  if (opts.literals?.minSamples !== undefined) n += 1;
  if (opts.literals?.enable === false) n += 1;
  if (opts.formats?.enable === false) n += 1;
  if (opts.numbers?.integerDetection === false) n += 1;
  if (opts.numbers?.rangeMode && opts.numbers.rangeMode !== "evidence-only") n += 1;
  if (opts.objects?.closed === false) n += 1;
  if (opts.objects?.optionalThreshold !== undefined && opts.objects.optionalThreshold !== 1.0) {
    n += 1;
  }
  if (opts.discriminators?.enable === false) n += 1;
  if (opts.onTypeConflict === "unknown") n += 1;
  return n;
}

// Full sentence used by GenerateSchemaCard's cold-start panel.
export function summariseOptions(opts: InferOptions | null): string {
  if (!opts)
    return "Strict defaults — literal unions for low-cardinality, closed objects, integer detection on.";
  const parts: string[] = [];
  if (opts.literals?.maxCardinality !== undefined) {
    parts.push(`literals up to ${opts.literals.maxCardinality}`);
  }
  if (opts.literals?.maxUniqueRatio !== undefined) {
    parts.push(`max unique ratio ${Math.round(opts.literals.maxUniqueRatio * 100)}%`);
  }
  if (opts.literals?.minSamples !== undefined) {
    parts.push(`min samples ${opts.literals.minSamples}`);
  }
  if (opts.literals?.enable === false) parts.push("literals off");
  if (opts.formats?.enable === false) parts.push("formats off");
  if (opts.numbers?.integerDetection === false) parts.push("integer detection off");
  if (opts.numbers?.rangeMode && opts.numbers.rangeMode !== "evidence-only") {
    parts.push(`range mode ${opts.numbers.rangeMode}`);
  }
  if (opts.objects?.closed === false) parts.push("open objects");
  if (opts.objects?.optionalThreshold !== undefined && opts.objects.optionalThreshold !== 1.0) {
    parts.push(`optional threshold ${opts.objects.optionalThreshold}`);
  }
  if (opts.discriminators?.enable === false) parts.push("discriminators off");
  if (opts.onTypeConflict === "unknown") parts.push("conflicts → unknown");
  if (parts.length === 0) return "Strict defaults.";
  return `Custom: ${parts.join(", ")}.`;
}
