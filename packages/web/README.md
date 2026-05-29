# @schemagen/web

Web UI for schemagen. See [docs/frontend-spec.md](../../docs/frontend-spec.md) for the design.

## Scripts

- `pnpm dev` — Vite dev server.
- `pnpm test` — Vitest (jsdom + RTL).
- `pnpm e2e` — Playwright (one walk-through spec). Requires `pnpm dev` running OR Playwright will spawn it.
- `pnpm build` — production bundle.
