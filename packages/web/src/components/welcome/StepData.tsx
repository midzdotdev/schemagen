// PR HH Step 1 — Your data. A "did the import work?" reassurance: record
// count, a scrollable peek at the first record, and a "Pick a different
// root path…" affordance when the original JSON had multiple candidate
// root arrays.

import { GitFork } from "lucide-react";
import { useState } from "react";
import { RootPickerModal } from "@/components/data-panel/RootPickerModal";
import { Button } from "@/components/ui/button";
import { JsonView } from "@/components/ui/json-view";
import { useStore } from "@/state/store";

export interface StepDataProps {
  onContinue: () => void;
}

export function StepData(_props: StepDataProps) {
  const records = useStore((s) => s.records);
  const setRecords = useStore((s) => s.setRecords);
  const pendingImport = useStore((s) => s.pendingImport);
  const count = records.length;
  const [pickerOpen, setPickerOpen] = useState(false);

  const firstRecord = records[0];

  return (
    <>
      <p className="text-sm text-foreground">
        <span className="font-semibold">{count.toLocaleString()}</span> record
        {count === 1 ? "" : "s"} imported.
      </p>

      {pendingImport && pendingImport.candidates.length > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
          <span className="text-[11px] text-muted-foreground">
            The original JSON had {pendingImport.candidates.length} candidate root arrays.
          </span>
          <Button
            variant="outline"
            size="xs"
            className="shrink-0 gap-1.5"
            onClick={() => setPickerOpen(true)}
          >
            <GitFork className="size-3" />
            Pick a different root…
          </Button>
        </div>
      )}

      {firstRecord !== undefined && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Sample record
          </span>
          <JsonView
            value={firstRecord}
            aria-label="Sample record"
            className="max-h-96 text-[11px]"
          />
        </div>
      )}

      {pendingImport && (
        <RootPickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          parsed={pendingImport.parsed}
          candidates={pendingImport.candidates}
          onPick={(picked) => {
            setRecords(picked);
            setPickerOpen(false);
          }}
        />
      )}
    </>
  );
}
