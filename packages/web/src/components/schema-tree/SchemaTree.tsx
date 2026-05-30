import { useMemo } from "react";
import { useEvidence } from "@/hooks/useEvidence";
import { useValidation } from "@/hooks/useValidation";
import { mismatchCountAtPath } from "@/state/selectors";
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

  if (!ir) return null;

  const rootMismatches = mismatchCountAtPath(mismatches, []);

  return (
    <div role="tree" aria-label="Schema" className="py-2">
      <NodeRow
        node={ir}
        path={[]}
        evidence={evidence}
        mismatchCount={rootMismatches}
        depth={0}
        filter={query ? filter : null}
      />
    </div>
  );
}
