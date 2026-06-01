import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import { useStore } from "@/state/store";
import { RecordDetail } from "./RecordDetail";

export interface RecordListProps {
  records: unknown[];
}

// Fixed row height keeps virtualization simple — each preview is a single-line
// truncated string at the same text size. If we ever wrap, replace with
// dynamic measurement (estimateSize + measureElement).
const ROW_HEIGHT = 32;

export function RecordList({ records }: RecordListProps) {
  const filter = useStore((s) => s.recordsFilter);
  const parentRef = useRef<HTMLDivElement>(null);
  // detailIndex is the original index into `records`, not the visible row.
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  // Visible set = filter.indices (in order) when active, else all records.
  // We keep the original-record index alongside each entry so the visible
  // row still labels itself as "record 47" rather than "row 1 of filtered".
  const visible = useMemo<{ index: number; record: unknown }[]>(() => {
    if (!filter) return records.map((record, index) => ({ index, record }));
    return filter.indices
      .filter((i) => i >= 0 && i < records.length)
      .map((i) => ({ index: i, record: records[i] }));
  }, [records, filter]);

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (visible.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-muted-foreground">
        {filter ? "No records match this filter." : "No records in this workspace."}
      </p>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <ul
        aria-label="Records"
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((vRow) => {
          const entry = visible[vRow.index];
          if (!entry) return null;
          const preview = previewFor(entry.record);
          return (
            <li
              key={entry.index}
              className="absolute left-0 top-0 w-full border-b border-border/60"
              style={{ height: ROW_HEIGHT, transform: `translateY(${vRow.start}px)` }}
            >
              <button
                type="button"
                onClick={() => setDetailIndex(entry.index)}
                className="flex h-full w-full items-baseline gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent/50"
              >
                <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                  {entry.index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {preview.label && (
                    <span className="font-medium text-muted-foreground">{preview.label}: </span>
                  )}
                  <span className="font-mono text-foreground">{preview.value}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <RecordDetail
        open={detailIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDetailIndex(null);
        }}
        index={detailIndex}
      />
    </div>
  );
}

const IDENTIFIER_KEYS = ["id", "name", "title", "login", "key", "slug", "email", "username"];

interface Preview {
  label: string | null;
  value: string;
}

function previewFor(value: unknown): Preview {
  if (value === null || value === undefined) return { label: null, value: "null" };
  if (typeof value !== "object") return { label: null, value: String(value) };
  if (Array.isArray(value)) return { label: null, value: `[${value.length} items]` };
  const obj = value as Record<string, unknown>;
  for (const k of IDENTIFIER_KEYS) {
    if (obj[k] !== undefined && isScalar(obj[k])) {
      return { label: k, value: formatScalar(obj[k]) };
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (isScalar(v)) return { label: k, value: formatScalar(v) };
  }
  return { label: null, value: `{ ${Object.keys(obj).length} fields }` };
}

function isScalar(v: unknown): v is string | number | boolean | null {
  return v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

function formatScalar(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") {
    const trimmed = v.length > 60 ? `${v.slice(0, 60)}…` : v;
    return JSON.stringify(trimmed);
  }
  return String(v);
}
