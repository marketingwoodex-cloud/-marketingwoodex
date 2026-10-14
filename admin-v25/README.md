# Woodex Admin v2.5 Pro

The admin dashboard described in [`../ADMIN-V2.5-MASTER-PLAN-2026-10-13.md`](../ADMIN-V2.5-MASTER-PLAN-2026-10-13.md),
over the PHP API in `../api/v2`.

**It is no longer a prototype with no backend.** The app asks `GET /health` and `GET /me` when it
starts, and everything follows from the answers — three states, and the shell always shows which one
you are in:

| State | When | What the screens show |
|---|---|---|
| **live** | api/v2 answers and someone is signed in | `GET /dashboard`, `GET /leads`, `GET /notifications/poll` — real rows, server-side filters and paging, the counts on the page are the counts the server sent |
| **signed out** | api/v2 answers, nobody signed in | the sign-in screen: password, then the two-factor code, with the API's own error text and request-id |
| **not answering** | api/v2 is not answering | the status strip says why; every screen says it cannot read anything and shows no figures |

Falling back to mock data *while the API is answering* was deliberately ruled out. A screen that shows
invented numbers beside a live backend is worse than no screen, because somebody will believe them.
What is not built yet says so on the screen ("values inside the documents, not summed here"), and a
failed load shows the failure with its request-id rather than a stale figure.

## A development database with data in it

The console is only worth checking against data. On an empty SQLite database every screen is correct and
nearly empty, so there is a seeder and a check for the dashboard:

```bash
npm run db:init                 # migrations into _private/woodex.sqlite (git-ignored)
npm run db:owner -- --email owner@woodex.local --name "Woodex Owner"   # prints the password once; copy the sign-in
                                                                       # into _private/dev-owner.txt (name: and password: lines)
npm run dev:api                 # api/v2 on 127.0.0.1:8080
npm run db:seed                 # 5 clients, 12 leads, 3 quotations (one invoiced, one part-paid), 3 bookings
npm run dashboard:verify        # every /dashboard figure against the SQLite file, plus the stale-lead rule
```

`db:seed` writes only through the API, so it also exercises the write routes. It refuses to run on a database
that already has leads, and it refuses any host but 127.0.0.1. `dashboard:verify` reads the database itself and
never trusts the PHP's own arithmetic; it exits 1 if any figure disagrees.

```bash
npm install
npm run dev            # http://localhost:5173  (binds 0.0.0.0, proxies /api → the API)
npm run dev:api        # php -S 127.0.0.1:8080 api/v2/index.php — needs PHP (see below)
npm run verify         # typecheck + 65-route render smoke + production build
```

`/api` is **proxied, not called cross-origin** — api/v2 is same-origin by design (no CORS, a
SameSite session cookie, a CSRF token tied to it), and a dev server that had to weaken all three to
work would be the one place the prototype behaved differently from production. Point it somewhere
else with `WX_API_TARGET=https://… npm run dev`.

**When the API is not running**, the dev server says so in the API's own envelope. `/api` and `/assets`
answer `502 UPSTREAM` with the command that fixes it, instead of an empty 500 that reads like a bug in
the API:

```json
{"ok":false,"error":{"code":"UPSTREAM","message":"api/v2 is not answering at http://127.0.0.1:8080. Start it with `npm run dev:api` …"}}
```

Vite still logs its own `http proxy error` line for each request — that is vite's dev logging, not the
app. The front end is unaffected: it settles into the offline state with no figures on any screen, and
the status strip carries the reason. A sandbox with no PHP and no MySQL (the build sandbox, for
instance) therefore runs the front end quite happily and shows nothing from the server — which is why
`npm run dev:api` is the one script here that needs the host.

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
| `src/lib/session.tsx` | The three link states, the health poll, the sign-in handshake, and one handler for "the API says sign in again" so every screen behaves the same |
| `src/lib/live.ts` | `useLive()` — fetch, cancel, reload, and the failure with its request-id. A screen using it can show loading, data or the reason there is none, and nothing else |
| `src/screens/LiveDashboard.tsx`, `LiveLeads.tsx` | The mock screens with the mock removed: server-side filters and paging, totals from the server, honest gaps in words |

## What the render smoke test covers

`npm run smoke` renders all 65 routes through React's real reconciler (the crash test v2.1 lacked) and
then, because `renderToString` does not run effects, renders the three states a *server* causes by
handing the tree a session: signed out (the sign-in form must exist and not be blank), live dashboard
(which must show "Loading…" and must **not** contain a KPI value before the server answers), and live
leads. The last pair is the assertion that matters — it is the test that fails if someone later
"helpfully" renders zeros while a request is in flight.

## Measured


```
npm run typecheck   → clean (strict, noUnusedLocals, noUnusedParameters)
npm run smoke       → 70 checks · 65 routes · 0 failures
npm run build       → index 80 kB · vendor 160 kB · icons 36 kB · charts 388 kB (lazy)
```

## Not included (deliberately)

No API client, no auth, no state library, no tests beyond the render smoke, no i18n.
Those are Phase 1 of the master plan, not prototype scope.
