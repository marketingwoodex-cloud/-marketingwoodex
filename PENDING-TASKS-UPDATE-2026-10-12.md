# Pending tasks — status update, 2026-10-12

Delta against `PENDING-TASKS-2026-10-11.md` (the copy on Google Drive). Only rows whose status
changed are listed. Everything else in that list still stands. Evidence:
`deliverables/ADMIN-DESIGN-BATCH-2026-10-12.md`.

## Closed by this batch

| ID | Was | Now | Evidence |
|---|---|---|---|
| OV-2 | TODO — "fix the gold literal colours and re-render on theme switch" | **DONE** | `admin/uipal.js` + `admin-dash.js` / `admin-reports.js`; canvas ink measured blue-600 (light) / blue-400 (dark), repaint confirmed in a headless browser |
| AU-10 | TODO — "icons sit against their labels, add spacing" | **VERIFIED — no change needed** | `.seg button` already had `display:inline-flex; gap:7px`; measured 7 px on all five tabs in both themes |
| AS-27 | TODO — remove the `!important` sidebar block, add `--side-bg` / `--side-fg` | **DONE** | One `--side-*` token set in `admin.css` (light + dark); obsidian/navy `!important` blocks removed; `woodex-ui.css` aliases the same tokens |
| AS-28 | TODO — literal palettes in `admin-security.js` and `admin-integ.js` | **DONE** | 99 literals in `admin-security.js` + `admin-conn.js` → tokens; `admin-integ.js` keeps only third-party brand colours (data) |
| AS-30 | TODO — ~60 literal colours in `admin/*.js` and `admin.css` → tokens | **DONE for app chrome** | 343 replacements across 21 files, by CSS property. Kept deliberately: `admin-theme.js`/`admin-chrome.js` (site-theme data), `admin-print*.js` (A4 inks), brand colours |
| AS-31 | TODO — `Plus Jakarta Sans` leftovers in `admin.css` | **DONE** | Active font stack was already Inter; header comment corrected. Remaining mentions are the site-theme preview pages (content) |
| AS-34 | TODO — `node --check` on every admin JS (62 of 62) | **DONE (JS count now 65)** | 65 / 65 pass after the batch |
| AS-35 | TODO — re-run `reverify_findings.py` | **DONE — expectations need updating** | 51 PASS / 5 FAIL / 10 INFO. Four of the five FAILs assert that the old state is *present* (AD-13 obsidian sidebar, AD-27/AD-28 token literals, and AD-24 tracked secrets); AD-02 is a pre-existing chat-library copy mismatch. The script's expectations, not the code, need the edit |
| OV-1 | TODO — "check the KPI row with real data; preview shows *data is incomplete*" | **PARTIAL** | Seeded preview `dash_data` fixture (U4) added to `tools/qa-p29/preview-server.py`; KPI row, chips, funnel, target ring, follow-ups, overdue list and the chart now render in the preview. A live-server check is still yours |
| AU-24 | VERIFY — "hard-coded dark colours on the Knowledge page are now tokens; check light mode" | **VERIFIED in preview** | Knowledge & Q&A / AI Assistant routes audited in both themes: 0 below AA, 0 page errors |

Also fixed while sweeping (not on the 2026-10-11 list):

| What | Now |
|---|---|
| KPI delta ink (`▲ 26%`) was 2.62:1 in light mode | `#047857` light / `#34d399` dark — passes AA |
| Sign-in "or" divider was 4.39:1 light, 3.94:1 dark | `var(--mut)` — 0 failures on the login page in both themes |
| Login button and shell still carried the old gold `#c59b27` / `#b58d4a` | `var(--pri)` / `var(--pri-fg)` |
| Chart re-theme re-routed the dashboard (full API refetch per toggle) | Toggle only flips the class; charts repaint in place |

## Closed by the second batch (layout, same day)

| ID | Was | Now | Evidence |
|---|---|---|---|
| U1.1 (AS-… plan §1.3 row 1) | PARTIAL — page header checked on Approvals only | **DONE — 57 of 57 routes** | `header-audit.mjs`: every H1 is 24px/600 with a breadcrumb; the `heroes` no-access state was the only headerless route and now uses the shared header |
| U1.2 (plan §1.3 row 2) | PARTIAL — "CSS in place; needs a screen with real KPI data" | **DONE** | KPI rows measure 4 cols / 16px gap / tabular-nums / brand icon on dashboard, pages and redirects (was 5 cols on two, gold ink on one). The duplicate `.dx-kpis` grid that caused the ragged row is gone |
| AS-29 / AD-16 | TODO — "scope the light-background rules" (count 73, never re-run — L-19) | **CLOSED BY MEASUREMENT** | `light-islands.mjs` over 58 routes in dark mode: 0 real light islands; the only hits are the two public-site preview iframes |
| AS-20 | TODO — "cache policy and `?v=` version on every admin asset" | **DONE** | 61 admin-relative script tags now versioned (`?v=ui-4`); vendor/absolute-path scripts excluded on purpose |
| AS-33 / U8 | TODO — refresh the audit manifest | **DONE** | Regenerated, 69 → 167 entries, SHA-256 + size, revision-pinned |
| AD-18 follow-through | "`themeChanged()` once for all charts" | **DONE** | `window.themeChanged()` is the single hook; the toggle calls it, the class watcher covers the rest |

## Third batch (2026-10-12) — preview role sign-in

| ID | Was | Now | Evidence |
|---|---|---|---|
| AS-27 follow-up (preview sign-in) | The preview stub accepted exactly ONE account, so no role could be demonstrated | **DONE** | Accounts now come from `PREVIEW_ACCOUNTS` / `PREVIEW_ACCOUNTS_FILE` (never from the repo); roles mirror `api/roles-lib.php`; each account has its own token, so `me`/`status` keep that role after a reload. Tested: six accounts, correct role label each, sidebar 32/32/17/12/8 links, 0 page errors |
| AD-31 (new) | — | **FIXED** | `admin-appr.js` read `.length` off follow-up buckets that the API always sends but a stub did not; one missing key blanked the whole Sales day-view. Buckets are now normalised. `leads_followups` / `leads_list` / `leads_count` fixtures added to the preview stub (the real shape from `api/sales17-lib.php:155`) |

## AD-24 — verified in more detail (still owner-only)

| Fact | Evidence |
|---|---|
| Shared team password in **117 tracked files** | `git grep -l` |
| It is the live **database password fallback** in the source-of-truth tree | `woodex-live-p29-v2.1-pro/config.php:19` |
| Deployment `.env` tracked, not git-ignored (DB pass, APP_KEY, Telegram token) | `woodex-live-p29-v2.1-pro/.env` |
| One **Telegram bot token** appears in 25 tracked files | distinct-match count = 1 |
| `_private/system.json` holds a 32-char maintenance token | `/maint/token` |
| Audit correction | `_private/db.json` / `admin-db.json` are no longer tracked |

Full write-up without values: `deliverables/SECRET-EXPOSURE-VERIFIED-2026-10-12.md`.
Options 1–6 there need owner approval; visibility (C-6) is still refused from this sandbox (403).

## Fourth batch (2026-10-12) — master QA sweep over all 58 routes

| ID | Was | Now | Evidence |
|---|---|---|---|
| U1.3 (new) | `#/business` and `#/settings` rendered the **same** page | **FIXED** | `admin-settings.js` ended with `W.VIEWS.business = W.VIEWS.settings` (it loads after `admin-fields.js`, so it always won and the real Business info screen — contact, brand, social — never appeared). Alias removed for `business` only; `integrations`/`connections` stay aliases on purpose |
| QA-1 (new) | 11 screens stuck on "Loading…", 14 with JS errors | **0 and 0** | New `tools/qa-p29/master-qa.mjs` walks every route; new `preview_fixtures.py` answers 240 actions that had no preview answer (sample data, real API shapes) |
| U6 / AS-32 | `frontend-v1/admin` mirror drift | **still open** | If the mirror is deployed anywhere, today's fixes are not in it — needs the owner's call |

Reproduce: `cd tools/qa-p29 && PREVIEW_EMAIL=… PREVIEW_PASS=… node master-qa.mjs http://127.0.0.1:8080 /tmp/mq`

## Fifth batch (2026-10-12) — Website & CMS master audit

| ID | Was | Now | Evidence |
|---|---|---|---|
| AUDIT-1 (new) | The CMS area had never been audited screen-by-screen | **DONE — 23/23 clean** | `tools/qa-p29/cms-audit.mjs`: every screen renders with data, 0 JS errors, 0 failing calls; all 58 routes clean in `master-qa.mjs` |
| QA-2 (new) | `/api/builder.php` was unanswered in the preview → Pages & builder, Library, Header & footer, Hero slides, Theme blank or "No builder access" | **FIXED** | Stub answers the builder endpoint and issues a builder token to Master/Manager/Developer, matching `api/admin.php` |
| AD-32 (new) | Approvals card crashed when a route change landed mid-request | **FIXED** | `admin-appr.js` guards the insert; `?v=ui-6` |
| U1.4 (new) | Sidebar: grey scrollbar rail + washed-out labels | **FIXED** (commit `82221bc`) | Measured: no thin bars, labels `rgb(55,65,81)`, active row brand blue, 40px rows, 8px radius, 12px gap; screenshots at 1280/1440/2560 |
| FLOW-1 (new) | 102 CMS-area write actions never exercised | **OPEN — next block** | Coverage table: 121 implemented, 19 exercised by navigation; the rest need a click-driven flow audit |

## Changed status elsewhere

| ID | Was | Now | Note |
|---|---|---|---|
| C-6 | YOU / APPROVAL — make the repository private | **BLOCKED — needs you** | Attempted via the GitHub API twice; the connection's token lacks repo-admin scope (`HTTP 403 Resource not accessible by integration`). Nothing changed; the repo is still public. Do it in GitHub → Settings → General → Danger Zone, or reconnect GitHub with `Administration: write` |
| C-10 / D-3 | DECISION | **DECIDED** | Source of truth = `woodex-live-p29-v2.1-pro` (your answer, 2026-10-12). All work stays there until you decide on the other seven copies |
| AS-32 / U6 | DECISION — mirror `frontend-v1/admin` or retire it | **OPEN, now visible** | `regression_static.py` reports the four changed files as *known drift (U6 open)* instead of failing, so the gate still catches unintended drift |
| AS-33 | TODO — refresh `manifest.json` | **PARTIAL** | Cache-busters bumped to `?v=ui-3` on the changed admin assets (the stale-CSS half of AD-26). `manifest.json` refresh still open |
| OV-6 | VERIFY — pending-tasks card status values vs the live server | **UNCHANGED — note** | The card on the dashboard is hard-coded placeholder data ("3 open · 7 completed"), not live status. Worth deciding whether it should read from the server |

## Still exactly as before

C-1…C-5, C-7…C-9 (rotate the token, default login, untrack secrets, rotate DB/master passwords,
live private-path check, 2FA, demo password, backup drill) — all still yours/approval. Nothing in the
secrets or sign-in area was touched in this batch (SEC-001 pre-fill still needs your explicit OK).
