// PR HH Step 1 — Your data. A "did the import work?" reassurance: record
// count, top-level shape, primitive/compound field breakdown, and the
// first record under a collapsed disclosure.

import { useMemo } from "react";
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
  const count = records.length;

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
  const firstRecordJson = useMemo(() => {
    if (firstRecord === undefined) return "";
    try {
      return JSON.stringify(firstRecord, null, 2);
    } catch {
      return "<could not stringify>";
    }
  }, [firstRecord]);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-card/40 p-4 sm:grid-cols-2">
        <Stat label="Records" value={`${count.toLocaleString()} records`} />
        <Stat label="Shape" value={shape.label} />
        {shape.recordsAreObjects && stats.length > 0 && (
          <>
            <Stat label="Primitive fields" value={`${primitiveFields} primitive fields`} />
            <Stat label="Compound fields" value={`${compoundFields} compound (object/array)`} />
          </>
        )}
      </div>

      {firstRecord !== undefined && (
        <details className="group rounded-lg border border-border bg-card/40">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent/40 group-open:border-b group-open:border-border">
            Show first record
          </summary>
          <pre className="max-h-96 overflow-auto bg-background px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground">
            {firstRecordJson}
          </pre>
        </details>
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
