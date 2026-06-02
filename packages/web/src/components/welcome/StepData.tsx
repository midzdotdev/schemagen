// PR HH Step 1 — Your data.
//
// Shows the currently-selected records root (path + count) as a compact
// summary card with a 'Change root…' button that opens the existing
// RootPickerModal. The auto-pick from welcome-view ingest is shown as the
// initial selection; the user only sees the tree if they explicitly open
// the modal.

import { GitFork } from "lucide-react";
import { useMemo, useState } from "react";
import { RootPickerModal } from "@/components/data-panel/RootPickerModal";
import { Button } from "@/components/ui/button";
import { JsonTree } from "@/components/ui/json-tree";
import { WizardStepShell } from "@/components/welcome/WizardStepShell";
import { formatPath, type PickerCandidate, type PickerPath } from "@/lib/root-picker";
import { useStore } from "@/state/store";

export interface StepDataProps {
  onContinue: () => void;
  onSkip: () => void;
}

// Find which candidate path the current records came from. Uses reference
// equality first (cheap, common case) and falls back to length-matching.
function findSelectedPath(
  parsed: unknown,
  candidates: PickerCandidate[],
  records: unknown[],
): PickerPath | undefined {
  for (const c of candidates) {
    const v = atPath(parsed, c.path);
    if (v === records) return c.path;
  }
  for (const c of candidates) {
    if (c.recordCount === records.length) {
      const v = atPath(parsed, c.path);
      if (Array.isArray(v) && v.length === records.length) return c.path;
    }
  }
  return undefined;
}

function atPath(value: unknown, path: PickerPath): unknown {
  let cur: unknown = value;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof seg === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
      continue;
    }
    if (typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function StepData({ onContinue, onSkip }: StepDataProps) {
  const records = useStore((s) => s.records);
  const setRecords = useStore((s) => s.setRecords);
  const pendingImport = useStore((s) => s.pendingImport);
  const count = records.length;
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedPath = useMemo(
    () =>
      pendingImport
        ? findSelectedPath(pendingImport.parsed, pendingImport.candidates, records)
        : undefined,
    [pendingImport, records],
  );

  const firstRecord = records[0];
  const canChangeRoot = pendingImport !== null && pendingImport.candidates.length > 0;

  return (
    <WizardStepShell
      step={1}
      title="Your data"
      sub="Check the right records came through."
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {pendingImport ? (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Records root
          </span>
          <p className="text-[11px] text-muted-foreground">
            Where your records live in the JSON. Wrong here, wrong everywhere.
          </p>
          <div className="mt-1 flex items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-3 py-2">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <code className="truncate font-mono text-sm text-foreground">
                {selectedPath ? formatPath(selectedPath) : "(root)"}
              </code>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {count.toLocaleString()} record{count === 1 ? "" : "s"}
              </span>
            </div>
            <Button
              variant="outline"
              size="xs"
              className="shrink-0 gap-1.5"
              onClick={() => setPickerOpen(true)}
              disabled={!canChangeRoot}
            >
              <GitFork className="size-3" />
              Change
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground">
          <span className="font-semibold">{count.toLocaleString()}</span> record
          {count === 1 ? "" : "s"} imported.
        </p>
      )}

      {firstRecord !== undefined && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Sample record
          </span>
          <JsonTree value={firstRecord} ariaLabel="Sample record" className="mt-1" />
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
    </WizardStepShell>
  );
}
