import { useEvidence } from "../../hooks/useEvidence";
import { useValidation } from "../../hooks/useValidation";
import { mismatchCountAtPath } from "../../state/selectors";
import { useStore } from "../../state/store";
import { NodeRow } from "./NodeRow";

export function SchemaTree() {
  const ir = useStore((s) => s.ir);
  const { mismatches } = useValidation();
  const evidence = useEvidence();

  if (!ir) {
    return (
      <div className="p-4 text-sm text-[--color-muted-foreground]">
        No schema yet. Import data to infer one.
      </div>
    );
  }

  const rootMismatches = mismatchCountAtPath(mismatches, []);

  return (
    <div role="tree" aria-label="Schema" className="flex flex-col gap-0.5 p-2">
      <NodeRow node={ir} path={[]} evidence={evidence} mismatchCount={rootMismatches} depth={0} />
      <MismatchOverlay mismatches={mismatches} />
    </div>
  );
}

// Inject mismatch counts into the tree by walking and re-emitting NodeRow
// with descendant counts. Since NodeRow already renders its own children,
// this stub is here for a future enhancement where badges are computed
// per descendant. For MVP we rely on the root count and per-row count of 0
// for descendants (Phase W5 wires this fully).
function MismatchOverlay(_props: { mismatches: import("@schemagen/core").Mismatch[] }) {
  return null;
}
