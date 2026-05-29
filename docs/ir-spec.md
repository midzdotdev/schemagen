# IR Specification

The Intermediate Representation (IR) is schemagen's native, source-of-truth schema format. It is the artifact developers edit. Other formats (JSON Schema, Zod, TypeScript) are emitted from it as one-way exports — they are never read back.

## Design properties

The IR is:

1. **Plain JSON-shaped data.** No opaque IDs, no references that aren't expressible in JSON, no binary encoding.
2. **Hand-editable.** A developer can open the IR in a text editor and make changes without tooling.
3. **Field-order-preserving.** Object fields are serialized in the order they were first observed in the input data so the IR visually mirrors the data.
4. **Structurally validated, semantically unconstrained.** The core library guarantees the IR is structurally well-formed (every node has the fields its `kind` requires). It does *not* enforce that the IR accepts any particular dataset. Whether the IR matches data is a separate axis, reported by `validate()`, never gated.
5. **Immutable in transit.** Every mutating core operation returns a new IR. The frontend may rely on referential equality to diff.

## Node kinds

Every node is `{ kind: <string>, ...kind-specific fields }`.

The IR contains **only the schema**. Evidence (top-K values, observed ranges, cardinality, presence counts) is **not stored in the IR**. It is computed on demand from the workspace's record store. See [core-spec.md](./core-spec.md#computeevidence) and [frontend-spec.md](./frontend-spec.md#persistence) for how evidence is produced and where records live.

The reason: schemagen workspaces persist records in IndexedDB, so evidence is always reproducible from `(records, IR, options)`. Baking it into the IR would create a staleness axis without buying portability — and it would pollute the small, hand-editable schema artifact that the IR is supposed to be.

### `unknown`

Escape hatch. Accepts anything. Used as a placeholder during editing or when inference cannot determine a type (e.g. all observed values were `null`).

```json
{ "kind": "unknown" }
```

### `null`

Matches only the JSON `null` value.

```json
{ "kind": "null" }
```

### `boolean`

```json
{ "kind": "boolean", "literals": [true] }
```

- `literals?: boolean[]` — if present, restricts to these specific values. Omit for any boolean.

### `number`

```json
{ "kind": "number", "integer": true, "min": 0, "max": 100, "literals": [1, 2, 3] }
```

- `integer?: boolean` — if `true`, restricts to integers. If absent, any number.
- `min?: number`, `max?: number` — inclusive bounds. Independent.
- `literals?: number[]` — if present, restricts to these values. Mutually exclusive with `min`/`max` semantically (the UI should not surface both at once, but the IR doesn't forbid the combination — it just means the strictest applies).

### `string`

```json
{ "kind": "string", "literals": ["active", "pending"], "format": "date", "pattern": "^[a-z]+$", "minLength": 1, "maxLength": 64 }
```



- `literals?: string[]` — restricts to these values.
- `format?: string` — recognized formats are the standard JSON Schema format names: `"date"`, `"date-time"`, `"uuid"`, `"email"`, `"uri"`, `"hostname"`, `"ipv4"`, `"ipv6"`. Open set; emitters pass known formats through unchanged and ignore unrecognized ones.
- `pattern?: string` — regex (ECMAScript flavor).
- `minLength?: number`, `maxLength?: number`.

All constraints are AND'd. To express "one of these literals OR a free string" use a `union`.

### `array`

Homogeneous sequence.

```json
{ "kind": "array", "items": <node>, "minItems": 0, "maxItems": 100, "uniqueItems": true }
```

- `items: Node` — required.
- `minItems?: number`, `maxItems?: number`.
- `uniqueItems?: boolean`.

### `tuple`

Fixed-position heterogeneous sequence.

```json
{ "kind": "tuple", "items": [<node>, <node>, ...], "rest": <node> }
```

- `items: Node[]` — positional types, required.
- `rest?: Node` — if present, additional elements past `items.length` must match this. Omit for a fixed-length tuple.

### `object`

```json
{
  "kind": "object",
  "fields": {
    "id":   { "type": <node>, "optional": false, "nullable": false },
    "name": { "type": <node>, "optional": true,  "nullable": false }
  },
  "additional": false
}
```

- `fields: Record<string, FieldEntry>` — insertion order is significant for serialization and UI.
  - `type: Node` — required.
  - `optional?: boolean` — default `false`. If `true`, the key may be absent.
  - `nullable?: boolean` — default `false`. If `true`, the value may be `null` in addition to whatever `type` accepts.
- `additional: false | true | Node` — what to allow for keys not in `fields`. `false` = closed (default), `true` = any value, `Node` = values must match.

`optional` and `nullable` are independent. A field can be optional-but-not-nullable (key may be missing; if present, value cannot be null), nullable-but-not-optional (key must be present; value may be null), neither, or both.

### `record`

String-keyed map with homogeneous value type. For dictionaries where keys are data, not field names.

```json
{ "kind": "record", "values": <node>, "keyPattern": "^[a-z_]+$" }
```

- `values: Node` — required.
- `keyPattern?: string` — regex constraint on keys.

### `union`

```json
{
  "kind": "union",
  "variants": [<node>, <node>, ...],
  "discriminator": "type"
}
```

- `variants: Node[]` — must have at least 2 entries. A single-variant "union" should be collapsed to that variant.
- `discriminator?: string` — if present, names a field every variant (which must be an `object`) carries with a distinct literal value. Used for fast validation and clearer emission. The core may set this during inference; the dev may set/clear it manually. Not required for correctness.

## Evidence is computed, not stored

Evidence — observed value counts, cardinality, presence frequency, sample values, numeric ranges — is **not** part of the IR. It is computed on demand by `computeEvidence(ir, records)` (see [core-spec.md](./core-spec.md#computeevidence)) against the records held in the workspace.

The shape of that computed evidence mirrors the IR's node tree. Every IR node has a corresponding evidence node carrying the kind-specific counts and samples the UI needs:

- **All**: `count` — how many records reached this node.
- **`string`**: top-K `values`, `cardinality`, length bounds, sample free-string values.
- **`number`**: observed `min`/`max`, integer/float counts, samples.
- **`boolean`**: `trueCount`, `falseCount`.
- **`object`**: `fieldPresence` per field (count of records in which each was present).
- **`array`**: length distribution.
- **`union`**: per-variant counts plus, for each variant, its own evidence subtree.

Evidence is descriptive, never prescriptive — it does not affect validation semantics, and the IR is valid with or without it. Manual edits to the IR do not invalidate evidence; the next `computeEvidence` call simply re-derives whatever the current records support.

## Serialization

The IR is serialized as JSON. The root is a single Node. There is no separate document envelope, no version field at the top level — version is implicit in the structure. (A `$version` field may be added later if breaking changes ship.)

Pretty-printing: 2-space indent, object keys preserved in insertion order, no key sorting. The frontend's "export IR" and "import IR" round-trip exactly.

## Structural validity

A core function `isValid(ir): boolean` (and a richer `checkStructure(ir): StructureError[]`) checks:

- Every node has a recognized `kind`.
- Every node has the required fields for its kind (e.g. `array` has `items`, `object` has `fields`).
- `union.variants.length >= 2`.
- `object.fields` keys are strings.
- Numeric bounds are not inverted (`min <= max`).
- `tuple.items` is a non-empty array.

Structural validity is enforced at API boundaries — `validate`, `merge`, `emit`, and `applyChange` all reject structurally invalid IRs with a clear error. Hand-edited IRs are checked on import.

Structural validity is distinct from data validity. An IR can be structurally valid and still reject every record in the dataset; that is the developer's intent and is reported by `validate`, not blocked.

## What's deferred

- **Intersection types.** Rare in real data, complex to validate and emit. Add when a concrete need appears.
- **Recursive / self-referential schemas.** Would require named definitions and references. Add when a concrete need appears.
- **Schema-level metadata** (title, description, version). Likely a top-level envelope when added; node-level descriptions can be added as a `description?: string` field on any node without breaking anything.
- **Custom format extensions.** The `format` field is open-ended already; a registry can be added later.
