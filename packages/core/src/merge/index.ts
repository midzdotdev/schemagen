// merge. See docs/core-spec.md § "`merge`".

import { applyChange } from "../changes";
import type { Change } from "../changes/types";
import type { IR } from "../ir/types";
import { validate } from "../validate";
import type { Mismatch, MismatchKind } from "../validate";

export interface MergeOptions {
  resolution?: Partial<Record<MismatchKind, "auto" | "skip">>;
}

export interface MergeResult {
  ir: IR;
  changes: Change[];
  unresolved: Mismatch[];
}

const DEFAULT_RESOLUTIONS: Record<MismatchKind, "auto" | "skip"> = {
  "type-mismatch": "skip",
  "literal-violation": "auto",
  "missing-required-field": "auto",
  "unexpected-field": "auto",
  "out-of-range": "auto",
  "pattern-violation": "auto",
  "format-violation": "auto",
  "wrong-length": "auto",
  "null-not-allowed": "auto",
  "non-integer": "auto",
  "duplicate-items": "auto",
};

export function merge(ir: IR, samples: unknown[], options?: MergeOptions): MergeResult {
  const resolutions = { ...DEFAULT_RESOLUTIONS, ...(options?.resolution ?? {}) };

  let current = ir;
  const appliedChanges: Change[] = [];
  const unresolved: Mismatch[] = [];

  // Dedup mismatches by (kind, path, value/name). Two records hitting the same
  // mismatch shouldn't apply the resolution twice.
  const seen = new Set<string>();
  const initial = validate(ir, samples);
  for (const m of initial.mismatches) {
    const sig = signatureFor(m);
    if (seen.has(sig)) continue;
    seen.add(sig);

    const decision = resolutions[m.kind];
    if (decision === "skip" || m.suggestions.length === 0) {
      unresolved.push(m);
      continue;
    }
    const change = m.suggestions[0]?.change;
    if (!change) {
      unresolved.push(m);
      continue;
    }
    try {
      const { ir: next } = applyChange(current, change);
      current = next;
      appliedChanges.push(change);
    } catch {
      unresolved.push(m);
    }
  }

  return { ir: current, changes: appliedChanges, unresolved };
}

function signatureFor(m: Mismatch): string {
  return JSON.stringify({
    kind: m.kind,
    path: m.path,
    value: m.actual.value,
  });
}
