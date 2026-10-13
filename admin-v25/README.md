# Woodex Admin v2.5 Pro — prototype

Working UI prototype for the React + TypeScript master dashboard described in
[`../ADMIN-V2.5-MASTER-PLAN-2026-10-13.md`](../ADMIN-V2.5-MASTER-PLAN-2026-10-13.md).

This is a **design and architecture prototype**: real layouts, real interactions, real design
tokens, mock data. No API is called and nothing is written anywhere.

```bash
npm install
npm run dev       # http://localhost:5173  (binds 0.0.0.0)
npm run verify    # typecheck + 65-route render smoke + production build
```

## What works

| Screen | Route | What it demonstrates |
|---|---|---|
| Dashboard | `#/dashboard` | 4-up KPI row, quoted-vs-won chart, "needs attention" rules, activity feed, quick actions, role-aware money |
| Leads | `#/leads` | filters, search, sort, bulk selection bar, empty state, footer totals |
| Pipeline | `#/pipeline` | drag-and-drop stage board **plus** keyboard move (← / →), weighted forecast, stage-discipline bars |
| Quotations | `#/quotes` | 34-line BOQ builder, dual-bank routing, server-PDF honesty note |
| Theme | `#/theme` | live token contract — switch theme, accent and density and the whole app (and every chart) follows |
| Any other route | e.g. `#/backups` | the build plan for that screen: phase, API actions, the v2.1 module it replaces |

Plus: ⌘K command palette over all 65 routes, collapsible sidebar groups, light/dark, three accents,
two densities, prototype banner, and an explicit 404 screen.

## Architecture notes

| File | Why it exists |
|---|---|
| `src/lib/nav.ts` | The typed route registry — one route, one component. Replaces the v2.1 `NAV` tuple array that caused AD-3 (undefined phase), AD-4 (unreachable aliases) and AD-12 (20 view keys registered twice) |
| `src/styles/tokens.css` | The token contract. Components may only read semantic tokens, never primitives or hex |
| `src/lib/theme.ts` | Theme/density/accent controller + `useTokens()` so charts re-read resolved values on theme change (the v2.1 defect where charts stayed blue in dark mode) |
| `src/components/charts.tsx` | All chart colours come from tokens; also a pure-SVG `Ring` for scores |
| `src/smoke.tsx` | Renders every route through the real reconciler and fails on any throw — the crash test v2.1 lacked |

## Measured

```
npm run typecheck   → clean (strict, noUnusedLocals, noUnusedParameters)
npm run smoke       → 70 checks · 65 routes · 0 failures
npm run build       → index 80 kB · vendor 160 kB · icons 36 kB · charts 388 kB (lazy)
```

## Not included (deliberately)

No API client, no auth, no state library, no tests beyond the render smoke, no i18n.
Those are Phase 1 of the master plan, not prototype scope.
