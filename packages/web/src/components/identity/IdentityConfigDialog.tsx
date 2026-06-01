// Settings dialog for IdentityConfig. See docs/frontend-spec.md § "Identity-key suggestion".

import type { IdentityConfig } from "@schemagen/core";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  compositeUniqueness,
  computeFieldStats,
  type FieldStat,
  isPrimitiveKind,
} from "@/lib/field-stats";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export interface IdentityConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional seed values when opened from the suggestion banner.
  seedFields?: string[];
}

const MODES: { value: IdentityConfig["onDuplicate"]; label: string; description: string }[] = [
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
  {
    value: "keep-all",
    label: "Keep all",
    description:
      "No logical dedup. Useful when entities mutate and the schema should see every version.",
  },
];

export function IdentityConfigDialog({
  open,
  onOpenChange,
  seedFields,
}: IdentityConfigDialogProps) {
  const current = useStore((s) => s.identityConfig);
  const records = useStore((s) => s.records);
  const setIdentityConfig = useStore((s) => s.setIdentityConfig);

  // Selected fields as flat single-segment names. Composite-key support is
  // limited to top-level field combinations (matches core's propose scope).
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<IdentityConfig["onDuplicate"]>("replace");
  const [droppedCount, setDroppedCount] = useState<number | null>(null);

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

  useEffect(() => {
    if (!open) return;
    if (current) {
      setSelected(current.fields.map((p) => p.join(".")));
      setMode(current.onDuplicate);
    } else if (seedFields?.length) {
      setSelected(seedFields);
      setMode("replace");
    } else {
      setSelected([]);
      setMode("replace");
    }
    setDroppedCount(null);
  }, [open, current, seedFields]);

  function toggle(name: string): void {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
    setDroppedCount(null);
  }

  function handleApply(): void {
    if (selected.length === 0) return;
    // Each entry becomes a path. Dot-notation is interpreted at the entry level
    // so the rare "I typed nested.path" round-trip still works for stored
    // configs hydrated from workspace bundles.
    const fields = selected.map((p) => p.split(".").filter(Boolean));
    const result = setIdentityConfig({ fields, onDuplicate: mode });
    setDroppedCount(result.droppedCount);
    if (result.droppedCount === 0) onOpenChange(false);
  }

  function handleClear(): void {
    setIdentityConfig(null);
    onOpenChange(false);
  }

  const noRecords = records.length === 0;
  const noPrimitiveFields = !noRecords && stats.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Identity-key settings" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Identity key</DialogTitle>
          <DialogDescription>
            Logically dedupe records on a key. Future imports of the same entity collapse instead of
            piling up.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-foreground">Fields</span>
              {selected.length > 1 && (
                <span className="text-[11px] text-muted-foreground">
                  Composite uniqueness:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      composite >= 0.95 ? "text-success" : "text-warning",
                    )}
                  >
                    {(composite * 100).toFixed(0)}%
                  </span>
                </span>
              )}
            </div>
            {noRecords ? (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Import some records first — schemagen needs a sample to compute uniqueness per
                field.
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
                        // The accessible name is the field, so screen readers
                        // hear "id, checked" not "id, 100% unique 100% present, checked".
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
              Toggle one field for a simple key, or several for a composite key (uniqueness of the
              tuple is shown above).
            </p>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-foreground">On duplicate</legend>
            {MODES.map((m) => (
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
                  onChange={() => setMode(m.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{m.label}</span>
                  <span className="ml-1.5 text-muted-foreground">{m.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {droppedCount !== null && droppedCount > 0 && (
            <p className="rounded-md bg-warning/15 px-2 py-1.5 text-xs text-warning">
              Applying this config would drop {droppedCount} records. Click Apply again to confirm.
            </p>
          )}
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!current}>
            Remove identity key
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply} disabled={selected.length === 0}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
