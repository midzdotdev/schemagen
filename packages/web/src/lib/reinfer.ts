// PR FF — web side of re-infer. Builds the touched-path set from the active
// history (where the `source` distinction lives) and runs the pure core diff
// against a freshly-inferred IR.
//
// See docs/plans/pr-ff-reinfer-reconcile.md.

import {
  changeTargetPaths,
  computeReinferDiff,
  type InferOptions,
  type IR,
  infer,
  type ReinferDiff,
} from "@schemagen/core";
import type { HistoryEntry } from "@/state/types";

// Paths the user has actively edited. Only the active history prefix counts
// (undone edits don't shape the current IR), and inferred ops are excluded —
// they came from schemagen, not the user.
export function touchedPaths(activeEntries: HistoryEntry[]): Set<string> {
  const set = new Set<string>();
  for (const entry of activeEntries) {
    if (entry.source === "inferred") continue;
    for (const p of changeTargetPaths(entry.change)) set.add(p);
  }
  return set;
}

// Diff the current IR against `infer(records, inferenceOptions)`, classifying
// each change by whether the user has touched its path.
export function buildReinferDiff(
  ir: IR,
  records: unknown[],
  inferenceOptions: InferOptions | null,
  activeEntries: HistoryEntry[],
): ReinferDiff {
  const fresh = infer(records, inferenceOptions ?? undefined);
  return computeReinferDiff(ir, fresh, touchedPaths(activeEntries));
}
