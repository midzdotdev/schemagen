// PR Z — workspace-scoped inference options.
// Plan: docs/plans/pr-z-inference-options.md
//
// Tunes how the initial schema is built. Applies only at cold-start (ir === null);
// once an IR exists the dialog still opens but inputs are disabled and Apply is
// hidden — the schema tree is the right surface to edit per-node after that.

import { type InferOptions, resolveOptions } from "@schemagen/core";
import { AlertTriangle, Braces, GitBranch, Hash, ScanText, Tags } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "@/lib/cn";
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
  // Reuse core's resolver to fill in defaults, then project to FormState
  // (drops `formats.detect` and `discriminators.fields` — see interpretation #1).
  const r = resolveOptions(opts ?? undefined);
  return {
    literals: r.literals,
    formats: { enable: r.formats.enable },
    numbers: r.numbers,
    objects: r.objects,
    discriminators: { enable: r.discriminators.enable },
    onTypeConflict: r.onTypeConflict,
  };
}

// Pre-resolved defaults for the "Default: X" muted labels next to each input.
// Drift-proof — these values come from the same source as `resolveOptions`.
const D = resolveOptions(undefined);
const onOff = (b: boolean): string => (b ? "on" : "off");

function rangeModeLabel(mode: "off" | "evidence-only" | "constraint"): string {
  if (mode === "off") return "Ignore";
  if (mode === "evidence-only") return "Record as evidence only";
  return "Add as schema constraints";
}

function typeConflictLabel(mode: "union" | "unknown"): string {
  return mode === "union" ? "Allow either (union)" : "Give up (unknown)";
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
      <DialogContent aria-label="Inference options" className="max-w-xl">
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
          <Section
            title="Literal unions"
            icon={<Tags className="size-4" />}
            accent="emerald"
            description="When a field's values repeat often, schemagen can capture them as an enum-style set of choices (e.g. status: 'active' | 'pending' | 'cancelled') instead of just calling it a string."
          >
            <Row
              label="Detect literal unions"
              defaultLabel={onOff(true)}
              help="When off, every string field stays a plain string regardless of how often values repeat."
            >
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.literals.enable}
                  onChange={(v) => set("literals", { ...form.literals, enable: v })}
                />
              )}
            </Row>
            <Row
              label="Maximum distinct values"
              defaultLabel={String(D.literals.maxCardinality)}
              help="Skip the union if the field has more than this many distinct values — too many to enumerate cleanly."
            >
              {(id) => (
                <NumberInput
                  id={id}
                  min={1}
                  value={form.literals.maxCardinality}
                  onChange={(v) => set("literals", { ...form.literals, maxCardinality: v })}
                />
              )}
            </Row>
            <Row
              label="Skip when too varied"
              defaultLabel={String(D.literals.maxUniqueRatio)}
              help="Skip the union if more than this fraction of records have a unique value. 0.5 means 'skip when over half the values are one-offs'."
            >
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
            <Row
              label="Minimum records to consider"
              defaultLabel={String(D.literals.minSamples)}
              help="With fewer records than this, schemagen can't tell whether values 'repeat often' — falls back to plain string."
            >
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

          <Section
            title="String formats"
            icon={<ScanText className="size-4" />}
            accent="emerald"
            description="Tag string fields that look like well-known formats — dates, UUIDs, emails, URLs, IP addresses — so downstream tools can validate them."
          >
            <Row
              label="Detect known formats"
              defaultLabel={onOff(true)}
              help="When off, every string is just a string with no format tag."
            >
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.formats.enable}
                  onChange={(v) => set("formats", { enable: v })}
                />
              )}
            </Row>
          </Section>

          <Section
            title="Numbers"
            icon={<Hash className="size-4" />}
            accent="sky"
            description="How schemagen treats numeric fields."
          >
            <Row
              label="Distinguish integers from numbers"
              defaultLabel={onOff(true)}
              help="When on, fields where every observed value is a whole number become integers; fractional values become numbers."
            >
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.numbers.integerDetection}
                  onChange={(v) => set("numbers", { ...form.numbers, integerDetection: v })}
                />
              )}
            </Row>
            <Row
              label="Numeric ranges (min/max)"
              defaultLabel={rangeModeLabel(D.numbers.rangeMode)}
              help="What schemagen does with the smallest and largest values it observes."
            >
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
                  <option value="off">Ignore</option>
                  <option value="evidence-only">Record as evidence only</option>
                  <option value="constraint">Add as schema constraints</option>
                </select>
              )}
            </Row>
          </Section>

          <Section
            title="Objects"
            icon={<Braces className="size-4" />}
            accent="foreground"
            description="How schemagen treats object fields and the keys on them."
          >
            <Row
              label="Reject unknown fields"
              defaultLabel={onOff(true)}
              help="When on, the schema is 'closed' — future records with fields schemagen hasn't seen become mismatches. When off, extra fields are tolerated."
            >
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.objects.closed}
                  onChange={(v) => set("objects", { ...form.objects, closed: v })}
                />
              )}
            </Row>
            <Row
              label="Field must be present in"
              defaultLabel={`${(D.objects.optionalThreshold * 100).toFixed(0)}% of records`}
              help="Fraction of records that need to contain a field for it to be 'required'. 1.0 = present in every single record; below that, the field is marked optional."
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

          <Section
            title="Discriminators"
            icon={<GitBranch className="size-4" />}
            accent="violet"
            description="A discriminator is a 'type tag' field that distinguishes record variants — e.g. event: { kind: 'login' | 'logout', ... } where the rest of the shape depends on kind. Schemagen can auto-detect these and emit a tagged union."
          >
            <Row
              label="Detect discriminators"
              defaultLabel={onOff(true)}
              help="When off, variant records become a plain union (no tag field called out)."
            >
              {(id) => (
                <Checkbox
                  id={id}
                  checked={form.discriminators.enable}
                  onChange={(v) => set("discriminators", { enable: v })}
                />
              )}
            </Row>
          </Section>

          <Section
            title="Mixed types"
            icon={<AlertTriangle className="size-4" />}
            accent="amber"
            description="When a field is a number in some records but a string in others, schemagen has to pick one of two strategies."
          >
            <Row label="Type-conflict strategy" defaultLabel={typeConflictLabel(D.onTypeConflict)}>
              {(id) => (
                <select
                  id={id}
                  value={form.onTypeConflict}
                  onChange={(e) =>
                    set("onTypeConflict", e.target.value as FormState["onTypeConflict"])
                  }
                  className="rounded border border-border bg-card px-2 py-0.5 text-xs"
                >
                  <option value="union">Allow either (union)</option>
                  <option value="unknown">Give up (unknown)</option>
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

type SectionAccent = "emerald" | "sky" | "violet" | "amber" | "foreground";

const ACCENT_TEXT: Record<SectionAccent, string> = {
  // Match the JsonView palette so the dialog reads like an extension of the
  // schema tree's colour vocabulary.
  emerald: "text-emerald-600 dark:text-emerald-400",
  sky: "text-sky-600 dark:text-sky-400",
  violet: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
  foreground: "text-foreground/80",
};

const ACCENT_BORDER: Record<SectionAccent, string> = {
  emerald: "border-l-emerald-500/60",
  sky: "border-l-sky-500/60",
  violet: "border-l-violet-500/60",
  amber: "border-l-amber-500/60",
  foreground: "border-l-foreground/30",
};

function Section({
  title,
  description,
  icon,
  accent = "foreground",
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  accent?: SectionAccent;
  children: ReactNode;
}) {
  return (
    <fieldset
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border border-l-2 bg-card/30 px-3 py-2.5",
        ACCENT_BORDER[accent],
      )}
    >
      <legend
        className={cn("flex items-center gap-1.5 px-1.5 text-xs font-medium", ACCENT_TEXT[accent])}
      >
        {icon}
        {title}
      </legend>
      {description && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      <div className="flex flex-col gap-1 pt-1">{children}</div>
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
