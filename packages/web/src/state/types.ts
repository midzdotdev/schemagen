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

// Active filter on the records list. The chip renders `path` in monospace
// (the field path is code-like) and `predicate` in regular weight (it reads
// as English: "is present", "= 42", "satisfies /^abc/"). Together they
// answer "which records am I looking at?". Driven from the inspector /
// mismatch panel today; same shape supports a user-typed filter later.
//
// Vocabulary: avoid "match" / "matches" in predicate phrases — the
// "Mismatches" surface in the rest of the app refers to schema-validation
// failures, an unrelated concept. Reach for "satisfies", "is", "=", etc.
export interface RecordsFilter {
  path: string;
  predicate: string;
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
