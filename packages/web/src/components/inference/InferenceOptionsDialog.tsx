// PR Z — workspace-scoped inference options.
// Plan: docs/plans/pr-z-inference-options.md
//
// Tunes how the initial schema is built. Applies only at cold-start (ir === null);
// once an IR exists the dialog still opens but inputs are disabled and Apply is
// hidden — the schema tree is the right surface to edit per-node after that.

import { INFER_OPTION_DEFAULTS as DEFAULTS, type InferOptions } from "@schemagen/core";
import { useEffect, useId, useState } from "react";
import { useStore } from "@/state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export interface InferenceOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  literals: {
    enable: boolean;
    maxCardinality: number;
    maxUniqueRatio: number;
    minSamples: number;
  };
  formats: { enable: boolean };
  numbers: {
    integerDetection: boolean;
    rangeMode: "off" | "evidence-only" | "constraint";
  };
  objects: { closed: boolean; optionalThreshold: number };
  discriminators: { enable: boolean };
  onTypeConflict: "union" | "unknown";
}

function seed(opts: InferOptions | null): FormState {
  return {
    literals: {
      enable: opts?.literals?.enable ?? DEFAULTS.literals.enable,
      maxCardinality: opts?.literals?.maxCardinality ?? DEFAULTS.literals.maxCardinality,
      maxUniqueRatio: opts?.literals?.maxUniqueRatio ?? DEFAULTS.literals.maxUniqueRatio,
      minSamples: opts?.literals?.minSamples ?? DEFAULTS.literals.minSamples,
    },
    formats: { enable: opts?.formats?.enable ?? DEFAULTS.formats.enable },
    numbers: {
      integerDetection: opts?.numbers?.integerDetection ?? DEFAULTS.numbers.integerDetection,
      rangeMode: opts?.numbers?.rangeMode ?? DEFAULTS.numbers.rangeMode,
    },
    objects: {
      closed: opts?.objects?.closed ?? DEFAULTS.objects.closed,
      optionalThreshold: opts?.objects?.optionalThreshold ?? DEFAULTS.objects.optionalThreshold,
    },
    discriminators: {
      enable: opts?.discriminators?.enable ?? DEFAULTS.discriminators.enable,
    },
    onTypeConflict: opts?.onTypeConflict ?? DEFAULTS.onTypeConflict,
  };
}

function commit(f: FormState): InferOptions {
  return {
    literals: { ...f.literals },
    formats: { enable: f.formats.enable },
    numbers: { ...f.numbers },
    objects: { ...f.objects },
    discriminators: { enable: f.discriminators.enable },
    onTypeConflict: f.onTypeConflict,
  };
}

export function InferenceOptionsDialog({ open, onOpenChange }: InferenceOptionsDialogProps) {
  const stored = useStore((s) => s.inferenceOptions);
  const ir = useStore((s) => s.ir);
  const setInferenceOptions = useStore((s) => s.setInferenceOptions);
  const irExists = ir !== null;

  const [form, setForm] = useState<FormState>(() => seed(stored));

  useEffect(() => {
    if (open) setForm(seed(stored));
  }, [open, stored]);

  function handleApply(): void {
    setInferenceOptions(commit(form));
    onOpenChange(false);
  }

  function handleReset(): void {
    setInferenceOptions(null);
    setForm(seed(null));
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Inference options" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Inference options</DialogTitle>
          <DialogDescription>
            {irExists
              ? "A schema already exists for this workspace. These options apply only at first import — edit fields directly in the schema tree."
              : "These tune how schemagen builds the initial schema from your records. They apply only to a new workspace's first import — once a schema exists, edit fields directly in the schema tree."}
          </DialogDescription>
        </DialogHeader>

        <fieldset
          disabled={irExists}
          className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1"
        >
          <Section title="Literals">
            <Row label="Enable" defaultLabel="on">
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.literals.enable}
                  onChange={(v) => set("literals", { ...form.literals, enable: v })}
                />
              )}
            </Row>
            <Row label="Max cardinality" defaultLabel="20">
              {(id) => (
                <NumberInput
                  id={id}
                  min={1}
                  value={form.literals.maxCardinality}
                  onChange={(v) => set("literals", { ...form.literals, maxCardinality: v })}
                />
              )}
            </Row>
            <Row label="Max unique ratio" defaultLabel="0.3">
              {(id) => (
                <NumberInput
                  id={id}
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.literals.maxUniqueRatio}
                  onChange={(v) => set("literals", { ...form.literals, maxUniqueRatio: v })}
                />
              )}
            </Row>
            <Row label="Min samples" defaultLabel="5">
              {(id) => (
                <NumberInput
                  id={id}
                  min={1}
                  value={form.literals.minSamples}
                  onChange={(v) => set("literals", { ...form.literals, minSamples: v })}
                />
              )}
            </Row>
          </Section>

          <Section title="Formats">
            <Row label="Enable" defaultLabel="on">
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.formats.enable}
                  onChange={(v) => set("formats", { enable: v })}
                />
              )}
            </Row>
          </Section>

          <Section title="Numbers">
            <Row label="Integer detection" defaultLabel="on">
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.numbers.integerDetection}
                  onChange={(v) => set("numbers", { ...form.numbers, integerDetection: v })}
                />
              )}
            </Row>
            <Row label="Range mode" defaultLabel="evidence-only">
              {(id) => (
                <select
                  id={id}
                  value={form.numbers.rangeMode}
                  onChange={(e) =>
                    set("numbers", {
                      ...form.numbers,
                      rangeMode: e.target.value as FormState["numbers"]["rangeMode"],
                    })
                  }
                  className="rounded border border-border bg-card px-2 py-0.5 text-xs"
                >
                  <option value="off">off</option>
                  <option value="evidence-only">evidence-only</option>
                  <option value="constraint">constraint</option>
                </select>
              )}
            </Row>
          </Section>

          <Section title="Objects">
            <Row label="Closed (no additional properties)" defaultLabel="on">
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.objects.closed}
                  onChange={(v) => set("objects", { ...form.objects, closed: v })}
                />
              )}
            </Row>
            <Row
              label="Optional threshold"
              defaultLabel="1.0"
              help="Presence ratio required for a field to count as required. 1.0 = present in every record."
            >
              {(id) => (
                <NumberInput
                  id={id}
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.objects.optionalThreshold}
                  onChange={(v) => set("objects", { ...form.objects, optionalThreshold: v })}
                />
              )}
            </Row>
          </Section>

          <Section title="Discriminators">
            <Row label="Enable" defaultLabel="on">
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.discriminators.enable}
                  onChange={(v) => set("discriminators", { enable: v })}
                />
              )}
            </Row>
          </Section>

          <Section title="Conflict resolution">
            <Row label="On type conflict" defaultLabel="union">
              {(id) => (
                <select
                  id={id}
                  value={form.onTypeConflict}
                  onChange={(e) =>
                    set("onTypeConflict", e.target.value as FormState["onTypeConflict"])
                  }
                  className="rounded border border-border bg-card px-2 py-0.5 text-xs"
                >
                  <option value="union">union</option>
                  <option value="unknown">unknown</option>
                </select>
              )}
            </Row>
          </Section>
        </fieldset>

        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={!stored || irExists}>
            Reset to defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {irExists ? "Close" : "Cancel"}
            </Button>
            {!irExists && (
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-foreground">{title}</legend>
      <div className="flex flex-col gap-1">{children}</div>
    </fieldset>
  );
}

function Row({
  label,
  defaultLabel,
  help,
  children,
}: {
  label: string;
  defaultLabel: string;
  help?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-0.5 rounded px-2 py-1 text-xs hover:bg-accent/40">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-foreground">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {children(id)}
          <span className="font-mono text-[11px] text-muted-foreground">
            Default: {defaultLabel}
          </span>
        </div>
      </div>
      {help && <span className="text-[11px] text-muted-foreground">{help}</span>}
    </div>
  );
}

function Checkbox({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-3.5 cursor-pointer accent-info"
    />
  );
}

function NumberInput({
  value,
  onChange,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 rounded border border-border bg-card px-2 py-0.5 text-right text-xs"
      {...rest}
    />
  );
}
