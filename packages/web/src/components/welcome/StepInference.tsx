// PR HH Step 3 — Inference options. Compact summary card with a row per
// inference option; "Adjust options…" opens the existing dialog for fine
// control; "Generate schema" fires inferSchema and unmounts the wizard.

import { resolveOptions } from "@schemagen/core";
import { Sliders } from "lucide-react";
import { useMemo } from "react";
import { useUIShell } from "@/components/shell/UIShell";
import { Button } from "@/components/ui/button";
import { WizardStepShell } from "@/components/welcome/WizardStepShell";
import { useStore } from "@/state/store";

export interface StepInferenceProps {
  onGenerate: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface Row {
  label: string;
  value: string;
  isDefault: boolean;
}

export function StepInference({ onGenerate, onBack, onSkip }: StepInferenceProps) {
  const inferenceOptions = useStore((s) => s.inferenceOptions);
  const inferSchema = useStore((s) => s.inferSchema);
  const { openModal } = useUIShell();

  const rows = useMemo<Row[]>(() => {
    const resolved = resolveOptions(inferenceOptions ?? undefined);
    const defaults = resolveOptions(undefined);

    const r: Row[] = [];

    const lit = resolved.literals;
    const litDefault = defaults.literals;
    r.push({
      label: "Literal unions",
      value: lit.enable ? `up to ${lit.maxCardinality} distinct values` : "off",
      isDefault:
        lit.enable === litDefault.enable && lit.maxCardinality === litDefault.maxCardinality,
    });

    r.push({
      label: "String formats",
      value: resolved.formats.enable ? "detect (date, uuid, email…)" : "off",
      isDefault: resolved.formats.enable === defaults.formats.enable,
    });

    const numbers = resolved.numbers;
    const numbersDefault = defaults.numbers;
    r.push({
      label: "Numeric ranges",
      value:
        numbers.rangeMode === "off"
          ? "off"
          : numbers.rangeMode === "evidence-only"
            ? "evidence only"
            : "as constraints",
      isDefault: numbers.rangeMode === numbersDefault.rangeMode,
    });

    r.push({
      label: "Integer detection",
      value: numbers.integerDetection ? "on" : "off",
      isDefault: numbers.integerDetection === numbersDefault.integerDetection,
    });

    r.push({
      label: "Discriminators",
      value: resolved.discriminators.enable ? "auto-detect" : "off",
      isDefault: resolved.discriminators.enable === defaults.discriminators.enable,
    });

    return r;
  }, [inferenceOptions]);

  function handleGenerate() {
    inferSchema();
    onGenerate();
  }

  return (
    <WizardStepShell
      step={3}
      title="Inference options"
      sub="How schemagen reads your records. Tighter rules catch more; looser let more through."
      continueLabel="Generate schema"
      onContinue={handleGenerate}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Options
        </span>
        <p className="text-[11px] text-muted-foreground">
          Each row controls one part of how the schema gets built.
        </p>
        <ul className="mt-1 flex flex-col gap-1 rounded-lg border border-border bg-card/40 p-1">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-baseline justify-between gap-3 rounded-md px-3 py-1.5"
            >
              <span className="text-xs font-medium text-foreground">{row.label}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {row.value}
                {row.isDefault && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground/70">(default)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 gap-1.5 self-start"
          onClick={() => openModal("inference-options")}
        >
          <Sliders className="size-3" />
          Adjust options…
        </Button>
      </div>
    </WizardStepShell>
  );
}
