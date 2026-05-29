# CLAUDE.md

## Keep the README current

The README is the entry point for anyone reviewing schemagen and is the only doc most readers will open. Treat it as part of every change set:

- When specs change in `docs/`, reflect the relevant shift in the README (current state, aspirations, uniqueness claims, or walk-through).
- When capabilities are added or removed, update the walk-through so its examples still match how the tool behaves.
- When milestones move (spec → core → frontend → published packages), update "Current state".
- When new export targets ship (Zod, TypeScript, others), promote them from "later" to listed alongside JSON Schema.

Don't let the README drift behind reality. If a change makes any part of the README wrong, fix it in the same commit.
