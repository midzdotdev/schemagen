// Store types. See docs/frontend-spec.md § "Persistence" + § "History".

import type { Change, IdentityConfig, IdentityProposal, IR, Path } from "@schemagen/core";

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
  // X3: indices of records currently highlighted by findExamples.
  selectedRecordIndices: number[];
}

export interface ApplyChangeOptions {
  label?: string;
  source?: HistorySource;
}
