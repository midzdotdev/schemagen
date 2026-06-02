# PR II (revised) — stepped onboarding wizard + inference rework

> Status: **proposed**. Supersedes the single-page review-page approach from `docs/plans/pr-ii-onboarding-review-page.md` (resolved interpretation #1, "single scrolling page, no stepper"). Builds on the same branch and reuses everything PR #71 already landed: `useUIPrefs`/`writeUIPrefBag`, `OrientationHint`, the `WelcomeView` restructure, `DataSection`, and `IdentitySection` — none of those are rebuilt. It **replaces** `ReviewPage` (the single scrolling host) with a stepped `WizardHost` driven by a visual 1·2·3 `Stepper` (Data · Identity · Inference), and **reworks** the inference options into a shared, less-dense `InferenceOptionsForm` that renders inline in step 3 (pre-IR, editable) and inside the header Sliders modal (post-IR, read-only). The load-bearing Generate ordering and double-commit guards move out of `ReviewPage` verbatim. Per MEMORY.md (TDD-with-spec-traceability), this is its own plan file with citation IDs and failing-tests-first phasing — reversing PR II's no-stepper interpretation requires a plan-restart, not a test patch.

## Context

PR II replaced the PR HH three-step wizard with a single scrolling `ReviewPage`: header + `DataSection` + `IdentitySection` + an inline "Inference: N overrides · Adjust" line that opened a modal + a sticky "Generate schema (N fields)" footer. The user now wants the guided, stepped shape back — but with two concrete improvements over both prior attempts:

1. A **visual** numbered 1·2·3 stepper (done / current / upcoming, visited steps clickable to jump back), explicitly **not** PR HH's vague "{step} of 3" text eyebrow.
2. Inference shown **inline** in step 3 — no modal hop during onboarding — and reorganized so the panel is calmer: a handful of plain-language common toggles up front, the rare/numeric knobs behind a single "Advanced" disclosure.

Alongside that, the header Sliders modal's post-IR state (`ir !== null`) looks broken: the whole control set is already inert (it sits in `<fieldset disabled={irExists}>`), but the input primitives carry no disabled styling, so they render at full opacity and *look* editable. The user reads this as "shows editable inputs even with an IR."

**Reused as-is (PR #71, do not rebuild):** `DataSection.tsx` (store-driven, step-1 body), `IdentitySection.tsx` (controlled, step-2 body), `IdentityPicker.tsx`, `OrientationHint.tsx`, `WelcomeView.tsx`, `useUIPrefs.ts` (`onboardingCompleted` + `writeUIPrefBag` + `recordsSidebarCollapsed`), `field-stats.ts` (`fieldCountLabel`, `pathKeyToCorePath`, `seedSelection` logic), the `App.tsx` routing predicate, and the core `InferOptions` universe in `packages/core/src/infer/options.ts`.

**Replaced:** `ReviewPage.tsx` → `WizardHost.tsx` (donor for the Generate handler and identity state, not a delete-and-rewrite).

**Reworked:** `InferenceOptionsDialog.tsx` is split — its form body + sub-components become a shared presentational `InferenceOptionsForm.tsx`; the dialog becomes a thin shell wrapping it. A new `Stepper.tsx` and a new `InferenceStep.tsx` are added.

## Resolved interpretations

Locked in based on the user's direction and the adversarial pass. Each is a deliberate deviation from a literal reading and needs sign-off. Where the adversarial pass refuted a draft decision, the revision is folded in here; anything it could not cleanly revise is in **Open questions**.

1. **Stepped `WizardHost` replaces the single-page `ReviewPage`, at the same App branch.** `App.tsx`'s `inReview = ir === null && records.length > 0 && !onboardingCompleted` predicate, the `key={workspaceId}` remount, and the `StorageBanner` suppression (`!isFresh && !inReview`) are **untouched** — only the rendered component (`ReviewPage` → `WizardHost`) and its import change. This reverses PR II resolved-interpretation #1.

2. **Visual numbered 1·2·3 stepper, not a text eyebrow.** A presentational, controlled `Stepper` renders an `<ol aria-label="Onboarding steps">` of three `<li>`/`<button>` steps (Data · Identity · Inference) with derived `done` / `current` / `upcoming` states. `aria-current="step"` marks the current step. This matches the repo's only other ordered-step list, `HistoryPanel.tsx` (`<ol aria-label="History">`), and is the first `aria-current` in the codebase (introduced fresh).

3. **Clickable visited steps, forward-gated.** `WizardHost` owns `step` (0|1|2) and `maxVisited` (furthest index reached, `Math.max`-monotonic). A step is clickable iff `index <= maxVisited && index !== current` — the user can jump **back** to any seen step but cannot leap **forward** past the linear Continue gate. The guard lives **inside** the `Stepper` before `onStepSelect` fires; upcoming/unvisited steps render as `<button disabled>` so a stale `maxVisited` can never reach Generate without traversing each step. *(Adversarial D5 confirmed sound: a clickable visited step is functionally identical to Back — a pure `setStep(i)` with no side effects — because all mutable onboarding state lives in the host and step bodies are render-switched, not unmounted.)*

4. **`<button>` per step, not `role="tab"`/tablist.** A tablist implies free random-access plus arrow-key cycling between panels; this is a linear back-only flow. Native `<button>` + `aria-current="step"` gives correct semantics, free Tab/Enter/Space, and native "disabled is skipped by Tab" for future steps — no roving tabindex. The current step renders as an inert-but-focusable `<button>` (no-op `onClick`, not `disabled`) so a screen reader can still announce it and there is no dead current step.

5. **Generate is the footer finish, not a fourth numbered circle.** The stepper always shows exactly three items (assertable as `getAllByRole("listitem").length === 3`). The footer shows `← Back` + `Continue →` on steps 1–2 and `← Back` + `Generate schema (N fields)` on step 3, reusing `fieldCountLabel(records)` for the parenthetical. Back is disabled on step 1.

6. **Inference rendered inline in step 3 via a progressively-disclosed shared form — no modal hop.** *(Adversarial D1 refuted "full panel inline"; revised here.)* Step 3 mounts the shared `InferenceOptionsForm` showing only the **four** common boolean toggles by default (`literals.enable`, `formats.enable`, `objects.closed`, `numbers.integerDetection`), with the rare/numeric knobs collapsed behind a single **Advanced** disclosure. Strict-by-default is preserved: a user can Continue past step 3 having touched nothing, and defaults still derive from `resolveOptions(undefined)`. The justification is "eliminate the onboarding modal hop," **not** "the user wants inference filled out before Generate" (that premise was unsupported). `ReviewPage`'s "Inference: … · Adjust" line and the modal hop are deleted; PR II's II-R9 (Adjust opens modal) inverts.

7. **One shared, always-editable `InferenceOptionsForm` — no `readOnly` / IR-gated mode.** Extract the form body + `Section`/`Row`/`Checkbox`/`NumberInput`/`PercentInput` + `seed`/`commit`/`FormState` into one presentational, **Dialog-free** component. It serves two surfaces identically and editably: (a) wizard step 3 and (b) the header modal — regardless of whether a schema exists. It renders **no banner, no Reset, no Dialog chrome** — each wrapper owns those. There is **no** `readOnly` prop and no IR branching inside the form, because inference options are a persistent workspace setting, not a cold-start-only one (interpretation #8).

8. **Inference options are NOT cold-start-only; the dialog stays editable after a schema exists.** *(Corrects the original premise that the post-IR modal should be read-only — that contradicts the PR FF spec, which re-infers via `infer(records, inferenceOptions)` and says "tuning happens in the existing dialog before opening Re-infer". `state/types.ts` literally called the options "inert once `ir` is set"; that was the bug.)* Landed as a precursor on this branch ahead of the wizard work: the dialog's `<fieldset disabled={irExists}>`, the `disabled={… || irExists}` on Reset, and the "A schema already exists … applies only at first import — edit fields directly in the schema tree" copy are **removed**; the description is reworded to a persistent, neutral framing. The cold-start-only comments in `types.ts`, `store.ts`, `ingest-records.ts`, `db.ts`, and the dialog header are reworded. `Z-D5` is rewritten from "post-IR inputs/Reset disabled" to "**options stay editable after a schema exists**"; `Z-D6` drops the first-import-only banner assertion. Re-inference actually *consuming* these options post-IR is PR FF's job (its in-progress task); this PR only stops the UI from claiming and enforcing a cold-start-only scope.

9. **Three plain-language sections + one Advanced disclosure; concrete mapping below.** *(Adversarial D3 refuted "less dense without hiding anything the user needs" and the "5 common toggles" count.)* The six dense accent cards collapse to three sections — **Types**, **Structure**, **Numbers** — leading with the **four** strict-on detector toggles (not five; `discriminators.enable` is Advanced). The numeric/expert knobs go behind Advanced. We **do not** claim nothing first-import-relevant is hidden: `objects.optionalThreshold` (drives required vs optional) and `numbers.rangeMode` (the only way to emit min/max) demonstrably are, and they live in Advanced. The full mapping and relabel table are in **Inference options reorganization**.

10. **Advanced auto-opens from a direct default comparison, not `inferenceOverrideCount`.** `inference-summary.ts` (`inferenceOverrideCount`/`summariseOptions`) **undercounts** — it omits `literals.maxUniqueRatio` and `literals.minSamples` — so a user who changed only those would get Advanced collapsed post-IR. `defaultAdvancedOpen` is computed by comparing the stored value against `resolveOptions(undefined)` directly. The undercount in `inferenceOverrideCount`/`summariseOptions` is fixed in the same change (add both knobs), with `inference-summary.test.ts` updated.

11. **Identity stays staged in the host and is committed exactly once at Generate — committing at step 2 is NOT behaviour-preserving.** *(Adversarial D4 refuted the "step-2 vs step-3 commit doesn't change behaviour" clause as circular and false.)* `setIdentityConfig` is destructive (`dedupeByIdentity`, rewrites `store.records`), and `inferSchema()` reads `store.records`. The Generate handler runs `inferSchema()` **before** dedup so inference sees the full record set; ratio/count-based options (`optionalThreshold`, `maxUniqueRatio`, `maxCardinality`, presence/uniqueness) compute over `records.length`. Committing identity on leaving step 2 would (a) make inference run over the already-deduped set, changing the schema, and (b) re-dedupe on Identity→Inference→back→Generate and trip the records-change reset effect, wiping the staged selection. Therefore `selected`/`touched` and the records-change re-seed effect live in `WizardHost`, never in a per-step component.

12. **Generate fires only from the step-3 footer button, with the existing ordering and guards verbatim.** Moved from `ReviewPage.handleGenerate`: (1) `inferSchema()` first (a throw rolls back before any commit); (2) `setIdentityConfig({ fields: selected.map(pathKeyToCorePath) })` only if `(touched || selected.length > 0)`; (3) one `writeUIPrefBag(workspaceId, { onboardingCompleted: true, recordsSidebarCollapsed: false })`. Guards: early-return on `generatingRef.current`, on `ir !== null`, on `records.length === 0`; `generatingRef` set in `try`, reset in `finally`; errors caught into `generateError` shown in a `role="alert"`.

13. **No presets; strict-by-default preserved.** Defaults come exclusively from `resolveOptions(undefined)` (`const D` at module scope). The store stays `null` until a user overrides. Autosave (no Apply/Cancel) and Reset-to-defaults (`setInferenceOptions(null)`) semantics are unchanged. The reorg is purely visual (whitespace, three plain-language groups, Advanced disclosure, read-only render). `formats.detect` and `discriminators.fields` stay out of the UI (type-only today; Z-D8 asserts no discriminators field picker).

## Stepper + wizard layout

`WizardHost` renders three flex children: a shrink-0 header, the shrink-0 `Stepper`, the `min-h-0 flex-1 overflow-y-auto` body (only the current step's body is mounted/visible; host owns the state behind every body), and a shrink-0 footer.

```
WizardHost — step index = 1 (Identity current); Data done, Inference upcoming

+--------------------------------------------------------------------------+
| HEADER (shrink-0, border-b)                                              |
|  Set up your schema                              3,128 records · acme    |
+--------------------------------------------------------------------------+
| STEPPER  <ol aria-label="Onboarding steps">  (shrink-0)                  |
|                                                                          |
|   .------.                .------.                    .------.           |
|   |  ✓   |---- Data ------|  2   |==== Identity ======|  3   | Inference |
|   '------'  done          '------'  current           '------' upcoming  |
|   <button> onStepSelect    aria-current="step"        <button disabled>  |
|   bg-success, ✓ glyph      bg-primary + ring-primary  border-border      |
|   label muted-foreground   label foreground, bold     label muted/60     |
|                                                                          |
|   connector before current: bg-success/primary ; after: bg-border       |
+--------------------------------------------------------------------------+
| BODY (min-h-0 flex-1 overflow-y-auto, mx-auto max-w-2xl column)         |
|   step===0 -> <DataSection/>           (no props, store-driven)         |
|   step===1 -> <IdentitySection selected onSelectedChange/>             |
|   step===2 -> <InferenceStep/>         (inline form, editable)          |
|   {generateError && <p role="alert"/>} (only meaningful on step 3)      |
+--------------------------------------------------------------------------+
| FOOTER (shrink-0, border-t, justify-between)                           |
|  [ ← Back ]                          steps 1,2:  [ Continue → ]          |
|  ^disabled on step 1                 step 3:     [ Generate schema (N) ] |
+--------------------------------------------------------------------------+
```

Per-state circle anatomy (two numbers, `current` + `maxVisited`, drive everything):

```
done       ●  filled bg-success, white ✓ glyph (aria-hidden), label muted-foreground,
              wrapped in <button> onStepSelect(i)  — jump back   (index < current)
current    ●  filled bg-primary, white number, ring-2 ring-primary, label foreground
              font-medium, aria-current="step", inert-but-focusable <button> (no-op)
visited-   ●  same visual as done, reachable by click (index <= maxVisited && i!==current)
not-current   — still a <button> onStepSelect(i)
upcoming   ○  bg-transparent border-border, number muted-foreground, label muted/60,
              <button disabled>  — gated by Continue   (index > current && > maxVisited)
```

Step 3 body — calm inference default (Advanced collapsed):

```
<InferenceStep/>  ->  <InferenceOptionsForm value={stored} onChange readOnly={false}/>

  Tune how schemagen reads your records. Defaults are strict.

  ── Types ─────────────────────────────────────────────────
   Recognise repeating values as a fixed list of choices   [x]
   Recognise emails, dates, UUIDs, URLs, IPs               [x]

  ── Structure ─────────────────────────────────────────────
   Flag records with fields the schema hasn't seen         [x]

  ── Numbers ───────────────────────────────────────────────
   Treat whole-number-only fields as integers              [x]

   ▸ Advanced                                    7 more settings

  (wrapper-owned)                            [ Reset to defaults ]
```

Step 3 body — Advanced expanded (editable):

```
   ▾ Advanced
   ──────────────────────────────────────────────────────────
   Choice lists
     Most distinct values to list        [   20 ]   default 20
     Skip when too varied                [   30 %]  default 30%
     Fewest records before guessing      [    5 ]   default 5
   Required fields
     A field counts as required when      [ 100 %]  default 100%
       present in this share of records
   Number ranges
     Smallest / largest values seen       [ Record as evidence only ▾ ]
                                          Ignore / Record as evidence / Enforce as min-max
   Variants
     Detect a "type tag" that splits      [x]        default on
       records into variants
   Mixed types
     When a field is sometimes a number,  [ Allow either ▾ ]
       sometimes text                     Allow either / Give up (unknown)
```

Header modal — the **same editable form** whether or not a schema exists (interpretation #8: inference options are persistent, not cold-start-only). The modal differs from the inline step only in its wrapper chrome (Dialog header/description + Reset), never in editability. `defaultAdvancedOpen` is true when any stored knob differs from `resolveOptions(undefined)`.

## Inference options reorganization

The discovered surfaced inventory is **11 knobs** (the type also has `formats.detect` and `discriminators.fields`, deliberately not surfaced — interpretation #13). They regroup from six accent cards into three plain-language sections plus one shared Advanced disclosure.

### Section → option mapping

| Section | Option key | Common / Advanced | New label (plain language) | Default (from `resolveOptions(undefined)`) |
|---|---|---|---|---|
| **Types** | `literals.enable` | common | Recognise repeating values as a fixed list of choices | on |
| **Types** | `formats.enable` | common | Recognise emails, dates, UUIDs, URLs, IPs | on |
| **Types** | `literals.maxCardinality` | Advanced | Most distinct values to list | 20 |
| **Types** | `literals.maxUniqueRatio` | Advanced | Skip when too varied | 30% |
| **Types** | `literals.minSamples` | Advanced | Fewest records before guessing | 5 |
| **Types** | `discriminators.enable` | Advanced | Detect a "type tag" that splits records into variants | on |
| **Types** | `onTypeConflict` | Advanced | When a field is sometimes a number, sometimes text | Allow either |
| **Structure** | `objects.closed` | common | Flag records with fields the schema hasn't seen | on |
| **Structure** | `objects.optionalThreshold` | Advanced | A field counts as required when present in (% of records) | 100% |
| **Numbers** | `numbers.integerDetection` | common | Treat whole-number-only fields as integers | on |
| **Numbers** | `numbers.rangeMode` | Advanced | Smallest / largest values seen | Record as evidence only |

Common (always visible): exactly **four** booleans — `literals.enable`, `formats.enable`, `objects.closed`, `numbers.integerDetection` (Types 2, Structure 1, Numbers 1). Advanced (one shared disclosure, collapsed by default): the remaining **seven** knobs. Select-label mappers (`rangeModeLabel`, `typeConflictLabel`) and percent formatting (`PercentInput`: stores 0..1, displays 0..100 with `%`) move verbatim.

### Shared component API

```ts
// packages/web/src/components/inference/InferenceOptionsForm.tsx
// Presentational, Dialog-free. Renders NO banner, NO Reset, NO Dialog chrome —
// the wrappers own those. Defaults come from `const D = resolveOptions(undefined)`.

export interface InferenceOptionsFormProps {
  value: InferOptions | null;            // raw store value; null = strict defaults
  onChange: (next: InferOptions | null) => void; // autosave; always editable
  defaultAdvancedOpen?: boolean;         // default false (calm). Wrapper passes true
                                         // when any knob ≠ resolveOptions(undefined)
}
export function InferenceOptionsForm(props: InferenceOptionsFormProps): JSX.Element;
```

Internals moved verbatim out of `InferenceOptionsDialog`: `FormState`, `seed()`, `commit()`, `set()`, and the `Section`/`Row`/`Checkbox`/`NumberInput`/`PercentInput` sub-components (the `Section` `role="group"` + `aria-label` pattern and its biome-ignore carry over). Added: an `<Advanced>` disclosure (`<details>`/`<summary>` or button-toggled region; the codebase already uses `<details>` in `WelcomeView`/`ErrorBoundary`) wrapping the seven Advanced rows. The only local state is the disclosure open boolean (`useState(defaultAdvancedOpen)`), ephemeral, never persisted. There is no read-only/static render — the form is always editable (interpretation #7/#8).

**Wrapper 1 — `InferenceStep` (wizard step 3):** subscribes to `inferenceOptions` + `setInferenceOptions`; renders a short heading/blurb + `<InferenceOptionsForm value={stored} onChange={setInferenceOptions}/>` + a wrapper-owned "Reset to defaults" ghost button calling `setInferenceOptions(null)`, disabled when `!stored`.

**Wrapper 2 — `InferenceOptionsDialog` (header modal, thin shell):** keeps `{ open, onOpenChange }`; body is `<InferenceOptionsForm value={stored} onChange={setInferenceOptions} defaultAdvancedOpen={hasNonDefault(stored)}/>`, plus the `DialogHeader`/neutral description and the wrapper-owned Reset button (disabled when `!stored`) — no `irExists` branching anywhere (interpretation #8). `hasNonDefault` compares against `resolveOptions(undefined)` directly (interpretation #10), not `inferenceOverrideCount`.

## File-level edit map

### New

- `packages/web/src/components/welcome/WizardHost.tsx` — stepped onboarding host replacing `ReviewPage`. Owns `step`/`maxVisited`, `selected`/`touched`, `generateError`, `generatingRef`, `recordsRef`, the records-change re-seed effect, navigation handlers, and the verbatim Generate finish handler. No props; rendered `<WizardHost key={workspaceId}/>`.
- `packages/web/src/components/welcome/Stepper.tsx` — presentational, controlled 1·2·3 stepper. Props `{ steps, current, maxVisited, onStepSelect, idPrefix? }`. No store access, no `@schemagen/core` import.
- `packages/web/src/components/welcome/InferenceStep.tsx` — thin store-driven wrapper mounting `InferenceOptionsForm` editable (`readOnly={false}`) + the wrapper-owned Reset button. The step-3 body.
- `packages/web/src/components/inference/InferenceOptionsForm.tsx` — shared presentational form extracted from `InferenceOptionsDialog`. Dialog-free; `readOnly` two-mode render; Advanced disclosure.
- `packages/web/test/components/welcome/WizardHost.test.tsx` — host orchestration + finish-ordering suite (carries the moved II-R3/R4/R5/R7/I5/I6).
- `packages/web/test/components/welcome/Stepper.test.tsx` — stepper states, click-to-jump, forward gate, keyboard.
- `packages/web/test/components/welcome/InferenceStep.test.tsx` — inline editable step + Reset wrapper.
- `packages/web/test/components/inference/InferenceOptionsForm.test.tsx` — the extracted form (editable + readOnly modes, sections, Advanced, percent round-trip).

### Modified

- `packages/web/src/components/inference/InferenceOptionsDialog.tsx` — becomes a thin Dialog shell wrapping `InferenceOptionsForm`; loses the inline form body, the `<fieldset disabled>`, and the sub-components (moved). Keeps `DialogHeader`/description + wrapper-owned Reset.
- `packages/web/src/App.tsx` — swap the rendered component (`ReviewPage` → `WizardHost`) + its import in the unchanged `inReview` branch (and the `key={workspaceId}`). Predicate and `StorageBanner` suppression untouched.
- `packages/web/src/lib/inference-summary.ts` — fix the undercount: `inferenceOverrideCount` and `summariseOptions` add `literals.maxUniqueRatio` and `literals.minSamples`.
- `packages/web/test/components/inference/InferenceOptionsDialog.test.tsx` — Z-D5/Z-D6 already rewritten for the persistent (non-cold-start) behaviour (precursor, interpretation #8); when the dialog becomes a thin shell over the shared form, re-express Z-D7/Z-D8/Z-D9 for the 3-section + Advanced structure (expand Advanced before querying moved knobs; Discriminators no longer its own `role="group"`).
- `packages/web/test/components/app.test.tsx` — II-A1/II-A5 update the asserted heading from `/review your data/` to `/set up your schema/` and assert the stepper; II-A2 navigates to step 3 before Generate, keeping the one-write contract.
- `packages/web/test/lib/inference-summary.test.ts` — add cases for the two newly-counted knobs (path noted; create if absent under `test/lib/`).
- `README.md` — update the onboarding walk-through (stepped wizard, inline inference) in the same commit (CLAUDE.md rule).

### Deleted

- `packages/web/src/components/welcome/ReviewPage.tsx` — replaced by `WizardHost.tsx`.
- `packages/web/test/components/welcome/ReviewPage.test.tsx` — replaced by `WizardHost.test.tsx` (assertions migrate, not vanish).

### Notably unchanged

- `packages/web/src/components/welcome/DataSection.tsx` — step-1 body, verbatim.
- `packages/web/src/components/welcome/IdentitySection.tsx` — step-2 body, controlled, verbatim.
- `packages/web/src/components/identity/IdentityPicker.tsx`, `OrientationHint.tsx`, `WelcomeView.tsx` — verbatim.
- `packages/web/src/hooks/useUIPrefs.ts` (`onboardingCompleted` + `writeUIPrefBag`), `packages/web/src/lib/field-stats.ts`, `packages/web/src/components/shell/AppHeader.tsx` (Sliders → `openModal('inference-options')`), `packages/web/src/components/shell/UIShell.tsx` (mounts the modal), `packages/web/src/components/ui/button.tsx`.
- `packages/web/src/state/store.ts` / `state/types.ts` — `inferenceOptions`, `setInferenceOptions`, `inferSchema`, `setIdentityConfig` unchanged.
- `packages/core/src/infer/options.ts` — `INFER_OPTION_DEFAULTS` / `resolveOptions` unchanged (single source of truth).
- `packages/web/test/components/welcome/DataSection.test.tsx`, `IdentitySection.test.tsx`, `OrientationHint.test.tsx`, `hooks/useUIPrefs.test.tsx` — re-run as guards.

## State + action surface

No new store slices. `WizardHost` owns all mutable onboarding state via `useState`/`useRef`, lifted verbatim out of `ReviewPage`:

- `step: 0 | 1 | 2` — active step. `useState(0)`. `onContinue()` → `setStep(s => s + 1)` (capped at 2) and `setMaxVisited(m => Math.max(m, s + 1))`; `onBack()` → `setStep(s => Math.max(0, s - 1))`; `onStepSelect(i)` → `setStep(i)` (already validated by `Stepper`).
- `maxVisited: number` — `useState(0)`, monotonic via `Math.max`. Gates click-to-jump.
- `selected: string[]` + `touched: boolean` — identity selection, seeded by `seedSelection(identityConfig?.fields, records)` (the `useMemo` `seed` + `useState(seed)` pattern). `handleSelectedChange` sets both. **Must stay in the host** so `setIdentityConfig` fires once at Generate, never per-toggle, and survives Identity↔Inference navigation (interpretation #11).
- `generateError: string | null`, `generatingRef = useRef(false)`, `recordsRef = useRef(records)`.

**Host effect (verbatim):** when the `records` reference changes (DataSection root re-pick via `setRecords`), reset `selected → seed`, `touched → false` (skipping initial mount via `recordsRef`). Lives in the host so a step-1 re-pick still clears a step-2 selection across the split — step bodies are render-switched, never independently mounted with their own selection (interpretation #11 / risk).

**Lifted identity is controlled down to `IdentitySection`** (`selected`/`onSelectedChange`); the section has zero store side-effects.

**Inference edits go to the store, not host state.** `InferenceStep` and the dialog read/write `inferenceOptions` via `setInferenceOptions` (autosave, no draft) — the established contract. Stepping **Back** off the Inference step does **not** roll back inference edits; Reset-to-defaults is the documented escape hatch (interpretation #6, autosave-on-Back hazard resolved by accepting the existing contract).

**Generate finish handler** — the only place `setIdentityConfig` and `writeUIPrefBag` are called, fired only by the step-3 footer button, ordering and guards preserved verbatim (interpretation #12). `inferSchema()` receives the full pre-dedup record set; the conditional commit and single merged `writeUIPrefBag({ onboardingCompleted: true, recordsSidebarCollapsed: false })` follow. `key={workspaceId}` forces a per-workspace remount so step/selection state never leaks.

## Test catalog

Each test opens with a `Plan § "Section Title"` citation comment (MEMORY.md TDD-traceability). IDs are prefixed: `Z-S*` Stepper, `Z-W*` WizardHost, `Z-N*` InferenceStep, `Z-F*` InferenceOptionsForm, `Z-D*` (rewritten) dialog shell, `II-A*` app. Carried assertions name the PR II ID they preserve.

### `test/components/welcome/Stepper.test.tsx` (new) — Plan § "Stepper + wizard layout"

- **Z-S1** — `<ol aria-label="Onboarding steps">` with three list items labelled Data, Identity, Inference, in order.
- **Z-S2** — `current=1`: step 1 `done` (✓ glyph aria-hidden, accessible name includes "completed"), step 2 `aria-current="step"`, step 3 `upcoming` (no aria-current, disabled button).
- **Z-S3** — `current=2, maxVisited=2`: clicking Data fires `onStepSelect(0)` (visited && !current ⇒ enabled button).
- **Z-S4** — current step click does **not** fire (`i===current` filtered); upcoming/unvisited is `<button disabled>` and `userEvent.click` fires nothing.
- **Z-S5** — `current=0, maxVisited=0`: steps 2,3 disabled (forward gate); `maxVisited=2, current=0`: steps 1,2 clickable (forward only as far as visited).
- **Z-S6** — clickable Data reachable via Tab, activates on Enter (`onStepSelect(0)`); disabled future steps skipped by Tab (native button semantics).

### `test/components/welcome/WizardHost.test.tsx` (new) — Plan § "State + action surface"

- **Z-W1** — initial render: stepper step 1 current, DataSection visible, Back disabled, Continue (not Generate) present.
- **Z-W2** — Continue advances Data→Identity, marks Data done; Back returns; `maxVisited` increments on advance, never decrements on Back. *(carries HH-W4/W5 pattern)*
- **Z-W3** — Continue twice reaches step 3: inline inference form visible (e.g. /recognise repeating values/), footer reads `Generate schema (N fields)`, no modal opened.
- **Z-W4** — footer label switches to Generate only on step 3; `getAllByRole("listitem").length === 3` throughout (Generate never a circle).
- **Z-W5** — Generate finish ordering: `inferSchema()` first; on throw `setIdentityConfig` NOT called, no `writeUIPrefBag`, localStorage bag key null, `role="alert"` shown. *(carries II-R3/II-R4)*
- **Z-W6** — success path: `setIdentityConfig` once iff `(touched || selected.length>0)`, then `writeUIPrefBag` once with `{onboardingCompleted:true, recordsSidebarCollapsed:false}`. *(carries II-R3)*
- **Z-W7** — double-click Generate commits once (`inferSchema` and `setIdentityConfig` each once) via `generatingRef`. *(carries II-R5)*
- **Z-W8** — `Generate schema` parenthetical: `(5 fields)`, `(1 field)`, no `/field/` for array-of-primitives root (`fieldCountLabel`). *(carries II-R2)*
- **Z-W9** — identity seeded from proposed key; Identity→Inference→back→Identity preserves selection (host-owned, `setIdentityConfig` not yet called). *(carries II-I3)*
- **Z-W10** — commit-only-at-Generate rule: array-of-primitives + untouched skips `setIdentityConfig` (carries II-I5); clearing the seed then Generating commits `{fields:[]}` (carries II-I6).
- **Z-W11** — re-picking the records root in step 1 resets the staged selection (step-2 checkbox unchecked after navigating forward) — re-seed effect survives the split. *(carries II-R7)*
- **Z-W12** — nav-loop: Identity→Inference→back→Identity→Generate commits `setIdentityConfig` **exactly once**, and `inferSchema` receives the full pre-dedup record count (guards interpretation #11; new).

### `test/components/welcome/InferenceStep.test.tsx` (new) — Plan § "Inference options reorganization"

- **Z-N1** — renders the three section labels + four common toggles, Advanced collapsed, no numeric inputs visible; no modal chrome.
- **Z-N2** — wrapper Reset button calls `setInferenceOptions(null)`, disabled when `stored===null`.

### `test/components/inference/InferenceOptionsForm.test.tsx` (new) — Plan § "Inference options reorganization"

- **Z-F1** — editable (`value=null`): exactly three section labels (Types/Structure/Numbers) + the four common toggles; no numeric inputs while Advanced collapsed.
- **Z-F2** — Advanced collapsed by default; after activating the Advanced summary, the seven advanced rows appear with `Default: X` labels derived from `resolveOptions(undefined)`.
- **Z-F3** — editable autosave: toggling "recognise repeating values" off calls `onChange` with `literals.enable:false`; expand Advanced, set "Most distinct values to list" to 30 → `onChange` with `literals.maxCardinality:30`; no Apply/Cancel.
- **Z-F4** — the form is always editable: with any `value` (incl. one paired with an IR in the store) the controls remain interactive `checkbox`/`spinbutton`/`combobox`; there is no read-only/static mode.
- **Z-F6** — percent round-trip preserved: default `maxUniqueRatio` shows 30, typing 75 → `onChange literals.maxUniqueRatio:0.75`; `optionalThreshold` default shows 100. *(carries Z-D9)*
- **Z-F7** — `defaultAdvancedOpen` true → Advanced expanded on mount; computed by the wrapper against `resolveOptions(undefined)`, not `inferenceOverrideCount` (covered with a `maxUniqueRatio`-only override).
- **Z-F8** — `value=null` shows all strict defaults; no preset selector anywhere.

### `test/components/inference/InferenceOptionsDialog.test.tsx` (rewrite) — keep Z-D* green via the shared component

- **Z-D1/Z-D2** — editable through the shell: controls reflect stored options; autosave on edit; no Apply/Cancel.
- **Z-D5** *(rewritten — done as precursor)* — inference options stay editable after a schema exists: the moved-knob input is enabled, Reset enabled, and no "only at first import / once a schema exists" copy. Asserts editable, not `toBeDisabled()`.
- **Z-D6** *(rewritten — done as precursor)* — the helper banner describes inference without a first-import-only scope; a common toggle is interactive.
- **Z-D7** *(re-expressed)* — `Default: 20` visible after expanding Advanced (knob moved behind the disclosure).
- **Z-D8** *(re-expressed)* — Discriminators is no longer its own `role="group"`; its "Detect …variants" checkbox lives in Advanced under Types, with no textbox/field picker.
- **Z-D9** — percent↔fraction (30↔0.3, 75→0.75) preserved through the extracted `PercentInput`.

### `test/lib/inference-summary.test.ts` (modify) — Plan § interpretation #10

- Add: overriding `literals.maxUniqueRatio` or `literals.minSamples` now increments `inferenceOverrideCount` and appears in `summariseOptions`.

### `test/components/app.test.tsx` (modify) — Plan § "Resolved interpretations" #1

- **II-A1/II-A5** — `inReview` branch renders `WizardHost`: heading /set up your schema/ + stepper present, no schema region; ingest does not seed `onboardingCompleted`.
- **II-A2** — import → advance to step 3 → Generate sets `ir` non-null, flips `onboardingCompleted`, expands the sidebar in one write, routes away. *(carries II-A2 via navigation)*

## Implementation phasing

Each phase is failing-tests-first → minimum code → green; each starts from no production code beyond the prior phase's. Reuse what PR #71 landed (DataSection/IdentitySection/IdentityPicker/OrientationHint/useUIPrefs/WelcomeView) — do not scaffold those net-new.

1. **Stepper (Z-S1–Z-S6).** Build the presentational `Stepper` against its own suite. No host wiring yet.
2. **InferenceOptionsForm extraction (Z-F1, Z-F2, Z-F3, Z-F4, Z-F6, Z-F7, Z-F8).** Lift the form body + sub-components into the shared, always-editable Dialog-free component with the 3-section + Advanced regroup. Pure-component tests.
3. **Dialog shell rewrite + summary fix (Z-D1/D2/D7/D8/D9, inference-summary cases).** Reduce `InferenceOptionsDialog` to a shell over the shared form (Z-D5/Z-D6 persistent behaviour already landed as a precursor); re-express Z-D7/D8/D9 for the Advanced structure; fix the `inferenceOverrideCount`/`summariseOptions` undercount.
4. **WizardHost scaffold + nav (Z-W1–Z-W4).** Build the host shell, mount the three step bodies render-switched, wire Back/Continue/`onStepSelect`/`maxVisited`. App still renders `ReviewPage`.
5. **Identity lift + Generate finish (Z-W5–Z-W12).** Move `selected`/`touched`, the re-seed effect, and the verbatim Generate handler into the host; wire the step-3 footer button.
6. **InferenceStep wrapper (Z-N1, Z-N2).** Mount the editable form inline + wrapper Reset as the step-3 body.
7. **App swap + heading (II-A1/A2/A5).** Swap `ReviewPage` → `WizardHost` in `App.tsx`; delete `ReviewPage.tsx`/`ReviewPage.test.tsx`; update `app.test.tsx`; update README in the same commit.

## Verification

- `pnpm typecheck` clean.
- `pnpm test --filter @schemagen/web` green; new test files present; rewritten Z-D and II-A suites pass; `DataSection`/`IdentitySection`/`OrientationHint`/`useUIPrefs` suites still green as guards.
- `pnpm lint` clean (Biome `noRestrictedImports` — intra-package `@/` alias for two-plus-level climbs).
- Manual run: fresh workspace → paste a sample → **step 1 Data** (record count, collapsed first record) → Continue → **step 2 Identity** (proposed key pre-checked, dedup preview live; toggle, then jump back to Data via the stepper, re-pick root, return — selection reset) → Continue → **step 3 Inference** (four common toggles, Advanced collapsed; expand, change a knob; Back does not roll back; Reset restores defaults) → `Generate schema (N fields)` → IR appears, wizard unmounts, sidebar expands. Reload → wizard does not re-show. Post-IR: header Sliders → modal opens **read-only** (static values, no editable inputs, Advanced auto-open if any knob ≠ default).
- README walk-through updated in the same commit as the App swap (CLAUDE.md).

## Out of scope

- **`formats.detect` / `discriminators.fields` pickers** — type-only today; surfacing them changes Z-D8 and behaviour. Deferred until users ask.
- **A draft/Apply-Cancel model for the inference step** — defer: the established autosave contract holds, and Reset-to-defaults is the escape hatch (interpretation #6); only revisit if accidental-persistence-on-Back is reported.
- **Presets / strict-vs-loose bundles** — explicitly rejected by the user; strict-by-default is the posture (interpretation #13).
- **Re-pick root array path inside the wizard** — would need the parsed JSON + candidates threaded through; `DataSection`'s own `RootPickerModal` covers re-pick; defer.
- **Workspace-name prompt as a step** — `WelcomeView` auto-rename covers most cases; defer.
- **Re-inference consuming the (now persistent) inference options post-IR** — the options are editable after a schema exists, but nothing re-runs `infer()` with them until **PR FF** (re-infer + reconcile) lands. That consumption + any "Re-infer" affordance is PR FF's scope, not this PR's.

## Open questions

- **None blocking.** The adversarial pass refuted draft framings (D1 "full panel," D2 "`readOnly=irExists` covers post-IR," D3 "hides nothing needed," D4 "step-2 commit is equivalent") and each was revised inline into interpretations #6, #7/#8, #9/#10, and #11. D5 (clickable stepper) was upheld. The earlier post-IR read-only proposal is **dropped**: it contradicted the PR FF spec (which tunes inference options in this dialog before re-inferring), so the options are persistent and always editable (interpretation #8), not cold-start-only.

