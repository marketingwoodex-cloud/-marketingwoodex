# Design pass 3 — the remaining blue dot, and two invisible-text bugs

**Date:** 2026-10-13 · **Branch:** `arena/7f38fddd-marketingwoodex`
**Evidence:** `deliverables/design-pass-3-2026-10-13/screens/` (browser shots) · `.../gates/r8-verify.json` (measurements)
**Probes:** `tools/qa-p29/r8-verify.mjs` (sidebar + Leads + pipeline, both themes) · `chip-check.mjs` (text-vs-surface, 12 routes × 2 themes)

Pass 2 rebuilt the sidebar, the Leads screen and the kanban, and fixed the badge counter that
treated the API's string `"0"` as truthy. Two defects survived that pass. Both are closed here,
and both were confirmed in the browser before and after.

---

## 1. The blue dot was still there — in the collapsed rail

Pass 2's `navBadges()` fix (parse to integer, hide at 0) is correct, but a second path painted
the same dot: `admin.css` revealed badges on hover with a rule that re-shows **every** badge,
including the ones the app had just hidden.

```css
/* before — a bare child-selector reveal beat the [hidden] attribute */
#app.mini .side:hover .nav-a>span, #app.mini .side:hover .nav-bdg, #app.mini .side:hover .nav-new {
  display: inline-block !important;
}
```

Collapsing the sidebar and hovering it therefore repainted ~26 empty badges as dots — exactly
what the screenshot showed. Measured with `r8-verify.mjs`, collapsed + hovered:

| | visible badges | empty badges painting as dots |
|---|---|---|
| before | 27 | **26** |
| after | 1 (the real `1` on Leads) | **0** |

The reveal now requires `:not([hidden])`, and an empty badge is `display:none` outright:

```css
#app.mini .side:hover .nav-bdg:not([hidden]), #app.mini .side:hover .nav-new:not([hidden]) { display:inline-block !important }
#app.mini .side:hover .nav-bdg:empty, .nav-bdg:empty { display:none !important }
```

Expanded sidebar measured 0 empty badges in both themes (it already was clean).

## 2. Chips whose ink was the same colour as their fill

`chip-check.mjs` measures every text node against the surface it is actually painted on
(translucent backgrounds are composited up the ancestor chain, so inherited and semi-transparent
chips measure correctly). Four rules in `assets/wx-ds-pipeline.css` set `color` to the same token
as `background`, so the label was invisible inside its own chip:

| rule | before | after |
|---|---|---|
| `.p19-tags .nw` (the lead's `new` tag) | `background:var(--primary); color:var(--primary)` | `color: var(--pri-fg)` |
| `.p19-tags .ln` (line tag) | `background:var(--muted-foreground-1); color:var(--muted-foreground-1)` | `background: var(--primary-soft); color: var(--primary-text)` |
| `.p19-age.warm` | `background:var(--warn); color:var(--warn)` | `background: var(--warn-soft); color: var(--warn)` |
| `.p19-age.hot` | `background:var(--bad); color:var(--bad)` | `background: var(--bad-soft); color: var(--bad)` |

A fifth case was structural, not a typo: the filter chips on Invoices and Projects render their
count as `<small>1</small>` (`All 1`, `Active 1`), and the generic muted-small colour painted that
count stone-600 onto the primary fill — **1.48:1**. A selected chip now carries its ink into the
count (`html button.on > small { color: inherit }`); the navy month card keeps its own tan label
through the more specific `.it-mo.on small` rule.

**Gate:** 12 routes × 2 themes, text-vs-surface below 2.2:1 → **0 / 0**, page errors **0**.

## 3. Re-measured after both fixes

| Check (browser) | light | dark |
|---|---|---|
| Leads KPI cards, real values (open 4 · pipeline Rs 1.2 Cr · won 1 · follow-ups 0) | ✓ | ✓ |
| Leads rows rendered from the database | 5 | 5 |
| "Preline" demo wording left on the Leads screen | 0 | 0 |
| Kanban columns 6 · cards 5 · no `undefined` in the board | ✓ | ✓ |
| Sidebar nav font | Inter 14px | Inter 14px |
| Sidebar background | `rgb(255,255,255)` | `rgb(38,38,38)` |
| Active nav fill | `rgb(245,245,244)` | `rgb(64,64,64)` |
| Empty badges anywhere in the nav | 0 | 0 |
| Page errors across all three screens | 0 | 0 |

Screens in `screens/`: sidebar, sidebar collapsed+hovered, Leads, pipeline — light and dark, plus
the Invoices screen showing the `All 1` chip readable.

---

## 4. Build marker and cache-busting

Every stylesheet and script link now carries `?v=ui-7` (72 links, one version) and the sidebar
brand reads **`ADMIN V2.1.1 · UI7`**, so the running build is identified on screen instead of
being inferred. Served build verified: brand `ADMIN V2.1.1 · UI7`, all asset links `v=ui-7`,
0 empty badges in the nav.

## 5. Pending inventory — measured, not estimated

Full sweep of **all 59 admin routes** (`design-sweep.mjs`, both of the previous passes' gates
included): **0 page errors on every route.** What is left is inline styling, not broken screens:

| route | inline colour styles | route | inline colour styles |
|---|---|---|---|
| `/pages` | 149 | `/users` | 34 |
| `/settings` | 94 | `/activity` | 30 |
| `/social` | 42 | `/backups` · `/system` | 23 |
| `/security` | 41 | `/settings/connections` | 22 |
| `/dashboard` | 38 | `/telegram` · `/aicenter` | 15 |
| `/enquiries` | 12 | `/theme` | 12 |
| `/wahub` · `/wainsights` | 10 | | |

16 of 59 routes carry inline colours; the other 43 are clean. Fonts across all 59 routes:
**Inter** 18 458 nodes, `ui-monospace` 71 (code blocks), one node is the theme screen's own
font-picker sample. Full data: `gates/route-sweep-59.json`.

Motion: the design sheets carry 16 transitions and 5 keyframe animations (sidebar rail, drawer,
overlays). A Preline-style motion layer for dropdowns, accordions, tabs and rows is proposed,
not yet built.
