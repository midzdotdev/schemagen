// PR HH Step 2 — Identity key. Inline IdentityPicker (no modal hop) with a
// live dedup preview underneath. Continue commits the choice and advances;
// with no selection the primary button flips to "Skip identity".

import { dedupeByIdentity, dedupeByteIdentical } from "@schemagen/core";
import { useMemo, useState } from "react";
import { IdentityPicker } from "@/components/identity/IdentityPicker";
import { WizardStepShell } from "@/components/welcome/WizardStepShell";
import { useStore } from "@/state/store";

export interface StepIdentityProps {
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

function FieldList({ fields }: { fields: string[] }) {
  return (
    <>
      {fields.map((f, i) => (
        <span key={f}>
          {i > 0 && " + "}
          <code className="rounded bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
            {f}
          </code>
        </span>
      ))}
    </>
  );
}

export function StepIdentity({ onContinue, onBack, onSkip }: StepIdentityProps) {
  const records = useStore((s) => s.records);
  const setIdentityConfig = useStore((s) => s.setIdentityConfig);

  const [selected, setSelected] = useState<string[]>([]);

  // Dedup preview — recomputes on every selection change. dedupeByIdentity
  // already returns the kept + dropped split we need; for the no-selection
  // case we fall back to the byte-dedup floor that the ingest pipeline runs.
  const preview = useMemo(() => {
    if (selected.length === 0) return null;
    const fields = selected.map((p) => p.split(".").filter(Boolean));
    return dedupeByIdentity(records, { fields });
  }, [records, selected]);
  const byteFloor = useMemo(
    () => (selected.length === 0 ? dedupeByteIdentical(records) : null),
    [records, selected.length],
  );

  function handleContinue() {
    if (selected.length > 0) {
      const fields = selected.map((p) => p.split(".").filter(Boolean));
      setIdentityConfig({ fields });
    }
    onContinue();
  }

  const continueLabel = selected.length > 0 ? "Continue" : "Skip identity";

  return (
    <WizardStepShell
      step={2}
      title="Identity key"
      sub="How schemagen recognises the same record across imports. Pick a stable primitive field so re-imports dedup correctly."
      continueLabel={continueLabel}
      onContinue={handleContinue}
      onBack={onBack}
      onSkip={onSkip}
    >
      <IdentityPicker selected={selected} onSelectedChange={setSelected} />

      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground"
      >
        {preview ? (
          <>
            Using <FieldList fields={selected} />, your {records.length.toLocaleString()} records
            would yield{" "}
            <span className="font-medium text-foreground">
              {preview.kept.length.toLocaleString()} unique
            </span>{" "}
            ({preview.dropped.length.toLocaleString()} duplicate
            {preview.dropped.length === 1 ? "" : "s"}).
          </>
        ) : (
          <>
            <span className="text-foreground">No identity key selected.</span> Byte-identical
            re-imports will still collapse{" "}
            {byteFloor && byteFloor.dropped.length > 0 ? (
              <>
                — your {records.length.toLocaleString()} records would yield{" "}
                <span className="font-medium text-foreground">
                  {byteFloor.kept.length.toLocaleString()} unique
                </span>{" "}
                ({byteFloor.dropped.length.toLocaleString()} byte-identical duplicate
                {byteFloor.dropped.length === 1 ? "" : "s"}).
              </>
            ) : (
              <>
                — your current {records.length.toLocaleString()} records have no exact byte
                duplicates.
              </>
            )}
          </>
        )}
      </div>
    </WizardStepShell>
  );
}
