import { Check, ChevronsUpDown, FileUp, Plus, Trash2 } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { parseSessionBundle } from "@/lib/session-bundle";
import type { WorkspaceSummary } from "@/persistence/adapter";
import type { WorkspaceRow } from "@/persistence/db";
import {
  createAndSwitchWorkspace,
  deleteWorkspace,
  getCurrentAdapter,
  loadSessionBundle,
  switchWorkspace,
} from "@/state/init";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

// Switcher pill in the AppHeader. Shows the current workspace name + chevron;
// clicking opens a popover listing every workspace with its record/edit stats
// + a 'New workspace' shortcut.
export function WorkspaceSwitcher() {
  const currentId = useStore((s) => s.workspaceId);
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [summaries, setSummaries] = useState<Map<string, WorkspaceSummary>>(new Map());
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Refresh the list each time we open the popover so renames/creates in
  // other tabs (unlikely but cheap) are reflected.
  useEffect(() => {
    if (!open) return;
    const adapter = getCurrentAdapter();
    if (!adapter) return;
    setLoading(true);
    void adapter
      .listWorkspaces()
      .then(async (rows) => {
        const sorted = rows.slice().sort((a, b) => b.updatedAt - a.updatedAt);
        setWorkspaces(sorted);
        const sums = await adapter.summariseWorkspaces(sorted.map((r) => r.id));
        setSummaries(sums);
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function handleSwitch(id: string): Promise<void> {
    if (id === currentId) {
      setOpen(false);
      return;
    }
    await switchWorkspace(id);
    setOpen(false);
  }

  async function handleNew(): Promise<void> {
    await createAndSwitchWorkspace();
    setOpen(false);
  }

  function handleImportBundle(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    void file.text().then(async (raw) => {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "could not parse bundle file");
        return;
      }
      const result = parseSessionBundle(value);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      try {
        await loadSessionBundle(result.bundle);
        setOpen(false);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "could not import bundle");
      }
    });
  }

  async function handleDelete(ws: WorkspaceRow): Promise<void> {
    const name = ws.name.trim() || "this workspace";
    if (!window.confirm(`Delete "${name}"? Records, history, and identity config will be lost.`)) {
      return;
    }
    await deleteWorkspace(ws.id);
    // Refresh the list without closing the popover so the user can see the
    // updated state.
    const adapter = getCurrentAdapter();
    if (adapter) {
      const rows = await adapter.listWorkspaces();
      setWorkspaces(rows.slice().sort((a, b) => b.updatedAt - a.updatedAt));
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Switch workspace"
          title="Switch workspace"
          className={cn(
            "inline-flex size-5 items-center justify-center rounded text-muted-foreground",
            "hover:bg-accent hover:text-accent-foreground",
            "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          )}
        >
          <ChevronsUpDown className="size-3" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1" align="start">
        <div className="px-2 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Workspaces
        </div>
        {loading ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
        ) : (
          <ul aria-label="Workspaces" className="flex flex-col gap-0.5">
            {workspaces.map((ws) => {
              const isCurrent = ws.id === currentId;
              return (
                <li
                  key={ws.id}
                  className={cn(
                    "group/ws flex items-center rounded-sm transition-colors",
                    "hover:bg-accent",
                    isCurrent && "bg-accent/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void handleSwitch(ws.id)}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 py-1.5 text-left text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "size-3 shrink-0",
                          isCurrent ? "text-foreground" : "text-transparent",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {ws.name.trim() || "Untitled workspace"}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {formatAgo(ws.updatedAt)}
                      </span>
                    </span>
                    <span className="ml-5 truncate font-mono text-[10px] text-muted-foreground">
                      {formatSummary(summaries.get(ws.id))}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${ws.name.trim() || "workspace"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(ws);
                    }}
                    className="mr-1 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/15 hover:text-destructive group-hover/ws:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="my-1 h-px bg-border" aria-hidden />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs font-medium"
          onClick={() => void handleNew()}
        >
          <Plus className="size-3.5" />
          New workspace
        </Button>
        <label
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <input
            type="file"
            accept=".json,.session.json,application/json"
            onChange={handleImportBundle}
            className="sr-only"
            aria-label="Import session bundle file"
          />
          <FileUp className="size-3.5" />
          Import session bundle…
        </label>
        {importError && (
          <p
            role="alert"
            className="mx-1 mt-1 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive"
          >
            {importError}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function formatSummary(summary: WorkspaceSummary | undefined): string {
  if (!summary) return "—";
  const count = summary.recordCount.toLocaleString();
  if (summary.rootKind === null) return `${count} records · no schema yet`;
  return `${count} records · ${summary.rootKind}`;
}

// Short relative time. We don't pull in a full date lib for this.
function formatAgo(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < 60_000) return "just now";
  const min = Math.floor(delta / 60_000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  const mo = Math.floor(day / 30);
  return `${mo}mo`;
}
