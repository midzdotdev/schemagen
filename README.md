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
