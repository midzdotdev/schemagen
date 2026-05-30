import { useEvidence } from "../../hooks/useEvidence";
import { useValidation } from "../../hooks/useValidation";
import { mismatchCountAtPath } from "../../state/selectors";
import { useStore } from "../../state/store";
import { NodeRow } from "./NodeRow";

export function SchemaTree() {
  const ir = useStore((s) => s.ir);
  const { mismatches } = useValidation();
  const evidence = useEvidence();

  if (!ir) return null;

  const rootMismatches = mismatchCountAtPath(mismatches, []);

  return (
    <div role="tree" aria-label="Schema" className="py-2">
      <NodeRow node={ir} path={[]} evidence={evidence} mismatchCount={rootMismatches} depth={0} />
    </div>
  );
}
