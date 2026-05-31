import {
  Download,
  FileJson,
  Github,
  Keyboard,
  KeyRound,
  Redo2,
  RotateCcw,
  Sliders,
  Undo2,
} from "lucide-react";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ThemeToggle } from "./ThemeToggle";
import { useUIShell } from "./UIShell";
import { WorkspaceNameField } from "./WorkspaceNameField";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export function AppHeader() {
  const records = useStore((s) => s.records);
  const ir = useStore((s) => s.ir);
  const entries = useStore((s) => s.history.entries);
  const cursor = useStore((s) => s.history.cursor);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const { openModal } = useUIShell();

  const canUndo = cursor > 0;
  const canRedo = cursor < entries.length;
  const hasWorkspace = ir !== null || records.length > 0;

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <div className="flex items-center gap-1.5">
        <FileJson className="size-4 text-muted-foreground" aria-hidden />
        <h1 className="text-sm font-semibold tracking-tight text-muted-foreground">schemagen</h1>
      </div>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      {/*
        Two affordances on the workspace identity:
        - Name field is click-to-rename the current workspace.
        - Switcher (chevron) opens a popover to switch / create.
      */}
      <div className="flex items-center gap-0.5">
        <WorkspaceNameField />
        <WorkspaceSwitcher />
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Identity key settings"
              onClick={() => openModal("identity")}
            >
              <KeyRound className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Identity key settings</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Inference options"
              onClick={() => openModal("inference-options")}
            >
              <Sliders className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inference options</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Reset workspace"
              disabled={!hasWorkspace}
              onClick={() => openModal("reset")}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset workspace</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Keyboard shortcuts"
              onClick={() => openModal("shortcuts")}
            >
              <Keyboard className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard shortcuts · ?</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ThemeToggle />
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <a href="https://github.com/midzdotdev/schemagen" target="_blank" rel="noreferrer">
            <Github className="size-3.5" />
            <span className="sr-only">GitHub</span>
          </a>
        </Button>
        <Button size="sm" onClick={() => openModal("export")} disabled={!ir}>
          <Download className="size-3.5" />
          Export
        </Button>
      </div>
    </header>
  );
}
