# PR II — One-page onboarding review

> Status: **superseded** by [`pr-ii-revised-onboarding-wizard.md`](./pr-ii-revised-onboarding-wizard.md). The single-page `ReviewPage` shipped briefly, then was replaced by a stepped wizard (`WizardHost` + visual stepper) after review feedback. The reusable parts this plan introduced — `DataSection`, `IdentitySection`, `OrientationHint`, the `useUIPrefs` rename + `writeUIPrefBag`, and the WelcomeView restructure — all carried forward; only the single-page host was swapped for the stepped one. Kept for history.
>
> Original status: **proposed**. Builds on top of PR HH (#68 — workspace wizard scaffold). PR HH lands the three-step wizard host, `WizardStepShell`, `StepData`, `StepIdentity`, `StepInference`, the extracted `IdentityPicker`/`JsonTree`/`RootPickerModal`, and the `wizardCompleted` UIPref. PR II **supersedes PR HH's UI shape**: it collapses the three-step wizard into a single scrolling review page (`ReviewPage`) with a sticky-footer Generate button, while reusing PR HH's component extractions and store wiring verbatim. The working branch should be opened **on top of** PR HH (`feat/workspace-wizard`); PR HH must merge first so the rename/delete file map applies cleanly. If PR HH is abandoned, PR II must be rewritten so `ReviewPage`/`DataSection`/`IdentitySection` are net-new files rather than renames.

## Context

PR HH ships a three-step wizard (Data → Identity → Inference) inside a `WizardStepShell` (sticky header counter, scrollable body, sticky footer Back/Continue, header Skip-wizard link). The shell itself works well; the steppering is the wart. Discovery against the real code confirmed (and corrected earlier drafts on) the following:

- The `WizardStepShell` chrome (sticky-header/body/footer) is exactly the layout primitive a single-page review wants — minus the `N of 3` counter and the Skip link.
- `IdentityPicker` is already extracted and computes its own live dedup preview locally via `dedupeByIdentity`.
- `AppHeader`'s Sliders button (`components/shell/AppHeader.tsx`) is unconditionally mounted and opens `InferenceOptionsDialog` via the existing `UIShell` modal slot. (Superseded note: the dialog used to be read-only post-IR via a disabled fieldset; it is now editable in all states — inference options are a persistent setting feeding initial inference and re-inference, not cold-start-only.)
- **`store.setIdentityConfig` is destructive**: it runs `dedupeByIdentity(records, config)` and writes `records: kept` synchronously, returning `droppedCount`. Any commit-on-every-keystroke wiring would silently destroy records on the first toggle. (This reverses an earlier draft's commit-on-change plan.)
- `useUIPref`'s setter closes over a stale `bag` snapshot. Two chained setters from the same handler clobber each other — multi-key writes need a single merged write.
- **`DEFAULT_PREFS.recordsSidebarCollapsed` is `true`** (collapsed) — not `false` as an earlier draft assumed. Force-expand on first Generate is a real override, not a no-op.
- **`computeFieldStats(records)` (in `packages/web/src/lib/field-stats.ts`) is the real helper**; `.length` gives the top-level field count. There is no `computeFieldTree` helper — earlier drafts naming one were wrong.
- `GenerateSchemaCard.tsx` (`components/schema-tree/GenerateSchemaCard.tsx`) is the existing pre-IR CTA inside `SchemaPanel`, with its own "Customise" link to the inference dialog. Under PR II it becomes dead code and must be deleted, else it contradicts the single-Generate-surface goal.
- `useKeyboardShortcuts` stands down inside INPUT/TEXTAREA/contentEditable, so a "Cmd-Z to undo" hint is false in the exact field-editing context users would reach for it. The orientation hint copy drops that claim.

This PR replaces the wizard surface with one page, removes the inline inference step (keeping a one-line summary + Adjust link), and accepts a small set of explicit deviations from a literal "merge the three steps into one body" reading.

## Trigger

PR II's `ReviewPage` mounts when, for the active workspace, **records exist, IR is null, and onboarding is not yet complete**. The exact `App.tsx` gate:

```
records.length > 0 && ir === null && !onboardingCompleted
```

IR-presence beats `onboardingCompleted`: any branch where `ir !== null` routes through `ThreePaneLayoutPostIR`, never `ReviewPage`. `WelcomeView` continues to render whenever `records.length === 0 && ir === null` (the `isFresh` predicate stays unchanged and is independent of `onboardingCompleted`, so Reset returns the user to `WelcomeView` cleanly).

Bundle restore is the special case: `loadWorkspaceBundle` (in `state/init.ts`) writes `onboardingCompleted=true` into the new workspace's UIPref bag synchronously (a bundle implicitly represents a fully-onboarded workspace). A bundle with `ir !== null` lands in the post-IR shell; a bundle with `ir === null` lands in the records-only cold-start `PaneLayout` rather than `ReviewPage`.

## Resolved interpretations

Each one is a deliberate deviation from a literal "just merge the three steps" reading. Flagged for sign-off before tests harden around them. Items #2, #5, #6, #7, #9 are the ones an adversarial review pass revised away from the first draft — read those closely.

1. **Single scrolling page, no stepper.** `ReviewPage` reuses `WizardStepShell`'s sticky-header/body/footer pattern but drops the `N of 3` counter and the Skip link (the shell file itself is deleted — see #10). The body is one scrollable column with two stacked sections (Data, then Identity) and a "Tune inference" line beneath Identity. The page header reads `Review your data` with a subhead naming the record count and source (`3 records from hn-sample.json`). The sticky footer holds a single primary action: `Generate schema (N fields)`. This is the cheapest correct reshape — the picker and store actions already exist. We accept the discovery cost that two heavy blocks (`JsonTree` and `IdentityPicker`) are visible at once on short viewports; the sticky footer keeps Generate reachable.

2. **Inference options leave the body of onboarding, but a one-line inline summary survives.** The `AppHeader` Sliders button is the canonical surface and is always mounted. Inside `ReviewPage`, a single muted line beneath the Identity section reads `Inference: strict defaults · Adjust` (or `Inference: N overrides · Adjust` when overrides exist), where `Adjust` opens the same `InferenceOptionsDialog` via `useUIShell().openModal('inference-options')`. This preserves the no-stepper framing without betting first-run UX entirely on an unlabelled header icon — the refutation pass flagged "inference invisible to first-timers" as the strongest objection to a pure removal. The summary text reuses the existing options-summary helper that `GenerateSchemaCard` uses today.

3. **Skip wizard is removed.** The Skip link was the wizard's only fast-forward. Under PR II the equivalent is "scroll past everything and click the sticky-footer Generate" — Generate *is* the fast path. Removing Skip eliminates the dual-finish-path debt (today's `WorkspaceWizard.handleSkip` and `StepInference.handleGenerate` both end in `inferSchema()`). The footer label does NOT vary with identity selection (no `Skip identity` copy); only the field count varies. Recovery from a wedged state is the existing Reset workspace affordance.

4. **Footer label is `Generate schema (N fields)` pinned to `computeFieldStats(records).length` (top-level only).** A new `fieldCountLabel(records)` helper in `lib/field-stats.ts` handles pluralization (`1 field` vs `N fields`) and degenerate cases: when `computeFieldStats(records).length === 0` and records exist (non-object root), the label drops the parenthetical and reads `Generate schema`; when `records.length === 0`, the button is disabled and the count is hidden. `N` does not change with identity selection — identity affects which records survive, not how many top-level fields they have. The label is memoized on `records` identity.

5. **Identity selection is staged in local React state and commits ONCE on Generate.** (Reverses the first draft's commit-on-change.) `IdentitySection` owns a `selected: string[]` `useState`, lifted up to `ReviewPage` so the Generate handler can read it. Seeded from `identityConfig.fields` first (bundle restores), `identityProposal` second, `[]` otherwise. The live dedup preview ("3 records kept, 0 dropped") is computed locally via `dedupeByIdentity(records, draftConfig)`, never via `setIdentityConfig`. The Generate handler is the only call site that fires `setIdentityConfig` — because that store action destructively rewrites `records`. When the user touched the picker but ends with `selected === []`, Generate commits `setIdentityConfig({fields: []})` to clear stale config from a bundle restore; when the picker was never touched and `selected === []`, Generate skips the call.

6. **Generate handler owns three writes in one synchronous burst, in a strict order.** (1) `inferSchema()` first — synchronous, no-op if records empty or ir set, throws on malformed records; (2) only if step 1 did not throw, `setIdentityConfig({fields})` when needed; (3) only after both succeed, `writeUIPrefBag(workspaceId, { onboardingCompleted: true, recordsSidebarCollapsed: false })` via a new non-hook helper. A local `generating` ref makes double-clicks no-ops. If `inferSchema` throws, no UIPref writes occur, no identity commit occurs, and the user stays on `ReviewPage` with an inline error banner. The three-way transition is atomic from the user's perspective, and the single merged UIPref write dodges the stale-`bag`-closure clobber.

7. **The records sidebar is force-expanded on first Generate by overriding the default-`true` collapse.** Framing: "override the default-collapsed pref so first-Generate users immediately see the sidebar surface" — NOT "even if a previous workspace had it collapsed" (UIPrefs are per-workspace; cross-workspace bleed is incoherent). The write rides in the same `writeUIPrefBag` call that flips `onboardingCompleted`, so the App re-render observes both prefs and the IR flip in one commit, avoiding a one-frame collapsed-then-expanded flash.

8. **`wizardCompleted` is renamed to `onboardingCompleted` with a one-key read-time fallback.** `useUIPref` reads `bag.onboardingCompleted ?? bag.wizardCompleted ?? DEFAULT_PREFS.onboardingCompleted` (uses `??`, never `||`, so an explicit legacy `false` is preserved). `writeUIPrefBag` clears `bag.wizardCompleted` from the merged result on every write, so the legacy field self-retires after a workspace's first post-rename write. On `main` no production user can have written `wizardCompleted=true` (only feat-branch preview users), so the beneficiary cohort is small but real — the fallback is cheap insurance, not a migration.

9. **`OrientationHint` banner above `SchemaPanel` on first Generate.** A single dismissible banner shows once after Generate completes: copy reads `Click any field in the inspector to override its type.` The Cmd-Z claim is dropped (keyboard shortcuts stand down inside inputs — see Context). Dismissal writes `orientationHintDismissed=true` to the per-workspace UIPref bag. `role="status"`, `aria-live="polite"`, focusable Dismiss button. We accept the per-workspace scope trade-off (heavy users see the hint once per new workspace) rather than introduce a global localStorage key here; the global variant is tracked in Out of scope.

10. **`WizardStepShell` is deleted, not reused.** The shell has one caller, the chrome is ~30 lines, and inlining into `ReviewPage` is cheaper than carrying a layout primitive with conditional null-handling for `step`/`onSkip` props. The sticky-header/body/footer pattern lives directly in `ReviewPage`.

11. **`GenerateSchemaCard.tsx` is deleted in the same PR.** Its CTA and Customise link are subsumed by `ReviewPage`'s sticky footer + the inline `Adjust` link (#2). Without deletion it survives as a duplicate inline inference affordance inside `SchemaPanel` that contradicts #2.

12. **`ReviewPage` is keyed on `workspaceId` in `App.tsx`.** `<ReviewPage key={workspaceId} />` forces a full remount on workspace switch, so local `selected` state cannot leak from workspace A to B. Root re-pick (which fires `setRecords`) resets `selected` via a `useEffect` dep guard on the records reference.

## Page layout

```
+--------------------------------------------------------------+
| schemagen  [workspace v]  [Undo][Redo][KeyRound][Sliders][⌨][Export] |   <- AppHeader (always mounted)
+--------------------------------------------------------------+
| Review your data                                             |   <- ReviewPage sticky header
| 3 records from hn-sample.json                                |
+--------------------------------------------------------------+
| <section aria-labelledby="data-h">                           |
|  ## Data                                                     |
|  +--------------------------------------------------------+  |
|  | Records root: items[]              [3 records] [Change]|  |
|  +--------------------------------------------------------+  |
|  | {                                                      |  |
|  |   "id": 8863,                                          |  |
|  |   "title": "My YC app: ...",                           |  |
|  |   "by": "dhouston",                                    |  |
|  |   "score": 111,                                        |  |
|  |   "time": 1175714200                                   |  |
|  | }                                                      |  |
|  +--------------------------------------------------------+  |
| </section>                                                   |
|                                                              |
| <section aria-labelledby="identity-h">                       |
|  ## Identity (optional)                                      |
|  Pick fields that uniquely identify a record. Used to dedupe.|
|  +--------------------------------------------------------+  |
|  | [x] id        number      3 unique / 3 records         |  |
|  | [ ] title     string      3 unique / 3 records         |  |
|  | [ ] by        string      2 unique / 3 records         |  |
|  | > Show nested fields                                   |  |
|  +--------------------------------------------------------+  |
|  Preview: 3 records kept, 0 dropped by identity              |
|                                                              |
|  Inference: strict defaults · Adjust                         |
| </section>                                                   |
+==============================================================+
| [ Generate schema (5 fields) ]                               |   <- sticky footer
+--------------------------------------------------------------+
```

The sticky footer reserves `scroll-padding-block-end` equal to its height on the body so keyboard focus on the last identity row is never occluded.

## File-level edit map

### New files

- **`packages/web/src/components/welcome/ReviewPage.tsx`** — single-scrolling review host. Owns the sticky-header/body/footer layout (inlined from the deleted `WizardStepShell`), the lifted `selected` state, and the Generate handler. Reads `workspaceId`, `records`, `identityConfig`, `identityProposal`, `inferenceOptions`; calls `inferSchema`, `setIdentityConfig`, and `writeUIPrefBag`. Keyed on `workspaceId` at the App.tsx call site.
- **`packages/web/src/components/welcome/OrientationHint.tsx`** — dismissible banner rendered above `SchemaPanel` on first IR-present render for the workspace. Reads/writes `orientationHintDismissed` via `useUIPref`. `role="status"`, `aria-live="polite"`, focusable Dismiss button.
- **`packages/web/test/components/welcome/ReviewPage.test.tsx`** — host tests (II-R*).
- **`packages/web/test/components/welcome/DataSection.test.tsx`** — Data section tests (II-D*).
- **`packages/web/test/components/welcome/IdentitySection.test.tsx`** — Identity section tests (II-I*).
- **`packages/web/test/components/welcome/OrientationHint.test.tsx`** — Hint tests (II-O*).
- **`packages/web/test/components/welcome/WelcomeView.test.tsx`** — first-time coverage for the WelcomeView restructure (II-WV*).

### Renamed files

Use `git mv` to preserve history; the rename sweep is atomic with Phase 3/4.

- **`WorkspaceWizard.tsx` → `ReviewPage.tsx`** — host shell replaced; rename keeps PR HH's wizard-host commit history attached.
- **`StepData.tsx` → `DataSection.tsx`** — `WizardStepShell` wrapper stripped; renders as a `<section aria-labelledby="data-h">` card. Continues to own the `RootPickerModal` trigger and `JsonTree` preview.
- **`StepIdentity.tsx` → `IdentitySection.tsx`** — `WizardStepShell` stripped; `IdentityPicker` mount unchanged; live dedup preview retained. **No longer owns identity commit state** — `selected` is lifted to `ReviewPage` (props-down, callback-up).
- **`test/.../StepData.test.tsx` → `DataSection.test.tsx`** — carry over HH-D* assertions as II-D*.
- **`test/.../StepIdentity.test.tsx` → `IdentitySection.test.tsx`** — carry over HH-I* as II-I*; invert any "commit on Continue" assertions to "no commit until Generate".
- **`test/.../WorkspaceWizard.test.tsx` → `ReviewPage.test.tsx`** — most assertions dropped (stepper/Skip-specific); a few carry over as II-R*.

### Modified files

- **`packages/web/src/App.tsx`** — add the fourth mode-switch branch: when `records.length > 0 && ir === null && !onboardingCompleted`, render `<ReviewPage key={workspaceId} />`. The existing `isFresh` check (records=0 && ir=null) still routes to `WelcomeView` regardless of `onboardingCompleted`. `OrientationHint` is composed above `SchemaPanel` inside the `ThreePaneLayoutPostIR` schema slot via a fragment at the App.tsx call site (`workspaceId` already in scope).
- **`packages/web/src/hooks/useUIPrefs.ts`** — (a) rename type field `wizardCompleted` → `onboardingCompleted`; (b) add `orientationHintDismissed: boolean` (default `false`); (c) read-time fallback inside `useUIPref` so `onboardingCompleted` reads `bag.onboardingCompleted ?? bag.wizardCompleted ?? DEFAULT_PREFS.onboardingCompleted`; (d) export a non-hook `writeUIPrefBag(workspaceId, partial: Partial<UIPrefs>)` that reads localStorage fresh, merges `partial`, clears any legacy `wizardCompleted` key from the merge, writes back, and notifies subscribers — used by `ReviewPage`'s Generate handler and by `state/init.ts`'s bundle path. Document inline that `DEFAULT_PREFS` must stay a stable module-level reference.
- **`packages/web/src/components/identity/IdentityPicker.tsx`** — update the file-header comment from "render inline inside the new-workspace wizard" to "render inline inside the onboarding review page". No behavioural change.
- **`packages/web/src/components/welcome/WelcomeView.tsx`** — promote the paste card above the samples grid; move file upload + bundle restore into a single `<details>` titled `More ways to start`. Preserve the global drag hint as a top-of-page line so DropZone discoverability survives. Split `importError` so paste errors render under the paste card and sample errors under the samples grid; a file/bundle error forces the `<details>` open. **Note:** the deeper WelcomeView reshape (paste-path auto-rename parity, full mobile-keyboard handling, `.session.json` legacy audit) is orthogonal and tracked in Out of scope — this PR ships the minimal DOM reorder + disclosure required to land the new on-ramp ordering alongside `ReviewPage`.
- **`packages/web/src/state/init.ts`** — `loadWorkspaceBundle` calls `writeUIPrefBag(newWorkspaceId, { onboardingCompleted: true })` synchronously after records/IR are set and before the workspace is adopted, so bundle-restored workspaces never see `ReviewPage`. Confirm the adopt order detaches the previous persistence subscriber before hydrate and attaches the new one after, to prevent stale writes to the prior workspaceId.
- **`packages/web/src/lib/field-stats.ts`** — add `fieldCountLabel(records: unknown[]): string | null` returning `null` when records is empty, `"1 field"` for a single field, `"N fields"` otherwise, and `null` when `computeFieldStats(records).length === 0` and records is non-empty (signals "drop the count parenthetical").
- **`packages/web/src/components/inference/InferenceOptionsDialog.tsx`** — add a `useEffect([workspaceId])` that re-seeds local draft state from the store on workspace change, so opening the dialog, switching workspaces, and clicking Apply does not write A's edits into B. Existing pre-IR/post-IR mode + disabled fieldset behaviour unchanged.
- **`packages/web/src/components/shell/UIShell.tsx`** — close any open modal on `workspaceId` change (`useEffect([workspaceId])` calling `closeModal()`). Belt-and-braces for the same race.
- **`packages/web/test/components/app.test.tsx`** — update the existing pre-IR three-regions test to seed `onboardingCompleted=true` before rendering, so it keeps exercising the records-only `PaneLayout` branch and is not silently re-routed to `ReviewPage`. Add II-A* tests.
- **`packages/web/test/hooks/useUIPrefs.test.tsx`** — extend with II-U* (rename + fallback + multi-key writer).
- **`docs/plans/pr-hh-workspace-wizard.md`** — change status line to `> Status: **superseded by PR II** — wizard host and WizardStepShell removed; IdentityPicker extraction and proposeIdentityKey seed retained.`
- **`README.md`** — rewrite the walk-through step depicting the records-paste → IdentitySuggestion banner flow to describe the `ReviewPage` flow (paste → review records + identity → Generate); update the `@schemagen/web` capability bullet referencing identity-key auto-suggest to reflect pre-tick rather than banner. (Per CLAUDE.md, lands in the same commit as the contradicting code.)

### Deleted files

- **`packages/web/src/components/welcome/WizardStepShell.tsx`** — sticky-chrome primitive inlined into `ReviewPage`. Single caller; no longer needed.
- **`packages/web/src/components/welcome/StepInference.tsx`** — inference moves to the header Sliders surface + inline `Adjust` link (#2).
- **`packages/web/src/components/schema-tree/GenerateSchemaCard.tsx`** — subsumed by `ReviewPage`'s sticky footer + inline `Adjust` link (#11).
- **`packages/web/test/components/welcome/WizardStepShell.test.tsx`**, **`StepInference.test.tsx`**, **`packages/web/test/components/schema-tree/GenerateSchemaCard.test.tsx`** — covered the deleted components.

### Notably unchanged

- `components/shell/AppHeader.tsx` — the Sliders trigger and its `openModal('inference-options')` wiring are already what PR II elevates as "the surface". No change.
- `components/inference/InferenceOptionsDialog.tsx` body — pre-IR editable, post-IR disabled-fieldset contract inherited verbatim (modulo the workspaceId-reset effect above).
- `components/identity/IdentityPicker.tsx` body — picker contract (`selected`, `onSelectedChange`, live preview via `dedupeByIdentity`) unchanged. Only the header comment is touched.
- `state/store.ts` — `setIdentityConfig`, `setInferenceOptions`, `inferSchema` actions unchanged. The destructive-commit contract of `setIdentityConfig` is preserved; `ReviewPage` is responsible for calling it exactly once, on Generate.
- `state/dexie-adapter.ts` — persistence layer unchanged.
- `packages/core/*` — no changes; `dedupeByIdentity`, `proposeIdentityKey`, `compositeUniqueness` all stable.
- Workspace switcher, ErrorBoundary, ShortcutsDialog, ThreePaneLayoutPostIR — no changes.

## State + action surface

**`useUIPrefs` additions**

- `UIPrefs.onboardingCompleted: boolean` (renamed from `wizardCompleted`, default `false`).
- `UIPrefs.orientationHintDismissed: boolean` (new, default `false`).
- `useUIPref(workspaceId, 'onboardingCompleted')` reads with the legacy fallback (`?? wizardCompleted ?? default`).
- `writeUIPrefBag(workspaceId, partial)` — new non-hook helper. Reads `localStorage[schemagen.uiPrefs.${workspaceId}]` fresh, merges `partial`, drops any `wizardCompleted` key from the merged result, writes the JSON back, and notifies in-process subscribers. Quota errors are surfaced (not silently swallowed) so the Generate handler can fall back to an inline error banner.

**`ReviewPage` local state**

- `selected: string[]` — staged identity selection. Seeded from `identityConfig.fields ?? identityProposal ?? []` on mount; recreated on `workspaceId` change (via `key`); reset to seed when `records` identity changes (via `useEffect`).
- `generating` ref — busy guard so double-click is a no-op.
- `generateError: string | null` — set if `inferSchema()` throws.

**Generate handler (`ReviewPage`)**

```
onGenerate():
  if (generatingRef.current) return
  if (records.length === 0) return                 // button is also disabled
  generatingRef.current = true
  try {
    inferSchema()                                  // synchronous; throws if records malformed
    if (selectedTouched || selected.length > 0) {
      setIdentityConfig({ fields: selected.map(toPath) })
    }
    writeUIPrefBag(workspaceId, {
      onboardingCompleted: true,
      recordsSidebarCollapsed: false,
    })
  } catch (e) {
    setGenerateError(messageFor(e))
  } finally {
    generatingRef.current = false
  }
```

Ordering rationale: `inferSchema()` first so failures roll back cleanly (no UIPref writes, no identity commit). `setIdentityConfig` second because it's the destructive write callers expect to follow a successful inference attempt. UIPref writes last so the App re-render observes `ir!==null` and `onboardingCompleted=true` in one commit.

**`loadWorkspaceBundle` writes** — `state/init.ts` calls `writeUIPrefBag(newWorkspaceId, { onboardingCompleted: true })` synchronously inside the bundle load, before adopt. Bundle-restored workspaces never see `ReviewPage`.

**Sample / paste / file ingest does NOT touch UIPrefs.** `commitRecords` only writes records (and IR if a bundle path supplies one) and `identityProposal`; `onboardingCompleted` stays at its default `false` so a fresh ingest into a fresh workspace correctly routes through `ReviewPage`.

**App.tsx mode switch (precedence pinned)**

```
ir !== null                                                -> ThreePaneLayoutPostIR
records.length === 0 && ir === null                        -> WelcomeView           // isFresh
records.length > 0 && ir === null && !onboardingCompleted  -> <ReviewPage key={workspaceId} />
records.length > 0 && ir === null && onboardingCompleted   -> PaneLayout            // records-only cold-start
```

The fourth-vs-third precedence is named explicitly so a future refactor cannot silently reorder them.

## Test catalog

Every test starts with a `Plan § "Section Title"` citation comment. IDs use `II-<group><n>` (II-R = ReviewPage host, II-D = DataSection, II-I = IdentitySection, II-WV = WelcomeView, II-O = OrientationHint, II-U = UIPrefs, II-A = App).

### `test/components/welcome/ReviewPage.test.tsx` (new)

- **II-R1** — Renders sticky page header (`Review your data`), Data section, Identity section, the inline `Inference: … · Adjust` line, and a sticky footer Generate button, in that DOM order. `Plan § "Resolved interpretations #1"`.
- **II-R2** — Footer label uses `fieldCountLabel(records)`: `Generate schema (5 fields)` for the HN sample; `Generate schema (1 field)` (singular) for a one-field record; `Generate schema` (no parenthetical) when records exist but `computeFieldStats(records).length === 0` (array-of-primitives root); button disabled + count hidden when `records.length === 0`. `Plan § "Resolved interpretations #4"`.
- **II-R3** — Generate calls `inferSchema()` exactly once, `setIdentityConfig` exactly once (or zero if selected untouched + empty), and writes both `onboardingCompleted=true` and `recordsSidebarCollapsed=false` in a single `localStorage.setItem`. `Plan § "Resolved interpretations #5/#6"`.
- **II-R4** — Generate writes UIPrefs **after** a successful `inferSchema()`. When `inferSchema()` throws, no UIPref writes persist, `identityConfig` is not committed, user stays on `ReviewPage` with `generateError` rendered. `Plan § "Resolved interpretations #6"`.
- **II-R5** — Double-clicking Generate within one tick → exactly one `inferSchema`, one `setIdentityConfig` (when committed), one UIPref write. `Plan § "Resolved interpretations #6"`.
- **II-R6** — `ReviewPage` keyed on `workspaceId`. Switching workspaces with non-empty local selection unmounts/remounts with the new workspace's seed and does not call `setIdentityConfig` during the swap. `Plan § "Resolved interpretations #12"`.
- **II-R7** — Root re-pick via the Data section `Change` button (fires `setRecords`) resets local `selected` to the new `identityProposal` (or `[]`). `Plan § "Resolved interpretations #5"`.
- **II-R8** — Generate is disabled while an in-flight `ingestAsync` is still streaming; once ingest completes, the button enables and Generate dedupes the full set. `Plan § "State + action surface"`.
- **II-R9** — Inline `Adjust` link opens the same `InferenceOptionsDialog` the AppHeader Sliders button opens (asserts `openModal('inference-options')` from both surfaces). `Plan § "Resolved interpretations #2"`.

### `test/components/welcome/DataSection.test.tsx` (new — carryover from HH-D*)

- **II-D1** — Renders a `<section>` with accessible name "Data" and a Records root summary row (resolved root path + record count). `Plan § "Page layout"`.
- **II-D2** — `Change` opens `RootPickerModal`; the section renders no `WizardStepShell` chrome. `Plan § "File-level edit map — Renamed files"`.
- **II-D3** — Sample record preview renders via `JsonTree` (carries HH-D3 root-pick passthrough). `Plan § "Page layout"`.
- **II-D4** — `JsonTree` preview is wrapped in `overflow-x-auto` so long string values do not cause page-level horizontal scroll. `Plan § "Page layout"`.

### `test/components/welcome/IdentitySection.test.tsx` (new — carryover from HH-I*)

- **II-I1** — Renders a `<section>` named "Identity (optional)" wrapping `IdentityPicker`; the header is a real `<h2>`, not a styled `<span>`. `Plan § "Page layout"`.
- **II-I2** — Toggling checkboxes updates local `selected` and the live dedup preview text **without calling `setIdentityConfig` and without mutating `store.records`**, regardless of toggle count. `Plan § "Resolved interpretations #5"`.
- **II-I3** — On mount, `selected` seeds from `identityConfig.fields` when present (bundle restore), from `identityProposal` when config is null and a proposal exists, from `[]` otherwise. `Plan § "Resolved interpretations #5"`.
- **II-I4** — Dedup preview computed via local `dedupeByIdentity(records, draftConfig)`, memoized on `(records, selected)`; shows the `0 dropped` baseline whenever `selected.length > 0`. `Plan § "State + action surface"`.
- **II-I5** — Records with no primitive fields → picker shows the empty state and the Generate handler skips `setIdentityConfig` entirely (inferSchema + UIPref writes only). `Plan § "Resolved interpretations #5"`.
- **II-I6** — User toggled the picker but ends with `selected === []` → Generate explicitly calls `setIdentityConfig({fields: []})` to clear prior config (bundle-restore case). `Plan § "Resolved interpretations #5"`.
- **II-I7** — Each `IdentityPicker` row's accessible name includes field name, kind, uniqueness %, presence % (no row-level `aria-label` override that hides the rich label). `Plan § "Page layout"`.

### `test/components/welcome/WelcomeView.test.tsx` (new)

- **II-WV1** — DOM order: paste card above the samples grid; file upload + bundle restore inside a `<details>` labelled `More ways to start`. `Plan § "File-level edit map — WelcomeView.tsx"`.
- **II-WV2** — Drag hint copy renders as a global top-of-page line (outside the paste card and the `<details>`) so DropZone discoverability is section-independent. `Plan § "File-level edit map — WelcomeView.tsx"`.
- **II-WV3** — `importError` split: paste-path error under the paste card; sample-path error under the samples grid; file/bundle-path error forces the `<details>` open and renders inside it. `Plan § "File-level edit map — WelcomeView.tsx"`.
- **II-WV4** — All on-ramps (paste Import, samples, file `<input>`, bundle `<input>`, DropZone) share one busy gate — any in-flight ingest disables the others. `Plan § "File-level edit map — WelcomeView.tsx"`.

### `test/components/welcome/OrientationHint.test.tsx` (new)

- **II-O1** — Renders above `SchemaPanel` on first post-IR mount when `orientationHintDismissed=false`. `role="status"`, `aria-live="polite"`. Copy reads `Click any field in the inspector to override its type.` and does NOT promise Cmd-Z. `Plan § "Resolved interpretations #9"`.
- **II-O2** — Clicking the focusable Dismiss button writes `orientationHintDismissed=true` to the workspace bag and unmounts the banner. `Plan § "Resolved interpretations #9"`.
- **II-O3** — Does NOT render when `orientationHintDismissed=true` for the active workspace. Dismissing in workspace A still shows the hint on workspace B (per-workspace scope documented). `Plan § "Resolved interpretations #9"`.

### `test/hooks/useUIPrefs.test.tsx` (extend)

- **II-U1** — `DEFAULT_PREFS.onboardingCompleted === false` and `orientationHintDismissed === false`; reading either on an empty bag returns the default. `Plan § "State + action surface"`.
- **II-U2** — Given `{wizardCompleted: true}` and no `onboardingCompleted` key, `useUIPref(ws, 'onboardingCompleted')` returns `true` (legacy read-time fallback). `Plan § "Resolved interpretations #8"`.
- **II-U3** — Given `{wizardCompleted: false}` and no `onboardingCompleted` key, returns `false` (pins `??`; explicit-false legacy preserved). `Plan § "Resolved interpretations #8"`.
- **II-U4** — `writeUIPrefBag(ws, {onboardingCompleted: true, recordsSidebarCollapsed: false})` writes both keys in a single `localStorage.setItem`; reading back via `useUIPref` shows both. (Two chained `useUIPref` setters would clobber; the helper does not.) `Plan § "State + action surface — writeUIPrefBag"`.
- **II-U5** — `writeUIPrefBag` strips any `wizardCompleted` key from the merged result, so subsequent reads are non-fallback. `Plan § "Resolved interpretations #8"`.
- **II-U6** — `writeUIPrefBag` reads localStorage fresh at write time, bypassing stale captured-bag closures held by sibling `useUIPref` hooks. `Plan § "State + action surface — writeUIPrefBag"`.

### `test/components/app.test.tsx` (modify + extend)

- **(existing pre-IR three-regions test)** — updated to seed `onboardingCompleted=true` before asserting the records-only `PaneLayout` renders its three regions; without the seed it would silently route through `ReviewPage`. `Plan § "Trigger"`.
- **II-A1** — `records>0 && ir===null && !onboardingCompleted` → App renders `<ReviewPage>` keyed on `workspaceId`. `Plan § "Trigger"`.
- **II-A2** — After Generate, App re-renders to `ThreePaneLayoutPostIR` with the records sidebar expanded — seed `recordsSidebarCollapsed=true` BEFORE Generate, read back `false` after, same bag. `Plan § "Resolved interpretations #7"`.
- **II-A3** — `loadWorkspaceBundle` for a bundle with records and `ir=null` writes `onboardingCompleted=true` and App routes to records-only `PaneLayout`, NOT `ReviewPage`. `Plan § "Trigger"`.
- **II-A4** — `loadWorkspaceBundle` for a bundle with `ir!=null` routes to `ThreePaneLayoutPostIR`; `ReviewPage` never mounts. `Plan § "Trigger"`.
- **II-A5** — Sample/paste/file ingest into a fresh workspace leaves `onboardingCompleted=false`; App routes to `ReviewPage`. `Plan § "State + action surface"`.
- **II-A6** — `resetWorkspace` after onboarding clears records + IR; App routes to `WelcomeView` regardless of `onboardingCompleted`. `Plan § "Trigger"`.
- **II-A7** — `OrientationHint` is composed above `SchemaPanel` in the schema slot on the first post-Generate render. `Plan § "Resolved interpretations #9"`.

### Tests deleted with the wizard

- **HH-W*** (all WorkspaceWizard tests, incl. HH-W9 Skip-wizard) — no migration; PR II has no Skip semantic and no stepper. Replaced by II-R1 (single page) + II-R5 (single Generate handler).
- **HH-N*** (all StepInference tests) — component deleted; inline `Adjust` covered by II-R9, post-IR read-only contract owned by the existing `InferenceOptionsDialog` suite.
- **GenerateSchemaCard tests** — component deleted; covered by II-R2 (footer label) + II-R9 (Adjust link).

## Implementation phasing

Each phase starts with failing tests and ends with the listed IDs green. No production code lands ahead of a test that pins its contract.

**Phase 0 — Prereq check (no code).** Verify `git log main -- packages/web/src/components/welcome/WorkspaceWizard.tsx` is non-empty (confirms PR HH landed and rename targets exist). If empty, sequence PR HH first or fold its missing pieces in and rewrite the File-level edit map.

**Phase 1 — useUIPrefs rename + writeUIPrefBag.** Write II-U1..II-U6. Land the rename, read-time fallback, `orientationHintDismissed` slot, and `writeUIPrefBag`. Update `state/init.ts`'s `loadWorkspaceBundle` to call it.

**Phase 2 — App.tsx fourth branch.** Write II-A1, II-A3..II-A6 + the existing-test update. Add the `<ReviewPage key={workspaceId} />` branch and a placeholder `ReviewPage` (a single `<h1>Review your data</h1>`). II-A2 stays red until Phase 5.

**Phase 3 — DataSection rename.** Write II-D1..II-D4. `git mv` StepData → DataSection (+ test). Strip `WizardStepShell`; replace with a section card. Update citations.

**Phase 4 — IdentitySection rename + commit semantics.** Write II-I1..II-I7. `git mv` StepIdentity → IdentitySection (+ test). Strip `WizardStepShell`. Lift `selected` to `ReviewPage`. Invert inherited "commit on Continue" to "no commit until Generate". Update `IdentityPicker.tsx` header comment.

**Phase 5 — ReviewPage host + Generate handler.** Write II-R1..II-R9. Implement inlined sticky chrome, sticky-footer Generate, inline `Adjust` line, `fieldCountLabel` in `lib/field-stats.ts`, the Generate handler ordering, the busy ref, the `generateError` banner, and the `useEffect` resets keyed on `workspaceId`/`records`. Add the `useEffect([workspaceId])` in `UIShell` and `InferenceOptionsDialog`. Turns II-R* and II-A2 green.

**Phase 6 — OrientationHint + post-IR composition.** Write II-O1..II-O3 + II-A7. Implement `OrientationHint`, compose above `SchemaPanel` in App.tsx.

**Phase 7 — WelcomeView restructure.** Write II-WV1..II-WV4. Reorder DOM (paste above samples), move file + bundle into `<details>`, split `importError`, lift drag hint global, wire the shared busy gate.

**Phase 8 — Pure removal (gated on green runs).** Delete `WizardStepShell.tsx`, `StepInference.tsx`, `GenerateSchemaCard.tsx` + their tests. `grep -rn 'WizardStepShell\|StepInference\|GenerateSchemaCard' packages/web` returns empty. Update `docs/plans/pr-hh-workspace-wizard.md` status. Sweep citations (`grep -rn 'Plan § "Step ' packages/web/test` and `grep -rn 'HH-' packages/web/test` both empty). Typecheck + full suite as the gate.

**Phase 9 — README update.** Rewrite the walk-through step (paste → ReviewPage → Generate) and the `@schemagen/web` capability bullet.

## Verification

- `pnpm typecheck` — clean across `@schemagen/web` and `@schemagen/core`.
- `pnpm test --filter @schemagen/web` — all pass; new test count matches the catalog (II-R1..9, II-D1..4, II-I1..7, II-WV1..4, II-O1..3, II-U1..6, II-A1..7 + the existing-test edit).
- `pnpm lint --filter @schemagen/web` — clean; Biome `noRestrictedImports` confirms no new `../../..` imports (intra-package uses the `@/` alias).
- `grep -rn 'WizardStepShell\|StepInference\|GenerateSchemaCard\|wizardCompleted' packages/web/src` — returns only the legacy-fallback reference and the strip-on-write inside `useUIPrefs.ts`; no other production references.
- `grep -rn 'HH-' packages/web/test` and `grep -rn 'Plan § "Step ' packages/web/test` — both empty (ID + citation sweeps complete).
- Manual run-through on a fresh local workspace:
  1. Land on `WelcomeView`; confirm paste card above samples, drag hint visible at top.
  2. Click the `hn-sample` tile → records ingest, `ReviewPage` mounts.
  3. Data section shows records-root summary + `JsonTree`; Identity shows `IdentityPicker` with `id` pre-ticked from `identityProposal`; Preview reads `3 records kept, 0 dropped`; `Inference: strict defaults · Adjust` line below; footer reads `Generate schema (5 fields)`.
  4. Click `Adjust` → `InferenceOptionsDialog` opens, editable. Close.
  5. Click the AppHeader Sliders button → same dialog (shared modal).
  6. Click Generate → transitions to `ThreePaneLayoutPostIR` with records sidebar expanded + `OrientationHint` above `SchemaPanel`. Dismiss the banner.
  7. DevTools: `localStorage[schemagen.uiPrefs.<ws>]` contains `{onboardingCompleted:true, recordsSidebarCollapsed:false, orientationHintDismissed:true, …}` with no `wizardCompleted` key.
  8. Switch to a fresh workspace → `WelcomeView`. Paste small JSON → `ReviewPage` for the new workspace; identity selection independent of the prior one.
  9. Generate in the new workspace → its `OrientationHint` shows again (per-workspace scope acknowledged).
  10. Import a workspace bundle via `More ways to start` → lands directly in `ThreePaneLayoutPostIR` (bundle with IR), never `ReviewPage`.
- Keyboard-only sweep: tab page-top → `Change` → IdentityPicker checkboxes → Show nested fields → `Adjust` → footer Generate; Enter on Generate; confirm transition and that focus never vanishes under the sticky footer (scroll-padding works).
- **README impact:** the README walk-through and the `@schemagen/web` capability bullet are updated in this PR. Per CLAUDE.md the README sweep lands in the same commit as the contradicting code; reviewers diff `README.md` vs `main` and confirm the records-paste → IdentitySuggestion narrative is gone.

## Out of scope

- **`OrientationHint` global (per-user) scope.** Kept per-workspace to match `UIPrefs` scope and avoid a parallel global-localStorage hook. Heavy users see the hint once per new workspace. *Why deferred:* the cost is bounded; a global version needs a new hook + migration that doesn't fit here.
- **Inference defaults tuning (deferred PR Z).** PR II ships the inline `Adjust` link as discoverability but does not change the cold-start defaults that bite on some data shapes (the 25-unique-strings case). *Why deferred:* PR Z is an orthogonal product decision on a separate branch (`docs/plan-pr-z`).
- **Mobile / narrow-viewport polish.** Sticky-footer safe-area, paste-textarea keyboard occlusion, samples-grid stacking, header overflow <375px. *Why deferred:* none blocks the desktop happy path; mobile reshape is its own PR.
- **A11y deep sweep.** This PR ships the structural wins (real `<section>` landmarks, `<h2>` headings, focusable dismiss, scroll-padding, rich `IdentityPicker` row names). Further work (skip-links, full live-region pass on the dedup preview, Cmd+Enter on Generate, dialog focus-restore audit) is separate. *Why deferred:* the listed items are improvements over today's wizard, not regressions.
- **Cross-tab UIPref sync.** No `storage` event listener; two tabs on one workspace diverge until reload. *Why deferred:* pre-existing, not introduced here.
- **Workspace UIPref bag cleanup on delete.** Deleted workspaces leave their `schemagen.uiPrefs.<id>` bag forever. *Why deferred:* pre-existing, cosmetic.
- **Large-bundle dedup preview perf (>10k records).** `IdentityPicker`'s preview recomputes per toggle; can lag on huge bundle-restored sets. *Why deferred:* bundles with an IR bypass `ReviewPage` entirely; the records-but-no-IR bundle is rare enough to defer.
- **Deeper WelcomeView restructure.** Paste-path auto-rename parity, full mobile-keyboard handling, `.session.json` legacy support audit, drag-onto-page bundle sniffing. *Why deferred:* genuinely orthogonal to the ReviewPage shape; bundling it would inflate the review surface.
- **Async inference / re-infer (PR FF).** `inferSchema` is synchronous today; if a future PR makes it async, the Generate handler ordering + busy ref need revisiting. *Why deferred:* not introduced here.
- **PR Z re-baselining post-merge.** When PR Z lands, its `Step 3 — Inference` citations and any `wizardCompleted` references need rewriting against PR II's terminology. *Why deferred:* tracked under PR Z's own scope.
