# Website & CMS master audit — 2026-10-12

Scope: every screen under **Pages & builder**, **Content** and **Media / SEO / Speed / Health / Theme** —
23 routes — checked route by route, API call by API call, on the preview build.

| | Result |
|---|---|
| Screens that render with real data | **23 / 23** |
| JS errors | **0** |
| API calls that failed | **0** |
| Screens stuck on "Loading…" | **0** |
| Whole-admin sweep (all 58 routes, same run) | **0 stuck, 0 errors** |

Tool: `tools/qa-p29/cms-audit.mjs` — per screen it records every action the screen calls, the
response's `ok`, its top-level keys and the size of every array in it, plus any JS error with
file:line. Reproduce with one command (see the QA README).

## 1. What was actually broken (and is now fixed)

### a. The whole Pages & builder area could not load in the preview
`/api/builder.php` — a **separate endpoint** from `admin.php` — was not answered by the preview at
all, and the preview never issued a **builder token**, so:

- Pages & builder, Section library, Header & footer, Hero slides → blank or "No builder access"
- Theme → empty controls

Both fixed: the preview now answers the builder endpoint (`status`, `pages`, `load`, `save`,
`page_new`, `theme`, `theme_get`, `blocks_*`, `backups`, `restore`, `media`, `upload`) and hands a
builder token to Master / Manager / Developer, exactly like `api/admin.php`. **The three-panel editor
now opens** (`/admin/#/builder/index.html`): Pages / Sections / Elements / Layers / Theme / SEO rail,
70 section templates with category filters and skin options, the page canvas, and the
Content / Style / Advanced inspector.

### b. Real app bug (AD-32) — the approvals card crashed under navigation
`admin-appr.js` inserts the "N changes waiting for approval" card into the dashboard container. If
the user changed screen while the request was in flight, the container had already been replaced, so
the insert threw `Cannot read properties of null (reading 'insertBefore')` — one uncaught error per
visit. Now guarded before the insert. `admin-appr.js` → `?v=ui-6`.

### c. Preview bug — the builder's icon list was blocked
`builder/vendor/icons.json` was refused by the preview's data-file rule, so the builder's icon loader
parsed a 404 as JSON and threw. Static front-end JSON (`/builder/vendor/`, `/assets/data/`,
`/assets/announce.json`) is now served; `_private` and API JSON stay blocked.

## 2. Per-screen data verified in this run

| Screen | What the audit saw in the API responses |
|---|---|
| Pages | `pages_list` 6 pages; maintenance page list 3 |
| Builder | opens the editor iframe; `blocks_list` 4, `pages` 6, `theme_get`, `load` 1 page |
| Section library | 50-entry library UI over `blocks_list` |
| Header & footer | `load` (title, url, html, mtime, size, ro) + announcement config |
| Hero slides | hero set + templates, no longer "No builder access" |
| Redirects | 2 redirects + the page list for targets |
| Blog & insights | 5 CMS items + 6 file pages (word counts, SEO score) |
| Portfolio / Services / Cities / Page templates | CMS items, page kinds (5), templates (3) |
| Forms | 2 forms with fields, pages, counters, defaults |
| Estimator | 2 templates with their own `rates.services` |
| FAQs / Testimonials / Client logos / Team | CMS items, placements (2), logos data, 5 team members |
| Media library | 5 files, 2 folders, trash 0, storage bytes |
| SEO / SEO agent | 6 pages, 4 SEO rows, engines `{default, list}`, findings list |
| Speed | PSI rows per page + device |
| Site health | 4 checks with status |
| Theme | the full token set (`--wx-*`), presets and fonts |

## 3. "Every API" — measured coverage, honestly

Counting only the PHP that serves this area (`content-lib`, `builder`, `media-lib`, `p18e-lib`,
`p36-lib`, `seo-agent-lib`, `roles-lib`, `admin.php`):

| | Count |
|---|---|
| Actions implemented in PHP | **121** |
| Exercised by simply opening the 23 screens | **19** |
| Remaining — write & flow actions (save, delete, import, scan, upload, restore, reorder, publish, approvals decisions, AI calls) | **102** |

The 102 are the honest remainder of "every API": they need a **click-driven flow audit** — press Save
on each screen, run each scan, import/restore, and assert on the response *and* the UI feedback.
That is the next block (FLOW-1); the tooling to do it (`cms-audit.mjs` + a flow driver) is in place.

## 4. Sidebar (from your screenshot)

The grey vertical bar in the middle of the sidebar was the nav **scrollbar**, painted with the
light border colour and drawn even when the list barely scrolled. Fixed in `82221bc`: thin,
track-less, and only visible while the pointer is over the sidebar. The same commit fixed the real
"not clean" cause — a rule that painted **every** `span` in the sidebar muted, so menu labels and the
active row were equally washed out. Measured now:

| | Value |
|---|---|
| Thin bar elements in the sidebar | **0** |
| Menu label colour | `rgb(55,65,81)` (was muted) |
| Active row | brand blue + inset bar |
| Row height / radius / icon gap | 40 px · 8 px · 12 px (sub-items 34 px) |
| Hover / chevron | 160 ms transitions, chevrons rotate when a group opens, reduced-motion respected |

## 5. The Preline-style design pass — block 1 landed in this same commit series

Your reference (`preline.co/templates/support/shared-inbox`) is a different design *system*, not a
different colour, so it is being applied as one: through the shared stylesheet, so every screen
inherits it, without touching any screen's layout.

**Block 1 — done and measured** (`deliverables/DESIGN-PASS-1-2026-10-12.md`, screenshots
`deliverables/design-pass/`):

- **Cards** — KPI cards now use the reference order: uppercased muted label, 26px tabular value,
  tinted icon square top-right, sub-line beneath.
- **Chips** — soft same-hue washes with hairline tint borders instead of saturated outlines.
- **Tables** — uppercased 11.5px column labels with a tinted header band, roomier rows, tabular
  numbers, soft hover.
- **Typography/spacing** — 15px/600 card headings, 18/20px card padding, tighter tracking.
- **Animation** — a freshly built screen fades in for 180ms (staggered), opacity only so no
  `position: fixed` child is re-anchored; all motion off under `prefers-reduced-motion`.

Gates: `master-qa` 58/58 clean · `cms-audit` 23/23 clean · contrast **belowAA 0** in light *and*
dark · 390 px sweep unchanged from the unmodified baseline (the one media overflow pre-exists).

**Blocks 2–5 (next):** global spacing/type tokens · sidebar icon rail and bottom-anchored user
block · reusable page-header / toolbar / table / side-panel section blocks · per-screen sweep of
Sales, CRM, Settings and System.

The sidebar complaint itself was a scrollbar painted with the border colour plus a rule that muted
every label; both are fixed and measured (section 4 above), with the rail gone from the rendered
sidebar.
