// PR HH — layout primitive shared by every wizard step. Owns the headline,
// body slot, and action bar (Back / Continue / Skip).
//
// Steps own their own decision state and pass labels/handlers in via props.

import type { ReactNode } from "react";
import { Button } from "../ui/button";

export interface WizardStepShellProps {
  step: 1 | 2 | 3;
  title: string;
  sub: string;
  children: ReactNode;
  // Continue moves to the next step or, on step 3, fires Generate.
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  onBack?: () => void;
  // Skip fast-forwards to Generate from any step. See plan §
  // "Resolved interpretations #5".
  onSkip: () => void;
}

export function WizardStepShell({
  step,
  title,
  sub,
  children,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
  onBack,
  onSkip,
}: WizardStepShellProps) {
  return (
    <section
      aria-label="Workspace wizard"
      className="mx-auto flex h-full w-full max-w-2xl flex-col gap-8 overflow-y-auto px-6 py-10"
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {step} of 3
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Skip wizard
          </button>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </header>
      <div className="flex flex-col gap-4">{children}</div>
      <footer className="mt-auto flex items-center justify-between gap-2 pt-4">
        <div>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back
            </Button>
          )}
        </div>
        {onContinue && (
          <Button size="sm" onClick={onContinue} disabled={continueDisabled}>
            {continueLabel}
          </Button>
        )}
      </footer>
    </section>
  );
}
