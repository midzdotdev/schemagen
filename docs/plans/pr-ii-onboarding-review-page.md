# PR II — One-page onboarding review

> Status: **proposed**. Builds on PR HH (workspace wizard). Restructures the first-import surface from a three-step wizard into a single scrolling review page, and reshapes the welcome view around the primary on-ramp (paste). Inference options leave the onboarding path entirely.

## Context

PR HH introduced a three-step wizard (Data → Identity → Inference → Generate). Living with it surfaced friction that's structural, not cosmetic:

- **The "3 of 3" framing reads like a survey.** Each step gates the next behind a `Continue →`, but none of them actually needs to. Identity has a sensible default (`proposeIdentityKey`), inference has working defaults, and the data review is a glance. The user does the work three times — once to read each step's headline, once to click through — for one decision (Generate).
- **Inference options don't belong on the first-impression path.** Most users don't know what `maxCardinality` means until they've seen an IR. The wizard step is just a card pointing at a dialog that already opens from the header (Sliders button). A first-time user reads it as "another decision I need to make to proceed" — which is false.
- **The welcome view treats four on-ramps as peers.** Sample datasets, paste, file upload, bundle restore. The actual usage shape is heavily lopsided: paste covers "have JSON, want to try this"; samples cover "have nothing, want to explore"; file upload is a fallback for large data; bundle restore is for returning users. Equal weight buries the common path.
- **There's no orientation moment after Generate.** The wizard ends and the user lands on the three-pane shell with the records sidebar collapsed. The schema panel just appears. No hint about what's clickable, no signpost to the inspector. The records sidebar in particular is collapsed by default — which is right for repeat sessions, wrong for the first one.

This PR is the reshape, not a fresh design. PR HH's plumbing — the wizard host, the per-step components, `wizardCompleted` UIPref, `proposeIdentityKey` seed, the IdentityPicker extraction — stays. The host's *shape* changes from three slides to one page, the welcome view's *weights* shift, and a small post-Generate banner gets added.

PR HH is currently open as #68. This PR supersedes its UI shape, so the working branch should be opened **on top of** the existing wizard branch — landing PR HH first keeps the diff for review focused. If product decides to skip PR HH and go straight to PR II, the components still apply; the diff just spans more files.

## Trigger

Unchanged from PR HH:

- `records.length > 0`
- `ir === null`
- `wizardCompleted === false` (per-workspace UIPref)

The slot in `App.tsx` that today renders `<WorkspaceWizard />` instead renders `<ReviewPage />` (rename). Trigger logic doesn't move.

## Resolved interpretations

Each one is a deviation from a literal "just merge the steps". Flagged for sign-off before tests harden around it.

1. **Single scrolling page, not a stepper.** No step counter, no Continue/Back. The page renders Data, Identity, then a Generate footer, in that vertical order, all visible at once. Sticky page header (workspace name + close affordance) and sticky footer with Generate — body scrolls between them. Justification: the three steps were already non-blocking (each had a sensible default); the only forced sequencing was UI, not data.
2. **Inference is *not* a section on this page.** It's deleted from onboarding entirely. The existing Sliders button in `AppHeader` opens `InferenceOptionsDialog`, which already works pre-IR; that's the surface. Onboarding shows nothing about inference. A first-time user who never opens the dialog gets defaults — which the deferred PR Z plan explicitly says are right for the common case.
3. **"Skip wizard" is gone.** With a single Generate button at the bottom, there's no faster path to skip toward — Generate *is* the fast path. Removes a fork that confused first-time users.
4. **Generate button is footer-anchored and shows field count.** `Generate schema (8 fields)` where `8` is the top-level field count from `computeFieldTree(records)`. Reassures the user that schemagen has parsed something real before they click. Field count is the cheap, honest signal — record count is already on the page.
5. **Welcome view's primary CTA becomes paste.** The paste textarea moves above the sample row and gets bigger (rows=8). Samples row stays as a secondary band beneath. File upload and bundle restore collapse into a single "More ways to start" disclosure (`<details>`) at the bottom. Drag-and-drop hint stays — it's free affordance, not screen real estate.
6. **Post-Generate orientation hint.** First time `ir` flips from null to non-null in a workspace, render a dismissible banner above the schema panel: "Click any field in the schema to edit it in the inspector. Use ⌘Z to undo." Stored as `orientationHintDismissed: boolean` UIPref (per-workspace). Banner styling mirrors `StorageBanner`. One sentence, one dismiss button — no walkthrough overlay, no spotlight.
7. **Records sidebar default-expanded on first Generate.** Today `recordsSidebarCollapsed` defaults to false (sidebar expanded), but in practice many users see it collapsed from a previous session. We don't need to change the default — but on the transition from review page → three-pane (i.e., when `ir` is first set in this workspace), explicitly write `recordsSidebarCollapsed = false`. The user can collapse it manually after; we only force-expand on the first reveal.
8. **`wizardCompleted` UIPref stays, gets renamed to `onboardingCompleted`.** Same semantics, more honest name. Migration: on read, fall back to the old key if present. (Pure localStorage, so the cost of a stale key on disk is negligible — no Dexie schema bump.)
9. **No name change to "review", "setup", or "checklist" in user-visible copy.** The headline becomes `Review your import` — a verb the user is actually doing, not a category label.

## Page layout (visual)

```
┌─────────────────────────────────────────────────────────┐
│ Review your import                       [ × close ]    │  ← sticky header
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ RECORDS ROOT ───────────────────────────────┐        │
│ │ Defines the path at which your records live. │        │  ← StepData,
│ │ Root: (root)  ·  20 records      [Change…]   │        │    repurposed
│ │                                              │        │    as a section
│ │ ┌─ SAMPLE RECORD ─────────────────────────┐  │        │
│ │ │ { "id": 41089755,                       │  │        │
│ │ │   "title": "…",  …                      │  │        │
│ │ │ }                                       │  │        │
│ │ └─────────────────────────────────────────┘  │        │
│ └──────────────────────────────────────────────┘        │
│                                                         │
│ ┌─ IDENTITY KEY ───────────────────────────────┐        │
│ │ What makes a record unique.                  │        │  ← StepIdentity,
│ │ ☑ Show nested fields                         │        │    repurposed
│ │ ┌──────────────────────────────────────────┐ │        │
│ │ │ ☑ id                          number     │ │        │
│ │ │ ☐ title                       string     │ │        │
│ │ │ ☐ url                         string     │ │        │
│ │ └──────────────────────────────────────────┘ │        │
│ │ Using id: 20 unique records, 0 duplicates    │        │
│ └──────────────────────────────────────────────┘        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                       [ Generate schema (8 fields) → ]  │  ← sticky footer
└─────────────────────────────────────────────────────────┘
```

The two existing per-step components (`StepData`, `StepIdentity`) shed their `<WizardStepShell>` wrappers and become section-styled cards. Their internal helper text + controls don't change. `StepInference.tsx` is deleted.

## File-level edit map

All paths under `packages/web/src/` unless otherwise noted.

### New files

- **`components/welcome/ReviewPage.tsx`** — the host. Owns the sticky header + footer chrome, renders `<DataSection>` then `<IdentitySection>`, and the footer Generate button. No step state. Computes top-level field count via `computeFieldTree(records)` (uses the array length of the root level).
- **`components/welcome/OrientationHint.tsx`** — small dismissible banner above the schema panel, rendered only when `orientationHintDismissed === false`. Sets the pref on dismiss.

### Renamed files

- **`components/welcome/WorkspaceWizard.tsx` → removed.** Its concerns (mode switch, completion flag flip, Generate handler) move into `ReviewPage.tsx`.
- **`components/welcome/StepData.tsx` → `components/welcome/DataSection.tsx`.** Drops `onContinue` / `onSkip` props (no footer to drive). Body unchanged — sub headline, helper text, root picker trigger, sample record `JsonTree`.
- **`components/welcome/StepIdentity.tsx` → `components/welcome/IdentitySection.tsx`.** Drops `onContinue` / `onSkip` / `onBack` props. Commits the identity choice on every change (no longer "on Continue") so the footer Generate button reads `identityConfig` as already in store.
- **`components/welcome/WizardStepShell.tsx` → deleted.** No more per-step shell. Section wrapper is a plain `<section>` with shared utility classes inline (only two callers, no need to abstract).

### Deleted files

- **`components/welcome/StepInference.tsx`** and its test file.
- **`components/welcome/WorkspaceWizard.tsx`** and its test file (replaced by `ReviewPage.test.tsx`).
- **`components/welcome/WizardStepShell.tsx`** (no callers).

### Modified files

- **`components/welcome/WelcomeView.tsx`** — restructure the body:
  - Hero unchanged.
  - **Paste section moves above samples**, with `rows={8}`, `placeholder` unchanged, primary `Import` button beneath. Keeps the "drag a .json file anywhere" hint.
  - Samples row stays as a secondary band beneath paste. Same three sample cards; same handlers.
  - File upload + bundle restore collapse into a single `<details>` block at the bottom labelled "More ways to start" — body contains both the `<input type="file">` for raw data and the bundle import.
  - Resume copy ("Or pick a previous workspace from the switcher…") moves inside the disclosure.
- **`hooks/useUIPrefs.ts`** — add `orientationHintDismissed: boolean` (default false); rename `wizardCompleted` → `onboardingCompleted` with a read-time fallback to the old key so existing users don't re-see the page after this ships.
- **`App.tsx`** — the conditional that renders `<WorkspaceWizard />` renders `<ReviewPage />`. The post-IR shell wraps its `<SchemaPanel />` in a wrapper that renders `<OrientationHint />` on top when not dismissed.
- **`state/init.ts` (or wherever the post-Review Generate hand-off currently lives)** — when `inferSchema()` is called from `ReviewPage`, also write `recordsSidebarCollapsed = false` and `onboardingCompleted = true` to the UIPrefs for the active workspace before the IR transition lands.

### Notably unchanged

- `IdentityPicker.tsx`, `RootPickerModal.tsx`, `JsonTree.tsx`, `field-stats.ts`, `type-colors.ts`, persistence layer, store actions. PR II is layout-and-flow, not wiring.
- `AppHeader.tsx`'s Sliders button (inference options trigger) keeps its current behaviour. It just gains importance, since onboarding no longer mentions inference at all.

## State + action surface

Reads:
- `records`, `ir`, `identityConfig`, `inferenceOptions` (same as PR HH).
- `onboardingCompleted` UIPref (replaces `wizardCompleted`).
- `orientationHintDismissed` UIPref (new).

Writes:
- `setIdentityConfig(config | null)` — fires on every selection change in `IdentitySection`, not on a Continue button.
- `inferSchema()` — fires when the footer Generate button is clicked.
- `recordsSidebarCollapsed = false` (UIPref) — fires alongside `inferSchema()`.
- `onboardingCompleted = true` (UIPref) — fires alongside `inferSchema()`.
- `orientationHintDismissed = true` (UIPref) — fires from the banner's dismiss button.

No new store slices.

## Test catalog

Each test cites a section of this plan in a leading comment.

### `test/components/welcome/ReviewPage.test.tsx` (new)

- **II-R1** — Renders the page (no stepper) when records exist, no IR, and `onboardingCompleted` is false.
  Plan § "Trigger".
- **II-R2** — Does not render when `onboardingCompleted` is true; App falls through to the cold-start three-pane.
  Plan § "Trigger".
- **II-R3** — Renders both `DataSection` and `IdentitySection` in the same scroll view (single page, not a stepper).
  Plan § "Resolved interpretations #1".
- **II-R4** — Footer Generate button label includes the top-level field count, e.g. `Generate schema (8 fields)`.
  Plan § "Resolved interpretations #4".
- **II-R5** — Clicking Generate calls `inferSchema()`, writes `recordsSidebarCollapsed = false` and `onboardingCompleted = true` to UIPrefs for the active workspace.
  Plan § "State + action surface".
- **II-R6** — No "Skip" or "Continue" buttons appear anywhere on the page.
  Plan § "Resolved interpretations #3".
- **II-R7** — No inference-options card or summary appears on the page.
  Plan § "Resolved interpretations #2".

### `test/components/welcome/DataSection.test.tsx` (new, replaces `StepData.test.tsx`)

Reuses HH-D test bodies where behaviour is unchanged — the section still shows root, record count, sample record. Two updates:

- **II-D1** — Renders without an `onContinue` or `onSkip` prop (component signature changed).
  Plan § "File-level edit map" — DataSection.
- **II-D2** — No `<WizardStepShell>` element / no eyebrow "1 of 3" copy.
  Plan § "Resolved interpretations #1".

Carry forward: HH-D2 (root change opens modal), HH-D5a (sample record renders) — renamed to II-D3, II-D4.

### `test/components/welcome/IdentitySection.test.tsx` (new, replaces `StepIdentity.test.tsx`)

- **II-I1** — Selecting a field commits via `setIdentityConfig` immediately, with no Continue button click.
  Plan § "File-level edit map" — IdentitySection.
- **II-I2** — Dedup preview updates on selection change (carry forward HH-I2).
- **II-I3** — Dedup preview reads "No identity key selected" when selection is empty (carry forward HH-I3).
- **II-I4** — "Show nested fields" checkbox toggles the picker's `showAll` (carry forward existing test).

### `test/components/welcome/WelcomeView.test.tsx` (extend)

- **II-WV1** — Paste textarea appears above the sample row in DOM order.
  Plan § "Resolved interpretations #5".
- **II-WV2** — File upload control is inside a `<details>` element labelled "More ways to start", not at top-level.
  Plan § "Resolved interpretations #5".
- **II-WV3** — Bundle import control is inside the same `<details>` block.
  Plan § "Resolved interpretations #5".
- **II-WV4** — Drag-and-drop hint copy stays visible on the page (not behind the disclosure).
  Plan § "Resolved interpretations #5".

### `test/components/welcome/OrientationHint.test.tsx` (new)

- **II-O1** — Renders when `orientationHintDismissed === false`.
  Plan § "Resolved interpretations #6".
- **II-O2** — Does not render when dismissed.
  Plan § "Resolved interpretations #6".
- **II-O3** — Dismiss button writes `orientationHintDismissed = true` to UIPrefs.
  Plan § "Resolved interpretations #6".
- **II-O4** — Copy includes the inspector tip and the ⌘Z undo tip (verbatim from plan).
  Plan § "Resolved interpretations #6".

### `test/hooks/useUIPrefs.test.ts` (extend)

- **II-U1** — `orientationHintDismissed` defaults to false.
- **II-U2** — `onboardingCompleted` reads back as true when the legacy `wizardCompleted` key is set in localStorage.
  Plan § "Resolved interpretations #8" — migration fallback.
- **II-U3** — Writing `onboardingCompleted` writes the new key, not the legacy one.

### `test/App.test.tsx` (extend, if exists; otherwise spec via ReviewPage tests)

- **II-A1** — The conditional renders `ReviewPage` (not the deleted `WorkspaceWizard`) when records exist and IR is null.
- **II-A2** — After Generate, the records sidebar is expanded (`recordsSidebarCollapsed === false` in store/UIPrefs).
  Plan § "Resolved interpretations #7".

### Deleted tests

- `test/components/welcome/WorkspaceWizard.test.tsx` (replaced by `ReviewPage.test.tsx`).
- `test/components/welcome/StepData.test.tsx` (replaced by `DataSection.test.tsx`).
- `test/components/welcome/StepIdentity.test.tsx` (replaced by `IdentitySection.test.tsx`).
- `test/components/welcome/StepInference.test.tsx` (StepInference removed).

## Implementation phasing

Each phase starts from the test catalog above (no production code), per the TDD-with-spec-traceability rule. A phase is a coherent slice; if a test misinterprets the plan, restart that phase from zero with a revised catalog.

1. **Phase 1 — UIPrefs (II-U1, II-U2, II-U3).** Add `orientationHintDismissed`; rename + fallback for `onboardingCompleted`. Pure data layer change; nothing visual yet.
2. **Phase 2 — ReviewPage scaffold + App.tsx gate (II-R1, II-R2, II-R3, II-A1).** Render an empty `ReviewPage` matching the trigger conditions; the page renders DataSection + IdentitySection sections (still backed by the renamed StepData / StepIdentity components) inside the page, but the sections are temporarily props-passed (no behavioural change beyond shape).
3. **Phase 3 — DataSection rename + WizardStepShell removal in StepData (II-D1, II-D2, II-D3, II-D4).** Drop step shell, drop props. Tests carried over from HH-D verify carryover behaviours.
4. **Phase 4 — IdentitySection commit-on-change (II-I1, II-I2, II-I3, II-I4).** Wire `setIdentityConfig` to selection change inside the section. No footer to drive.
5. **Phase 5 — Generate footer with field count + post-Generate writes (II-R4, II-R5, II-R6, II-R7, II-A2).** Footer Generate button; computes field count; calls `inferSchema`, expands records sidebar, flips `onboardingCompleted`. Removes Skip remnants.
6. **Phase 6 — WelcomeView restructure (II-WV1, II-WV2, II-WV3, II-WV4).** Paste above samples; file + bundle behind `<details>`; drag hint stays visible.
7. **Phase 7 — OrientationHint (II-O1, II-O2, II-O3, II-O4).** Banner over schema panel; dismiss writes UIPref.
8. **Phase 8 — Delete StepInference, WorkspaceWizard, WizardStepShell + their tests.** Pure removal — typecheck + remaining test green run is the gate.

## Verification

After implementation:

- `pnpm typecheck` clean.
- `pnpm test --filter @schemagen/web` green.
- `pnpm lint` clean (Biome).
- Manual run:
  1. Fresh workspace via the switcher. Welcome view: paste textarea is the first interactive element under the hero; samples row is below it; "More ways to start" disclosure is at the bottom.
  2. Click a sample. Lands on the review page with both Data and Identity visible in a single scroll. No "1 of 3" / "Continue" anywhere.
  3. Toggle a different identity field. Dedup preview updates. No Apply / Continue button required.
  4. Open the Sliders dialog from the header. Tune `maxCardinality`. Apply. Returns to the review page.
  5. Footer Generate button reads `Generate schema (N fields)` with N matching the top-level field count.
  6. Click Generate. Lands on the three-pane shell with the records sidebar **expanded** and an OrientationHint banner above the schema panel.
  7. Dismiss the banner. Reload. Banner stays dismissed.
  8. Switcher → New workspace → repeat. Banner shows again (per-workspace pref).
  9. Visit a workspace that already has `wizardCompleted` set under the legacy key (from PR HH). Review page does not re-appear (migration fallback).

## Out of scope

- **Sample record annotations.** Inline badges on the JsonTree showing "always present" / "sometimes missing" per field — interesting, but pre-IR stats are noisy with small samples and a half-correct annotation is worse than none. Revisit after the orientation hint lands and we see whether users actually want pre-Generate hints.
- **Persistence banner upgrade.** The StorageBanner copy is still terse / scary. Worth a pass but unrelated to the onboarding shape.
- **First-time export walkthrough.** "You generated a schema — here's how to download it as JSON Schema / Zod." Belongs in a later PR once we have a stable export surface.
- **Workspace switcher simplification.** Today's switcher dropdown is fine for ≤10 workspaces; simplification is a different problem space.
- **Workspace name prompt as a section.** Auto-rename from sample/file filenames covers most cases; pasted JSON gets the default name. Out of scope per PR HH's same call.
- **Re-pick root array path as part of the review page.** Already accessible via the Change… button inside the Records root section; no new surface needed.
- **Tutorial overlay / docs prose.** The OrientationHint is one sentence by design; expanding into a guided tour belongs in a separate "what is a JSON schema?" effort.
- **Inference visibility on this page.** Explicit per Resolved Interpretation #2 — inference is the header Sliders button, not an onboarding section.
