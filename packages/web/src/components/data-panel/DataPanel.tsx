import { infer } from "@schemagen/core";
import { useState } from "react";
import { canonicalHash } from "../../lib/canonical-hash";
import type { PickerCandidate } from "../../lib/root-picker";
import { useStore } from "../../state/store";
import { ImportArea } from "./ImportArea";
import { RecordList } from "./RecordList";
import { RootPickerModal } from "./RootPickerModal";

interface PickerState {
  open: boolean;
  parsed: unknown;
  candidates: PickerCandidate[];
}

export function DataPanel() {
  const records = useStore((s) => s.records);
  const setRecords = useStore((s) => s.setRecords);
  const setIR = useStore((s) => s.setIR);
  const ir = useStore((s) => s.ir);

  const [picker, setPicker] = useState<PickerState>({
    open: false,
    parsed: null,
    candidates: [],
  });

  function commitRecords(newRecords: unknown[]): void {
    // Whole-record byte dedup against existing + new records.
    const seen = new Set<string>();
    const next: unknown[] = [];
    for (const r of [...records, ...newRecords]) {
      const h = canonicalHash(r);
      if (seen.has(h)) continue;
      seen.add(h);
      next.push(r);
    }
    setRecords(next);
    if (!ir) {
      // First import: infer the schema.
      setIR(infer(next));
    }
  }

  function handleNeedsPicker(parsed: unknown, candidates: PickerCandidate[]): void {
    setPicker({ open: true, parsed, candidates });
  }

  function handlePick(picked: unknown[]): void {
    setPicker((p) => ({ ...p, open: false }));
    commitRecords(picked);
  }

  return (
    <div className="flex h-full flex-col gap-3 py-3">
      <ImportArea onRecords={commitRecords} onNeedsPicker={handleNeedsPicker} />
      <RecordList records={records} />
      <RootPickerModal
        open={picker.open}
        onOpenChange={(open) => setPicker((p) => ({ ...p, open }))}
        parsed={picker.parsed}
        candidates={picker.candidates}
        onPick={handlePick}
      />
    </div>
  );
}
