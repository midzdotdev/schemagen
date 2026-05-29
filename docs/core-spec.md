# Core Library Specification

The core library is the reusable engine: schema inference, validation, mutation, history, and emission. It has no UI, no I/O, no shared state. Every function is pure.

The frontend consumes this library. So can a CLI, a server, an LSP, or another tool. The core does not assume a frontend exists.

See [ir-spec.md](./ir-spec.md) for the IR.

## Module surface

```ts
// Inference
infer(samples: unknown[], options?: InferOptions): IR

// Evidence (computed on demand from records — never persisted in the IR)
computeEvidence(ir: IR, samples: unknown[]): EvidenceTree

// Example records — live queries over the workspace's records
findExamples(
  ir: IR,
  samples: unknown[],
  path: Path,
  predicate?: (value: unknown) => boolean,
  limit?: number,
): RecordRef[]

// Validation
validate(ir: IR, data: unknown | unknown[]): ValidationResult

// Mutation (returns the new IR and the inverse Change)
applyChange(ir: IR, change: Change): { ir: IR; inverse: Change }

// Merge — apply a default resolution for every mismatch new data produces
merge(ir: IR, samples: unknown[], options?: MergeOptions): {
  ir: IR
  changes: Change[]      // changes that were applied, in order
  unresolved: Mismatch[] // mismatches with no auto-resolution
}

// Emission (one-way export)
emit(ir: IR, target: "json-schema", options?: EmitOptions): object

// Identity (logical dedup of records by a configured key)
proposeIdentityKey(samples: unknown[]): IdentityProposal | null
dedupeByIdentity(samples: unknown[], config: IdentityConfig): {
  kept: unknown[]
  dropped: { record: unknown; reason: "duplicate-identity" }[]
}

// Structural checks
checkStructure(ir: IR): StructureError[]
isValid(ir: IR): boolean
```

All functions are deterministic: same input → same output. No timestamps, no randomness, no `Date.now()`.

## `infer`

Builds an IR from one or more sample records. Each sample is parsed as an independent observation; the IR represents the union of all observations under the configured heuristics.

```ts
type InferOptions = {
  // Literal detection (per-string-field).
  literals?: {
    enable: boolean              // default true
    maxCardinality?: number      // default 20
    maxUniqueRatio?: number      // default 0.3 (unique/total)
    minSamples?: number          // default 5 — below this, never propose literals
  }

  // Discriminated union detection.
  discriminators?: {
    enable: boolean              // default true
    fields?: string[]            // candidate field names; if absent, any field is a candidate
  }

  // Format detection for strings.
  formats?: {
    enable: boolean              // default true
    detect?: FormatName[] | "all" // default "all"
  }

  // Numeric constraints.
  numbers?: {
    integerDetection: boolean    // default true — mark integer when all observed values are integers
    rangeMode: "off" | "evidence-only" | "constraint" // default "evidence-only"
  }

  // Object field handling.
  objects?: {
    closed: boolean              // default true — additional: false when no extra keys observed
    optionalThreshold?: number   // default 1.0 — present in <100% of samples => optional
  }

  // Conflict handling.
  onTypeConflict?: "union" | "unknown" // default "union"
}
```

**Defaults are opinionated, not neutral.** The whole point of schemagen is to be stricter than existing inference tools. Out of the box, `infer` proposes literal unions for low-cardinality strings, marks unobserved fields optional, and closes objects.

### Field ordering

The IR's object fields appear in the order they first appeared in the input. Across multiple samples, the order is stable: fields from earlier samples come before fields only seen in later samples; within a single sample, the input order is preserved.

### Evidence

`infer` does **not** bake evidence into the IR. Evidence (top-K values, presence frequencies, observed numeric ranges, samples) is computed separately by `computeEvidence` against the workspace's records and returned as a parallel tree. This keeps the IR a pure schema artifact: small, hand-editable, and stable across edits that don't change schema shape.

The frontend computes evidence on demand and caches it keyed on `(records-version, ir-shape-hash)`. Most edits (toggling `optional`, adding a literal) don't change which buckets any value falls into, so the cache hits; edits that re-partition the data (changing a node's kind, splitting into a union) invalidate.

## `computeEvidence`

```ts
type EvidenceTree = {
  // Shape mirrors the IR's node tree. Every IR node has a matching evidence node
  // at the same path. Each node carries the per-kind evidence described in
  // ir-spec.md (`Evidence is computed, not stored`).
}
```

Evidence is rebuilt by walking the records against the IR. For each record, the walker descends in lockstep with the schema, incrementing counters and collecting samples at each node. Records that don't match the IR contribute partial evidence — every node they reach gets counted; the failing branch does not.

**Performance contract:** computing evidence over 10,000 records against a typical IR completes in under 100ms. Roughly the same budget as `validate`, because the work is the same shape.

## `findExamples`

```ts
type RecordRef = { index: number; record: unknown }
```

Returns up to `limit` records (default 5) whose value at the given `path` exists and, if `predicate` is given, satisfies it. For example:

- `findExamples(ir, samples, ["status"], v => v === "archived")` — records where `status` is `"archived"`.
- `findExamples(ir, samples, ["address", "country"])` — records that have a `country` field present under `address`.

`findExamples` is a live query, not a cache lookup. The frontend uses it for the "show me an example record" affordance next to evidence in the inspector.

## `validate`

```ts
type ValidationResult = {
  ok: boolean
  mismatches: Mismatch[]
}

type Mismatch = {
  path: (string | number)[]        // JSON-pointer-like
  recordIndex?: number              // index into the input if an array was passed
  kind: MismatchKind
  expected: string                  // human-readable: "string in {active, pending}"
  actual: { value: unknown; description: string } // "string: \"archived\""
  suggestions: Suggestion[]         // ordered, most-recommended first
}

type MismatchKind =
  | "type-mismatch"
  | "literal-violation"
  | "missing-required-field"
  | "unexpected-field"
  | "out-of-range"
  | "pattern-violation"
  | "format-violation"
  | "wrong-length"
  | "null-not-allowed"
  | "non-integer"
```

`validate` accepts either a single record or an array. If given an array, mismatches carry `recordIndex`; if given a single record, they do not.

**Performance contract:** validating 10,000 records against a typical IR (depth ~5, ~50 fields) must complete in under 100ms on a modern laptop. Validation is called on every IR edit in the frontend; it cannot be the bottleneck.

`validate` never throws on semantic mismatch. It throws only if the IR is structurally invalid.

## Suggestions and Changes

Every mismatch carries `suggestions: Suggestion[]`. A suggestion is a Change with a human-readable label and a rationale.

```ts
type Suggestion = {
  label: string             // "Add \"archived\" to status literals"
  rationale: string         // "Resolves 47 mismatches across the dataset"
  change: Change
}

type Change =
  | { op: "set-node",         path: Path, node: Node }
  | { op: "set-field-type",   path: Path, type: Node }
  | { op: "add-field",        path: Path, name: string, entry: FieldEntry, position?: number }
  | { op: "remove-field",     path: Path, name: string }
  | { op: "rename-field",     path: Path, from: string, to: string }
  | { op: "reorder-fields",   path: Path, order: string[] }
  | { op: "set-optional",     path: Path, name: string, value: boolean }
  | { op: "set-nullable",     path: Path, name: string, value: boolean }
  | { op: "add-literal",      path: Path, value: string | number | boolean }
  | { op: "remove-literal",   path: Path, value: string | number | boolean }
  | { op: "clear-literals",   path: Path }
  | { op: "set-format",       path: Path, format: string | null }
  | { op: "set-pattern",      path: Path, pattern: string | null }
  | { op: "set-bound",        path: Path, which: "min" | "max" | "minLength" | "maxLength" | "minItems" | "maxItems", value: number | null }
  | { op: "set-integer",      path: Path, value: boolean }
  | { op: "wrap-in-union",    path: Path, with: Node }              // current node + with → union variants
  | { op: "add-union-variant",path: Path, variant: Node }
  | { op: "remove-union-variant", path: Path, index: number }
  | { op: "set-discriminator",path: Path, field: string | null }
  | { op: "wrap-in-array",    path: Path }                           // current node → items of new array
  | { op: "unwrap-array",     path: Path }                           // array → its item type
  | { op: "set-additional",   path: Path, value: false | true | Node }
  | { op: "batch",            changes: Change[], label?: string }    // grouped for history
```

`Path` is `(string | number)[]` — strings for object fields and "items" / "variants" markers, numbers for indexed positions (tuple positions, variant indices, array index when addressing inside `items`).

### Invertibility

`applyChange(ir, change)` returns `{ ir: newIR, inverse: Change }`. The `inverse`, when applied to `newIR`, produces an IR equal to the original `ir` (by deep value equality).

This is a hard contract. Every operation in the `Change` union must be invertible. Operations that destroy data (`remove-field`, `clear-literals`, `set-format` with `null`) produce an inverse that carries the destroyed data — e.g. the inverse of `remove-field` is an `add-field` carrying the removed `FieldEntry` and its original position.

`batch` is inverted by reversing the sequence and inverting each child.

### Why Change-based, not snapshot-based

History is a stack of Changes, not a stack of IR snapshots. This gives:

- **Semantic history entries.** The UI can label history items meaningfully ("Widened `status` to free string") instead of "Edit 47".
- **Cheap memory.** A 200-edit session doesn't hold 200 full IR copies.
- **Composability.** Suggestions, manual edits, and merge resolutions are all the same type. They compose, batch, and replay uniformly.

The frontend is free to also snapshot the IR for performance (e.g. cache validate results per snapshot). Core does not.

## Identity

Records are **byte-deduped** on import by canonical-stringification — this is non-optional and prevents exact re-uploads from accumulating. Optionally, the dev configures a **logical identity key** so that semantically-equivalent records (same entity, different field values over time) also dedupe.

```ts
type IdentityConfig = {
  fields: Path[]                          // ["id"] or [["user","id"]] or [["order","id"], ["lineId"]]
  onDuplicate: "replace" | "skip" | "keep-all"
}

type IdentityProposal = {
  fields: Path[]                          // the proposed key — single field or composition
  confidence: {
    uniqueness: number                    // fraction of records with a unique value at the key
    presence: number                      // fraction of records where every key field is present
  }
  rationale: string                       // human-readable: "Field `id` is unique in 100% of records and present in 100%"
}
```

### `proposeIdentityKey`

Scans the records and looks for a key — single field or short composition — that is both highly unique and consistently present. Returns the best candidate, or `null` when nothing clears a confidence threshold (default: uniqueness ≥ 0.95, presence ≥ 0.95).

Single-field candidates are tried first across every top-level field. If no single field qualifies, the function tries pairs of fields. It does not try triples — the search space gets expensive and the result is usually noise.

### `dedupeByIdentity`

Given a config, applies logical dedup over the records. The `onDuplicate` modes:

- **`replace`** — newest occurrence wins. Earlier records with the same identity are dropped.
- **`skip`** — first occurrence wins. Later duplicates are dropped.
- **`keep-all`** — no logical dedup; canonical-hash dedup still applies. Useful when entities mutate over time and the dev wants evidence to see every version (e.g. for correct optional-field inference).

`dedupeByIdentity` is order-sensitive (because of `replace`/`skip`); the caller controls record order. The function is otherwise pure.

The frontend persists the `IdentityConfig` as workspace state and applies it on every import. The core library is stateless — it only provides the analysis and the dedup primitive.

## `merge`

```ts
type MergeOptions = {
  // How to resolve each mismatch kind. "auto" picks the first suggestion.
  resolution?: Partial<Record<MismatchKind, "auto" | "skip">>
  // Default: { "type-mismatch": "skip", everything else: "auto" }
}
```

`merge` runs `validate`, then for each mismatch picks the configured resolution and applies it. Returns the new IR, the list of applied Changes (so they can enter history individually), and any mismatches that were skipped or had no suggestion.

`merge` is a convenience over `validate` + `applyChange`. The frontend's primary flow is the manual mismatch panel; `merge` exists for CLI/scripted use and for the optional "auto-apply all" button.

## `emit`

```ts
type EmitOptions = {
  draft?: "2020-12"            // default
  preserveFieldOrder?: boolean // default true (cosmetic — emits a comment or doc-order hint)
  $id?: string                 // root $id
  $schema?: string             // root $schema URL
}
```

The IR carries no evidence to strip — emission is a direct mapping of the schema.

`emit` is a pure mapping from IR to a JSON Schema document object. It does not stringify; the caller picks the serialization. Round-trip is one-way: there is no `parseJsonSchema → IR` function in v1.

### IR → JSON Schema mapping (summary)

| IR | JSON Schema |
|---|---|
| `unknown` | `true` |
| `null` | `{ "type": "null" }` |
| `boolean` (no literals) | `{ "type": "boolean" }` |
| `boolean` (literals: [x]) | `{ "const": x }` or `{ "enum": [...] }` |
| `string` (free) | `{ "type": "string", ...constraints }` |
| `string` (literals) | `{ "enum": [...] }` (+ type if needed) |
| `number` (integer) | `{ "type": "integer", ...bounds }` |
| `number` (any) | `{ "type": "number", ...bounds }` |
| `array` | `{ "type": "array", "items": ... }` |
| `tuple` | `{ "type": "array", "prefixItems": [...], "items": rest \|\| false }` |
| `object` | `{ "type": "object", "properties": {...}, "required": [...], "additionalProperties": ... }` |
| `record` | `{ "type": "object", "additionalProperties": ..., "propertyNames": { "pattern": ... } }` |
| `union` (no discriminator) | `{ "anyOf": [...] }` |
| `union` (discriminator) | `{ "oneOf": [...] }` + per-variant `const` on the discriminator field |

`nullable` is expressed by widening to `{ "anyOf": [originalType, { "type": "null" }] }` at emit time. `optional` is expressed by omission from `required`.

### Future targets

`emit(ir, "zod" | "typescript" | "io-ts" | ...)` are deferred. The IR is designed to support them; v1 only ships JSON Schema. See [frontend-spec.md](./frontend-spec.md#export-panel) for the UX hooks.

## Stability and versioning

The IR shape is the public contract. Changes to it follow semver:

- Adding a new optional field to a node: minor.
- Adding a new node `kind`: minor (consumers must handle unknown kinds gracefully, which is documented).
- Changing the meaning of an existing field, removing a kind, or changing structural validity rules: major.

The Change union is internal contract — applied through `applyChange`, never serialized into the IR itself. Adding new ops is minor. The frontend is free to construct Changes directly; downstream tooling should use `applyChange` rather than hand-rolling IR mutation.

## What's deferred

- **Streaming inference.** v1 holds all samples in memory.
- **Partial validation** (early exit, sampling). v1 validates fully.
- **Schema diffing** (IR vs IR). Useful for change review across saves; defer.
- **Named definitions / `$ref`-style sharing across nodes.** Tied to recursive schemas; defer.
- **JSON Schema → IR import.** One-way export only in v1.
