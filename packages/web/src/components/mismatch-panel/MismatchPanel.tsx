import type { Mismatch } from "@schemagen/core";
import { useMemo } from "react";
import { useValidation } from "../../hooks/useValidation";
import { formatPath } from "../../state/selectors";
import { MismatchEntry } from "./MismatchEntry";

export function MismatchPanel() {
  const { ok, mismatches } = useValidation();

  const groups = useMemo(() => groupByPath(mismatches), [mismatches]);

  if (ok) {
    return (
      <div className="p-4 text-sm text-[--color-muted-foreground]">
        No mismatches. The schema accepts all records.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <header className="text-xs uppercase tracking-wide text-[--color-muted-foreground]">
        {mismatches.length} mismatches
      </header>
      <ul aria-label="Mismatches" className="flex flex-col gap-2">
        {groups.map(({ pathKey, entries }) => (
          <li key={pathKey}>
            <p className="mb-1 text-[10px] uppercase text-[--color-muted-foreground]">{pathKey}</p>
            <ul className="flex flex-col gap-1">
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
