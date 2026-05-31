import { useMemo } from "react";
import { useEvidence } from "@/hooks/useEvidence";
import { useValidation } from "@/hooks/useValidation";
import { buildMismatchIndex } from "@/state/selectors";
import { useStore } from "@/state/store";
import { computeFilter, emptyFilter } from "./filter";
import { NodeRow } from "./NodeRow";

export interface SchemaTreeProps {
  query?: string;
}

export function SchemaTree({ query = "" }: SchemaTreeProps) {
  const ir = useStore((s) => s.ir);
  const { mismatches } = useValidation();
  const evidence = useEvidence();
  const filter = useMemo(() => (ir ? computeFilter(ir, query) : emptyFilter()), [ir, query]);
  // Pre-index mismatches by path prefix so every NodeRow reads its count in
  // O(1). Without this, deep trees pay O(rows × mismatches) per render.
  const mismatchIndex = useMemo(() => buildMismatchIndex(mismatches), [mismatches]);

  if (!ir) return null;

  return (
    <div role="tree" aria-label="Schema" className="py-2">
      <NodeRow
        node={ir}
        path={[]}
        evidence={evidence}
        mismatchIndex={mismatchIndex}
        depth={0}
        filter={query ? filter : null}
      />
    </div>
  );
}
