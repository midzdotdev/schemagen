import { FileSearch, GitBranch, Search, X } from "lucide-react";
import { useUIPref } from "@/hooks/useUIPrefs";
import { useValidation } from "@/hooks/useValidation";
import { useStore } from "@/state/store";
import { EmptyState } from "../shell/EmptyState";
import { PaneHeader } from "../shell/PaneHeader";
import { Badge } from "../ui/badge";
import { SchemaTree } from "./SchemaTree";

export function SchemaPanel() {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const workspaceId = useStore((s) => s.workspaceId);
  const { mismatches } = useValidation();
  // Persist the filter query per workspace so it survives reload.
  const [query, setQuery] = useUIPref(workspaceId, "schemaFilter");

  if (!ir) {
    return (
      <>
        <PaneHeader title="Schema" icon={<GitBranch className="size-3.5" />} />
        <div className="min-h-0 flex-1">
          <EmptyState
            icon={<FileSearch className="size-5" />}
            title="No schema yet"
            description="Paste or drop JSON into the data pane on the left. schemagen will infer a strict first cut."
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
        description={`Inferred from ${records.length.toLocaleString()} record${records.length === 1 ? "" : "s"}`}
        actions={
          mismatches.length > 0 ? (
            <Badge variant="destructive" className="normal-case">
              {mismatches.length} mismatch{mismatches.length === 1 ? "" : "es"}
            </Badge>
          ) : records.length > 0 ? (
            <Badge variant="success" className="normal-case">
              All records valid
            </Badge>
          ) : null
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
