// PR II (revised) — stepped onboarding wizard host. Replaces the single-page
// ReviewPage with a guided 1·2·3 flow (Data · Identity · Inference) finished by
// a footer Generate. Owns all mutable onboarding state: the active step and the
// furthest step reached (for the clickable stepper), and the staged identity
// selection — which is committed exactly once, at Generate, because
// setIdentityConfig destructively re-dedupes records and inferSchema must see
// the full set first.
//
// The Generate finish order is preserved verbatim from ReviewPage: inferSchema
// → setIdentityConfig (only when a key is chosen/touched) → one merged
// writeUIPrefBag (onboarding done + records sidebar expanded), guarded against
// double-commit and an already-set IR.
//
// See docs/plans/pr-ii-revised-onboarding-wizard.md.

import { proposeIdentityKey } from "@schemagen/core";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { writeUIPrefBag } from "@/hooks/useUIPrefs";
import { fieldCountLabel, pathKeyToCorePath } from "@/lib/field-stats";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { DataSection } from "./DataSection";
import { IdentitySection } from "./IdentitySection";
import { InferenceStep } from "./InferenceStep";
import { Stepper } from "./Stepper";

const STEP_LABELS = ["Data", "Identity", "Inference"];
const LAST_STEP = STEP_LABELS.length - 1;

function seedSelection(
  identityFields: readonly (readonly (string | number)[])[] | undefined,
  records: unknown[],
): string[] {
  if (identityFields && identityFields.length > 0) {
    return identityFields.map((p) => p.join("."));
  }
  const proposal = proposeIdentityKey(records);
  return proposal ? proposal.fields.map((p) => p.join(".")) : [];
}

export function WizardHost() {
  const workspaceId = useStore((s) => s.workspaceId);
  const workspaceName = useStore((s) => s.workspaceName);
  const records = useStore((s) => s.records);
  const ir = useStore((s) => s.ir);
  const identityConfig = useStore((s) => s.identityConfig);
  const inferSchema = useStore((s) => s.inferSchema);
  const setIdentityConfig = useStore((s) => s.setIdentityConfig);
  const errorId = useId();

  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);

  const seed = useMemo(
    () => seedSelection(identityConfig?.fields, records),
    [identityConfig, records],
  );
  const [selected, setSelected] = useState<string[]>(seed);
  const [touched, setTouched] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const generatingRef = useRef(false);

  // Root re-pick (setRecords) changes the field universe — reset the staged
  // selection to the fresh proposal. Skips the initial mount via recordsRef.
  const recordsRef = useRef(records);
  useEffect(() => {
    if (recordsRef.current !== records) {
      recordsRef.current = records;
      setSelected(seed);
      setTouched(false);
    }
  }, [records, seed]);

  function goTo(next: number): void {
    setStep(next);
    setMaxVisited((m) => Math.max(m, next));
  }

  function handleSelectedChange(next: string[]): void {
    setSelected(next);
    setTouched(true);
  }

  function handleGenerate(): void {
    if (generatingRef.current) return;
    if (ir !== null) return;
    if (records.length === 0) return;
    generatingRef.current = true;
    try {
      inferSchema();
      if (touched || selected.length > 0) {
        setIdentityConfig({ fields: selected.map(pathKeyToCorePath) });
      }
      writeUIPrefBag(workspaceId, {
        onboardingCompleted: true,
        recordsSidebarCollapsed: false,
      });
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Could not generate the schema.");
    } finally {
      generatingRef.current = false;
    }
  }

  const countLabel = useMemo(() => fieldCountLabel(records), [records]);
  const recordCount = records.length;
  const onLastStep = step === LAST_STEP;

  return (
    <section aria-label="Set up your schema" className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-border border-b px-6 py-4">
        <h1 className="font-semibold text-foreground text-lg tracking-tight">Set up your schema</h1>
        <p className="text-muted-foreground text-sm">
          {recordCount.toLocaleString()} record{recordCount === 1 ? "" : "s"}
          {workspaceName ? ` · ${workspaceName}` : ""}
        </p>
      </header>

      <div className="shrink-0 border-border border-b px-6 py-3">
        <Stepper
          steps={STEP_LABELS}
          current={step}
          maxVisited={maxVisited}
          onStepSelect={setStep}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {step === 0 && <DataSection />}
          {step === 1 && (
            <IdentitySection selected={selected} onSelectedChange={handleSelectedChange} />
          )}
          {step === 2 && <InferenceStep />}

          {generateError && (
            <p
              id={errorId}
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs"
            >
              {generateError}
            </p>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-border border-t px-6 py-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        {onLastStep ? (
          <Button onClick={handleGenerate} disabled={recordCount === 0}>
            Generate schema{countLabel ? ` (${countLabel})` : ""}
          </Button>
        ) : (
          <Button onClick={() => goTo(step + 1)}>Continue</Button>
        )}
      </footer>
    </section>
  );
}
