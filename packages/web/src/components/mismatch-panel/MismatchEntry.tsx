import { type Mismatch, findExamples } from "@schemagen/core";
import { useState } from "react";
import { formatPath } from "../../state/selectors";
import { useStore } from "../../state/store";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface MismatchEntryProps {
  mismatch: Mismatch;
}

export function MismatchEntry({ mismatch }: MismatchEntryProps) {
  const apply = useStore((s) => s.applyChange);
  const setSelectedPath = useStore((s) => s.setSelectedPath);
  const setSelectedRecordIndices = useStore((s) => s.setSelectedRecordIndices);
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
      20,
    );
    setSelectedRecordIndices(refs.map((r) => r.index));
  }

  return (
    <li className="rounded border border-[--color-border] p-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            className="text-left font-mono hover:underline"
            onClick={() => setSelectedPath(mismatch.path)}
          >
            {formatPath(mismatch.path)}
          </button>
          <span className="text-[--color-muted-foreground]">
            {humanKind(mismatch.kind)} — expected {mismatch.expected}; got{" "}
            {mismatch.actual.description}
          </span>
          {mismatch.recordIndex !== undefined && (
            <span className="text-[10px] text-[--color-muted-foreground]">
              record #{mismatch.recordIndex}
            </span>
          )}
        </div>
        <Badge variant="destructive" className="text-[10px]">
          {mismatch.kind}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {mismatch.suggestions.map((s) => (
          <Button
            key={s.label}
            size="sm"
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
        <Button size="sm" variant="ghost" onClick={handleShowRecords}>
          Show records
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-[10px] text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}

function humanKind(kind: Mismatch["kind"]): string {
  switch (kind) {
    case "type-mismatch":
      return "Type mismatch";
    case "literal-violation":
      return "Literal violation";
    case "missing-required-field":
      return "Missing required field";
    case "unexpected-field":
      return "Unexpected field";
    case "out-of-range":
      return "Out of range";
    case "pattern-violation":
      return "Pattern violation";
    case "format-violation":
      return "Format violation";
    case "wrong-length":
      return "Wrong length";
    case "null-not-allowed":
      return "Null not allowed";
    case "non-integer":
      return "Non-integer";
    case "duplicate-items":
      return "Duplicate items";
  }
}
