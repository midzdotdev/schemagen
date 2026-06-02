// PR II — onboarding review page. Replaces the three-step WorkspaceWizard
// (PR HH) with a single scrolling review of the imported data + identity key,
// finished by a sticky-footer Generate button.
//
// Owns the identity `selected` state (lifted out of IdentitySection) so the
// Generate handler can commit it exactly once. Generate order is deliberate:
// inferSchema() first so a failure rolls back cleanly (no identity commit, no
// UIPref writes); then the destructive setIdentityConfig; then a single merged
// UIPref write that flips onboardingCompleted and expands the records sidebar.
//
// See docs/plans/pr-ii-onboarding-review-page.md.

import { proposeIdentityKey } from "@schemagen/core";
import { Sliders, Sparkles } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { writeUIPrefBag } from "@/hooks/useUIPrefs";
import { fieldCountLabel, pathKeyToCorePath } from "@/lib/field-stats";
import { inferenceSummaryShort } from "@/lib/inference-summary";
import { useStore } from "@/state/store";
import { useUIShell } from "../shell/UIShell";
import { Button } from "../ui/button";
import { DataSection } from "./DataSection";
import { IdentitySection } from "./IdentitySection";

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

export function ReviewPage() {
  const workspaceId = useStore((s) => s.workspaceId);
  const workspaceName = useStore((s) => s.workspaceName);
  const records = useStore((s) => s.records);
  const ir = useStore((s) => s.ir);
  const identityConfig = useStore((s) => s.identityConfig);
  const inferenceOptions = useStore((s) => s.inferenceOptions);
  const inferSchema = useStore((s) => s.inferSchema);
  const setIdentityConfig = useStore((s) => s.setIdentityConfig);
  const { openModal } = useUIShell();
  const errorId = useId();

  const seed = useMemo(
    () => seedSelection(identityConfig?.fields, records),
    [identityConfig, records],
  );
  const [selected, setSelected] = useState<string[]>(seed);
  const [touched, setTouched] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const generatingRef = useRef(false);

  // Re-pick of the records root (setRecords) changes the field universe, so the
  // staged selection no longer makes sense — reset it to the fresh proposal.
  // Skips the initial mount, where useState has already seeded.
  const recordsRef = useRef(records);
  useEffect(() => {
    if (recordsRef.current !== records) {
      recordsRef.current = records;
      setSelected(seed);
      setTouched(false);
    }
  }, [records, seed]);

  function handleSelectedChange(next: string[]): void {
    setSelected(next);
    setTouched(true);
  }

  function handleGenerate(): void {
    if (generatingRef.current) return;
    // Already generated — the App unmounts ReviewPage once an IR exists, but
    // guard the race so a double-click can never commit twice.
    if (ir !== null) return;
    if (records.length === 0) return;
    generatingRef.current = true;
    try {
      // 1. Infer first — throws roll back here, before any commit.
      inferSchema();
      // 2. Commit identity when the user accepted the seed or touched the
      //    picker. An untouched empty selection (no primitive fields) skips it.
      if (touched || selected.length > 0) {
        setIdentityConfig({ fields: selected.map(pathKeyToCorePath) });
      }
      // 3. One merged UIPref write: onboarding done + reveal the records sidebar.
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

  return (
    <section aria-label="Review your data" className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-border border-b px-6 py-4">
        <h1 className="font-semibold text-foreground text-lg tracking-tight">Review your data</h1>
        <p className="text-muted-foreground text-sm">
          {recordCount.toLocaleString()} record{recordCount === 1 ? "" : "s"}
          {workspaceName ? ` · ${workspaceName}` : ""}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
          <DataSection />
          <IdentitySection selected={selected} onSelectedChange={handleSelectedChange} />

          <p className="text-muted-foreground text-xs">
            Inference: {inferenceSummaryShort(inferenceOptions)} ·{" "}
            <button
              type="button"
              onClick={() => openModal("inference-options")}
              className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
            >
              <Sliders className="size-3" />
              Adjust
            </button>
          </p>

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

      <footer className="flex shrink-0 justify-end border-border border-t px-6 py-3">
        <Button onClick={handleGenerate} disabled={recordCount === 0} className="gap-1.5">
          <Sparkles className="size-4" />
          Generate schema{countLabel ? ` (${countLabel})` : ""}
        </Button>
      </footer>
    </section>
  );
}
