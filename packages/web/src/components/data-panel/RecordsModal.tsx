// PR GG — restore post-IR access to stored records.
//
// PR EE dropped the data pane once an IR exists; users lost the ability to
// scroll through what schemagen has. This modal wraps the existing
// RecordList so the records are one click away from the schema header.

import { Database } from "lucide-react";
import { useStore } from "@/state/store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { RecordList } from "./RecordList";

export interface RecordsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordsModal({ open, onOpenChange }: RecordsModalProps) {
  const records = useStore((s) => s.records);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Records" className="flex max-h-[80vh] max-w-2xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="size-4" aria-hidden />
            Records
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {records.length.toLocaleString()}
            </span>
          </DialogTitle>
          <DialogDescription>
            Browse the records currently stored in this workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-card/40">
          {records.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No records in this workspace.</p>
          ) : (
            <RecordList records={records} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
