// PR Z — workspace-scoped inference options.
// Plan: docs/plans/pr-z-inference-options.md
//
// A persistent per-workspace setting for how schemagen infers types from
// records. It feeds the initial inference and re-inference alike (PR FF re-runs
// `infer(records, inferenceOptions)`), so the options stay editable whether or
// not a schema exists yet — they are NOT cold-start-only.
//
// Autosaves on every change — no Apply or Cancel buttons. The user closes via
// the Radix X / Escape. "Reset to defaults" lives in the footer.

import { type InferOptions, resolveOptions } from "@schemagen/core";
import { AlertTriangle, Braces, GitBranch, Hash, ScanText, Tags } from "lucide-react";
import { type ReactNode, useId } from "react";
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
const D = resolveOptions(undefined);
const onOff = (b: boolean): string => (b ? "on" : "off");
const pct = (n: number): string => `${Math.round(n * 100)}%`;

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
  const setInferenceOptions = useStore((s) => s.setInferenceOptions);

  // Form is derived directly from stored — autosave means there's no separate
  // working copy to manage.
  const form = seed(stored);

  function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setInferenceOptions(commit({ ...form, [key]: value }));
  }

  function handleReset(): void {
    setInferenceOptions(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Inference options" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Inference options</DialogTitle>
          <DialogDescription>
            Control how schemagen infers types from your records — strict by default. Changes save
            as you go and apply the next time a schema is inferred from this workspace's records.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
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
              defaultLabel={pct(D.literals.maxUniqueRatio)}
              help="Skip the union if more than this percent of records have a unique value. 50% means 'skip when over half the values are one-offs'."
            >
              {(id) => (
                <PercentInput
                  id={id}
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
              defaultLabel={`${pct(D.objects.optionalThreshold)} of records`}
              help="Percent of records that need to contain a field for it to be 'required'. 100% = present in every single record; below that, the field is marked optional."
            >
              {(id) => (
                <PercentInput
                  id={id}
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

        <div className="flex justify-start">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={!stored}>
            Reset to defaults
          </Button>
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
    // biome-ignore lint/a11y/useSemanticElements: <fieldset>+<legend> would render the title overlapping the border; this card layout needs the header to flow as a block child
    <div
      role="group"
      aria-label={title}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-l-2 border-border bg-card/30 px-3 py-3",
        ACCENT_BORDER[accent],
      )}
    >
      <div className={cn("flex items-center gap-1.5 text-xs font-medium", ACCENT_TEXT[accent])}>
        {icon}
        {title}
      </div>
      {description && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      <div className="flex flex-col gap-1 pt-1">{children}</div>
    </div>
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
  children: (id: string) => ReactNode;
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

// 0..1 ratio displayed as 0..100 percent. Stored as the underlying fraction
// so the InferOptions type stays unchanged.
function PercentInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        id={id}
        type="number"
        min={0}
        max={100}
        step={5}
        value={Math.round(value * 100)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(0, Math.min(100, n)) / 100);
        }}
        className="w-16 rounded border border-border bg-card px-2 py-0.5 text-right text-xs"
      />
      <span className="text-[11px] text-muted-foreground">%</span>
    </div>
  );
}
