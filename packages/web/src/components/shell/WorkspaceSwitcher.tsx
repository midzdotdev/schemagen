import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { WorkspaceRow } from "@/persistence/db";
import { createAndSwitchWorkspace, getCurrentAdapter, switchWorkspace } from "@/state/init";
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
  const [loading, setLoading] = useState(false);

  // Refresh the list each time we open the popover so renames/creates in
  // other tabs (unlikely but cheap) are reflected.
  useEffect(() => {
    if (!open) return;
    const adapter = getCurrentAdapter();
    if (!adapter) return;
    setLoading(true);
    void adapter
      .listWorkspaces()
      .then((rows) => setWorkspaces(rows.slice().sort((a, b) => b.updatedAt - a.updatedAt)))
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
                <li key={ws.id}>
                  <button
                    type="button"
                    onClick={() => void handleSwitch(ws.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isCurrent && "bg-accent/60",
                    )}
                  >
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
      </PopoverContent>
    </Popover>
  );
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
