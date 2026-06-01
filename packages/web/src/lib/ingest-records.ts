// Pure record-ingestion pipeline. Given the existing workspace state + a
// batch of incoming records, decide the next records + identityProposal
// values. The DataPanel handler used to do all of this inline; extracting it
// makes the rules testable in isolation and keeps the component focused on UI.
//
// Rules, in order:
//   1. Concat existing + new.
//   2. Dedup the merged set:
//      - If an identityConfig is set, run dedupeByIdentity. (No byte-dedup
//        on top — identity-key dedup already collapses byte-identical
//        records via their shared key.)
//      - Otherwise, run dedupeByteIdentical so a re-import of the same
//        payload doesn't pile up.
//   3. Preserve the existing IR if there is one. PR AA stops auto-infer on
//      cold-start — the user calls `inferSchema()` explicitly after reviewing
//      records and any inference-option overrides.
//   4. If no identityConfig + the user hasn't dismissed the suggestion,
//      recompute proposeIdentityKey against the merged records. Result is
//      whatever proposeIdentityKey returns (null clears the banner).

import type { IdentityConfig, IdentityProposal, InferOptions, IR } from "@schemagen/core";
import { dedupeByIdentity, dedupeByteIdentical, proposeIdentityKey } from "@schemagen/core";

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
  const merged = [...state.records, ...incoming];
  const records = state.identityConfig
    ? dedupeByIdentity(merged, state.identityConfig).kept
    : dedupeByteIdentical(merged).kept;

  const ir = state.ir;

  const identityProposal: IngestResult["identityProposal"] =
    !state.identityConfig && !state.identityProposalDismissed
      ? proposeIdentityKey(records)
      : undefined;

  return { records, ir, identityProposal };
}
