import { formatPath, getAtPath, type PickerCandidate } from "@/lib/root-picker";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export interface RootPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsed: unknown;
  candidates: PickerCandidate[];
  onPick: (records: unknown[]) => void;
}

export function RootPickerModal({
  open,
  onOpenChange,
  parsed,
  candidates,
  onPick,
}: RootPickerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Pick records root">
        <DialogHeader>
          <DialogTitle>Pick the records path</DialogTitle>
          <DialogDescription>
            The imported JSON has multiple candidate arrays. Choose the one that holds the records.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {candidates.map((c) => (
            <li key={formatPath(c.path)}>
              <button
                type="button"
                className="w-full rounded-md border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-ring/40 hover:bg-accent"
                onClick={() => {
                  const records = getAtPath(parsed, c.path) as unknown[];
                  onPick(records);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-sm text-foreground">{formatPath(c.path)}</code>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {c.recordCount} records
                  </span>
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {JSON.stringify(c.preview).slice(0, 100)}
                  {JSON.stringify(c.preview).length > 100 ? "…" : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
