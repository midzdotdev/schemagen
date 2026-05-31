# PR FF — Re-infer schema with conflict reconciliation

> Status: **proposed**. Sequencing follow-up to PRs Z / AA / EE. Owns the post-IR "the data has moved on — bring my schema back into line" flow.

## Context

Once an IR exists, schemagen treats it as user-owned: imports don't re-infer (PR AA made this explicit). But datasets shift — new records, fields evolve, formats change. The user has two unsatisfying options today:

- **Reset the workspace and re-import.** Loses history, identity config, every tweak.
- **Hand-fix every mismatch via the inspector.** Fine for a handful, miserable for dozens.

FF adds a "Re-infer" action that computes a fresh IR from the current records, diffs it against what the user has now, separates "clean updates" from "conflicts with user edits", and walks them through a per-conflict resolution.

## Scope

**In:**
- "Re-infer" button in the schema panel header (post-IR only — pre-IR the "Generate schema" CTA does the same job).
- Diff: current IR vs `infer(records, inferenceOptions)`.
- Classify each diff into one of two buckets:
  - **Auto** — the user never touched this path; the inference change is safe to apply.
  - **Conflict** — the user *did* touch this path; the inference change competes with theirs.
- Reconcile modal:
  - Shows count of auto changes with a single "Apply all" / "Skip all" toggle.
  - Each conflict gets its own row with "Accept new" / "Keep yours" buttons + a one-line description of both sides.
- On commit: apply selected changes via existing `applyChange`. History gets entries with `source: "inferred"` for the auto-applied set, `source: "manual"` for the conflicts the user resolved (they're still expressing intent).

**Out:**
- Three-way merge UI (visual side-by-side IR diff). The list-of-changes view is enough for v1.
- Selective re-infer of just one subtree.
- Auto-applying without confirmation. The action always opens the modal — even when there are zero conflicts, the user confirms.
- Re-inferring with inference-options changes alongside. v1 uses whatever options are currently in the workspace; tuning happens in the existing dialog before opening Re-infer.

## How "user touched this path" is computed

`history.entries` already carries `source: "manual" | "suggestion" | "inferred"`. Walk every entry with `source !== "inferred"`, extract the `path` from the change, and accumulate into a Set.

Path serialization: `["foo", 0, "bar"]` → `"foo.0.bar"`. Touched-set lookup is exact match on the serialized form.

Edge cases:
- **Batch changes**: a batch entry contains sub-changes. Flatten to individual paths during accumulation.
- **Wrap-in-union at root**: a single change touches the whole tree's identity. v1 treats this as "the root is touched" — descendant paths are not transitively marked. If this proves too leaky we can promote to "root + N levels".
- **Removed-then-re-added fields**: a `remove-field` followed by `add-field` at the same name is still treated as "touched"; the user expressed intent here.

## Diff algorithm

`computeReinferDiff(currentIR, freshIR, touchedPaths): { autoChanges: Change[]; conflictChanges: { change: Change; existing: Node }[] }`

Walk both IRs in parallel, paths in lockstep. At each node:

1. If `currentIR.node === freshIR.node` (structural equality) → no diff.
2. If they differ:
   - Compute the minimal `Change` that takes current → fresh. (Use the existing `applyChange` op set: `set-node`, `set-field-type`, `add-field`, `remove-field`, `add-literal`, etc.)
   - If `path ∈ touchedPaths` → push to `conflictChanges` with the existing node attached so the modal can show "you had X; inference says Y."
   - Otherwise → push to `autoChanges`.
3. Recurse into children (object fields, union variants, array items).

This is O(N) where N = total node count. Should handle any practical schema.

## Files

**New:**
- `packages/web/src/lib/reinfer-diff.ts` — pure function `computeReinferDiff`. The path-touched logic.
- `packages/web/src/components/schema-tree/ReinferModal.tsx` — the reconcile UI.

**Modified:**
- `packages/web/src/components/schema-tree/SchemaPanel.tsx` — add "Re-infer" button next to "Add data".
- `packages/web/src/components/shell/UIShell.tsx` — register `"reinfer"` modal name.

**Investigate during implementation:**
- `packages/core/src/merge/index.ts` already does IR-vs-IR merging. It might supply the minimal-change computation or a primitive we can reuse. If not, `reinfer-diff` is a self-contained module.

## Test plan

`computeReinferDiff` (pure):
- **FF-D1** identical IRs → both buckets empty.
- **FF-D2** fresh adds a field; user never touched it → `add-field` in `autoChanges`.
- **FF-D3** fresh removes a field the user manually renamed → `remove-field` in `conflictChanges`; `existing` carries the user's renamed entry.
- **FF-D4** fresh narrows a literal union the user widened → conflict; both nodes attached.
- **FF-D5** nested field path: parent touched, child not → child change is auto, parent change is conflict.
- **FF-D6** identity options matter — different `inferenceOptions` produce different `freshIR`; conflicts respect the option-driven shape.

`ReinferModal`:
- **FF-M1** modal title shows `N auto · M conflicts`.
- **FF-M2** "Apply all (auto)" applies just the auto changes; conflicts stay pending.
- **FF-M3** per-conflict "Accept new" applies that change as a manual edit (history `source: "manual"`).
- **FF-M4** per-conflict "Keep yours" does nothing for that change.
- **FF-M5** committing closes modal; cancelling discards everything.

`SchemaPanel`:
- **FF-S1** "Re-infer" button rendered only when `ir !== null` and `records.length > 0`.
- **FF-S2** clicking opens the Re-infer modal.

## Risks / unknowns

- **Path equality** across `batch` / `wrap-in-union` / variant-touching changes is the leakiest part. Plan: ship the simple version, watch for false positives or misses in practice, tighten if needed.
- **Performance** at large schemas (~hundreds of fields, deep nesting). Diffs are O(N). The modal renders a list of conflicts; if hundreds we may need virtualization. Defer until evidence.
- **Suggestion-applied changes** (`source: "suggestion"`) are treated as user-touched. They came from one-click mismatch resolutions, so the user owns them. Confirm in implementation.

## Size

Rough estimate:
- `reinfer-diff.ts` — 150 LOC (pure logic + path serialization).
- `ReinferModal.tsx` — 250 LOC (header, two sections, per-row actions, footer).
- `SchemaPanel` button + `UIShell` wiring — ~20 LOC.
- Tests — 200–300 LOC.

~600–800 LOC total. One PR; not stackable since modal depends on diff.

## Verification

- `pnpm test --filter @schemagen/web` — all new + existing tests pass.
- `pnpm typecheck`, `pnpm lint`.
- Manual:
  1. Workspace with an IR + at least one manual schema edit (e.g. widen a literal union).
  2. Import additional records that introduce new fields and shift existing ones.
  3. Click "Re-infer".
  4. Verify the modal: auto changes shown as a batch, conflicts include the edited field.
  5. Apply some, keep some, commit. Verify history entries land with sane labels and inverse changes (undo works per entry).
