import type { Change, Path, RecordNode } from "@schemagen/core";
import { KindBadge } from "../ui/kind-badge";

export interface RecordControlsProps {
  node: RecordNode;
  path: Path;
  applyChange: (change: Change) => void;
}

export function RecordControls({ node }: RecordControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-medium text-muted-foreground">Values</h3>
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/50 px-2 py-1.5 text-xs">
        <span className="text-muted-foreground">Value type</span>
        <KindBadge kind={node.values.kind} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Records are open-keyed objects. Select <code className="font-mono">values</code> in the
        schema tree to edit the value type for every entry.
      </p>
    </div>
  );
}
