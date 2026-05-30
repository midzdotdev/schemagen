import { FileSearch, GitBranch } from "lucide-react";
import { useValidation } from "../../hooks/useValidation";
import { useStore } from "../../state/store";
import { EmptyState } from "../shell/EmptyState";
import { PaneHeader } from "../shell/PaneHeader";
import { Badge } from "../ui/badge";
import { SchemaTree } from "./SchemaTree";

export function SchemaPanel() {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const { mismatches } = useValidation();

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
      <div className="min-h-0 flex-1 overflow-auto">
        <SchemaTree />
      </div>
    </>
  );
}
