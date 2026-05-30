# CLAUDE.md

## Keep the README current

The README is the entry point for anyone reviewing schemagen and is the only doc most readers will open. Treat it as part of every change set:

- When specs change in `docs/`, reflect the relevant shift in the README (current state, aspirations, uniqueness claims, or walk-through).
- When capabilities are added or removed, update the walk-through so its examples still match how the tool behaves.
- When milestones move (spec → core → frontend → published packages), update "Current state".
- When new export targets ship (Zod, TypeScript, others), promote them from "later" to listed alongside JSON Schema.

Don't let the README drift behind reality. If a change makes any part of the README wrong, fix it in the same commit.

## Import conventions

- **Intra-package** (within `@schemagen/web` or `@schemagen/core`): use the `@/` alias for anything that would otherwise need to climb two or more parent directories. `@/` is configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`. Sibling and one-level-up relative imports are still fine.
- **Cross-package**: import via the package name (e.g. `import { applyChange } from "@schemagen/core"`). Never reach into a sibling package's `src/` via relative path.
- Biome enforces this via `lint/style/noRestrictedImports` — anything that starts with three or more `../` is rejected.
