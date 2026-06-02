// Root picker modal — wraps RootPickerTree in a Dialog. Used by the post-IR
// Add Data flow; the new-workspace wizard renders the tree inline in Step 1
// rather than opening this modal.

import type { PickerCandidate } from "@/lib/root-picker";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { RootPickerTree } from "./RootPickerTree";

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
      <DialogContent aria-label="Pick records root" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pick the records path</DialogTitle>
          <DialogDescription>
            Navigate the imported JSON and select which array should become this workspace's
            records. Arrays of objects are highlighted as pickable.
          </DialogDescription>
        </DialogHeader>
        <RootPickerTree parsed={parsed} candidates={candidates} onPick={onPick} />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
