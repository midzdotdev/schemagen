# PR Z — workspace-scoped inference options dialog

> Status: **deferred** as of 2026-05-31. The original iteration-2 plan cut this; this file reopens it as a future option, not a commitment. Read the **Tension** section before picking it up.

## The tension to address

Original iteration-2 plan cut this with:

> Inference-options UI conflicts with the strict-by-default pitch. Exposing global sliders to soften strictness invites the noise existing tools produce. Per-node overrides via the inspector are the right surface, and they already work.

That reasoning still holds for **post-IR** tuning. It doesn't hold for **cold-start** tuning — there's no per-node inspector to use yet when there's no IR. Two real cases where defaults bite:

- A field with 25 unique short strings looks categorical to a human but inference gives up at `maxCardinality: 20` and leaves it as `string` (no literal union).
- A field present in 99.5% of 10k records gets marked `optional` because of 50 missing values, when the user knows the missing ones are bugs to fix upstream.

Users hit one of these on first import, can't articulate "increase literal cardinality from 20 to 30 then re-infer," and conclude the tool is too rigid. The fix is letting them tune the cold-start, not soften the IR after.

## Scope

**In:** "Inference options" dialog. Options apply only at cold-start (when `ir === null` and records get committed). Stored per-workspace in Dexie meta.

**Out:** Re-inference after an IR exists. Once IR exists, the user owns it. The dialog disables itself with a "tweak the schema directly" hint when an IR is set.

**Out:** Global defaults. Each workspace owns its own.

## Surfaces

**Trigger.** A `Sliders` / `Settings2` icon in `AppHeader`, between `KeyRound` and `RotateCcw`. New entry in `ModalName` union → `"inference-options"`.

**Dialog body.** Grouped sections matching `InferOptions`:

- **Literals** — enable toggle, `maxCardinality` (default 20), `maxUniqueRatio` (0.0–1.0 slider, default 0.3), `minSamples` (default 5).
- **Formats** — enable toggle, detect (chip-picker: "all" or subset of `FormatName`).
- **Numbers** — `integerDetection` toggle (default on), `rangeMode` (segmented: off / evidence-only / constraint).
- **Objects** — `closed` toggle (default on), `optionalThreshold` (slider 0.0–1.0, default 1.0 with helper text).
- **Discriminators** — enable toggle, fields chip-picker.
- **Conflict resolution** — `onTypeConflict` segmented: union / unknown.

Each row shows its default value next to the input as muted text ("Default: 20") so users see when they're deviating.

**Helper banner at top:**

> These tune how schemagen builds the initial schema from your records. They apply only to a new workspace's first import — once a schema exists, edit fields directly in the schema tree.

**Reset button:** "Reset to defaults" — clears the workspace's overrides.

## Persistence

- Add `inferenceOptions?: InferOptions` to `MetaRow` (Dexie schema bump v3, additive).
- `WorkspaceAdapter.patchMeta` already supports arbitrary patches.
- Store action `setInferenceOptions(options: InferOptions)` writes to meta + updates a slice.
- Hydration reads it back at workspace switch.

## Wiring

`ingestRecords` already takes `IngestState`. Add `inferenceOptions: InferOptions | null` to it. Inside, change `infer(records)` to `infer(records, inferenceOptions ?? undefined)`. Worker passes it through — `InferOptions` is plain-data serialisable.

`DataPanel` reads `inferenceOptions` from store, threads it into ingest state.

## Tests

- `store.setInferenceOptions` persists to meta and re-hydrates.
- `ingestRecords` with custom `maxCardinality: 30` produces a literal union from 25-unique data.
- Dialog round-trips values.
- Dialog shows notice + disables inputs when `ir !== null`.
- E2E: cold-start ingest → open dialog → bump `maxCardinality` → re-import → literal union appears.

## What worries me

1. **Discoverability vs noise.** Burying behind a gear icon is OK for advanced users; new users see strict defaults and never know the knob exists. That's the point of "strict by default."
2. **"My options stopped working when I edited the schema."** Once IR exists, options are inert. Helper text covers it; we'll see in feedback.
3. **Surface area to maintain.** ~9 controls across 6 groups. Future `InferOptions` changes need dialog updates; cost is mechanical.

## Size

~400 LOC: dialog (~250), store wiring (~50), Dexie schema bump + migration test (~50), tests (~50). One PR — not stackable since the dialog depends on store changes.

## Files likely to touch

- `packages/web/src/components/inference/InferenceOptionsDialog.tsx` (new)
- `packages/web/src/components/shell/UIShell.tsx` (new modal entry)
- `packages/web/src/components/shell/AppHeader.tsx` (trigger button)
- `packages/web/src/state/store.ts` (`inferenceOptions` slice + setter)
- `packages/web/src/persistence/db.ts` (v3 migration, additive)
- `packages/web/src/persistence/dexie-adapter.ts` (`patchMeta` already covers it)
- `packages/web/src/lib/ingest-records.ts` + `ingest-worker.ts` (pass options through)
- `packages/web/src/components/data-panel/DataPanel.tsx` (read + thread)
- tests as above
