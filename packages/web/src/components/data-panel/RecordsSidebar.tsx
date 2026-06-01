// Post-IR records sidebar. Two modes:
//
// 1. Collapsed (default): a thin vertical strip — Database icon + record
//    count. The whole strip is clickable and expands the panel.
// 2. Expanded: pane header + (optional) active-filter chip + virtualised
//    RecordList. The header's chevron collapses back to a strip.

import { ChevronLeft, ChevronRight, Database, Filter, X } from "lucide-react";
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
  const filter = useStore((s) => s.recordsFilter);
  const setRecordsFilter = useStore((s) => s.setRecordsFilter);
  const count = records.length;
  const filteredCount = filter?.indices.length ?? count;

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
        {filter && (
          <Filter
            className="size-3 text-primary"
            aria-label="Filter active"
          />
        )}
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
        description={
          filter
            ? `${filteredCount.toLocaleString()} of ${count.toLocaleString()} matched`
            : `${count.toLocaleString()} stored`
        }
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
      {filter && (
        <div
          role="status"
          aria-live="polite"
          className="flex shrink-0 items-center gap-2 border-b border-border bg-primary/5 px-3 py-1.5"
        >
          <Filter className="size-3 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
            {filter.label}
          </span>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
            {filteredCount.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => setRecordsFilter(null)}
            aria-label="Clear records filter"
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
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
