# PR HH — New-workspace wizard

> Status: **proposed**. Builds on the welcome view (records sidebar branch). Owns the first-import flow from "records just landed" to "schema generated", structured as three confirm-and-continue steps.

## Context

Today on a fresh workspace, after the user imports their first batch via the WelcomeView, two things happen behind the scenes:

1. `IdentitySuggestion` may quietly appear as a small banner.
2. The user has to find the **Generate schema** CTA to produce an IR.

Both decisions (identity key, inference options) are buried — discoverable but easy to miss. The user wants a guided three-step flow that surfaces these before the schema is generated, so the first import feels intentional rather than "you've imported, now poke around".

## Trigger

Wizard runs when **all** of these are true:

- `records.length > 0`
- `ir === null`
- `wizardCompleted === false` (per-workspace UIPref; default false; localStorage only — see "Persistence")

Once it finishes (Generate) or the user skips it, `wizardCompleted` flips to true for that workspace. Adding records later (PR FF re-infer / Add data) does **not** re-trigger.

Legacy workspaces with an IR already auto-skip via the first two conditions — no retroactive wizard.

## Resolved interpretations

Locked in based on the user's feedback so far. Anything called out here is a deviation from a literal reading of the brief.

1. **Three steps, in order: Data → Identity → Inference → Generate.** The user asked for two (Identity + Inference); added Data as Step 1 for a "did the import work?" reassurance.
2. **Data preview's first record is collapsed by default.** Records can be large; default-expanded would dominate the viewport. A `<details>` element with a "Show first record" summary is the simplest fit.
3. **Identity picker is inline, not modal.** Extract the existing `IdentityConfigDialog` body into `IdentityPicker` and reuse it both inline (wizard) and as the dialog body (preserves the header icon entry). The dedup preview re-computes on every selection change.
4. **Inference options stay modal-first.** Show a compact summary on the wizard step, open the existing `InferenceOptionsDialog` for changes. The dialog is dense enough that inlining it would dominate the step.
5. **Skip-wizard = fast-forward.** A single "Skip" action at any step calls `inferSchema()` with whatever the current state is (identity if confirmed, default inference options) and lands the user in the main view. Not "drop to 3-pane cold-start" — that just defers the same decision.
6. **`wizardCompleted` is UI state, not workspace data.** Stored in `UIPrefs` localStorage (per-workspace key), not Dexie meta. Worst case after a `localStorage.clear()` is that the user sees the wizard once more — fine.
7. **No "Back to welcome" affordance for now.** Each step has `Back` (prev step) and `Continue` (next step). To return to the welcome state, the user can delete the workspace from the switcher. Adding "Back to welcome" needs `clearRecords` mechanics we don't have.

## Step-by-step content

### Step 1 — Your data

- Headline: `1 of 3 · Your data`
- Sub: "We received {N} records. Here's a quick look before you set up identity and inference."
- Stat card: record count, top-level shape, top-level field count (using `computeFieldStats(records)`).
- Field-stats peek: "{P} primitive fields, {C} compound (object/array)."
- **First record** under a `<details>` element, closed by default. JSON pretty-printed at `text-xs` with horizontal scroll.
- Actions: `Continue →` (primary). `Skip wizard` (subdued link, bottom-right).

### Step 2 — Identity key

- Headline: `2 of 3 · Identity key`
- Sub: "How schemagen recognises the same record across imports. Pick a stable primitive field so re-imports dedup correctly."
- Inline `IdentityPicker`: checkbox list of primitive fields with uniqueness + presence stats, composite-uniqueness readout when 2+ are selected, on-duplicate radio set.
- **Live dedup preview** beneath the picker: `Using {label}, your {N} records would yield {U} unique records ({D} duplicates)`. Recomputes via `dedupeByIdentity` on every selection / mode change. When nothing is selected: "No identity key selected — every record kept distinct."
- Actions: `← Back` · `Continue →` (primary) · `Skip wizard`.
- Continue commits the choice via `setIdentityConfig({ fields, onDuplicate })`. If the picker is empty the button reads `Skip identity` and continues without committing.

### Step 3 — Inference options

- Headline: `3 of 3 · Inference options`
- Sub: "Schemagen will derive types, optionality, and literal unions from your records. Defaults are usually right."
- Summary card: compact rows summarising the current `InferOptions`. For each option, show "default" or the user's override in muted code.
- Actions: `← Back` · `Generate schema` (primary) · `Adjust options…` (opens existing `InferenceOptionsDialog`) · `Skip wizard`.
- Both `Generate schema` and `Skip wizard` call `inferSchema()`, flip `wizardCompleted` to true, and unmount the wizard. The only difference: `Skip wizard` can be hit from any step.

## File-level edit map

### New files

- **`components/welcome/WorkspaceWizard.tsx`** — the wizard host. Owns step state (`'data' | 'identity' | 'inference'`), renders the active step, handles Back/Continue/Skip wiring.
- **`components/welcome/WizardStepShell.tsx`** — small layout primitive used by every step (centred container, headline, sub, body slot, action bar with Back/Continue/Skip).
- **`components/welcome/StepData.tsx`** — Step 1 body.
- **`components/welcome/StepIdentity.tsx`** — Step 2 body. Local state for `selected` / `mode`; commits on Continue.
- **`components/welcome/StepInference.tsx`** — Step 3 body. Reads `inferenceOptions`; opens dialog for change.
- **`components/identity/IdentityPicker.tsx`** — extracted from `IdentityConfigDialog`. Stateless: receives `selected`, `mode`, `onSelectedChange`, `onModeChange`.

### Modified files

- **`components/identity/IdentityConfigDialog.tsx`** — render `<IdentityPicker>` for the body. Keep dialog-level controls (Apply / Cancel / Remove identity key / dropped-count warning).
- **`hooks/useUIPrefs.ts`** — add `wizardCompleted: boolean` (default false).
- **`App.tsx`** — extend the mode condition: `records.length > 0 && ir === null && !wizardCompleted` → `<WorkspaceWizard />`. Wizard sits between WelcomeView and cold-start 3-pane in the conditional.

### Deleted files

None.

## State + action surface

No new store slices. Wizard reads:

- `records` (for data preview + identity picker + dedup count)
- `identityConfig` (default selection for picker)
- `inferenceOptions` (summary on Step 3)

And calls:

- `setIdentityConfig(config | null)` (Continue from Step 2)
- `setInferenceOptions(options)` (only if the user opens the dialog)
- `inferSchema()` (Generate or Skip)

`wizardCompleted` lives in `UIPrefs` and is set by the wizard host on Generate / Skip.

## Test catalog

Each test cites a section of this plan in a leading comment.

### `test/components/welcome/WorkspaceWizard.test.tsx` (new)

- **HH-W1** — Renders Step 1 when first mounted with records + no IR + wizardCompleted=false.
  Plan § "Trigger".
- **HH-W2** — Does not render when wizardCompleted=true. App falls through to the cold-start 3-pane.
  Plan § "Trigger".
- **HH-W3** — Does not render when IR is non-null even if wizardCompleted=false.
  Plan § "Trigger" — legacy guard.
- **HH-W4** — `Continue →` from Step 1 advances to Step 2.
  Plan § "Step 1 — Your data".
- **HH-W5** — `← Back` from Step 2 returns to Step 1.
  Plan § "Step 2 — Identity key".
- **HH-W6** — `Continue →` from Step 2 with a selected field calls `setIdentityConfig(...)` then advances to Step 3.
  Plan § "Step 2 — Identity key".
- **HH-W7** — `Continue →` from Step 2 with no selection skips identity (no setIdentityConfig call) and still advances.
  Plan § "Step 2 — Identity key" — `Skip identity` semantics.
- **HH-W8** — `Generate schema` on Step 3 calls `inferSchema()` AND flips `wizardCompleted` to true.
  Plan § "Step 3 — Inference options".
- **HH-W9** — `Skip wizard` from any step calls `inferSchema()` AND flips `wizardCompleted` to true.
  Plan § "Resolved interpretations #5".

### `test/components/welcome/StepData.test.tsx` (new)

- **HH-D1** — Renders the record count and top-level shape.
  Plan § "Step 1 — Your data".
- **HH-D2** — First-record `<details>` element is closed by default.
  Plan § "Resolved interpretations #2".
- **HH-D3** — Primitive/compound field count matches `computeFieldStats` output.
  Plan § "Step 1 — Your data".

### `test/components/welcome/StepIdentity.test.tsx` (new)

- **HH-I1** — Inline picker renders the primitive fields from `computeFieldStats`.
  Plan § "Step 2 — Identity key".
- **HH-I2** — Dedup preview updates when the selected field changes.
  Plan § "Step 2 — Identity key" — "Live dedup preview".
- **HH-I3** — Dedup preview reads "No identity key selected" when selection is empty.
  Plan § "Step 2 — Identity key".

### `test/components/welcome/StepInference.test.tsx` (new)

- **HH-N1** — Summary renders each `InferOptions` row with its current value (default or overridden).
  Plan § "Step 3 — Inference options".
- **HH-N2** — `Adjust options…` opens the existing `InferenceOptionsDialog` (asserted via `openModal` spy or rendered dialog visibility).
  Plan § "Step 3 — Inference options".

### `test/components/identity/IdentityConfigDialog.test.tsx` (extend)

- Existing tests should keep passing after `IdentityPicker` extraction. Spot-check that the inline picker emits the same `selected` / `mode` interactions.

## Implementation phasing

Each phase opens with no production code beyond a no-op `WorkspaceWizard` placeholder, then adds the tests + minimum code per the catalog above. A phase is a coherent slice — failing tests → implementation → green.

1. **Phase 1 — IdentityPicker extraction.** Lift the dialog body. Existing dialog tests stay green. (Done in this branch — extracted ahead of plan write-up.)
2. **Phase 2 — Wizard scaffold + UIPref + App.tsx gate (HH-W1, HH-W2, HH-W3).** Render an empty wizard host when conditions match; cover the gate logic.
3. **Phase 3 — Step 1: Data (HH-D1, HH-D2, HH-D3).** Build StepData with stats + collapsed first record. Wire Continue.
4. **Phase 4 — Step 2: Identity (HH-W5, HH-W6, HH-W7, HH-I1, HH-I2, HH-I3).** Wire IdentityPicker into StepIdentity with local state + live dedup preview. Back/Continue/Skip.
5. **Phase 5 — Step 3: Inference (HH-W8, HH-N1, HH-N2).** Summary + Adjust button + Generate.
6. **Phase 6 — Skip wizard (HH-W9).** Subdued link in WizardStepShell; common handler in the wizard host.

## Verification

After implementation:

- `pnpm typecheck` clean.
- `pnpm test --filter @schemagen/web` green; new test count matches catalog.
- Manual run:
  1. Create a fresh workspace.
  2. Pick a sample on the welcome view.
  3. See Step 1 with the right record count and the first record collapsed.
  4. Continue → Step 2. See the proposed identity field highlighted. Toggle it; dedup preview updates.
  5. Continue → Step 3. See the inference options summary. Click `Adjust options…`; dialog opens with current values seeded; Cancel returns to Step 3.
  6. Click `Generate schema`. IR appears; wizard unmounts; main view shows the records sidebar + schema tree.
  7. Reload the page. Wizard does NOT re-show (wizardCompleted persisted in localStorage).
  8. Switcher → New workspace → import again. Wizard shows for that workspace.

## Out of scope

- Re-pick root array path (would need to thread the parsed JSON + candidates through to the wizard; defer until users ask for it).
- Workspace name prompt as a wizard step (the welcome view's auto-rename from sample/file filenames mostly covers this; pasted JSON gets the default name).
- Identity recipes / templates (e.g. "pick a UUID-style field").
- IR preview before Generate (the schema panel already shows it immediately after Generate).
- Tutorial overlays / docs prose ("what is a schema?").
- Per-field type overrides pre-generate (belongs in the inspector, post-Generate).
