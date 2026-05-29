import { dedupeByIdentity, infer, proposeIdentityKey } from "@schemagen/core";
import { useState } from "react";
import { canonicalHash } from "../../lib/canonical-hash";
import type { PickerCandidate } from "../../lib/root-picker";
import { useStore } from "../../state/store";
import { IdentitySuggestion } from "../identity/IdentitySuggestion";
import { DropZone } from "./DropZone";
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
  const identityConfig = useStore((s) => s.identityConfig);
  const identityProposal = useStore((s) => s.identityProposal);
  const setIdentityProposal = useStore((s) => s.setIdentityProposal);
  const dismissed = useStore((s) => s.identityProposalDismissed);

  const [picker, setPicker] = useState<PickerState>({
    open: false,
    parsed: null,
    candidates: [],
  });

  function commitRecords(newRecords: unknown[]): void {
    // Byte-dedup against existing + new records by canonical hash.
    const seen = new Set<string>();
    let merged: unknown[] = [];
    for (const r of [...records, ...newRecords]) {
      const h = canonicalHash(r);
      if (seen.has(h)) continue;
      seen.add(h);
      merged.push(r);
    }

    // Logical dedup if an identity config is set.
    if (identityConfig) {
      const { kept } = dedupeByIdentity(merged, identityConfig);
      merged = kept;
    }

    setRecords(merged);

    if (!ir) {
      // First import: infer the schema.
      setIR(infer(merged));
    }

    // Propose an identity key if we don't already have a config + the dev
    // hasn't dismissed the prompt for this workspace.
    if (!identityConfig && !dismissed && !identityProposal) {
      const proposal = proposeIdentityKey(merged);
      if (proposal) setIdentityProposal(proposal);
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
    <DropZone onRecords={commitRecords} onNeedsPicker={handleNeedsPicker}>
      <div className="flex h-full flex-col gap-3 py-3">
        <ImportArea onRecords={commitRecords} onNeedsPicker={handleNeedsPicker} />
        <IdentitySuggestion />
        <RecordList records={records} />
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
