// PR HH — new-workspace wizard. See docs/plans/pr-hh-workspace-wizard.md.
//
// Three steps (Data → Identity → Inference → Generate). Phase 3 fills in
// Step 1 + the shared shell; subsequent phases fill in Steps 2 & 3 and
// the skip-wizard fast-forward.

import { useState } from "react";
import { StepData } from "./StepData";
import { WizardStepShell } from "./WizardStepShell";

export interface WorkspaceWizardProps {
  onSkip: () => void;
}

type WizardStep = "data" | "identity" | "inference";

export function WorkspaceWizard({ onSkip }: WorkspaceWizardProps) {
  const [step, setStep] = useState<WizardStep>("data");

  if (step === "data") {
    return (
      <WizardStepShell
        step={1}
        title="Your data"
        sub="Here's a quick look before you set up identity and inference."
        onContinue={() => setStep("identity")}
        onSkip={onSkip}
      >
        <StepData onContinue={() => setStep("identity")} />
      </WizardStepShell>
    );
  }

  // Phases 4 / 5 — identity + inference. Render placeholders for now so the
  // wizard remains navigable while the bodies are filled in.
  return (
    <WizardStepShell
      step={step === "identity" ? 2 : 3}
      title={step === "identity" ? "Identity key" : "Inference options"}
      sub="Coming next."
      onBack={() => setStep(step === "identity" ? "data" : "identity")}
      onSkip={onSkip}
    >
      <p className="text-sm text-muted-foreground">Step body lands in the next phase.</p>
    </WizardStepShell>
  );
}
