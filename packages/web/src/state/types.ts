// Store types. See docs/frontend-spec.md § "Persistence" + § "History".

import type { Change, IR, IdentityConfig, IdentityProposal, Path } from "@schemagen/core";

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
  ir: IR | null;
  records: unknown[];
  history: { entries: HistoryEntry[]; cursor: number };
  selectedPath: Path | null;
  // X2: identity-key state
  identityConfig: IdentityConfig | null;
  identityProposal: IdentityProposal | null;
  identityProposalDismissed: boolean;
}

export interface ApplyChangeOptions {
  label?: string;
  source?: HistorySource;
}
