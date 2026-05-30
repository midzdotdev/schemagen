import type { Mismatch } from "@schemagen/core";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useMemo } from "react";
import { useValidation } from "../../hooks/useValidation";
import { formatPath } from "../../state/selectors";
import { useStore } from "../../state/store";
import { EmptyState } from "../shell/EmptyState";
import { MismatchEntry } from "./MismatchEntry";

export function MismatchPanel() {
  const { ok, mismatches } = useValidation();
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);

  const groups = useMemo(() => groupByPath(mismatches), [mismatches]);

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

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {mismatches.length} mismatch{mismatches.length === 1 ? "" : "es"} across {groups.length}{" "}
        path{groups.length === 1 ? "" : "s"}
      </p>
      <ul aria-label="Mismatches" className="flex flex-col gap-3">
        {groups.map(({ pathKey, entries }) => (
          <li key={pathKey} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {pathKey || "(root)"}
              </span>
              <span className="text-[10px] text-muted-foreground/60">{entries.length}</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {entries.map((m, i) => (
                <MismatchEntry
                  // biome-ignore lint/suspicious/noArrayIndexKey: mismatches don't carry stable IDs; positional within group is fine
                  key={i}
                  mismatch={m}
                />
              ))}
            </ul>
          </li>
        ))}
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
