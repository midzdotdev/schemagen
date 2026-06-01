// Post-IR records sidebar. Two modes:
//
// 1. Collapsed (default): a thin vertical strip — Database icon + record
//    count. The whole strip is clickable and expands the panel.
// 2. Expanded: pane header + virtualised RecordList. The header's chevron
//    collapses the panel back to a strip.
//
// Renders the strip OR the full body — never both. The parent layout
// (ThreePaneLayoutPostIR + App) swaps between a strip-prefixed two-pane
// layout and a three-pane resizable group based on the same UIPref this
// component reads.

import { ChevronLeft, ChevronRight, Database } from "lucide-react";
import { useStore } from "@/state/store";
import { PaneHeader } from "../shell/PaneHeader";
import { Button } from "../ui/button";
import { RecordList } from "./RecordList";

export interface RecordsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function RecordsSidebar({ collapsed, onToggle }: RecordsSidebarProps) {
  const records = useStore((s) => s.records);
  const count = records.length;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Expand records sidebar (${count} record${count === 1 ? "" : "s"})`}
        aria-expanded="false"
        className="group flex h-full w-10 shrink-0 flex-col items-center gap-2 border-r border-border bg-card/40 py-3 transition-colors hover:bg-accent/60"
      >
        <Database
          className="size-4 text-muted-foreground group-hover:text-foreground"
          aria-hidden
        />
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground group-hover:text-foreground">
          {count.toLocaleString()}
        </span>
        <ChevronRight
          className="mt-auto size-3 text-muted-foreground/60 group-hover:text-foreground"
          aria-hidden
        />
      </button>
    );
  }

  return (
    <>
      <PaneHeader
        title="Records"
        icon={<Database className="size-3.5" />}
        description={`${count.toLocaleString()} stored`}
        actions={
          <Button
            variant="ghost"
            size="xs"
            className="gap-1 text-muted-foreground"
            onClick={onToggle}
            aria-label="Collapse records sidebar"
            aria-expanded="true"
          >
            <ChevronLeft className="size-3" />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        {count === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            No records in this workspace.
          </p>
        ) : (
          <RecordList records={records} />
        )}
      </div>
    </>
  );
}
