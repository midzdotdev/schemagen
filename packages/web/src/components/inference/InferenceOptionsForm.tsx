// PR II (revised) — shared inference-options form.
//
// Presentational and Dialog-free: renders no banner, no Reset, no Dialog chrome
// — each wrapper (the wizard's InferenceStep and the header
// InferenceOptionsDialog) owns those. Always editable; there is no read-only
// mode, because inference options are a persistent workspace setting (they feed
// initial inference and re-inference alike), not a cold-start-only one.
//
// Layout is deliberately calm: three plain-language sections lead with the four
// strict-on detector toggles; the seven rarer/numeric knobs live behind one
// "Advanced" disclosure (rendered only when open, so a collapsed panel exposes
// no extra inputs).
//
// See docs/plans/pr-ii-revised-onboarding-wizard.md § "Inference options reorganization".

import { type InferOptions, resolveOptions } from "@schemagen/core";
import { type ReactNode, useId, useState } from "react";

export interface InferenceOptionsFormProps {
  value: InferOptions | null;
  onChange: (next: InferOptions | null) => void;
  defaultAdvancedOpen?: boolean | undefined;
}

interface FormState {
  literals: { enable: boolean; maxCardinality: number; maxUniqueRatio: number; minSamples: number };
  formats: { enable: boolean };
  numbers: { integerDetection: boolean; rangeMode: "off" | "evidence-only" | "constraint" };
  objects: { closed: boolean; optionalThreshold: number };
  discriminators: { enable: boolean };
  onTypeConflict: "union" | "unknown";
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

export function InferenceOptionsForm({
  value,
  onChange,
  defaultAdvancedOpen = false,
}: InferenceOptionsFormProps) {
  const form = seed(value);
  const [advancedOpen, setAdvancedOpen] = useState(defaultAdvancedOpen);

  function set<K extends keyof FormState>(key: K, next: FormState[K]): void {
    onChange(commit({ ...form, [key]: next }));
  }

  // Natural height — no inner scroll. The header modal wraps this in its own
  // bounded scroll container; the wizard step lets the page body scroll, so
  // step 3 doesn't end up with a scroll inside a scroll.
  return (
    <div className="flex flex-col gap-6">
      <Section title="Types">
        <Row
          label="Detect literal unions"
          help="Capture low-cardinality string fields as an enum of their observed values."
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
          label="Detect string formats"
          help="Tag strings matching known formats — email, date-time, UUID, URI, IP."
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

      <Section title="Structure">
        <Row
          label="Reject unknown fields"
          help="Closed objects — records with fields not in the schema become mismatches."
        >
          {(id) => (
            <Checkbox
              id={id}
              checked={form.objects.closed}
              onChange={(v) => set("objects", { ...form.objects, closed: v })}
            />
          )}
        </Row>
      </Section>

      <Section title="Numbers">
        <Row
          label="Integer detection"
          help="Fields whose values are all whole numbers become integer rather than number."
        >
          {(id) => (
            <Checkbox
              id={id}
              checked={form.numbers.integerDetection}
              onChange={(v) => set("numbers", { ...form.numbers, integerDetection: v })}
            />
          )}
        </Row>
      </Section>

      <details
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}
        className="border-border border-t pt-4"
      >
        <summary className="w-fit cursor-pointer font-semibold text-[11px] text-muted-foreground uppercase tracking-wider hover:text-foreground">
          Advanced <span className="font-normal normal-case">· 7 settings</span>
        </summary>

        {advancedOpen && (
          <div className="mt-4 flex flex-col gap-6">
            <SubGroup title="Literal unions">
              <Row
                label="Max cardinality"
                defaultLabel={String(D.literals.maxCardinality)}
                help="Skip the union past this many distinct values."
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
                label="Max unique ratio"
                defaultLabel={pct(D.literals.maxUniqueRatio)}
                help="Skip when more than this share of values are one-offs."
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
                label="Min samples"
                defaultLabel={String(D.literals.minSamples)}
                help="Below this record count, fall back to plain string."
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
            </SubGroup>

            <SubGroup title="Objects">
              <Row
                label="Required-field threshold"
                defaultLabel={`${pct(D.objects.optionalThreshold)} of records`}
                help="A field present in fewer records than this is marked optional."
              >
                {(id) => (
                  <PercentInput
                    id={id}
                    value={form.objects.optionalThreshold}
                    onChange={(v) => set("objects", { ...form.objects, optionalThreshold: v })}
                  />
                )}
              </Row>
            </SubGroup>

            <SubGroup title="Number ranges">
              <Row
                label="Numeric range mode"
                defaultLabel={rangeModeLabel(D.numbers.rangeMode)}
                help="What to do with the smallest and largest values observed."
              >
                {(id) => (
                  <Select
                    id={id}
                    value={form.numbers.rangeMode}
                    onChange={(v) =>
                      set("numbers", {
                        ...form.numbers,
                        rangeMode: v as FormState["numbers"]["rangeMode"],
                      })
                    }
                    options={[
                      { value: "off", label: "Ignore" },
                      { value: "evidence-only", label: "Record as evidence only" },
                      { value: "constraint", label: "Add as schema constraints" },
                    ]}
                  />
                )}
              </Row>
            </SubGroup>

            <SubGroup title="Discriminators">
              <Row
                label="Detect discriminators"
                defaultLabel={onOff(D.discriminators.enable)}
                help="Emit a tagged union when a type-tag field distinguishes record variants."
              >
                {(id) => (
                  <Checkbox
                    id={id}
                    checked={form.discriminators.enable}
                    onChange={(v) => set("discriminators", { enable: v })}
                  />
                )}
              </Row>
            </SubGroup>

            <SubGroup title="Conflicts">
              <Row
                label="Type-conflict strategy"
                defaultLabel={typeConflictLabel(D.onTypeConflict)}
                help="When a field is a number in some records and a string in others."
              >
                {(id) => (
                  <Select
                    id={id}
                    value={form.onTypeConflict}
                    onChange={(v) => set("onTypeConflict", v as FormState["onTypeConflict"])}
                    options={[
                      { value: "union", label: "Allow either (union)" },
                      { value: "unknown", label: "Give up (unknown)" },
                    ]}
                  />
                )}
              </Row>
            </SubGroup>
          </div>
        )}
      </details>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset>+<legend> forces a border/legend layout we don't want; role=group + aria-label is the right grouping here
    <div role="group" aria-label={title} className="flex flex-col gap-3">
      <h3 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function SubGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-[10px] text-muted-foreground/80 uppercase tracking-wide">
        {title}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
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
  defaultLabel?: string;
  help?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-foreground text-sm">
          {label}
        </label>
        <div className="flex shrink-0 items-center gap-2">
          {children(id)}
          {defaultLabel && (
            <span className="font-mono text-[11px] text-muted-foreground">
              Default: {defaultLabel}
            </span>
          )}
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
      className="size-4 cursor-pointer accent-info"
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

// 0..1 ratio displayed as 0..100 percent. Stored as the underlying fraction so
// the InferOptions type stays unchanged.
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

function Select({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-border bg-card px-2 py-0.5 text-xs"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
