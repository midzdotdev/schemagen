import type { Mismatch } from "@schemagen/core";
import { CheckCircle2, ChevronDown, ChevronRight, CircleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useValidation } from "@/hooks/useValidation";
import { cn } from "@/lib/cn";
import { formatPath } from "@/state/selectors";
import { useStore } from "@/state/store";
import { EmptyState } from "../shell/EmptyState";
import { MismatchEntry } from "./MismatchEntry";

type Kind = Mismatch["kind"];

// Short labels shared with MismatchEntry's badge for visual consistency.
const KIND_LABELS: Record<Kind, string> = {
  "type-mismatch": "type",
  "literal-violation": "literal",
  "missing-required-field": "missing",
  "unexpected-field": "extra",
  "out-of-range": "range",
  "pattern-violation": "pattern",
  "format-violation": "format",
  "wrong-length": "length",
  "null-not-allowed": "null",
  "non-integer": "non-int",
  "duplicate-items": "dupes",
};

export function MismatchPanel() {
  const { ok, mismatches } = useValidation();
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);

  const [active, setActive] = useState<Set<Kind>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Visible counts per kind drive both the chip labels and the filter UI;
  // recomputed when the upstream set changes.
  const countsByKind = useMemo(() => {
    const out = new Map<Kind, number>();
    for (const m of mismatches) out.set(m.kind, (out.get(m.kind) ?? 0) + 1);
    return out;
  }, [mismatches]);

  const filtered = useMemo(() => {
    if (active.size === 0) return mismatches;
    return mismatches.filter((m) => active.has(m.kind));
  }, [mismatches, active]);

  const groups = useMemo(() => groupByPath(filtered), [filtered]);

  if (!ir || records.length === 0) {
    return (
      <EmptyState
        icon={<CircleAlert className="size-5" />}
        title="Nothing to validate yet"
        description="Import data first; schemagen will continuously check it against the schema and surface mismatches here."
      />
    );
  }

  if (ok) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="size-5 text-success" />}
        title="All records are valid"
        description={`All ${records.length.toLocaleString()} records match the current schema.`}
      />
    );
  }

  function toggleKind(kind: Kind): void {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function toggleGroup(key: string): void {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {filtered.length === mismatches.length ? (
            <>
              {mismatches.length} mismatch{mismatches.length === 1 ? "" : "es"} across{" "}
              {groups.length} path{groups.length === 1 ? "" : "s"}
            </>
          ) : (
            <>
              {filtered.length} of {mismatches.length} ·{" "}
              <button
                type="button"
                className="text-foreground underline-offset-2 hover:underline"
                onClick={() => setActive(new Set())}
              >
                clear filter
              </button>
            </>
          )}
        </p>
        <ul className="flex flex-wrap gap-1">
          {Array.from(countsByKind.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([kind, count]) => {
              const isActive = active.has(kind);
              return (
                <li key={kind}>
                  <button
                    type="button"
                    onClick={() => toggleKind(kind)}
                    aria-pressed={isActive}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
                      isActive
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card hover:border-foreground/50",
                    )}
                  >
                    {KIND_LABELS[kind]}
                    <span
                      className={cn(
                        "rounded-sm px-1 font-mono text-[10px] tabular-nums",
                        isActive ? "bg-background/20" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
      <ul aria-label="Mismatches" className="flex flex-col gap-3">
        {groups.map(({ pathKey, entries }) => {
          const isCollapsed = collapsed.has(pathKey);
          return (
            <li key={pathKey} className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => toggleGroup(pathKey)}
                aria-expanded={!isCollapsed}
                className="flex items-baseline gap-1.5 text-left hover:text-foreground"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-3 self-center text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-3 self-center text-muted-foreground" />
                )}
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {pathKey || "(root)"}
                </span>
                <span className="text-[10px] text-muted-foreground/60">{entries.length}</span>
              </button>
              {!isCollapsed && (
                <ul className="flex flex-col gap-1.5">
                  {entries.map((m, i) => (
                    <MismatchEntry
                      // biome-ignore lint/suspicious/noArrayIndexKey: mismatches don't carry stable IDs; positional within group is fine
                      key={i}
                      mismatch={m}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function groupByPath(mismatches: Mismatch[]): { pathKey: string; entries: Mismatch[] }[] {
  const map = new Map<string, Mismatch[]>();
  const order: string[] = [];
  for (const m of mismatches) {
    const key = formatPath(m.path);
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
      order.push(key);
    }
    arr.push(m);
  }
  return order.map((k) => ({ pathKey: k, entries: map.get(k) ?? [] }));
}
