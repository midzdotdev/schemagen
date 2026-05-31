// Pure record-ingestion pipeline. Given the existing workspace state + a
// batch of incoming records, decide the next records / IR / identityProposal
// values. The DataPanel handler used to do all of this inline; extracting it
// makes the rules testable in isolation and keeps the component focused on UI.
//
// Rules, in order:
//   1. Concat existing + new, byte-dedup by canonicalHash (same record never
//      counted twice no matter how many times it's imported).
//   2. If an identityConfig is set, run dedupeByIdentity (logical dedup) over
//      the merged set; keep only the survivors.
//   3. If no IR exists yet, infer one from the merged records (cold-start
//      behaviour — once an IR exists, the user is in charge of its shape).
//   4. If no identityConfig + the user hasn't dismissed the suggestion,
//      recompute proposeIdentityKey against the merged records. Result is
//      whatever proposeIdentityKey returns (null clears the banner).

import type { IdentityConfig, IdentityProposal, InferOptions, IR } from "@schemagen/core";
import { dedupeByIdentity, infer, proposeIdentityKey } from "@schemagen/core";
import { canonicalHash } from "./canonical-hash";

export interface IngestState {
  records: unknown[];
  ir: IR | null;
  identityConfig: IdentityConfig | null;
  identityProposalDismissed: boolean;
  // Z: cold-start inference overrides. Inert once `ir` is set.
  inferenceOptions: InferOptions | null;
}

export interface IngestResult {
  records: unknown[];
  // Only populated when the input ir was null and the merged set is non-empty.
  ir: IR | null;
  // Set to a proposal (or null) whenever the proposal should be replaced.
  // undefined means "don't touch what's there" — used when an identityConfig
  // is set or the suggestion was dismissed, so the banner stays as-is.
  identityProposal: IdentityProposal | null | undefined;
}

export function ingestRecords(state: IngestState, incoming: unknown[]): IngestResult {
  const merged = byteDedup([...state.records, ...incoming]);
  const records = state.identityConfig
    ? dedupeByIdentity(merged, state.identityConfig).kept
    : merged;

  const ir =
    state.ir ?? (records.length > 0 ? infer(records, state.inferenceOptions ?? undefined) : null);

  const identityProposal: IngestResult["identityProposal"] =
    !state.identityConfig && !state.identityProposalDismissed
      ? proposeIdentityKey(records)
      : undefined;

  return { records, ir, identityProposal };
}

function byteDedup(records: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const r of records) {
    const h = canonicalHash(r);
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(r);
  }
  return out;
}
