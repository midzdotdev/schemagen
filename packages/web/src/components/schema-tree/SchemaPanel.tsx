import { FileSearch, GitBranch, RefreshCw, Search, X } from "lucide-react";
import { useUIPref } from "@/hooks/useUIPrefs";
import { useValidation } from "@/hooks/useValidation";
import { useStore } from "@/state/store";
import { EmptyState } from "../shell/EmptyState";
import { PaneHeader } from "../shell/PaneHeader";
import { useUIShell } from "../shell/UIShell";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { GenerateSchemaCard } from "./GenerateSchemaCard";
import { SchemaTree } from "./SchemaTree";

export function SchemaPanel() {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const workspaceId = useStore((s) => s.workspaceId);
  const { mismatches } = useValidation();
  const { openModal } = useUIShell();
  // Persist the filter query per workspace so it survives reload.
  const [query, setQuery] = useUIPref(workspaceId, "schemaFilter");

  if (!ir) {
    // PR AA — once records arrive, schema inference is the user's explicit
    // next step. Surface the CTA + inference-options summary in place of the
    // "no schema yet" empty state.
    if (records.length > 0) {
      return (
        <>
          <PaneHeader title="Schema" icon={<GitBranch className="size-3.5" />} />
          <div className="min-h-0 flex-1 overflow-auto">
            <GenerateSchemaCard />
          </div>
        </>
      );
    }
    return (
      <>
        <PaneHeader title="Schema" icon={<GitBranch className="size-3.5" />} />
        <div className="min-h-0 flex-1">
          <EmptyState
            icon={<FileSearch className="size-5" />}
            title="No schema yet"
            description="Paste or drop JSON into the data pane on the left to begin."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PaneHeader
        title="Schema"
        icon={<GitBranch className="size-3.5" />}
        actions={
          <>
            {records.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="gap-1.5"
                onClick={() => openModal("reinfer")}
              >
                <RefreshCw className="size-3" />
                Re-infer
              </Button>
            )}
            {mismatches.length > 0 ? (
              <Badge variant="destructive" className="normal-case">
                {mismatches.length} mismatch{mismatches.length === 1 ? "" : "es"}
              </Badge>
            ) : records.length > 0 ? (
              <Badge variant="success" className="normal-case">
                All records valid
              </Badge>
            ) : null}
          </>
        }
      />
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-background px-3 py-2">
        <Search className="size-3.5 text-muted-foreground" aria-hidden />
        <input
          type="text"
          aria-label="Filter schema fields"
          placeholder="Filter fields…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear filter"
            onClick={() => setQuery("")}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <SchemaTree query={query} />
      </div>
    </>
  );
}
