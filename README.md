# schemagen

A developer tool for generating, visualizing, and iterating on data schemas from real samples.

## Status

`@schemagen/core` and `@schemagen/web` are in `main`. JSON Schema emits today; Zod and TypeScript follow. No npm release yet.

- `@schemagen/core` — pure TypeScript. Inference, validation, mutation (`applyChange` + inverse), JSON Schema emission. Strict typing (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`). Vitest + fast-check.
- `@schemagen/web` — local-first React app. Resizable three-pane shell (data / schema / inspector), full op editor, mismatch panel with filter and grouped collapse, rolled-up mismatch counts, identity-key auto-suggest, workspace-scoped inference tuning, session export/import, JSON syntax highlighting, sample loader, undo/redo, keyboard shortcuts. Persists to IndexedDB via Dexie.

Specs in [`docs/`](./docs/):

- [`ir-spec.md`](./docs/ir-spec.md) — native schema format. Edit this; emit everything else from it.
- [`core-spec.md`](./docs/core-spec.md) — library API.
- [`frontend-spec.md`](./docs/frontend-spec.md) — three-pane web UI.

## Capabilities

- **Strict by default.** Infer literal unions for low-cardinality strings. Mark unobserved fields optional. Close objects. Detect discriminators.
- **One source, many targets.** Edit schemagen's IR. JSON Schema emits today; Zod and TypeScript follow. Edits live in one place.
- **Edits never block on validity.** Multi-step changes pass through invalid states. The UI surfaces mismatches continuously.
- **Schema iteration is first-class.** New data flows in. Mismatches surface with one-click resolutions. Every edit is invertible. Full undo/redo history persists.
- **Evidence-driven.** Top-K values, presence frequencies, ranges — always computed from the workspace's records.
- **Identity-aware dedup.** Set an identity key (single field or composition). Repeated imports replace rather than accumulate. schemagen auto-suggests a key by uniqueness.

## Walk-through

Build a schema for user records from an analytics API.

**1. Import.** Paste a JSON response into the data panel:

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

A banner appears above the data panel:

> Field `id` is unique across 100% of records. Use as identity key? Future imports will replace records with matching `id`.

Accept. `id` is now the workspace identity key.

**2. Inference.** schemagen produces a first cut:

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

The inspector shows evidence per node: `status` → `active: 162, trialing: 38`. `avatar_url` → `present in 162/200 (81%)`.

**3. Tweak.** Widen `status` to its literal union OR a free string. Future unknown values validate; the literal set stays as documentation. The change lands in history as "Wrapped status in union with free string".

**4. New data.** Drag a fresh JSON file with 220 users onto the data pane. The workspace renames itself after the file. Because `id` is the identity key, 200 records replace earlier versions and 20 are new — the workspace stays at 220, not 420. The mismatch panel populates:

- **14× `literal-violation`** at `.status`: value `"past_due"`. Suggestion: *Add `"past_due"` to status literals*.
- **50× `unexpected-field`** at the root: `.stripe_customer_id`. Suggestion: *Add field `stripe_customer_id` as optional string*.

Click both. Each lands in history as its own labeled entry; undo each individually with `⌘Z`. The mismatch panel clears.

**5. Export.** `⌘E` opens the export modal. Copy the JSON Schema. Commit it to the consuming service's repo. The workspace stays in IndexedDB — history preserved. Next month, the next batch starts at step 4.

No data on hand? The empty workspace offers bundled samples: HackerNews top stories, SWAPI characters, Open Library — Tolkien.
