// Record detail panel — full JSON view with mismatch highlights.
// Spec: docs/frontend-spec.md § "Per-record view".

import { validate } from "@schemagen/core";
import { useMemo } from "react";
import { useStore } from "../../state/store";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export interface RecordDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number | null;
}

export function RecordDetail({ open, onOpenChange, index }: RecordDetailProps) {
  const ir = useStore((s) => s.ir);
  const records = useStore((s) => s.records);
  const record = index !== null ? records[index] : null;

  const mismatches = useMemo(() => {
    if (!ir || !record) return [];
    try {
      return validate(ir, record).mismatches;
    } catch {
      return [];
    }
  }, [ir, record]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Record detail" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record #{(index ?? 0) + 1}</DialogTitle>
          <DialogDescription>
            Full JSON below. Fields with current schema mismatches are highlighted.
          </DialogDescription>
        </DialogHeader>
        {mismatches.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {mismatches.map((m) => (
              <Badge key={`${m.kind}:${m.path.join(".")}`} variant="destructive">
                {m.kind} <span className="ml-1 font-mono">@ {m.path.join(".") || "(root)"}</span>
              </Badge>
            ))}
          </div>
        )}
        <pre
          aria-label="Record JSON"
          className="max-h-96 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed"
        >
          {record !== null && record !== undefined ? JSON.stringify(record, null, 2) : "No record."}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
