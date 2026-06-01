# schemagen

A developer tool for generating, visualizing, and iterating on data schemas from real samples.

## Status

`@schemagen/core` and `@schemagen/web` are in `main`. JSON Schema emits today; Zod and TypeScript follow. No npm release yet.

- `@schemagen/core` — pure TypeScript. Inference, validation, mutation (`applyChange` + inverse), JSON Schema emission. Strict typing (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`). Vitest + fast-check.
- `@schemagen/web` — local-first React app. Welcome view for fresh workspaces, three-step onboarding wizard (data → identity → inference → generate), resizable post-IR layout with a collapsible records sidebar, full op editor, mismatch panel with filter and grouped collapse, rolled-up mismatch counts, identity-key auto-suggest, workspace-scoped inference tuning, workspace bundle export/import, JSON syntax highlighting, sample loader, undo/redo, keyboard shortcuts. Persists to IndexedDB via Dexie.

Specs in [`docs/`](./docs/):

- [`ir-spec.md`](./docs/ir-spec.md) — native schema format. Edit this; emit everything else from it.
- [`core-spec.md`](./docs/core-spec.md) — library API.
- [`frontend-spec.md`](./docs/frontend-spec.md) — web UI.

Active plans live in [`docs/plans/`](./docs/plans/) — design-locked PR specs (PR FF for re-infer + reconcile, PR HH for the workspace wizard, etc.).

## Capabilities

- **Strict by default.** Infer literal unions for low-cardinality strings. Mark unobserved fields optional. Close objects. Detect discriminators.
- **One source, many targets.** Edit schemagen's IR. JSON Schema emits today; Zod and TypeScript follow. Edits live in one place.
- **Edits never block on validity.** Multi-step changes pass through invalid states. The UI surfaces mismatches continuously.
- **Schema iteration is first-class.** New data flows in. Mismatches surface with one-click resolutions. Every edit is invertible. Full undo/redo history persists.
- **Evidence-driven.** Top-K values, presence frequencies, ranges — always computed from the workspace's records.
- **Identity-aware dedup.** Set an identity key (single field or composition). Repeated imports keep the newest version per identity; byte-identical re-imports collapse even without one.
- **Records browser, filterable.** A collapsible records sidebar lives beside the schema once an IR exists. Click a field or a mismatch and the sidebar filters to the matching records, with a visible chip explaining the filter.

## Walk-through

Build a schema for user records from an analytics API.

**1. Start.** Open schemagen. The welcome view greets you with sample datasets, paste/upload, and a workspace-bundle import. Paste a JSON response:

```json
{
  "page": 1,
  "users": [
    { "id": "a1b2c3d4-...", "email": "ada@example.com", "status": "active",   "signed_up_at": "2024-01-15T10:00:00Z", "avatar_url": "https://cdn.example.com/u/ada.png" },
    { "id": "c3d4e5f6-...", "email": "lin@example.com", "status": "trialing", "signed_up_at": "2024-02-03T08:30:00Z" }
  ]
}
```

The root picker offers `.users`. Select it. schemagen dedupes the 200 records by canonical hash and stores them.

**2. Wizard.** The new-workspace wizard kicks in. Three steps before the schema is generated:

- **Your data** — 200 records, "Array of 200 objects", 8 primitive fields + 1 compound. Expand "Show first record" if you want to see what shape made it through. Continue.
- **Identity key** — schemagen highlights `id` (100% unique, 100% present). The live dedup preview reads "Using `id`, your 200 records would yield 200 unique (0 duplicates)." Continue.
- **Inference options** — defaults are usually right. Glance at the summary (literal unions up to 20, format detection on, numeric ranges evidence-only). Click **Generate schema**.

You can also **Skip wizard** from any step — schemagen fast-forwards to Generate with sensible defaults.

**3. Inference.** schemagen produces a first cut:

```
object {
  id:           string  (format: uuid)
  email:        string  (format: email)
  status:       "active" | "trialing"
  signed_up_at: string  (format: date-time)
  avatar_url?:  string  (format: uri)
}
```

Two calls worth flagging:

- `status` had 2 distinct values across 200 records — under the literal threshold — so it's a literal union, not just `string`.
- `avatar_url` was missing from 38 of 200 records, so it's optional.

The inspector shows evidence per node: `status` → `active: 162, trialing: 38`. `avatar_url` → `present in 162/200 (81%)`. Click **Show records** in the inspector and the records sidebar filters to the matching set with a chip like ``status is present · 200``.

**4. Tweak.** Widen `status` to its literal union OR a free string. Future unknown values validate; the literal set stays as documentation. The change lands in history as "Wrapped status in union with free string".

**5. New data.** Open the records sidebar's **Add data** button, drop a fresh JSON file with 220 users. The workspace renames itself after the file. Because `id` is the identity key, 200 records replace earlier versions and 20 are new — the workspace stays at 220, not 420. The mismatch panel populates:

- **14× `literal-violation`** at `.status`: value `"past_due"`. Suggestion: *Add `"past_due"` to status literals*.
- **50× `unexpected-field`** at the root: `.stripe_customer_id`. Suggestion: *Add field `stripe_customer_id` as optional string*.

Click each mismatch and **Show records** in its row narrows the sidebar to just those offending records. Apply the suggestion; each change lands in history as its own labeled entry; undo each individually with `⌘Z`. The mismatch panel clears.

**6. Export.** `⌘E` opens the export modal. Copy the JSON Schema. Commit it to the consuming service's repo. Or grab the workspace bundle — a `.workspace.json` that restores records, schema edits, history, and identity config when imported into another browser. The workspace stays in IndexedDB — history preserved. Next month, the next batch starts at step 5.

No data on hand? The welcome view offers bundled samples: HackerNews top stories, SWAPI characters, Open Library — Tolkien.
