# Root-Cause Analysis

Revision `24157f6`. Each root cause groups matrix rows. Causes RC-1 to RC-7 are carried from the master report v1 and re-checked this pass.

## RC-1 — Source-of-truth fragmentation and paste duplication
- **Symptom:** "Phase undefined" and a settings page that never loads (plain build).
- **Causal chain:** plain `admin-settings.js` contains a duplicated MCP block and a stray `}` → `node --check` fails at `:608` → `VIEWS.settings` never registers → router falls back to `VIEWS.soon` → `def[4]` undefined in plain `admin.js:680`.
- **Evidence:** `node --check` plain: 3 SyntaxErrors (E3). Pro/`frontend-v1`: 0 failures (E3). Duplicate symbol counts (`renderActiveChat` 6 vs 3) (E2).
- **Why controls missed it:** no gate on which tree is shipped; no duplicate-symbol check.
- **Other defects from the same cause:** AD-01, AD-02, AD-03, RC-2 items.
- **Prevention:** one source tree (decision D-3); `node --check` gate in packaging; duplicate top-level symbol check.

## RC-2 — Route and view registry depends on script order
- **Symptom:** `#/integrations` shows the dashboard; `#/approvals` may show security; `enquiries` depends on hash suffix.
- **Causal chain:** `index.html` `<script defer>` order → last assignment to `VIEWS[key]` wins. 20 keys have 2+ owners (AD-12 PASS). NAV has no `phase`; aliases not in NAV (AD-04). `route()` falls back to dashboard.
- **Evidence:** RUNTIME (prior harness) for `#/integrations`; STATIC for the 20 keys; RUNTIME identity check for `VIEWS.approvals === VIEWS.security`.
- **Other defects:** AD-04, AD-10, AD-11, AD-12, SA-02.
- **Prevention:** `register(key, fn, {owner})` throwing on second non-wrapper owner; boot-time duplicate check.

## RC-3 — Sidebar pinned by `!important`; components bypass tokens
- **Symptom:** dark obsidian sidebar beside a light workspace; low-contrast text in light mode.
- **Causal chain:** `admin.css` `#0a0c10 !important` (lines 1284, 1391, 1614) overrides token rule `.side` (`:74`, `var(--card)`). Workspace uses `var(--bg)` (`#f8fafc` light). Components use literal hex (AD-15).
- **Evidence:** RUNTIME jsdom: `#side` = `rgb(10,12,16)` in both themes (E3, jsdom limits noted); CALC contrast: `#cbd5e1` on `#fff` = 1.48:1 (fails 4.5:1 and 3:1); `#00d3f2` on `#fff` = 1.81; `#9ca3af` on `#fff` = 2.54; `#94a3b8` on `#f8fafc` = 2.45. Sidebar text passes only because the sidebar is always dark.
- **Other defects:** AD-14, AD-15, AD-16, AD-17, AD-18.
- **Prevention:** token contract (`html.dark`, `--txt`, `--mut`, `--side-bg`); lint against hex outside token file.

## RC-4 — Integrations screen reports success it does not have
- **Symptom:** every provider appears connected; Save and Ping report success.
- **Causal chain:** `renderIntegrationsTab()` makes zero `api()` calls; `APPS` (23 entries, 14 `connected:true`) is literal; Save shows a toast with no request; Ping prints canned result.
- **Evidence:** STATIC (reverify PASS: 14 literals; no `api(` in the function). Wording fixed in working tree (E2).
- **Prevention:** truthful-UI rule (prompt §13 item 14); server-side `integrations_status`.

## RC-5 — Non-atomic persistence, unlocked read-modify-write, silent busy returns
- **Symptom:** "Admin is not set up yet" (503) intermittently; admins and builders logged out; opt-outs overwritten; campaigns report success with nothing queued.
- **Causal chain:** `jwrite` truncates before `LOCK_EX` (`admin.php:37`); `jread` no lock (`:36`); empty read → 503 (`:47`); `bsecret` regenerates (`:40`); cron locks, admins do not (AU-01); `busy` returns silently (AU-02, WC-02).
- **Evidence:** STATIC (reverify PASS ×3). Race **not reproduced** (PHP runtime unavailable). Status: Confirmed (static) for code path; reproduction HYPOTHESIS.
- **Prevention:** temp + `rename()`; `flock` helper; fail-closed reads; explicit error codes.

## RC-6 — Error envelope incomplete
- **Symptom:** "Server error (500). Open /wx-check.php" with no cause.
- **Causal chain:** dispatcher catches `PDOException` only (`admin.php:591`); no `set_exception_handler`; 12 library files have no `try`.
- **Evidence:** STATIC (grep counts; reverify INFO: 12 present, `r404-lib.php` absent).
- **Prevention:** `catch (Throwable)` JSON envelope with `requestId`; handler registration.

## RC-7 — Deployment and cache
- **Symptom:** "works for me, fails for them"; stale JS after deploy.
- **Causal chain:** `.htaccess:35–36` 30-day cache on JS/CSS; no `?v=` on 69 admin script tags; deny rules in `.htaccess` only; Dockerfile `chmod 777` on `_private` and no `AllowOverride` (defect present, reverify PASS).
- **Evidence:** STATIC. Live behaviour **BLOCKED**.
- **Prevention:** build hash on assets; deny rules verified with curl on live host; no 777.

## RC-8 (new this pass) — Credentials committed and published
- **Symptom:** a repository that is public contains a database password, a bot token, and an owner sign-in hint; a public page and browser-served JS publish them.
- **Causal chain:** no ignore rules for secrets; env and config files tracked; literals copied into docs, dumps, tools, and public pages; browser login pre-fills a default.
- **Evidence:** OBSERVED (`gh repo view`); STATIC (git grep: 151 files, 36 Telegram locations, one fingerprint each); E3 (bcrypt check with controls).
- **Why existing controls missed it:** `.gitignore` covers only `frontend-v1/_private/*`; no secret scanning in CI; `detect-secrets` never run before this pass.
- **Prevention:** secret scanning as a pre-commit and CI gate (`secret-scan-tracked-2026-10-11.txt` as baseline); ignore rules; remove literals from source and docs; rotate.

## Coupling and fix order
RC-8 containment (rotation) must precede any history rewrite. RC-1 (source of truth) must precede RC-2 and RC-3 fixes, otherwise the same change lands in four trees. RC-5 fixes touch auth tokens and need approval.
