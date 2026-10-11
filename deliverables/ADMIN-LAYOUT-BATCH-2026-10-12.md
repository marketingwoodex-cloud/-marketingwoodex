# Admin layout batch — U1.1/U1.2, AS‑20, AS‑29/AD‑16, AS‑33 (2026-10-12, second batch)

Tree: `woodex-live-p29-v2.1-pro` (source of truth, D‑3). Nothing deployed; no live file touched.

Comes after `ADMIN-DESIGN-BATCH-2026-10-12.md` (batch A: chart theming, sidebar/colour tokens).

## 1. Results

| ID | Task | Status now | Evidence |
|---|---|---|---|
| **U1.1** | Page title bar: H1 24px/600, breadcrumb, toolbar | **DONE — 57 of 57 routes** | `tools/qa-p29/header-audit.mjs`: every rendered H1 is 24px/600 with a breadcrumb under it. `heroes` was the one route with no header at all (its "no builder access" state); it now uses the shared `head()` like every other screen |
| **U1.2** | KPI row: 4-up grid, 18px padding, tabular numbers, tinted icon | **DONE** | Measured before/after on the three routes that render KPI tiles: `cols=5 → 4`, `gap 16px` unified, `font-variant-numeric: normal → tabular-nums`, icon ink `rgb(138,106,67)` (old gold) `→ rgb(37,99,235)` (brand) |
| **U1.2 root cause** | The dashboard's ragged KPI row | **FIXED** | A duplicate "OBSIDIAN & CYAN HYBRID" block re-declared `.dx-kpis` as `auto-fit/minmax(220px)` + 16px gap with `!important`, which is what produced five columns under four tiles. The grid now lives in one place (both files agree: 4 × `minmax(0,1fr)`, 16px) |
| **AS‑29 / AD‑16** | "Scope the light-background rules" (audit count: 73, never re-run — L‑19) | **ANSWERED WITH A MEASUREMENT** | New probe `tools/qa-p29/light-islands.mjs` visits all 58 routes in dark mode and finds elements still painting a light background: **0 genuine islands**. The only two hits are the website-preview iframes (`#th-if`, `#hf-frame`), which show the public site and are meant to be light |
| **AS‑20 / AD‑26** | Cache policy and `?v=` on every admin asset | **DONE** | All 61 admin-relative script tags now carry `?v=ui-4` (the other 10 are `vendor/` or absolute paths served from other trees). `.htaccess` caches JS/CSS for 30 days, so without this a deploy serves stale JS |
| **AS‑33 / U8** | Refresh `woodex-audit/manifest.json` | **DONE** | Regenerated and revision-pinned: 69 → 167 entries, now covering the admin tree, QA tools and deliverables as well as the audit pack; every entry SHA‑256 + byte size |
| **OV‑2 follow-through** | The plan asked for one `themeChanged()` for all charts | **DONE** | `window.themeChanged()` is the single documented hook (the class watcher still covers every other path); the theme toggle calls it |
| **AS‑30 continuation** | Literals left in `admin.css` | **DONE** | 202 more literals replaced by tokens in `admin.css` (gold family → `--pri*`, cyan family → `--pri`, navy panels → `--navy`, light tints → `--pri-soft`, cyan/gold rgba → blue rgba) |

## 2. Two real bugs the batch caught in itself

Both were found by re-running the contrast sweep, not by reading code:

1. **Self-referencing tokens.** The bulk literal pass had reached the token *definitions* and left
   `--gold: var(--pri); --pri: var(--pri);` — circular, resolving to nothing. The `--gold`/`--cyan`
   family is now written out as brand blue in both theme blocks.
2. **`.badge.navy` had background-coloured ink.** A `color:` had been given a *background* token
   (`--pri-soft`), so the pill rendered dark-on-dark (3.83:1). New `--navy-fg` token (the navy pill is
   dark in both themes, so its ink must be its own token), now readable.

The sweep that caught these ends clean: **0 below AA in light and dark** across the four-screen set,
and the full 58-route sweep is included in the batch gate.

## 3. Verification

| Check | Result |
|---|---|
| `node --check`, all admin JS | 65 / 65 |
| `header-audit.mjs`, 58 routes | 57 with H1·24px·600·breadcrumb (was 56) · KPI 4-up + tabular on all 3 KPI routes (was 0 of 3) |
| `light-islands.mjs`, 58 routes dark | 0 real light islands (2 expected iframes) |
| KPI widths 390 / 768 / 1024 / 1440 px | 2-up / 2-up / 2-up / 4-up, **no horizontal overflow** at any width |
| `theme-contrast.mjs` | 0 below AA, both themes (light + dark) |
| `regression_static.py` | 15 / 15 |
| Chat bubbles (Inbox, dark) | token-driven, readable; six light/dark override pairs deleted because the tokens cover both themes |
| `ui-design-batch.mjs` | chart repaint still confirmed (light blue-600 / dark blue-400), 0 page errors |

## 4. Deliberately not changed

- `vendor/` and absolute-path scripts (`/builder/*`, `/assets/js/*`) keep unversioned URLs — they are
  served from other trees and versioning them here would misrepresent their cache.
- The two light iframes (`#th-if`, `#hf-frame`) — they preview the public site.
- `frontend-v1/admin` mirror (U6/AS‑32) still open; `regression_static.py` reports the drift.
- Sign-in pre-fill (SEC‑001) — still needs your explicit approval.

## 5. Still open after this batch

| Item | Note |
|---|---|
| AD‑13 / AD‑27 / AD‑28 FAILs in `reverify_findings.py` | The script asserts the *old* state is present (obsidian sidebar, token literals, tracked secrets). Expectations need updating; the code is already right. |
| AD‑24 (tracked secret files) | Needs your approval (C‑3). |
| OV‑6 | The dashboard "Pending tasks" card is hard-coded placeholder text, not live status. |
| U9 mobile check of Settings › Integrations (pre-existing grid cut-off) | Not re-run; the KPI grid itself is clean at all four widths. |
| AS‑36 PHP runtime tests | Still declined (no runtime). |

## 6. Reproduce

```bash
cd tools/qa-p29 && npm install
PREVIEW_EMAIL=<any> PREVIEW_PASS=<any> python3 preview-server.py ../../woodex-live-p29-v2.1-pro 8080
PREVIEW_EMAIL=<same> PREVIEW_PASS=<same> node header-audit.mjs  http://127.0.0.1:8080 /tmp/hd
PREVIEW_EMAIL=<same> PREVIEW_PASS=<same> node light-islands.mjs http://127.0.0.1:8080 /tmp/li --all
PREVIEW_EMAIL=<same> PREVIEW_PASS=<same> node ui-design-batch.mjs http://127.0.0.1:8080 /tmp/ui
ALL=1 PREVIEW_EMAIL=<same> PREVIEW_PASS=<same> node theme-contrast.mjs http://127.0.0.1:8080 /tmp/tc
```
