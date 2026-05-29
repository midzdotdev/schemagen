import { Badge } from "../ui/badge";

export interface RecordListProps {
  records: unknown[];
}

export function RecordList({ records }: RecordListProps) {
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
      <ul aria-label="Records" className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {records.map((r, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: records are positional, not keyed
            key={i}
            className="rounded border border-[--color-border] px-2 py-1 text-xs font-mono truncate"
          >
            {JSON.stringify(r).slice(0, 100)}
          </li>
        ))}
      </ul>
    </div>
  );
}
