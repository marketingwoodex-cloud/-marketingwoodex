# Admin design pass — block 1 (Preline alignment)

Reference: the attached Preline screens (`preline.co/templates/support/shared-inbox/?page=contacts.html`,
its dashboard) plus the circled grey bar in the sidebar screenshot. Aim: the same visual grammar —
muted uppercased labels, generous card padding, soft tinted chips, tabular numbers, short mount
animation — applied through the shared stylesheet so **every** screen inherits it.

Everything below is styling only: no screen layout, markup order or behaviour changed.

## What changed (all in `admin/woodex-ds.css`, `?v=ds-9`)

| Block | Before | After |
|---|---|---|
| KPI cards (Dashboard, Pages, every stat row) | icon top-left above the label, label 13px sentence case | label 11.5px **UPPERCASE** muted, value 26px/700 tabular, tinted 38px icon square top-right, sub-line beneath — the reference card order |
| Chips (`4 new enquiries`, `2 overdue invoices`) | saturated 1px borders, 7×14px padding | soft same-hue wash, hairline tint border, 6×13px, hover lift |
| Table headers (Pages, Leads, Media, all lists) | 12.5px sentence-case grey, no band | 11.5px **UPPERCASE** 0.05em tracking, tinted header band |
| Table rows | 14px padding 14×16 | 13.5px text, 13×16 padding, tabular numbers, last row borderless |
| Card headings | 17px | 15px/600, -0.01em tracking; card padding 18/20px |
| Screen mount | hard swap | 180ms fade (`#view > *`, stagger 35ms) — **opacity only**, so no `position: fixed` child can be re-anchored mid-animation |
| Motion safety | — | all of it behind `prefers-reduced-motion: reduce` |

## Gates run after the change

| Gate | Result |
|---|---|
| `master-qa.mjs` — all routes | **58 routes · stuck=0 · with-page-errors=0** |
| `cms-audit.mjs` — Website & CMS area | **23 routes · 0 stuck · 0 JS errors · 0 failing API calls** |
| `theme-contrast.mjs` — light + dark | **belowAA: 0** on every sampled screen (worst pair 4.7:1) |
| `responsive-sweep.mjs` — 390 px | 58 screens, **1 overflow — measured identical on the unmodified baseline** (`media` 53px, pre-existing, tiles not touched by this pass) |

## Evidence

`deliverables/design-pass/`: `01-dashboard-before.png` / `02-dashboard-after.png`,
`03-pages-before.png` / `04-pages-after.png`. Sidebar before/after under
`deliverables/cms-audit/01-sidebar-before.png` / `02-sidebar-after.png`.

## Still to do for a full replica

1. Sidebar: section-label spacing, icon rail on collapse, user block bottom-anchored (partly done in `82221bc`).
2. Global tokens: spacing scale + Inter sizes declared once, so page layouts stop tuning numbers per screen.
3. Card **section blocks**: page-header block, filter/search toolbar block, table block, side panel block — as reusable classes, then applied screen by screen.
4. Motion polish: dropdown/accordion open transitions, hover transitions on rows and tiles.
5. Per-screen sweep of the remaining sections (Sales, CRM, Settings, System) with a screenshot review each.
