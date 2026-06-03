// PR Z / PR II (revised) — workspace-scoped inference options (header modal).
//
// A persistent per-workspace setting for how schemagen infers types from
// records. It feeds the initial inference and re-inference alike (PR FF re-runs
// `infer(records, inferenceOptions)`), so the options stay editable whether or
// not a schema exists yet — they are NOT cold-start-only.
//
// This is now a thin shell: the form body lives in the shared, always-editable
// InferenceOptionsForm. The dialog owns only the Dialog chrome, the neutral
// description, and the footer "Reset to defaults". Autosaves on every change —
// no Apply or Cancel. The Advanced disclosure opens by default when the stored
// options already differ from the strict defaults.

import { hasNonDefaultOptions } from "@/lib/inference-summary";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { InferenceOptionsForm } from "./InferenceOptionsForm";

export interface InferenceOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InferenceOptionsDialog({ open, onOpenChange }: InferenceOptionsDialogProps) {
  const stored = useStore((s) => s.inferenceOptions);
  const setInferenceOptions = useStore((s) => s.setInferenceOptions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Inference options" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Inference options</DialogTitle>
          <DialogDescription>
            Control how schemagen infers types from your records — strict by default. Changes save
            as you go and apply the next time a schema is inferred from this workspace's records.
          </DialogDescription>
        </DialogHeader>

        {/* The dialog is height-bounded, so the form scrolls within it here. */}
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <InferenceOptionsForm
            value={stored}
            onChange={setInferenceOptions}
            defaultAdvancedOpen={hasNonDefaultOptions(stored)}
          />
        </div>

        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInferenceOptions(null)}
            disabled={!stored}
          >
            Reset to defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
