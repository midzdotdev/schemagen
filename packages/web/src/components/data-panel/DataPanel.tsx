import { Database, FileText, Inbox } from "lucide-react";
import { useState } from "react";
import { ingestRecords } from "@/lib/ingest-records";
import type { PickerCandidate } from "@/lib/root-picker";
import { useStore } from "@/state/store";
import { IdentitySuggestion } from "../identity/IdentitySuggestion";
import { EmptyState } from "../shell/EmptyState";
import { PaneHeader } from "../shell/PaneHeader";
import { Badge } from "../ui/badge";
import { DropZone } from "./DropZone";
import { ImportArea } from "./ImportArea";
import { RecordList } from "./RecordList";
import { RootPickerModal } from "./RootPickerModal";
import { SampleLoader } from "./SampleLoader";

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
  const identityConfig = useStore((s) => s.identityConfig);
  const setIdentityProposal = useStore((s) => s.setIdentityProposal);
  const dismissed = useStore((s) => s.identityProposalDismissed);

  const [picker, setPicker] = useState<PickerState>({
    open: false,
    parsed: null,
    candidates: [],
  });

  function commitRecords(newRecords: unknown[]): void {
    const result = ingestRecords(
      { records, ir, identityConfig, identityProposalDismissed: dismissed },
      newRecords,
    );
    setRecords(result.records);
    // Only set IR on the cold-start transition; once it exists the user owns it.
    if (!ir && result.ir) setIR(result.ir);
    // undefined = "don't touch the proposal" (e.g. config is set or dismissed).
    if (result.identityProposal !== undefined) setIdentityProposal(result.identityProposal);
  }

  function handleNeedsPicker(parsed: unknown, candidates: PickerCandidate[]): void {
    setPicker({ open: true, parsed, candidates });
  }

  function handlePick(picked: unknown[]): void {
    setPicker((p) => ({ ...p, open: false }));
    commitRecords(picked);
  }

  return (
    <DropZone onRecords={commitRecords} onNeedsPicker={handleNeedsPicker}>
      <div className="flex h-full min-h-0 flex-col">
        <PaneHeader
          title="Data"
          icon={<Database className="size-3.5" />}
          actions={
            records.length > 0 ? (
              <Badge variant="outline" className="font-mono normal-case">
                {records.length.toLocaleString()}
              </Badge>
            ) : null
          }
        />
        <IdentitySuggestion />
        <ImportArea onRecords={commitRecords} onNeedsPicker={handleNeedsPicker} />
        {records.length === 0 && (
          <SampleLoader onRecords={commitRecords} onNeedsPicker={handleNeedsPicker} />
        )}
        <div className="flex min-h-0 flex-1 flex-col border-t border-border">
          <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border bg-muted/20 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <FileText className="size-3" />
            Records
            {records.length > 0 && <span className="text-foreground/60">· {records.length}</span>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {records.length === 0 ? (
              <EmptyState
                icon={<Inbox className="size-5" />}
                title="No records"
                description="Paste JSON above, drag a file here, or import a session bundle."
              />
            ) : (
              <RecordList records={records} />
            )}
          </div>
        </div>
        <RootPickerModal
          open={picker.open}
          onOpenChange={(open) => setPicker((p) => ({ ...p, open }))}
          parsed={picker.parsed}
          candidates={picker.candidates}
          onPick={handlePick}
        />
      </div>
    </DropZone>
  );
}
