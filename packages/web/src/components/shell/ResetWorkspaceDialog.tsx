import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export interface ResetWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetWorkspaceDialog({ open, onOpenChange }: ResetWorkspaceDialogProps) {
  const reset = useStore((s) => s.resetWorkspace);
  const recordCount = useStore((s) => s.records.length);
  const historyCount = useStore((s) => s.history.entries.length);

  function handleReset(): void {
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Reset workspace" className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset workspace?</DialogTitle>
          <DialogDescription>
            This clears the schema, records, edit history, and identity-key config from this
            workspace. The workspace name is kept; you can immediately import a new dataset into it.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          You'll lose <span className="font-medium text-foreground">{recordCount}</span> record
          {recordCount === 1 ? "" : "s"} and{" "}
          <span className="font-medium text-foreground">{historyCount}</span> history entr
          {historyCount === 1 ? "y" : "ies"}. This action is not undoable.
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleReset}>
            Reset workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
