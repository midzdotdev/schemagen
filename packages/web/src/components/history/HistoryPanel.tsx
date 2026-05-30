import type { Change, Path } from "@schemagen/core";
import { ArrowRight, History, Redo2, Undo2 } from "lucide-react";
import { formatPath } from "@/state/selectors";
import { useStore } from "@/state/store";
import { EmptyState } from "../shell/EmptyState";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export function HistoryPanel() {
  const entries = useStore((s) => s.history.entries);
  const cursor = useStore((s) => s.history.cursor);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setSelectedPath = useStore((s) => s.setSelectedPath);

  const canUndo = cursor > 0;
  const canRedo = cursor < entries.length;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<History className="size-5" />}
        title="No history yet"
        description="Every edit you make to the schema lands here and can be undone."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-1">
        <Button size="xs" variant="outline" disabled={!canUndo} onClick={() => undo()}>
          <Undo2 className="size-3" />
          Undo
        </Button>
        <Button size="xs" variant="outline" disabled={!canRedo} onClick={() => redo()}>
          <Redo2 className="size-3" />
          Redo
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {cursor} / {entries.length}
        </span>
      </div>
      <ol aria-label="History" className="flex flex-col gap-1">
        {entries.map((entry, idx) => {
          const isApplied = idx < cursor;
          const isCurrent = idx === cursor - 1;
          const path = pathOf(entry.change);
          return (
            <li
              key={entry.seq}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                isCurrent
                  ? "border-info/40 bg-info/8"
                  : isApplied
                    ? "border-border bg-card"
                    : "border-dashed border-border/50 bg-transparent opacity-60"
              }`}
            >
              <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                {entry.seq}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={`truncate ${
                    isApplied ? "text-foreground" : "text-muted-foreground line-through"
                  }`}
                  title={entry.label}
                >
                  {entry.label}
                </span>
                {path && (
                  <button
                    type="button"
                    onClick={() => setSelectedPath(path)}
                    className="group/path flex items-center gap-1 text-left text-[10px] text-muted-foreground hover:text-foreground"
                    title="Jump to this node"
                  >
                    <ArrowRight className="size-2.5 opacity-0 transition-opacity group-hover/path:opacity-100" />
                    <code className="truncate font-mono">{formatPath(path) || "(root)"}</code>
                  </button>
                )}
              </div>
              <Badge variant="muted" className="shrink-0">
                {entry.source}
              </Badge>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Extract the path the change applies to. batch has no single path.
function pathOf(change: Change): Path | null {
  if (change.op === "batch") return null;
  return change.path;
}
