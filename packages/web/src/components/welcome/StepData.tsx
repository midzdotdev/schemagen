// PR HH Step 1 — Your data. A "did the import work?" reassurance: record
// count, top-level shape, primitive/compound field breakdown, and a
// scrollable peek at the first record.
//
// When the original import had multiple candidate root paths (e.g. nested
// objects with arrays at several levels), surfaces a "Pick a different
// root path…" affordance — re-opens the same RootPickerModal that fired
// during welcome-view import.

import { GitFork } from "lucide-react";
import { useMemo, useState } from "react";
import { RootPickerModal } from "@/components/data-panel/RootPickerModal";
import { Button } from "@/components/ui/button";
import { JsonView } from "@/components/ui/json-view";
import { computeFieldStats } from "@/lib/field-stats";
import { useStore } from "@/state/store";

export interface StepDataProps {
  onContinue: () => void;
}

interface TopLevelShape {
  // Human-readable label like "Array of 5 objects" or "Array of 3 strings".
  label: string;
  // Whether every observed record is an object — i.e. whether the field
  // breakdown will have anything to say.
  recordsAreObjects: boolean;
}

function describeShape(records: unknown[]): TopLevelShape {
  const count = records.length;
  if (count === 0) {
    return { label: "Empty array", recordsAreObjects: false };
  }
  const kinds = new Set<string>();
  for (const r of records) kinds.add(classify(r));
  const noun =
    kinds.size === 1
      ? // biome-ignore lint/style/noNonNullAssertion: size === 1 guarantees a value
        pluralise(kinds.values().next().value!, count)
      : "mixed values";
  return {
    label: `Array of ${count.toLocaleString()} ${noun}`,
    recordsAreObjects: kinds.size === 1 && kinds.has("object"),
  };
}

function classify(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value;
}

function pluralise(noun: string, count: number): string {
  const word =
    noun === "object"
      ? "object"
      : noun === "array"
        ? "array"
        : noun === "string"
          ? "string"
          : noun === "number"
            ? "number"
            : noun === "boolean"
              ? "boolean"
              : noun;
  return count === 1 ? word : `${word}s`;
}

export function StepData(_props: StepDataProps) {
  const records = useStore((s) => s.records);
  const setRecords = useStore((s) => s.setRecords);
  const pendingImport = useStore((s) => s.pendingImport);
  const count = records.length;
  const [pickerOpen, setPickerOpen] = useState(false);

  const shape = useMemo(() => describeShape(records), [records]);
  const stats = useMemo(
    () => (shape.recordsAreObjects ? computeFieldStats(records) : []),
    [records, shape.recordsAreObjects],
  );
  const primitiveFields = useMemo(
    () => stats.filter((s) => ["string", "number", "boolean"].includes(s.kind)).length,
    [stats],
  );
  const compoundFields = stats.length - primitiveFields;

  const firstRecord = records[0];

  return (
    <>
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2">
        <Stat label="Records" value={`${count.toLocaleString()} records`} />
        <Stat label="Shape" value={shape.label} />
        {shape.recordsAreObjects && stats.length > 0 && (
          <>
            <Stat label="Simple fields" value={`${primitiveFields} (string, number, boolean)`} />
            <Stat label="Nested fields" value={`${compoundFields} (object, array)`} />
          </>
        )}
      </div>

      {pendingImport && pendingImport.candidates.length > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
          <span className="text-[11px] text-muted-foreground">
            The original JSON had {pendingImport.candidates.length} candidate root arrays.
          </span>
          <Button
            variant="outline"
            size="xs"
            className="gap-1.5 shrink-0"
            onClick={() => setPickerOpen(true)}
          >
            <GitFork className="size-3" />
            Pick a different root…
          </Button>
        </div>
      )}

      {firstRecord !== undefined && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            First record
          </span>
          <JsonView
            value={firstRecord}
            aria-label="First record"
            className="max-h-96 text-[11px]"
          />
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
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
