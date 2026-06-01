// PR HH — new-workspace wizard. See docs/plans/pr-hh-workspace-wizard.md.
//
// Three steps (Data → Identity → Inference → Generate). Phase 5 fills in
// Step 3 + the actual Generate action; the inference step is a placeholder
// for now.

import { useState } from "react";
import { StepData } from "./StepData";
import { StepIdentity } from "./StepIdentity";
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

  if (step === "identity") {
    return (
      <StepIdentity
        onContinue={() => setStep("inference")}
        onBack={() => setStep("data")}
        onSkip={onSkip}
      />
    );
  }

  // Phase 5 — Step 3 lands here.
  return (
    <WizardStepShell
      step={3}
      title="Inference options"
      sub="Coming next."
      onBack={() => setStep("identity")}
      onSkip={onSkip}
    >
      <p className="text-sm text-muted-foreground">Step body lands in the next phase.</p>
    </WizardStepShell>
  );
}
