import { Redo, Undo } from "lucide-react";
import { useStore } from "../../state/store";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export function HistoryPanel() {
  const entries = useStore((s) => s.history.entries);
  const cursor = useStore((s) => s.history.cursor);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  const canUndo = cursor > 0;
  const canRedo = cursor < entries.length;

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={!canUndo} onClick={() => undo()}>
          <Undo className="mr-1 h-3 w-3" />
          Undo
        </Button>
        <Button size="sm" variant="outline" disabled={!canRedo} onClick={() => redo()}>
          <Redo className="mr-1 h-3 w-3" />
          Redo
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-[--color-muted-foreground]">No history yet.</p>
      ) : (
        <ol aria-label="History" className="flex flex-col gap-1">
          {entries.map((entry, idx) => {
            const isApplied = idx < cursor;
            return (
              <li
                key={entry.seq}
                className="flex items-center gap-2 rounded border border-[--color-border] p-2 text-xs"
              >
                <span className="font-mono text-[10px] text-[--color-muted-foreground]">
                  {entry.seq}
                </span>
                <span className={isApplied ? "" : "text-[--color-muted-foreground] line-through"}>
                  {entry.label}
                </span>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {entry.source}
                </Badge>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
