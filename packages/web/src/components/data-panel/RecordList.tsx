import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
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
  const selected = useStore((s) => s.selectedRecordIndices);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const parentRef = useRef<HTMLDivElement>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  // When findExamples highlights a record, scroll to the first highlighted
  // index. scrollToIndex is cheap and respects the alignment we ask for.
  useEffect(() => {
    if (selected.length === 0) return;
    const first = selected[0];
    if (first === undefined) return;
    virtualizer.scrollToIndex(first, { align: "auto", behavior: "smooth" });
  }, [selected, virtualizer]);

  if (records.length === 0) return null;

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <ul
        aria-label="Records"
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((vRow) => {
          const i = vRow.index;
          const r = records[i];
          const isSelected = selectedSet.has(i);
          const preview = previewFor(r);
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: records are positional, not keyed
              key={i}
              data-testid={isSelected ? "selected-record" : undefined}
              className={cn(
                "absolute left-0 top-0 w-full border-b border-border/60 transition-colors",
                isSelected && "bg-info/10",
              )}
              style={{ height: ROW_HEIGHT, transform: `translateY(${vRow.start}px)` }}
            >
              <button
                type="button"
                onClick={() => setDetailIndex(i)}
                className={cn(
                  "flex h-full w-full items-baseline gap-2 px-3 py-2 text-left text-xs transition-colors",
                  "hover:bg-accent/50",
                  isSelected && "hover:bg-info/15",
                )}
              >
                <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                  {i + 1}
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
