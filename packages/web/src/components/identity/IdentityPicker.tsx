// Identity-key picker body — extracted from IdentityConfigDialog so the same
// UI can render inline inside the new-workspace wizard while the dialog form
// keeps its own modal entry point.
//
// Owns no decision authority: it surfaces the field stats, selection, and
// dedup preview, then hands the user's intent up via onChange.

import type { IdentityConfig } from "@schemagen/core";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  compositeUniqueness,
  computeFieldStats,
  type FieldStat,
  isPrimitiveKind,
} from "@/lib/field-stats";
import { useStore } from "@/state/store";

export interface IdentityPickerProps {
  selected: string[];
  mode: IdentityConfig["onDuplicate"];
  onSelectedChange: (next: string[]) => void;
  onModeChange: (next: IdentityConfig["onDuplicate"]) => void;
  // Mention the right next-step copy in the helper text. The dialog says
  // "Apply"; the wizard says "Continue".
  applyVerb?: string;
}

export const ON_DUPLICATE_MODES: {
  value: IdentityConfig["onDuplicate"];
  label: string;
  description: string;
}[] = [
  {
    value: "replace",
    label: "Replace",
    description:
      "Newest wins. Best for snapshot-style imports where you want the current entity set.",
  },
  {
    value: "skip",
    label: "Skip",
    description: "First occurrence wins. Useful when you want to lock in the original version.",
  },
];

export function IdentityPicker({
  selected,
  mode,
  onSelectedChange,
  onModeChange,
}: IdentityPickerProps) {
  const records = useStore((s) => s.records);

  const allStats = useMemo(() => computeFieldStats(records), [records]);
  // Filter to primitives — objects/arrays/mixed values can't reliably anchor
  // identity (JSON-string equality is fragile; mixed runtime types compare
  // unpredictably). Null-only fields are present-zero anyway.
  const stats = useMemo<FieldStat[]>(
    () => allStats.filter((s) => isPrimitiveKind(s.kind)),
    [allStats],
  );
  const composite = useMemo(
    () => (selected.length > 0 ? compositeUniqueness(records, selected) : 0),
    [records, selected],
  );

  const noRecords = records.length === 0;
  const noPrimitiveFields = !noRecords && stats.length === 0;

  function toggle(name: string): void {
    onSelectedChange(
      selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name],
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-foreground">Fields</span>
          {selected.length > 1 && (
            <span className="text-[11px] text-muted-foreground">
              Composite uniqueness:{" "}
              <span
                className={cn("font-medium", composite >= 0.95 ? "text-success" : "text-warning")}
              >
                {(composite * 100).toFixed(0)}%
              </span>
            </span>
          )}
        </div>
        {noRecords ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Import some records first — schemagen needs a sample to compute uniqueness per field.
          </p>
        ) : noPrimitiveFields ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            No primitive fields available — identity keys must be strings, numbers, or booleans.
          </p>
        ) : (
          <ul
            aria-label="Available identity fields"
            className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border border-border bg-card/40 p-1.5"
          >
            {stats.map((s) => {
              const isSelected = selected.includes(s.name);
              const isUnique = s.uniqueness >= 0.95;
              const isPresent = s.presence >= 0.95;
              return (
                <li key={s.name}>
                  <label
                    aria-label={s.name}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                      "hover:bg-accent",
                      isSelected && "bg-info/10 hover:bg-info/15",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(s.name)}
                      className="size-3.5 shrink-0 cursor-pointer accent-info"
                    />
                    <code className="min-w-0 flex-1 truncate font-mono text-foreground">
                      {s.name}
                    </code>
                    <span
                      title="Field type"
                      className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {s.kind}
                    </span>
                    <span
                      title="Uniqueness"
                      className={cn(
                        "shrink-0 font-mono tabular-nums",
                        isUnique ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      {(s.uniqueness * 100).toFixed(0)}% unique
                    </span>
                    <span
                      title="Presence"
                      className={cn(
                        "shrink-0 font-mono tabular-nums",
                        isPresent ? "text-foreground" : "text-warning",
                      )}
                    >
                      {(s.presence * 100).toFixed(0)}% present
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">
          Toggle one field for a simple key, or several for a composite key (uniqueness of the tuple
          is shown above).
        </p>
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
          Either way, schemagen always collapses records that are byte-identical (same fields and
          values, regardless of key order) — re-imports of the same payload won't pile up.
        </p>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-foreground">On duplicate</legend>
        {ON_DUPLICATE_MODES.map((m) => (
          <label
            key={m.value}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs transition-colors",
              mode === m.value
                ? "border-ring/40 bg-accent/60"
                : "border-border hover:border-border/80 hover:bg-accent/30",
            )}
          >
            <input
              type="radio"
              name="onDuplicate"
              value={m.value}
              checked={mode === m.value}
              onChange={() => onModeChange(m.value)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{m.label}</span>
              <span className="ml-1.5 text-muted-foreground">{m.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
