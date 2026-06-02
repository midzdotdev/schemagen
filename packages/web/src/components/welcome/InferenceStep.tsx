// PR II (revised) — Inference step (step 3) of the onboarding wizard.
//
// Thin store-driven wrapper around the shared, always-editable
// InferenceOptionsForm, plus a Reset-to-defaults action. Strict by default —
// the user can Continue/Generate without touching anything.
//
// See docs/plans/pr-ii-revised-onboarding-wizard.md.

import { InferenceOptionsForm } from "@/components/inference/InferenceOptionsForm";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";

export function InferenceStep() {
  const stored = useStore((s) => s.inferenceOptions);
  const setInferenceOptions = useStore((s) => s.setInferenceOptions);

  return (
    <section aria-labelledby="inference-h" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2
          id="inference-h"
          className="font-semibold text-foreground text-sm uppercase tracking-wider"
        >
          Inference
        </h2>
        <p className="text-muted-foreground text-xs">
          How schemagen reads your records. Defaults are strict — tighter rules catch more.
        </p>
      </div>

      <InferenceOptionsForm value={stored} onChange={setInferenceOptions} />

      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => setInferenceOptions(null)}
        disabled={!stored}
      >
        Reset to defaults
      </Button>
    </section>
  );
}
