// PR HH Step 2 — Identity key. Inline IdentityPicker (no modal hop) with a
// live dedup preview underneath. Continue commits the choice and advances;
// with no selection the primary button flips to "Skip identity".

import { dedupeByIdentity, dedupeByteIdentical, proposeIdentityKey } from "@schemagen/core";
import { useMemo, useState } from "react";
import { IdentityPicker } from "@/components/identity/IdentityPicker";
import { WizardStepShell } from "@/components/welcome/WizardStepShell";
import { pathKeyToCorePath } from "@/lib/field-stats";
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

  // Pre-seed with core's proposeIdentityKey result — users hit Continue if
  // the suggestion is correct; otherwise they uncheck and pick something else.
  const [selected, setSelected] = useState<string[]>(() => {
    const proposal = proposeIdentityKey(records);
    if (!proposal) return [];
    return proposal.fields.map((p) => p.join("."));
  });

  // Dedup preview — recomputes on every selection change. dedupeByIdentity
  // already returns the kept + dropped split we need; for the no-selection
  // case we fall back to the byte-dedup floor that the ingest pipeline runs.
  const preview = useMemo(() => {
    if (selected.length === 0) return null;
    const fields = selected.map(pathKeyToCorePath);
    return dedupeByIdentity(records, { fields });
  }, [records, selected]);
  const byteFloor = useMemo(
    () => (selected.length === 0 ? dedupeByteIdentical(records) : null),
    [records, selected.length],
  );

  function handleContinue() {
    if (selected.length > 0) {
      const fields = selected.map(pathKeyToCorePath);
      setIdentityConfig({ fields });
    }
    onContinue();
  }

  const continueLabel = selected.length > 0 ? "Continue" : "Skip identity";

  return (
    <WizardStepShell
      step={2}
      title="Identity key"
      sub="Tell schemagen what makes a record unique. Without this, future imports pile up and the schema starts seeing duplicates as new data."
      continueLabel={continueLabel}
      onContinue={handleContinue}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Fields
        </span>
        <p className="text-[11px] text-muted-foreground">
          Pick a field (or fields) that identifies the same record across imports — schemagen uses
          it to merge duplicates so the schema stays accurate as your data grows.
        </p>
        <div className="mt-1">
          <IdentityPicker selected={selected} onSelectedChange={setSelected} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Dedup preview
        </span>
        <p className="text-[11px] text-muted-foreground">What your current choice would do.</p>
        <div
          role="status"
          aria-live="polite"
          className="mt-1 rounded-md border border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground"
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
      </div>

      <p className="rounded-md border border-dashed border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
        Even without an identity key, schemagen always collapses records that are byte-identical
        (same fields and values, regardless of key order) — re-imports of the same payload won't
        pile up.
      </p>
    </WizardStepShell>
  );
}
