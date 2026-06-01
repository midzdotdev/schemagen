import { findExamples, type Mismatch } from "@schemagen/core";
import { Search } from "lucide-react";
import { useState } from "react";
import { useShowRecordsFilter } from "@/hooks/useShowRecordsFilter";
import { cn } from "@/lib/cn";
import { formatPath } from "@/state/selectors";
import { useStore } from "@/state/store";
import { Badge, type badgeVariants } from "../ui/badge";
import { Button } from "../ui/button";

export interface MismatchEntryProps {
  mismatch: Mismatch;
}

export function MismatchEntry({ mismatch }: MismatchEntryProps) {
  const apply = useStore((s) => s.applyChange);
  const setSelectedPath = useStore((s) => s.setSelectedPath);
  const showRecords = useShowRecordsFilter();
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const [error, setError] = useState<string | null>(null);

  function handleShowRecords(): void {
    if (!ir) return;
    const target = mismatch.actual.value;
    const refs = findExamples(
      ir,
      records,
      mismatch.path,
      (v) => Object.is(v, target) || (target !== undefined && v === target),
      records.length,
    );
    showRecords({
      label: `${formatPath(mismatch.path)} = ${previewValue(target)}`,
      indices: refs.map((r) => r.index),
    });
  }

  const severity = severityFor(mismatch.kind);

  return (
    <li className="rounded-lg border border-border bg-card p-2.5 shadow-sm transition-colors hover:border-border/80">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn("mt-1 size-1.5 shrink-0 rounded-full", severityDotClasses(severity))}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="truncate text-left font-mono text-xs text-foreground hover:underline"
              onClick={() => setSelectedPath(mismatch.path)}
              title={formatPath(mismatch.path) || "(root)"}
            >
              {formatPath(mismatch.path) || "(root)"}
            </button>
            <Badge variant={severity} className="shrink-0">
              {humanKind(mismatch.kind)}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Expected <span className="font-mono text-foreground/80">{mismatch.expected}</span>; got{" "}
            <span className="font-mono text-foreground/80">{mismatch.actual.description}</span>
            {mismatch.recordIndex !== undefined && (
              <span className="ml-1 text-muted-foreground/70">
                · record #{mismatch.recordIndex + 1}
              </span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {mismatch.suggestions.map((s) => (
              <Button
                key={s.label}
                size="xs"
                variant="outline"
                title={s.rationale}
                onClick={() => {
                  try {
                    setError(null);
                    apply(s.change, { source: "suggestion", label: s.label });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "could not apply");
                  }
                }}
              >
                {s.label}
              </Button>
            ))}
            <Button
              size="xs"
              variant="ghost"
              className="text-muted-foreground"
              onClick={handleShowRecords}
            >
              <Search className="size-3" />
              Show records
            </Button>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-1.5 rounded bg-destructive/10 px-1.5 py-1 text-[10px] text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

type Severity = NonNullable<Parameters<typeof badgeVariants>[0]>["variant"];

function severityFor(kind: Mismatch["kind"]): Severity {
  switch (kind) {
    case "type-mismatch":
    case "null-not-allowed":
    case "missing-required-field":
      return "destructive";
    case "literal-violation":
    case "out-of-range":
    case "non-integer":
    case "wrong-length":
    case "duplicate-items":
      return "warning";
    case "unexpected-field":
    case "pattern-violation":
    case "format-violation":
      return "info";
    default:
      return "muted";
  }
}

function severityDotClasses(severity: Severity): string {
  switch (severity) {
    case "destructive":
      return "bg-destructive";
    case "warning":
      return "bg-warning";
    case "info":
      return "bg-info";
    case "success":
      return "bg-success";
    default:
      return "bg-muted-foreground";
  }
}

function humanKind(kind: Mismatch["kind"]): string {
  switch (kind) {
    case "type-mismatch":
      return "type";
    case "literal-violation":
      return "literal";
    case "missing-required-field":
      return "missing";
    case "unexpected-field":
      return "extra";
    case "out-of-range":
      return "range";
    case "pattern-violation":
      return "pattern";
    case "format-violation":
      return "format";
    case "wrong-length":
      return "length";
    case "null-not-allowed":
      return "null";
    case "non-integer":
      return "non-int";
    case "duplicate-items":
      return "dupes";
  }
}

function previewValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    const trimmed = value.length > 32 ? `${value.slice(0, 32)}…` : value;
    return JSON.stringify(trimmed);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
