// PR II — Identity section of the onboarding review page (was StepIdentity).
//
// Inline IdentityPicker (no modal hop) with a live dedup preview underneath.
// This is a controlled component: `selected` is owned by WizardHost so the
// Generate handler can commit it exactly once via setIdentityConfig (that store
// action destructively rewrites records, so it must not fire on every toggle).
// The preview here is computed locally and has no store side-effects.
//
// See docs/plans/pr-ii-onboarding-review-page.md.

import { dedupeByIdentity, dedupeByteIdentical } from "@schemagen/core";
import { useMemo, useState } from "react";
import { IdentityPicker } from "@/components/identity/IdentityPicker";
import { cn } from "@/lib/cn";
import { compositeUniqueness, pathKeyToCorePath } from "@/lib/field-stats";
import { useStore } from "@/state/store";

export interface IdentitySectionProps {
  selected: string[];
  onSelectedChange: (next: string[]) => void;
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

export function IdentitySection({ selected, onSelectedChange }: IdentitySectionProps) {
  const records = useStore((s) => s.records);

  // Default: only top-level primitives — the common case. Power users opting
  // for a nested or array-indexed key tick the box to expose the full tree.
  const [showNested, setShowNested] = useState(false);

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
  const uniqueness = useMemo(
    () => (selected.length > 0 ? compositeUniqueness(records, selected) : 0),
    [records, selected],
  );

  return (
    <section aria-labelledby="identity-h" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2
          id="identity-h"
          className="font-semibold text-foreground text-sm uppercase tracking-wider"
        >
          Identity (optional)
        </h2>
        <p className="text-muted-foreground text-xs">
          What makes a record unique. Otherwise re-imports look like new data.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          Fields
        </span>
        <p className="text-[11px] text-muted-foreground">
          A field (or composite) that identifies the same record across imports.
        </p>
        <label className="mt-1 flex w-fit cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            checked={showNested}
            onChange={(e) => setShowNested(e.target.checked)}
            className="size-3.5 cursor-pointer accent-info"
          />
          Show nested fields
        </label>
        <div className="mt-1">
          <IdentityPicker
            selected={selected}
            onSelectedChange={onSelectedChange}
            showAll={showNested}
            showCompositeUniqueness={false}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          Summary
        </span>
        <div
          role="status"
          aria-live="polite"
          className="mt-1 flex flex-col gap-1.5 rounded-md border border-border bg-card/40 px-3 py-2 text-xs"
        >
          {preview ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-foreground">
                  Key: <FieldList fields={selected} />
                </span>
                <span className="shrink-0 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  {selected.length === 1 ? "single field" : `composite · ${selected.length} fields`}
                </span>
              </div>
              <div className="text-muted-foreground">
                <span
                  className={cn(
                    "font-medium",
                    uniqueness >= 0.95 ? "text-success" : "text-warning",
                  )}
                >
                  {(uniqueness * 100).toFixed(0)}% unique
                </span>{" "}
                {uniqueness >= 0.95
                  ? "— reliably tells records apart."
                  : "— some records share key values."}
              </div>
              <div className="text-muted-foreground">
                Your {records.length.toLocaleString()} records →{" "}
                <span className="font-medium text-foreground">
                  {preview.kept.length.toLocaleString()} distinct
                </span>
                {preview.dropped.length > 0
                  ? `, ${preview.dropped.length.toLocaleString()} duplicate${
                      preview.dropped.length === 1 ? "" : "s"
                    } dropped (newest kept).`
                  : ", no duplicates."}
              </div>
            </>
          ) : (
            <>
              <span className="text-foreground">No identity key.</span>
              <span className="text-muted-foreground">
                Re-imports stay as distinct records.{" "}
                {byteFloor && byteFloor.dropped.length > 0
                  ? `${byteFloor.dropped.length.toLocaleString()} byte-identical duplicate${
                      byteFloor.dropped.length === 1 ? "" : "s"
                    } still collapse.`
                  : "Byte-identical records still collapse automatically."}
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
