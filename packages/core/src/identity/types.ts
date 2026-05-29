// Identity dedup types. See docs/core-spec.md § "Identity".

import type { Path } from "../ir/types";

export interface IdentityConfig {
  fields: Path[];
  onDuplicate: "replace" | "skip" | "keep-all";
}

export interface IdentityProposal {
  fields: Path[];
  confidence: {
    uniqueness: number;
    presence: number;
  };
  rationale: string;
}
