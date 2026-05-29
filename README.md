# schemagen

A developer tool for generating, visualizing, and iterating on data schemas from real samples.

## Current state

Spec stage. No code yet. The v1 specs live in [`docs/`](./docs/):

- [`ir-spec.md`](./docs/ir-spec.md) — schemagen's native schema format, the thing developers edit. JSON Schema, Zod, and TypeScript types are emitted from it.
- [`core-spec.md`](./docs/core-spec.md) — pure-function library API: inference, validation, mutation, emission.
- [`frontend-spec.md`](./docs/frontend-spec.md) — three-pane web UI, IndexedDB workspaces, schema and session exports.

## Aspirations

A schema editor that closes the loop between data and types. Paste a dataset, get an opinionated first cut, refine it interactively, validate new records against it, and export to whichever schema format the consumer needs (JSON Schema for v1; Zod, TypeScript, and others follow).

## What makes it unique

- **Strict by default.** Inference proposes literal unions for low-cardinality strings, marks unobserved fields optional, closes objects, and detects discriminators. Existing tools default to permissive; schemagen defaults to specific.
- **One editable schema, many export targets.** Developers iterate on schemagen's own small, hand-editable schema format — not on emitted JSON Schema or generated TypeScript. Edits happen in one place; JSON Schema (and later Zod, TS, others) are produced as one-way exports.
- **Operations are never gated on validity.** Multi-step edits can pass through states that don't match the data. The UI surfaces mismatches continuously as feedback; it never blocks an edit.
- **Schema iteration is first-class.** New data flows in, mismatches surface in a side panel with one-click suggested resolutions, every edit is invertible, full undo/redo history is preserved.
- **Evidence-driven decisions.** Top-K observed values, presence frequencies, and ranges are always computable from the workspace's record set so the developer can make informed choices about widening, tightening, or rejecting new data.
- **Identity-aware dedup.** Workspaces can be configured with a logical identity key — a field or composition of fields — so repeated imports of the same entities don't pile up. schemagen auto-suggests a key based on uniqueness, and the developer chooses whether to replace older versions or preserve them for richer schema evidence.

## A walk-through

A developer wants a schema for user records returned by an analytics API.

**1. Import.** They paste a JSON response into the data panel:

```json
{
  "page": 1,
  "users": [
    { "id": "a1b2c3d4-...", "email": "ada@example.com", "status": "active",   "signed_up_at": "2024-01-15T10:00:00Z", "avatar_url": "https://cdn.example.com/u/ada.png" },
    { "id": "c3d4e5f6-...", "email": "lin@example.com", "status": "trialing", "signed_up_at": "2024-02-03T08:30:00Z" }
  ]
}
```

The root picker walks the structure and offers `.users` as the only path to an array of objects. The developer selects it; the 200 records in the response are deduped by canonical hash and stored in the workspace.

A banner appears above the data panel:

> Field `id` appears in 100% of records and is unique in 100% of them. Use it as the identity key? Future imports will replace records with matching `id` instead of accumulating duplicates.

The developer accepts. `id` is now the workspace's identity key; subsequent imports will dedupe against it.

**2. Inference.** schemagen produces a strict first cut, rendered in the schema tree roughly as:

```
object {
  id:           string  (format: uuid)
  email:        string  (format: email)
  status:       "active" | "trialing"
  signed_up_at: string  (format: iso-datetime)
  avatar_url?:  string  (format: url)
}
```

Two specific calls it made:

- `status` had cardinality 2 across 200 records (well under the literal threshold), so it's a union of literals — not just `string`.
- `avatar_url` was missing from 38 of 200 records, so it's marked optional.

The inspector shows evidence next to each node: `status` reports `active: 162, trialing: 38`; `avatar_url` reports `present in 162/200 (81%)`.

**3. Tweak.** The developer doesn't trust that `"active" | "trialing"` covers every future case, so they widen `status` to a union of those literals OR a free string. Future unknown values will validate, but the literal set stays in the schema as documentation. The change lands in history as "Wrapped status in union with free string".

**4. New data.** A week later they drag in a fresh export of all 220 users using "Add and validate". Because `id` is the identity key, 200 records replace their earlier versions (some now in different states) and 20 are new. The workspace stays at 220 records, not 420. The mismatch panel populates:

- **14× `literal-violation`** at `.status`: value `"past_due"`. Suggestion: *Add `"past_due"` to status literals*.
- **50× `unexpected-field`** at the root: `.stripe_customer_id`. Suggestion: *Add field `stripe_customer_id` as optional string*.

The developer clicks both suggestions. Each lands in history as its own labeled entry; either can be undone individually. The mismatch panel clears.

**5. Export.** From the export panel they copy the JSON Schema and commit it to the consuming service's repo. The schemagen workspace stays in IndexedDB; next month, the next batch starts at step 4.
