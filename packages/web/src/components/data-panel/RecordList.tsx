import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useStore } from "../../state/store";
import { Badge } from "../ui/badge";
import { RecordDetail } from "./RecordDetail";

export interface RecordListProps {
  records: unknown[];
}

export function RecordList({ records }: RecordListProps) {
  const selected = useStore((s) => s.selectedRecordIndices);
  const selectedSet = new Set(selected);
  const firstSelectedRef = useRef<HTMLLIElement>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selected.length > 0) {
      firstSelectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selected]);

  if (records.length === 0) {
    return (
      <p className="px-3 text-xs text-[--color-muted-foreground]">
        No records yet. Import some JSON to begin.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1 px-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[--color-muted-foreground]">Records</span>
        <Badge variant="outline">{records.length}</Badge>
      </div>
      <ul aria-label="Records" className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
        {records.map((r, i) => {
          const isSelected = selectedSet.has(i);
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: records are positional, not keyed
              key={i}
              ref={isSelected && firstSelectedRef.current === null ? firstSelectedRef : undefined}
              data-testid={isSelected ? "selected-record" : undefined}
              className={cn(
                "rounded border border-[--color-border] text-xs",
                isSelected && "border-[--color-accent] bg-[--color-muted]",
              )}
            >
              <button
                type="button"
                onClick={() => setDetailIndex(i)}
                className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-[--color-muted]"
              >
                <span className="w-8 shrink-0 text-right font-mono text-[10px] text-[--color-muted-foreground]">
                  #{i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[--color-foreground]">
                  {previewFor(r)}
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

function previewFor(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  const obj = value as Record<string, unknown>;
  for (const k of IDENTIFIER_KEYS) {
    if (obj[k] !== undefined && isScalar(obj[k])) {
      return `${k}: ${formatScalar(obj[k])}`;
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (isScalar(v)) {
      return `${k}: ${formatScalar(v)}`;
    }
  }
  return `{ ${Object.keys(obj).length} fields }`;
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
