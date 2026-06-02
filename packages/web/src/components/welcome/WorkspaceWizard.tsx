// PR HH — new-workspace wizard. See docs/plans/pr-hh-workspace-wizard.md.
//
// Three steps: Data → Identity → Inference → Generate. Each step is its own
// component; the wizard owns step state and the Skip-wizard fast-forward.

import { useState } from "react";
import { useStore } from "@/state/store";
import { StepData } from "./StepData";
import { StepIdentity } from "./StepIdentity";
import { StepInference } from "./StepInference";
import { WizardStepShell } from "./WizardStepShell";

export interface WorkspaceWizardProps {
  // Called when the wizard finishes — either via Generate on Step 3 or via
  // Skip wizard from any step. The caller flips the wizardCompleted UIPref
  // so the wizard doesn't re-render for this workspace.
  onComplete: () => void;
}

type WizardStep = "data" | "identity" | "inference";

export function WorkspaceWizard({ onComplete }: WorkspaceWizardProps) {
  const [step, setStep] = useState<WizardStep>("data");
  const inferSchema = useStore((s) => s.inferSchema);

  // Skip = fast-forward to Generate. Whatever the user has already confirmed
  // sticks (identityConfig if set, inferenceOptions if changed); everything
  // else takes its default. Then mark the wizard complete.
  function handleSkip() {
    inferSchema();
    onComplete();
  }

  function handleGenerate() {
    // StepInference already calls inferSchema before invoking onGenerate, so
    // here we only need to flip wizardCompleted.
    onComplete();
  }

  if (step === "data") {
    return (
      <WizardStepShell
        step={1}
        title="Your data"
        sub="Confirm schemagen is reading the right records."
        onContinue={() => setStep("identity")}
        onSkip={handleSkip}
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
        onSkip={handleSkip}
      />
    );
  }

  return (
    <StepInference
      onGenerate={handleGenerate}
      onBack={() => setStep("identity")}
      onSkip={handleSkip}
    />
  );
}
