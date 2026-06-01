// "Show records" — sets a records-sidebar filter for the records whose value
// at the selected path exists (and optionally satisfies a predicate). See
// docs/frontend-spec.md § "Schema tree".

import { findExamples } from "@schemagen/core";
import { Search } from "lucide-react";
import { useShowRecordsFilter } from "@/hooks/useShowRecordsFilter";
import { formatPath } from "@/state/selectors";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";

export interface ExamplesButtonProps {
  predicate?: (value: unknown) => boolean;
  label?: string;
  // Filter chip text when a custom predicate is in use (e.g. "format: email").
  // Falls back to the field path alone when omitted.
  filterLabel?: string;
  size?: "default" | "sm" | "xs";
}

export function ExamplesButton({
  predicate,
  label = "Show records",
  filterLabel,
  size = "xs",
}: ExamplesButtonProps) {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const selectedPath = useStore((s) => s.selectedPath);
  const showRecords = useShowRecordsFilter();

  if (!ir || !selectedPath) return null;

  return (
    <Button
      size={size}
      variant="ghost"
      className="text-muted-foreground"
      onClick={() => {
        const refs = findExamples(ir, records, selectedPath, predicate, records.length);
        const path = formatPath(selectedPath);
        showRecords({
          label: filterLabel ?? path,
          indices: refs.map((r) => r.index),
        });
      }}
    >
      <Search className="size-3" />
      {label}
    </Button>
  );
}
