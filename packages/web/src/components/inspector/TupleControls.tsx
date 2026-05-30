import type { Change, Path, TupleNode } from "@schemagen/core";
import { KindBadge } from "../ui/kind-badge";

export interface TupleControlsProps {
  node: TupleNode;
  path: Path;
  applyChange: (change: Change) => void;
}

// Tuple positional edits don't have a dedicated core op — they go through
// set-node. For v1 the inspector just enumerates the positions and points
// users at the child rows where they can pivot the kind.
export function TupleControls({ node }: TupleControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-medium text-muted-foreground">
        Positions <span className="ml-1 text-muted-foreground/60">({node.items.length})</span>
      </h3>
      <ul className="flex flex-col gap-1">
        {node.items.map((item, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: tuple positions are positional
            key={i}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/50 px-2 py-1 text-xs"
          >
            <span className="font-mono text-muted-foreground">[{i}]</span>
            <KindBadge kind={item.kind} />
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Click a position in the schema tree to edit that slot's type. Resizing the tuple itself is
        currently done via the escape hatch (Wrap in union / replace whole node).
      </p>
    </div>
  );
}
