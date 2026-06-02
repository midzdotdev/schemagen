// PR HH Step 1 — Your data.
//
// When the import had multiple candidate root paths, render the JSON tree
// picker inline so the user can change which array became the records.
// The currently-selected path is highlighted in the tree.
//
// Below the picker (or alone, for single-candidate imports), show the
// sample record JSON for a "did the import work?" reassurance.

import { useMemo } from "react";
import { RootPickerTree } from "@/components/data-panel/RootPickerTree";
import { JsonView } from "@/components/ui/json-view";
import type { PickerCandidate, PickerPath } from "@/lib/root-picker";
import { useStore } from "@/state/store";

export interface StepDataProps {
  onContinue: () => void;
}

// Reverse-lookup of the selected path: find the candidate whose value matches
// the current records (by reference). Falls back to deep-equality on length
// if reference identity changed (unlikely but defensive).
function findSelectedPath(
  parsed: unknown,
  candidates: PickerCandidate[],
  records: unknown[],
): PickerPath | undefined {
  for (const c of candidates) {
    const v = atPath(parsed, c.path);
    if (v === records) return c.path;
  }
  // Fallback: match by recordCount; the first candidate whose count matches
  // is good enough for highlighting.
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

export function StepData(_props: StepDataProps) {
  const records = useStore((s) => s.records);
  const setRecords = useStore((s) => s.setRecords);
  const pendingImport = useStore((s) => s.pendingImport);
  const count = records.length;

  const selectedPath = useMemo(
    () =>
      pendingImport
        ? findSelectedPath(pendingImport.parsed, pendingImport.candidates, records)
        : undefined,
    [pendingImport, records],
  );

  const firstRecord = records[0];
  const showTree = pendingImport !== null && pendingImport.candidates.length > 0;

  return (
    <>
      <p className="text-sm text-foreground">
        <span className="font-semibold">{count.toLocaleString()}</span> record
        {count === 1 ? "" : "s"} imported.
      </p>

      {showTree && pendingImport && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Records root
            </span>
            <span className="text-[11px] text-muted-foreground">
              {pendingImport.candidates.length === 1
                ? "Only one array of objects found."
                : `${pendingImport.candidates.length} candidate arrays — pick the one to use.`}
            </span>
          </div>
          <RootPickerTree
            parsed={pendingImport.parsed}
            candidates={pendingImport.candidates}
            selectedPath={selectedPath}
            onPick={(picked) => setRecords(picked)}
          />
        </div>
      )}

      {firstRecord !== undefined && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Sample record
          </span>
          <JsonView value={firstRecord} aria-label="Sample record" className="text-[11px]" />
        </div>
      )}
    </>
  );
}
