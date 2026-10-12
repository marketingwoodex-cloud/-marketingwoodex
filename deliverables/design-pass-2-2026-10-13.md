# Design pass 2 — sidebar, Leads, Pipeline, system recolour

**Date:** 2026-10-13 · **Branch:** `arena/7f38fddd-marketingwoodex`
**Build marker shown in the app:** `ADMIN V2.1.1 · UI6` (sidebar, under the logo)
**Evidence:** `deliverables/design-pass-2-2026-10-13/screens/` (browser screenshots) and `.../gates/` (route sweep, contrast audit, literal audit)

This pass answers the report that "nothing is updated, design is still pending, the lead page
is still old, the sidebar still shows the old design with a blue dot".

---

## 1. First, the cache problem (why the old design was still on screen)

The live build was probed directly before anything was rewritten
(`tools/qa-p29/probe-sidebar.mjs` → signs in, dumps the rendered DOM and computed styles):

| Probe (before this pass) | Result |
|---|---|
| `aside.side` background | `rgb(255,255,255)` (light), `rgb(38,38,38)` (dark) |
| stray `var(--sidebar)` text nodes / attributes | 0 / 0 |
| blue dots in the sidebar | 0 |
| nav link metrics | 14px / 500, `padding:8px 10px`, radius 8px, gap 14px |
| page errors | 0 |

So a stale cached page was being shown while the served build was already clean. That is a
delivery problem, and it is now fixed at the source:

* **Every local stylesheet and script link carries one build query** — `?v=ui-6` (71 links).
  A refresh can no longer resurrect an older asset.
* **The build is visible in the app**: the sidebar brand reads `ADMIN V2.1.1 · UI6`, and its
  tooltip carries the date and the design-document version.
* If an old page is still on screen after this: hard refresh once (Ctrl/Cmd+Shift+R).

## 2. The blue dot was a real bug — found and fixed

`admin.js` `navBadges()` tested `!n` on a value the API returns as a **string**. `!"0"` is
`false`, so every nav item with a known badge slot painted an empty pill — the stray dot.
It now parses to an integer and hides at 0:

```js
n = Math.max(0, parseInt(n, 10) || 0);
b.hidden = n === 0;
b.textContent = n > 99 ? "99+" : (n || "");
```

The sidebar also had legacy `!important` colour rules (`--side-fg`, `--side-muted`,
`--side-active-fg`) that a later sheet cannot outrank. `assets/wx-ds-sidebar.css` now redefines
that token family in one bridge block, so all 31 legacy `.side*` rules resolve to the Preline
tokens in both themes, and adds the real rebuild on top: brand block, section rail, hover /
active / focus-visible states, accordion, hover-only pin, badge, footer, `#app.mini` rail and
the ≤64rem off-canvas drawer.

Nav markup also gained the semantics the reference implies: `aria-current="page"` on the
active link, `aria-expanded` + `aria-controls` on both accordion levels, the badge exposed as a
status region. Keyboard focus ring measured at 2px `--primary`; Tab order walks the rail.

## 3. Leads screen — rebuilt on real data

The top half of the Leads screen was a static recreation of a third-party demo dashboard.
Every value was hardcoded and none of it read the database:

| Was (hardcoded) | Now (computed from `leads_list`) |
|---|---|
| OPEN DEALS **482**, "↗ 37.3% up from 142" | **Open leads** = 2, with overdue / due-today / no-next-step split |
| UNTOUCHED DEALS **639** | **Open pipeline value** = Rs 90 L with a real 8-week series |
| CALLS TODAY **36**, "↘ 4.1% down from 39" | **Won in filter** = 3, win rate 100%, Rs 1.2 Cr won |
| LEADS **510**, "0.0%" | **Follow-ups** = 0 overdue, next 7 days |
| "Import data — Gmail / Notion / CSV → *Launch importer*", "sync data to **Preline**" | Gone. One action: *Import a sheet of leads* → the real importer |
| "Lead funnel status" with 9.9% / 25.6% / 29.5% | **Pipeline by stage** — real counts per stage with bars |
| "Lead nurturing & filtering 44%" | **Where the leads come from** — the five most common real sources |
| 44% gauge, "47 nurtured / 23 sent to sales review" | **Follow-up coverage** — real arc gauge + legend (scheduled / overdue / due today / next 7 days / no next step) |

Two genuine bugs surfaced while wiring this up:

1. **The line filter never matched.** The segmented control was built from `M.lines` slugs
   (`furniture`, `interior`, `project`) while a lead stores the label (`"Furniture"`), so every
   line tab returned an empty table. It now matches either, and the control is built from the
   data, so values outside the vocabulary map (`Design`, `Commercial` — 3 of the 5 real leads)
   are reachable and no longer duplicated.
2. **Hardcoded theme colours in the table**: the company chip painted `background:#1e293b` with
   `color:var(--mut)` (unreadable in dark), the stage chip clipped to "quotatio", and the
   location column invented "Lahore" when a row had none.

Table renamed to what it shows (`Leads`, "N leads"), the second competing "New customer" button
removed (the page header owns *Add lead*), and the won-value tile now fits with its currency.

Click-level verification on the live build: line tabs → 1/1/1/2/5 rows, stage filter → 3 rows,
search "tariq" → 1 row, 0 page errors, light + dark.

## 4. Pipeline — the board was broken and light-only

`admin-p19f.js` injected 83 rules of literal hex CSS at run time, with a hand-written
`html.dark` block covering only four selectors. Two things fell out of that:

* every kanban column collapsed to 178px and card text was cut off at the column edge. Root
  cause: a `nowrap` tag inside the card set the grid's min-content width, so the card rendered
  219px wide inside a 176px track.
* the board was bright in dark mode, because the literals never switched.

Fixed by moving the sheet to `assets/wx-ds-pipeline.css` with every colour mapped to a theme
token (the dark block deleted — the tokens switch by themselves), pinning the card track to
`minmax(0,1fr)`, letting the card shrink, ellipsising tags, and wrapping the title block. Stage
accents now use `--status-*` instead of stock hexes. Result: 5 KPI cards at 20px in the theme
ink, 6 columns, cards 160px inside a 176px track with no overflow.

## 5. System-wide recolour

A per-route audit (`tools/qa-p29/literals-sweep.mjs`, `design-sweep.mjs`) showed 24 screens
still painting themselves with hardcoded hex — exactly the screens that read as "old" and the
ones that break in dark mode, since a literal is the same value in both themes
(dashboard 28, settings 60, social 32, activity 30, security 25, …).

* A declaration-level codemod rewrote **224 colour literals across 34 files** into semantic
  tokens (`#fff → var(--card)`, `#e4e7ec → var(--line)`, `#374151 → var(--foreground)`,
  `#f79009 → var(--warn)`, the brand gold → `var(--primary)`, …). Values that differ between
  themes were deliberately left alone.
* Hand-fixed the colour tables a codemod cannot see: AI-centre health dots, WhatsApp-hub
  connection dots, dashboard KPI icon tint.
* Canvas/chart palettes (`uipal.js`) keep hex on purpose — Chart.js paints on canvas and cannot
  resolve CSS variables; the dashboard already re-reads the palette when the theme changes.
* All token reads gained static fallbacks (702 across 47 files) because six screens render
  inside `srcdoc` iframes that load the site stylesheets rather than the admin token sheet.

## 6. Gates re-run after the pass

| Gate | Result |
|---|---|
| `master-qa.mjs` — every admin route | **58 routes · stuck 0 · page errors 0** |
| `contrast-audit.mjs` — light and dark | **0 failures both modes** (10,285 elements / 1,129 text nodes) |
| Leads interactions | line tabs, stage filter, search — all correct, 0 errors |
| Lead drawer | opens from the table, 23 fields, tabs Log activity / Details / Timeline, 0 errors, both themes |
| Sidebar probe | 0 stray dots, 0 `var(--sidebar)` text, active state = token ink, 0 errors |

## 7. What is still on the list

* Screens whose **composition** (not colour) is still legacy: Integrations, Site health, Speed,
  Media, Redirects, Theme, Users, Security, Backups, Activity — the next pass moves them onto
  the §8 block vocabulary the Leads and sales screens now use.
* `admin.css` (407 non-token literals) and `woodex-v21.css` (186) are the last literal-bearing
  sheets; components are being retired to `assets/wx-ds-*.css` screen by screen so those two
  files can eventually be dropped.
* Brand marks (Facebook blue, Instagram pink, YouTube red …) stay as authored colours.
