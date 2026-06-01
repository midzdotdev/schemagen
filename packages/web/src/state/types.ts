// Store types. See docs/frontend-spec.md § "Persistence" + § "History".

import type {
  Change,
  IdentityConfig,
  IdentityProposal,
  InferOptions,
  IR,
  Path,
} from "@schemagen/core";

export type HistorySource = "manual" | "suggestion" | "inferred";

export interface HistoryEntry {
  seq: number;
  change: Change;
  inverse: Change;
  label: string;
  source: HistorySource;
  appliedAt: number;
  clientId: string;
}

// Active filter on the records list. Driven from the inspector / mismatch
// panel today; the architecture supports a user-typed filter later (same
// shape — caller computes label + indices).
export interface RecordsFilter {
  label: string;
  indices: number[];
}

export interface AppState {
  workspaceId: string;
  workspaceName: string;
  ir: IR | null;
  records: unknown[];
  history: { entries: HistoryEntry[]; cursor: number };
  selectedPath: Path | null;
  // X2: identity-key state
  identityConfig: IdentityConfig | null;
  identityProposal: IdentityProposal | null;
  identityProposalDismissed: boolean;
  // Records sidebar filter (from inspector / mismatch panel). null = show all.
  recordsFilter: RecordsFilter | null;
  // Z: workspace-scoped overrides for cold-start inference. Inert once `ir` is set.
  inferenceOptions: InferOptions | null;
}

export interface ApplyChangeOptions {
  label?: string;
  source?: HistorySource;
}
