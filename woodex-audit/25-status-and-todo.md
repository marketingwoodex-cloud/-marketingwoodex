# 25 — Status: what is fixed, what is pending, and the to-do list

Date: 2026-10-11. Branch `arena/4ba510f0-marketingwoodex`. Target: `woodex-live-p29-v2.1-pro`.
Release recommendation: **BLOCK** (credential exposure is not contained; live site not verified).

## A. What has been fixed (and how it was verified)

| # | Area | What changed | Verified how | Still needs |
|---|---|---|---|---|
| 1 | Integrations wording (AD-05/06/07) | Removed "saved live!" without a request and canned "Ping successful: 200 OK". Now "Not verified" / "Not saved" (`admin-settings.js`) | Headless browser T-16 (HEAD control shows the false text; working tree does not) | Real health checks or permanent honest labels |
| 2 | Owner and editor dashboard crash (OV-01/OV-03) | Guards in `admin.js` and `admin-dash.js`; error card instead of a crash | Headless browser T-18: 0 page errors (HEAD: 1) | Support role not run |
| 3 | Approvals view (AD-10) | Removed the line that made `#/approvals` show Security (`admin-security.js`, both trees) | Headless browser: sidebar link shows the queue; fresh load 8/8 with script delay (pre-fix 3/8 Security) | Owner confirms intended view (D-13) |
| 4 | Estimator labels (A11Y-001) | Labels added to 3 form fields (`estimator/index.html`) | jsdom label check: 3 missing → 0 | Real screen-reader test |
| 5 | Audit pack | 60-row defect matrix, report rev 2, manifest, evidence | Scripts: `reverify_findings.py` 56/10/0; `regression_static.py` 15/15 | Keep in sync after each fix |
| 6 | Preview | Filtered static server; POST stub returns JSON (fixes the 501); blocks PHP source, `api/`, `_private/`, SQL, `admin-tg.js` | `preview-login-test.mjs`: sign-in, reload, 0 page errors | Preview only; not the real backend |

**What did not change:** the visual design. The screenshot still shows the dark sidebar, dark cards, and the same layout on every page. The fixes above are behaviour and wording, not the redesign. That is why every page looks the same.

## B. What is still pending

### B1. Design and UI/UX (replica in progress)
Done (working tree; preview on 8080 serves it):
- Blue brand replaces the cyan/teal/gold accents: admin tokens (`--gold`, `--pri`, `--cyan`, `--chat-bubble-ai`) bridged in `admin/woodex-ui.css`; inline and class literals mapped by selector.
- Neutral surfaces in the Preline style: light page `#f3f4f6`, cards white; dark page `#171717`, cards `#262626`, borders `#404040`.
- Inter self-hosted (`admin/assets/fonts/inter-latin-{400,500,600,700}.woff2`, OFL licence file alongside). Applied with `!important` over the DM Sans and Plus Jakarta Sans names in `admin.css`.
- Tailwind static build (`tools/ui-build`, `npm run build:css` -> `admin/assets/woodex-tw.css`, no preflight). Used for the sidebar user row and brand block in `index.html`.
- Lucide icons: already in `vendor/icons.js` (no change needed).
- Sidebar, top bar, cards, tables, buttons, inputs, badges, tabs, modal, toast, auth card restyled in both themes.
- Rendered contrast sweep over all 56 NAV routes, light and dark (`ALL=1 node tools/qa-p29/theme-contrast.mjs <url> <outDir>`): 0 text elements below 4.5:1 on every route. Results: `/tmp/shots-all/results.json` (not committed).
- Integration tile label ink chosen by luminance (`admin-settings.js` `tileInk`).
- Fixed contrast items: sidebar footer and avatar, breadcrumb, revoke-all red, info callouts (`.p19-how`), library filter chips in dark, WhatsApp green, hub-bar active tab, muted greys in light.

Pending (UI to-do, in order):
- U1. Preline-style layout pass: page header (title, breadcrumb, actions) and KPI cards on every screen. Current pages keep their old internal layout (only colours, type, and surfaces changed).
- U2. Source cleanup: replace literal `#00b8db`, `#00d3f2`, `#b8956a`, `#0c1628` in `admin/*.js` and `admin.css` with tokens (about 60 occurrences). The overrides now do this at runtime.
- U3. Chart colours: `#b8956a` gold in dashboard charts and rings still follows the old palette; Chart.js does not re-theme on toggle (AD-18).
- U4. Preview stub limitation: dashboard, enquiries, bookings, clients, quotes, team and others show "data incomplete" or throw `Object.keys`/`split` on undefined. The same errors occur on HEAD (checked for 4 routes), so they are stub gaps, not UI faults. Real visual check of data-heavy screens needs a seeded stub.
- U5. Brand tiles (integrations) keep brand colours; ink is chosen per tile (black or white).
- U6. `frontend-v1/admin` mirror not updated (still old theme).
- U7. Inter font: check for `Plus Jakarta Sans` usages that need removing.
- U8. Audit manifest refresh after these UI edits (`manifest.json`).
- U9. Mobile widths (grid cut-off at 1280 px on Settings > Integrations is pre-existing; not checked on mobile).
- U10. Owner approval needed before any change to login (pre-filled password) or untracking secrets (unchanged; see D).

### B2. Integrations and settings
- The connector list is hard-coded: "14 of 22 marked connected (not verified)" (`admin-settings.js`, static `APPS`). Status should come from the server or say "not configured".
- Connections tiles open the wrong tab container (`#st-tabs` vs `#st-subnav`; `admin-integ.js:60,89`) — AD-08.
- Google Analytics ID and Search Console tag are shown from stored config; confirm they are meant to be visible to all admins.

### B3. Security and secrets (owner action needed)
- SEC-001: admin login pre-fills and falls back to the shared password (`admin/index.html:43`, `admin.js:235`). **Remove it (needs your approval) and rotate it.**
- SEC-002: public `downloads.html:70` tells visitors to sign in with that password. Remove the line (approval) and rotate.
- SEC-003: Telegram bot token in 36 tracked locations, including browser-served `admin-tg.js`. Rotate in BotFather; untrack (approval).
- Other committed secrets: `_private/*.json`, `config.php` DB password, `.env`, bank details, maintenance token. Rotate and untrack (approval).
- Repository is **public**. Visibility change: not done (you said "later").
- History rewrite: not done. Needs "yes, rewrite history".
- Your chat-level report of SEC exposures is owed; I will confirm it when you say go.

### B4. Data, backend, and runtime
- DB reconnect: `db()` reads `_private/db.json` as connection settings; that file holds user data, so the boot redirect can send you to the installer (AD-19).
- PHP runtime tests blocked: need Node ≥24.18 or another runtime (AD-20, D-10). No live PHP run yet.
- Concurrency: `jwrite()` truncates before the lock (AD-21); builder save has a 1-second mtime check and restore has none (WC-01); WhatsApp cron can overwrite opt-outs (AU-03, hypothesis).
- Polling: chat polls every 3 s with no in-flight guard (`admin-chat2.js:137`).

### B5. Deployment and assets
- Admin scripts have no cache-busting (`?v=`), and `.htaccess` caches JS/CSS for 30 days (`.htaccess:36`).
- Missing assets: `/assets/panoramas/dha6-luxury-living-360.jpg`, `/assets/img/qr-placeholder.png`, `/assets/images/`.
- `Dockerfile:15` sets `chmod -R 777` on `_private`.
- Live production behaviour not verified (no approved host access).

### B6. Scope gaps
- Six projects not audited (they contain secret hits): `woodex-vlive-P20`, `p23-live`, `p22-preview`, `wf-admin`, `tools`, `woodex-live-v3`, `netlify`, `supabase`.

## C. To-do list (in order, to start after the questions are answered)

1. Confirm design direction and licence (section D, Q1–Q3).
2. Build the design tokens: dark and light colour sets, font, icon set, radius, shadows, and button/badge/input styles. Verify contrast on rendered pixels (not jsdom). Contrast check passes; the replica is still open.
3. Replace the admin shell (sidebar, topbar, theme switch, persisted per user). Fix the split theme in one place.
4. Apply the shell to Admin & Settings first (the screen in your screenshot), then Overview, Sales, Automation, and Website & CMS.
5. Integrations page: real status from the server; no hard-coded "connected".
6. Headless browser regression for each page, light and dark, desktop and mobile widths. Save screenshots under `woodex-audit/evidence/browser/`.
7. Security (after your approval): remove the pre-filled password and the `downloads.html` line; untrack secrets; you rotate the credentials.
8. Backend and runtime: decide on a PHP runtime (D-10), then run the PHP tests.
9. Concurrency and persistence fixes (AD-21, WC-01, AU-03), each with its own test.
10. Deployment: cache-busting, missing assets, Dockerfile permissions.
11. Re-run all gates; update the matrix; then the release decision.

## D. Open questions (answer before step 2)

Answers will decide the design approach. They are also recorded in `24-decision-log.md`.
