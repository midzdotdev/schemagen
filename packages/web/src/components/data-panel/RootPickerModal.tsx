import { type PickerCandidate, formatPath, getAtPath } from "../../lib/root-picker";
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
        <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {candidates.map((c) => (
            <li key={formatPath(c.path)}>
              <button
                type="button"
                className="w-full rounded-md border border-[--color-border] p-3 text-left hover:bg-[--color-muted]"
                onClick={() => {
                  const records = getAtPath(parsed, c.path) as unknown[];
                  onPick(records);
                }}
              >
                <div className="font-mono text-sm">{formatPath(c.path)}</div>
                <div className="text-xs text-[--color-muted-foreground]">
                  {c.recordCount} records — first: {JSON.stringify(c.preview).slice(0, 80)}
                  {JSON.stringify(c.preview).length > 80 ? "…" : ""}
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
