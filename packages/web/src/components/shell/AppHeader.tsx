import { Download, FileJson, Github, Redo2, Undo2 } from "lucide-react";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { WorkspaceNameField } from "./WorkspaceNameField";

export interface AppHeaderProps {
  onExportClick: () => void;
}

export function AppHeader({ onExportClick }: AppHeaderProps) {
  const records = useStore((s) => s.records);
  const ir = useStore((s) => s.ir);
  const entries = useStore((s) => s.history.entries);
  const cursor = useStore((s) => s.history.cursor);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  const canUndo = cursor > 0;
  const canRedo = cursor < entries.length;
  const recordCount = records.length;

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <div className="flex items-center gap-1.5">
        <FileJson className="size-4 text-muted-foreground" aria-hidden />
        <h1 className="text-sm font-semibold tracking-tight text-muted-foreground">schemagen</h1>
      </div>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <WorkspaceNameField />

      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        {ir ? (
          <span className="truncate">
            <span className="text-foreground font-medium">{recordCount.toLocaleString()}</span>{" "}
            record{recordCount === 1 ? "" : "s"} ·{" "}
            <span className="text-foreground font-medium">{describeIR(ir)}</span>
          </span>
        ) : (
          <span>Empty · Import data to begin</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={!canUndo}
              onClick={() => undo()}
              aria-label="Undo"
            >
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo · ⌘Z</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={!canRedo}
              onClick={() => redo()}
              aria-label="Redo"
            >
              <Redo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo · ⌘⇧Z</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <a href="https://github.com/midzdotdev/schemagen" target="_blank" rel="noreferrer">
            <Github className="size-3.5" />
            <span className="sr-only">GitHub</span>
          </a>
        </Button>
        <Button size="sm" onClick={onExportClick} disabled={!ir}>
          <Download className="size-3.5" />
          Export
        </Button>
      </div>
    </header>
  );
}

function describeIR(ir: { kind: string }): string {
  // Brief noun phrase for the workspace strip — keep it scannable.
  if (ir.kind === "object") return "object schema";
  if (ir.kind === "array") return "array schema";
  if (ir.kind === "union") return "union schema";
  return `${ir.kind} schema`;
}
