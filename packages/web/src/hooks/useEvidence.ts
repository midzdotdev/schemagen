// useEvidence. Runs core's computeEvidence against the current records,
// memoized on (ir, records).
// See docs/frontend-spec.md § "Schema tree (center)".

import { computeEvidence, type EvidenceTree } from "@schemagen/core";
import { useMemo } from "react";
import { useStore } from "../state/store";

export function useEvidence(): EvidenceTree | null {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  return useMemo<EvidenceTree | null>(() => {
    if (!ir) return null;
    try {
      return computeEvidence(ir, records);
    } catch {
      return null;
    }
  }, [ir, records]);
}
