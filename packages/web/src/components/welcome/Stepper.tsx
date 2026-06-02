// PR II (revised) — onboarding wizard stepper.
//
// Presentational, controlled 1·2·3 progress indicator. `current` is the active
// step; `maxVisited` is the furthest step reached. A step is clickable (jump
// back) when it's been reached and isn't the current one; steps past
// `maxVisited` are disabled so the linear Continue gate can't be skipped. The
// current step is a focusable but inert button so screen readers still announce
// it. Native <button> semantics give Tab/Enter/Space for free.
//
// See docs/plans/pr-ii-revised-onboarding-wizard.md § "Stepper + wizard layout".

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepperProps {
  steps: string[];
  current: number;
  maxVisited: number;
  onStepSelect: (index: number) => void;
  idPrefix?: string;
}

export function Stepper({ steps, current, maxVisited, onStepSelect, idPrefix }: StepperProps) {
  return (
    <ol aria-label="Onboarding steps" className="flex items-center gap-2">
      {steps.map((label, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        const reached = i <= maxVisited;
        const clickable = reached && !isCurrent;
        const status = isDone ? "completed" : isCurrent ? "current step" : "not yet reached";

        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            {i > 0 && (
              <span
                aria-hidden
                className={cn("h-px flex-1", i <= current ? "bg-primary" : "bg-border")}
              />
            )}
            <button
              type="button"
              {...(idPrefix ? { id: `${idPrefix}-step-${i}` } : {})}
              aria-current={isCurrent ? "step" : undefined}
              disabled={!reached}
              onClick={clickable ? () => onStepSelect(i) : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-sm outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-primary",
                clickable && "cursor-pointer hover:bg-accent/40",
                isCurrent && "cursor-default",
                !reached && "cursor-not-allowed",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  isDone && "bg-success text-success-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary",
                  !isDone && !isCurrent && "border border-border text-muted-foreground",
                )}
              >
                {isDone ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                  !reached && "text-muted-foreground/60",
                )}
              >
                {label}
              </span>
              <span className="sr-only">{status}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
