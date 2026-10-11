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

## 5. The Preline-style design pass — what it takes

Your reference (`preline.co/templates/support/shared-inbox`) is a different design system, not just
a different colour. A faithful pass is a **design-system change**, not a CSS patch, and doing it
half-way would look worse than today. The plan I propose, in order:

1. **Tokens + typography first** (one commit): Preline's spacing scale, 13/14 px text, Inter, card
   radius/shadow/border set, muted greys — applied through the existing `woodex-ui.css` tokens so
   every screen inherits it at once.
2. **Sidebar + topbar** (already partly done): grouped nav with section labels, 36–40 px rows, icon
   rail collapse, user block at the bottom.
3. **One reference screen end-to-end** — I suggest **Dashboard**: 4 KPI cards with inline sparklines
   and delta chips, a clean card grid, table styling with sticky headers (exactly like your
   screenshot). You approve the look once, then every other screen follows the same recipe.
4. **Tables + forms pass**: sticky headers, row hover, checkbox selection, filter/search row, badges,
   empty states — this is the biggest visual win across the 58 screens.
5. **Per-screen sweeps**: Content, Sales, Settings, System.

Say "start the Preline pass" and I will do step 1 + 2 + the Dashboard reference screen first so you
can judge the direction on one screen before it goes everywhere.
