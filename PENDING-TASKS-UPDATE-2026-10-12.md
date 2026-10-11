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
