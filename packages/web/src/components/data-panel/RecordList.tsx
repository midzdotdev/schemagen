import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useStore } from "../../state/store";
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

  if (records.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul aria-label="Records" className="flex flex-col">
        {records.map((r, i) => {
          const isSelected = selectedSet.has(i);
          const preview = previewFor(r);
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: records are positional, not keyed
              key={i}
              ref={isSelected && firstSelectedRef.current === null ? firstSelectedRef : undefined}
              data-testid={isSelected ? "selected-record" : undefined}
              className={cn(
                "border-b border-border/60 transition-colors last:border-b-0",
                isSelected && "bg-info/10",
              )}
            >
              <button
                type="button"
                onClick={() => setDetailIndex(i)}
                className={cn(
                  "flex w-full items-baseline gap-2 px-3 py-2 text-left text-xs transition-colors",
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
