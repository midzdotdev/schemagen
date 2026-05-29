# Frontend Specification

The frontend is a developer tool for visualizing, editing, and iterating on a schemagen IR. It consumes [@schemagen/core](./core-spec.md) and adds no schema semantics of its own — every IR mutation goes through `applyChange`, every validity question goes through `validate`.

This spec describes views and behavior, not implementation details. Framework choice, styling, and routing are decided when building.

## Operating principles

1. **The IR is what the developer edits.** Not JSON Schema. Not their original data. The IR is the source of truth; everything else is a view or an export.
2. **Operations are never disabled by validity.** The developer can make any structurally valid edit at any time, including edits that cause the schema to reject every record in the dataset. Multiple steps may be needed to reach the desired schema; the UI must not block intermediate states.
3. **Validity is shown, never enforced.** Mismatches are displayed continuously — inline on the schema tree, in a side panel, and on individual records — but never as gates.
4. **Every edit is undoable.** The full edit history is preserved for the session and presented to the developer.
5. **The original data is not the artifact.** The IR is. Data is an input to inference and a target for validation; the developer can swap, append, or discard data without affecting the IR.

## Top-level layout

Three regions:

- **Left**: Data panel. Paste or upload JSON (single object or array). Shows record count, validation summary per record.
- **Center**: Schema tree. The IR rendered as an interactive, expandable tree. Primary editing surface.
- **Right**: Inspector + Mismatches + History (tabbed or stacked). The inspector shows details and edit controls for the selected node; the mismatches tab lists current validity issues; the history tab lists every change with undo/redo.

The export panel is a modal or drawer triggered from the schema tree header.

## Data panel

The data panel manages the workspace's persistent record set (see [Persistence](#persistence)). Records added here live in IndexedDB across sessions until the dev clears them.

### Importing records

Sources: file upload, drag-drop, clipboard paste. Accepted formats: JSON (single value or array) and NDJSON (one JSON value per line).

After parsing:

- **If the parsed root is an array of objects**, it's used directly — no modal.
- **If the parsed root is a primitive or array of primitives**, refuse with a clear message ("schemagen needs record-shaped data; the input is a single value / array of strings").
- **For anything else** (objects, arrays of mixed types, arrays containing nested arrays — any non-primitive structure), open the **root picker**.

### Root picker

The picker walks the parsed structure and lists every path whose value is an **array of objects**. Paths use JSON-pointer-style segments: object keys are field names, array positions are integer indices. Examples surfaced as picker options:

- `.data.items` — object → object → array of records
- `.results` — object → array of records
- `[2]` — array of mixed values, where index 2 is the record array
- `.batches[0].rows` — mixed structure with arrays at multiple levels

Each option shows a count and a preview of the first record. The dev picks one to commit.

If the structure contains no array of objects at any depth, the picker explains this and offers "treat the root as a single record" as the only path. Same-shaped re-imports remember the chosen path for the session.

### Deduplication

Two layers of dedup run on every ingest:

**Byte dedup** (always on). Records are canonical-stringified (recursive key sort + stringify; use `fast-json-stable-stringify` or equivalent). The canonical string is the record's stable ID inside the workspace. Re-importing the same file is silently idempotent. Whole-record only — nested objects are never deduped, because that would mask repetition the schema should reflect.

**Logical dedup** (optional, per-workspace identity config). When the dev configures an identity key — a single field or a tuple of fields uniquely identifying an entity — records sharing the same identity collapse according to `onDuplicate`:

- **Replace** (default when configured) — newest wins. A weekly import of "all users" stays the same size as the user base, not 52× larger.
- **Skip** — first occurrence wins.
- **Keep-all** — no logical dedup. Useful for time-series-y data where entities mutate and the schema should reflect every state (e.g. `reason` only appearing on `"archived"` records should be inferred as optional, which requires evidence to see both states of the same entity).

The import summary reports both layers: "1,247 records, 14 byte duplicates skipped, 89 replaced by identity (`id`)".

### Identity-key suggestion

After every import, schemagen calls `proposeIdentityKey` on the (just-ingested) record set. If a high-confidence candidate exists and the workspace has no identity config yet, a banner surfaces above the data panel:

> **Identity key suggestion.** Field `id` appears in 100% of records and is unique in 100% of them. Use it as the identity key? Future imports will replace records with matching `id` instead of accumulating duplicates.
> [Use `id`] [Pick a different field] [Not now]

"Pick a different field" opens the identity settings dialog. "Not now" dismisses for this workspace until the next import notices the dedup pile is large enough to warrant re-suggesting.

If the dev later changes the config — adds, removes, or recomposes the key — the workspace re-runs `dedupeByIdentity` over the existing records. Dropped records are surfaced in a confirmable diff before the change commits, so a misconfigured key doesn't silently destroy data.

The identity settings dialog also explains the `replace` vs `keep-all` trade-off in one sentence: *"Replace keeps only the latest version of each entity — fine for snapshots. Keep-all preserves every version — choose this when the schema needs to reflect how entities change over time."*

### Modes

After commit, the dev chooses what to do with the new records:

- **Infer schema** — overwrites the current IR. The dataset becomes (or replaces) the inference input.
- **Add and validate** — appends to the persistent record set, leaves the IR untouched, runs `validate` and populates the mismatch panel.
- **Replace and re-infer** — clears existing records, ingests these, re-runs inference with current options.

### Per-record view

The panel lists records with a validity badge (green = matches, red with mismatch count). Clicking a record opens it in a side detail view and scrolls the mismatch panel to its entries. Records can be individually removed; they remain in the deduped set unless explicitly purged.

## Schema tree (center)

Renders the IR. Each node row shows:

- The node kind (icon + label).
- For object fields: the field name, optional/nullable badges.
- For strings/numbers with literals: the literal set inline (truncated with "+N more").
- For strings: format badge if set.
- A mismatch badge if any current mismatches touch this node or its descendants. Hovering shows the count and a list link.
- A small evidence summary on hover (count, observed range, top values). Evidence is computed live via `computeEvidence` against the workspace's record set; it updates automatically when records change.

A "show example records" affordance on any node calls `findExamples` and surfaces matching records in the data panel.

Selecting a node highlights it and opens the inspector. Right-click / context menu offers the operations that target this node.

## Inspector (right)

Per-node edit controls. **The full operation set is always available** — buttons are not disabled because applying them would break data validity. The inspector may show a warning ("This will cause N new mismatches") but never blocks.

Universal operations (on any node):
- Change kind (drops kind-specific fields, populates new ones with defaults).
- Wrap in array.
- Wrap in union (with a second variant).
- Wrap in optional (only meaningful on a field — moves the wrapping logic to the field entry).

Per-kind operations:

- **`string`**: toggle literal/free, add/remove literal, set/clear format, set/clear pattern, set/clear length bounds.
- **`number`**: toggle integer/float, add/remove literal, set/clear min/max.
- **`boolean`**: toggle constrained-to-literal.
- **`array`**: convert to tuple, set item type (navigates to the items node), set length bounds, toggle uniqueItems.
- **`tuple`**: add/remove position, set rest type, convert to array.
- **`object`**: add field, remove field, rename field, reorder fields, toggle field optional, toggle field nullable, set additional-properties policy.
- **`record`**: set value type, set key pattern.
- **`union`**: add variant, remove variant, set/clear discriminator, swap variants.

Every operation produces a `Change`, goes through `applyChange`, and lands in history.

## Mismatch panel (right)

Lists every entry from the latest `validate` result. Each entry shows:

- The path (clickable — scrolls and selects the corresponding node in the tree).
- The record index (clickable — scrolls the data panel).
- A short description of what mismatched.
- The suggestions, each rendered as a one-click button. Clicking applies the suggestion's `Change` and lands a new entry in history with the suggestion's label.

Multi-select is supported: select a set of mismatches and apply "auto-resolve" (uses the first suggestion of each) or "dismiss" (removes them from the panel without modifying the IR — they reappear on the next validate).

Grouping: by record, by path, by mismatch kind. Default: by path. A record with many mismatches collapses to one row with a count.

## History (right)

A linear list of every Change applied to the IR since inference (or since the developer started from scratch). Each entry shows:

- Sequence number.
- Label (from the suggestion that produced it, or auto-generated from the operation).
- Source: "inferred" / "manual" / "suggestion" / "merge".
- Path it targeted.

Operations:

- **Undo** (`⌘Z`): apply the inverse of the most recent change. Moves the entry to a redo stack.
- **Redo** (`⌘⇧Z`): reapply the most recently undone change.
- **Jump to**: click any entry to undo all changes after it. Subsequent edits clear the redo stack from that point.

History is persisted in IndexedDB as part of the workspace — undo/redo survive reloads. Schema exports drop history; session exports include it. Importing a schema file starts a fresh history with one entry: "Loaded".

History uses the `Change` model from core directly. The frontend does not maintain its own snapshot stack — it relies on the invertibility contract of `applyChange`.

### Batching

Multi-step edits initiated from a single UI action (e.g. "auto-resolve all 12 mismatches") are wrapped in a `batch` Change with a labeled summary. The history shows one entry; expanding it reveals the constituent changes. Undo undoes the whole batch.

## Export panel

Triggered from the schema tree header. Shows:

- A live preview of the JSON Schema emission of the current IR.
- A target selector (v1: JSON Schema only; placeholders for Zod, TypeScript, etc.).
- Emit options (draft version, `$id`, `$schema`).
- Copy and download buttons.

The export panel is read-only. Changes flow only one way: IR → export. There is no edit-the-JSON-Schema mode.

## Persistence

The frontend uses **IndexedDB** as the primary persistence layer. A workspace is the unit of saved state and contains:

- The current IR.
- The deduped record set (keyed by canonical-stringified content hash).
- The full Change history (every applied Change with its inverse — the undo/redo stack survives reloads).
- Inference options.
- Identity config (optional logical-identity key — see [Deduplication](#deduplication)).
- Ingest metadata: file names, chosen root paths, timestamps, dedup counters.

Multiple workspaces coexist in IndexedDB and are selectable from a workspace list on app start. There is no server, no account; everything is local.

### Storage durability

`navigator.storage.persist()` is requested on first workspace creation. When granted, the browser will not evict the workspace under storage pressure. The result is shown in the UI ("Persistent storage: granted" / "best-effort").

**Safari and other browsers without robust `persist()` semantics get a banner:** "Your browser may clear schemagen's storage after periods of inactivity (typically about 7 days on Safari). Export sessions you want to keep." The banner is dismissible per workspace but reappears if storage estimates show pressure or eviction has occurred since last visit.

A storage estimate (`navigator.storage.estimate()`) is checked on workspace open; if usage exceeds a threshold (say 75% of quota), the dev is nudged to export and prune older workspaces.

### Export shapes

Two file-based exports, both fully importable:

- **Schema export** (`workspace.schema.json`) — just the IR. Small, hand-editable, the right artifact to commit to a repo or share with another tool. No records, no history.
- **Session export** (`workspace.session.json` or `.zip` if large) — everything: IR, records, history, options, metadata. The right artifact for "I want to continue this on another machine" or "send my colleague a reproducible state". Imports as a new workspace.

Session files are intentionally heavyweight. We don't try to slim them; the dev opts in when they want portability of the whole working state. What goes inside session files is kept exhaustive for v1 — we err on the side of preserving anything that might be needed for future schema iteration, rather than pre-optimizing for size.

### Import flow

Importing a schema file creates a workspace with no records; the dev can then add data. Importing a session file restores the workspace as-is, including history (so undo works back through the original edit sequence).

### Crash recovery

In-progress edits are flushed to IndexedDB on every Change application (the persistence layer is the durable history). There is no separate autosave mechanism; the dev never has to save the working state manually.

## Performance budgets

These match the core's contract:

- IR with depth ≤ 8 and ≤ 200 nodes: every UI operation is <16ms (one frame).
- Validation across ≤ 10,000 records on every edit: <100ms (driven by core).
- History stack of 500 entries: undo/redo each <16ms.

If the data grows beyond these budgets, the data panel may sample or batch revalidation; the schema editing experience must remain at frame rate.

## Keyboard

- `⌘Z` / `⌘⇧Z`: undo / redo.
- `⌘E`: open export panel.
- `⌘F`: focus search-in-tree (jump to a node by field name or path).
- `Esc`: clear selection.
- Arrow keys: navigate the tree when the tree has focus.
- `Enter`: open the inspector for the selected node.

## Out of scope for v1

- Multi-user collaboration / shared sessions.
- Multiple schemas open at once.
- Schema comparison / diff between two saved IRs.
- Importing existing JSON Schema as a starting point.
- Inferring across heterogeneous data sources (CSV, NDJSON files, URLs).
- Persistence beyond local files and crash-recovery autosave.
