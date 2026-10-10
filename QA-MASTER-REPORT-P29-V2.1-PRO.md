# Woodex ADMIN V2.1 — Master QA Report (revision 2)

**Target:** `woodex-live-p29-v2.1-pro/` (primary). Sibling trees are used for comparison only.
**Repository:** `marketingwoodex-cloud/-marketingwoodex` · branch `arena/4ba510f0-marketingwoodex` · evidence revision `24157f6` (this revision is recorded in `woodex-audit/manifest.json`).
**Date:** 2026-10-11 (Asia/Karachi).
**Scope:** OVERVIEW · SALES · AUTOMATION · WEBSITE & CMS · ADMIN & SETTINGS (including security and DevOps).
**Audit type:** **full static audit** of the pro tree, plus **partial runtime audit** (jsdom harness and PHP parse lint). **Not production-verified.** No live host, staging host, database, or browser on the deployed site was inspected.
**Release recommendation:** **BLOCK** (`woodex-audit/21-release-readiness.md`).

Companion pack: `woodex-audit/` (00–24, `evidence/`, `qa/`, `manifest.json`). The defect matrix in `woodex-audit/06-defect-verification-matrix.md` is the source of record. §2 below is generated from it.

---

## 0. Read this first — credential exposure (Critical, not contained)

Three credentials are published in tracked files. The repository itself is **public** (`gh repo view`: `isPrivate: false`). Values are **not** reproduced in this report. Each is referred to by file, line and fingerprint.

1. **Shared demo password (LIT-1, fingerprint `7e4cbcf8995b`).** Found in **151 tracked files**, including:
   - `admin/index.html:43` pre-fills the browser-served admin login password field.
   - `admin/admin.js:235` substitutes it when the password field is empty; `:256` writes it back.
   - `downloads.html:70` (a **public** page) tells visitors to sign in at `/admin/` with a master-account email and this value.
   - `.env` and `config.php:19` (database password constant, in the same tree).
   - Live validity: **UNKNOWN**. The three committed SQL dumps each hold six `$2y$10$` rows that share one distinct hash; the literal matches none of them (boolean check, controls passed: `woodex-audit/evidence/sanitized-command-output/bcrypt-literal-check-2026-10-11.txt`). That shows the dumps are not the live state; it does not prove the live database is different.
2. **Telegram bot token (fingerprint `5cce5b5c16`).** One value in **36 tracked locations**, including browser-served `admin/admin-tg.js:27` (public to any visitor), `.env:18`, `config.php:23`, both SQL dumps, `.env.example:18`, and a root Markdown document. Live validity: **UNKNOWN**.
3. **Other committed secrets (pro tree).** `.env` (application key, database password, Telegram token; key names only were checked), `config.php` (database password at 19; bank account IBAN constants at 29 and 33), `_private/db.json` and `_private/admin-db.json` (seven `pass_hash` entries each), `_private/system.json:5` (maintenance token), `_private/company.json` (bank account details).

**Tracking status.** All of the above are tracked: `git ls-files` lists `.env`, `config.php`, and the `_private/*` files, and `git check-ignore` reports none as ignored. The pro tree has no `.gitignore`. The `_private` rule that exists targets `frontend-v1/`.

**Process and status notes.**
- I did not rotate anything, rewrite history, force-push, or change repository visibility. Rotation is performed by the owner in each provider console. A history rewrite needs an explicit owner instruction (`woodex-audit/24-decision-log.md`, D-2).
- During triage, one unredacted `grep` printed the shared literal once into session output (HOSTINGER-DEPLOYMENT-GUIDE.md, line 90, which documents it as a demo credential). Nothing was written to a deliverable file. It is already published, so it is covered by the rotation step below.

**Immediate owner actions (approval required for each code step):**
1. Rotate the shared password everywhere it is used (admin account, database user, any API key derived from it). Rotate the Telegram bot token in BotFather. Rotate the maintenance token and the app key. Record dates and dependent services.
2. Decide on repository visibility (currently public; the owner answered "later"). This is still open.
3. Decide on history rewrite. Do not run it without an explicit "yes, rewrite history".
4. Approve removal of the login pre-fill and fallback (SEC-001), removal of the sign-in line from `downloads.html` (SEC-002), and untracking of secret files (SEC-003).

---

## 1. Root-Cause Structural Diagnosis

### 1.1 Evidence legend
- **RUNTIME** — executed in jsdom 24 against `admin/index.html` with a stubbed API (`tools/qa-p29/`). PHP is **not** executed; PHP checks are parse-only.
- **STATIC** — confirmed by reading the cited file and line (line numbers are against revision `24157f6`).
- **CALC** — computed from CSS values (WCAG contrast ratio).
- **OBSERVED** — repository metadata via `gh` (repository visibility).
- **HYPOTHESIS** — follows from the code but is not yet reproduced. Each has a stated confirmation step.
- **BLOCKED / UNKNOWN** — cannot be checked with current access (live host, PHP runtime, database).

### 1.2 What was verified clean (with limits)
- **Pro-tree admin JavaScript parses.** `node --check` passes on all 62 files in `woodex-live-p29-v2.1-pro/admin/*.js` (STATIC/RUNTIME, syntax only).
- **PHP files parse** under the PHP 8.2 grammar: 48/48 in the pro tree (`phplint.js`, parse only). The negative control fails as expected. No PHP was executed.
- **Estimator form fields**: the three visible fields without accessible names are now labelled (see A11Y-001). Verified by jsdom, not by a screen reader.
- **Theme storage key is consistent**: `admin/index.html:11` and `admin/admin.js:328` both use `localStorage` key `wxaTheme` (STATIC).
- **`.cx-h` theme pair is correct**: scoped with `:root:not(.dark)` at `admin.css:1613–1621`. It is the model for the theme fix (STATIC).
- **Dockerfile base image is sane apart from permissions**: `php:8.2-apache`, `a2enmod rewrite headers` (line 4). The only permissions defect is line 15 (see RC-7).

> *Correction from revision 1:* revision 1 said `wa-cron.php` had no empty-key bypass because `wag_load()` "always generates a non-empty cronKey". That was wrong. `wag_load()` regenerates the key when the stored value is empty (`p18g-lib.php:16–17`), so a failed read can change the key. See AU-03 (Hypothesis).

### 1.3 Root causes (ranked by how much they explain)

**RC-1 — Duplicate source trees and pasted duplicate fragments (explains Breakdown 1).**
- Four admin copies exist: pro, `frontend-v1/`, plain `woodex-live-p29-v2.1/`, and a space-named copy. The four edited files are byte-identical between pro and `frontend-v1/` (STATIC, hash compare).
- In the plain tree, three JavaScript files contain pasted duplicate fragments that break parsing:

| Symbol | Pro tree | Plain tree | Parse error |
|---|---|---|---|
| `renderActiveChat` (`admin-chat.js`) | 3 | 6 | `admin-chat.js:334` |
| `updateClientView` (`admin-settings.js`) | 2 | 4 | `admin-settings.js:608` (duplicate MCP block; stray `}`) |
| `Instant Quick Broadcast` (`admin-social.js`) | 1 | 2 | `admin-social.js:333` |

- When `admin-settings.js` fails to parse, `VIEWS.settings` is never registered and the router falls through to the "coming soon" template. That template prints "Phase undefined" because `VIEWS.soon` reads `def[4]` (`admin.js:680` in plain). The pro tree guards this read.
- **Which tree is deployed is UNKNOWN** (see L-5). If the plain tree is what is live, AD-01 and AD-02 are Critical.

**RC-2 — The route and view registry depends on script order (explains Breakdowns 1 and 3).**
- Navigation is a tuple table (`NAV`) with no `phase` field. `VIEWS.soon` reads `def[4]`, which is undefined in the plain build.
- Hash aliases `business`, `connections`, `integrations` exist at `admin-settings.js:586–588` but are not in `NAV`. `route()` (`admin.js:461`) falls back to the dashboard loader. **RUNTIME:** `#/integrations` on the pro tree executes the dashboard loader.
- **20 view keys are assigned by two or more modules** (STATIC count, `VIEWS.<key> =` across `admin/*.js`). `dashboard` is assigned four times; `seo`, `library`, `clients` three times; `users`, `updates`, `team`, `redirects`, `projects`, `profile`, `pipeline`, `pages` twice. Many overrides are deliberate wrappers (`wrap()` at `admin-p8.js:42`; `OLD.invoices`/`OLD.projects` in `admin-sales17.js`). One is a silent overwrite: `admin-security.js:203` sets `W.VIEWS.approvals = W.VIEWS.security`, which replaces the approvals view defined at `admin-appr.js:21`. **RUNTIME:** `VIEWS.approvals === VIEWS.security`. **RUNTIME (jsdom, pre-fix):** in-app navigation to `#/approvals` rendered the Security page, not the queue (3/3 runs with random script delays). **Fixed pending verification (C-008):** line 203 is removed in both trees; post-fix navigation shows the queue (4/4). A load-order race on the initial page load was not reproduced: the queue rendered on initial load in every run, before and after the fix.

**RC-3 — The sidebar is pinned dark by `!important`, and components bypass theme tokens (explains Breakdown 2).**
- `admin.css:74` sets `.side` to `var(--card)`. `:439` sets it to navy `#0c1628`. `:1283–1286` sets `.side{background:#0a0c10 !important;…}`, which overrides both. **RUNTIME:** `#side` computes to `rgb(10,12,16)` in light and dark.
- The workspace (`.main`, `#view`) follows `var(--bg)`, which is `#f8fafc` in light mode. Result: an obsidian sidebar beside a light canvas.
- Components bypass tokens. Counts (STATIC): `admin-security.js` 65 hex literals, 0 `var(`, 70 inline `style=`; `admin-integ.js` 10 hex, 0 `var(`; `admin-settings.js` 88 hex, 38 `var(`.
- There is no token contract. The runtime uses `html.dark` with `--txt`/`--mut`, while `admin/master-components.html` documents `data-theme` with `--tx`/`--mu`. The runtime never sets `data-theme`.

**RC-4 — The Integrations screen reports success it does not have (trust defect behind Breakdown 1).**
- `renderIntegrationsTab()` (`admin-settings.js:121`) makes **zero** `api()` calls. Its `APPS` array (lines 9–31) has 22 hard-coded entries, 14 of them `connected: true`. (The earlier count of 23 is superseded; counts here are from the current file.)
- "Save" (`#st-save-btn`, one handler at `admin-settings.js:578`) shows a success toast with no request (AD-06). The Ping handler (`:96`) prints a canned "Ping successful: 200 OK" with no request (AD-07). "Connect" sets an in-memory flag.
- Claude appears only in the MCP configuration block (`admin-settings.js:331–539`, for example "Claude Desktop Configuration"). It is not an `APPS` entry.
- No producer exists for the status keys `in-trk`, `in-psi`, `in-ai`, `in-ts` (STATIC).

**RC-5 — Non-atomic persistence, unlocked read-modify-write, silent busy returns (explains Breakdown 3).**
- `jwrite()` (`api/admin.php:37`) calls `file_put_contents(…, LOCK_EX)`, which truncates the file before the lock is held. `jread()` (`:36`) takes no lock. The same pattern is in `forms.php:24` and `approvals-lib.php:21` (STATIC).
- A reader that hits the truncated file gets an empty array. `db()` (`admin.php:46`) then answers "Admin is not set up yet" with HTTP 503 (`:47`). `bsecret()` (`:40`) regenerates the HMAC secret on an empty read, which invalidates every outstanding admin and builder token (`:42`, `:96`). The mechanism is STATIC; a live reproduction is not done.
- WhatsApp: `wag_tick()` (`p18g-lib.php:93–94`) takes `wa-auto.lock` with `LOCK_NB` and returns `['busy'=>true]` silently when it cannot. The admin writers (`wag_save` callers at `p18g-lib.php` 236–313 and `wahub-lib.php` 121–188) take no lock. A cron tick and an admin save can therefore overwrite each other, including WhatsApp opt-outs.
- Content scheduler: `cms_tick()` (`content-lib.php:49–50`) returns `0` when its lock is busy. Callers treat `0` as "nothing to publish" (WC-02). Caller behaviour is not fully traced (L-10).

**RC-6 — The error envelope is incomplete (explains intermittent blank failures).**
- `api/admin.php` declares `strict_types=1` (line 10) and sets `display_errors` to `0` (line 16).
- The only catch in the dispatcher is `catch (PDOException $e)` at line 591. Any other `Throwable` escapes as an empty HTTP 500.
- The client (`admin.js:25`) turns a non-JSON 500 into "Server error (500). Open /wx-check.php to see why." The user sees a pointer, not the cause.
- **None of the 12 library files** (`content-lib`, `dash-lib`, `sales-lib`, `roles-lib`, `sheets-lib`, `redirects-lib`, `logos-lib`, `google-data-lib`, `p18e-lib`, `p18h-lib`, `p18j-lib`, `phase8-lib`) has a `try` block (STATIC count). `set_exception_handler` is not registered.

**RC-7 — Deployment and caching (explains "works for me, fails for them").**
- `.htaccess:36` sets `Cache-Control: public, max-age=2592000` (30 days) for CSS and JavaScript. `admin/index.html` has **zero** `?v=` version strings on its 70 `<script` tags (STATIC).
- After any fix, returning browsers keep the old `admin-settings.js` and `admin.css`, so themes and handlers mix.
- Deny rules for `_private/`, `*.sql`, `*-lib.php`, and `router.php` live in `.htaccess` (`:20–21` for `_private` and dotfiles; `:26` `Require all denied` in the blocks) and in four per-directory files (`_database/`, `_private/`, `_templates/`, `assets/uploads/`). `_private/.htaccess` uses Apache 2.2 syntax (`Deny from all`).
- The `Dockerfile` never sets `AllowOverride`, and line 15 runs `chmod -R 777 /var/www/html/_private`. **HYPOTHESIS (strong):** the stock Apache configuration uses `AllowOverride None`, so none of these `.htaccess` files would be read in the container. Confirm with `curl` (Phase 10). **BLOCKED** until a live host is available.
- `router.php` is a `php -S` test router. It is not production behaviour.

### 1.4 Breakdown 1 — "Phase undefined" in Admin & Settings → Integrations

**Trace (plain build):**
1. `route()` (`admin.js:461`) resolves `#/settings/integrations`. `VIEWS.settings` is undefined because `admin-settings.js` throws a SyntaxError at parse (`:608`).
2. The route falls to `VIEWS.soon(el, a, def)` (`admin.js:678`).
3. `VIEWS.soon` writes `'Phase ' + def[4]` (`admin.js:680`). `def[4]` is undefined, so the header reads "Phase undefined".

**RUNTIME (harness, `woodex-audit/evidence/sanitized-command-output/`):** plain build: 3 SyntaxErrors, `VIEWS.settings` undefined, `.soon-box` shown, "Phase undefined" rendered. Pro build (prior run, before the edits in this revision): 0 errors, `VIEWS.settings` defined, `#st-subnav` present, heading "Settings & Integrations".

**Conditions that hide the failure:**
- `renderIntegrationsTab()` writes into `#st-tab-content` behind `if (!cont) return;` with no error and no placeholder.
- `admin-integ.js:60,89` tile handlers do `if (b) b.click()`. The target `#st-tabs [data-t]` is created by `admin-p8.js:64–74`, but Settings renders `#st-subnav` (`admin-settings.js:42, 567–569`). Clicks on the tiles are silent no-ops (AD-08). **RUNTIME:** `#st-tabs` is absent on `#/settings/integrations` in the pro build.
- `admin-integ.js:93` attaches its enhancement to `#view .st-grid:not([data-ig])`. `.st-grid` is emitted only by `admin-content.js`, `admin-integ.js`, and `admin-sheets.js`, not by Settings (STATIC). The observer does not find a grid on that page (AD-09).

**What the pro build shows:** five integration cards on `#/settings/integrations` (harness count; the identity of those five cards is not yet traced, see L-12). Their "connected" state comes from the static `APPS` array, not from the server.

### 1.5 Breakdown 2 — Split theme (dark sidebar, light workspace, low contrast) in My Security & Approvals

**Mechanism:**
1. `admin/index.html:11` sets `html.dark` from `localStorage.wxaTheme`, or from `prefers-color-scheme` when unset.
2. Tokens (`admin.css:7–25`) switch on `html.dark`. `--bg` is `#f8fafc` in light mode.
3. `.side` is styled three times: `admin.css:74` (`var(--card)`), `:439` (`#0c1628`), and `:1283–1286` (`#0a0c10 !important`). The third wins in both themes.
4. **RUNTIME (`sidebar-probe`):** `#side` computes to `rgb(10,12,16)` in both modes.

**Contrast in the light workspace (CALC, WCAG ratio):**

| Foreground | Background | Ratio | Note |
|---|---|---|---|
| `#cbd5e1` | `#fff` | 1.48:1 | Text on a light surface |
| `#00d3f2` | `#fff` | 1.81:1 | Cyan accent text |
| `#9ca3af` | `#fff` | 2.54:1 | Muted text |
| `#94a3b8` | `#f8fafc` | 2.45:1 | Muted text on the canvas |

These are the sidebar's own colours. They pass only because the sidebar is always dark. Taking the `!important` override away without giving the sidebar its own tokens would make brand and role text unreadable (fix coupling; see Phase 9 step 2).

**Dark islands inside the light theme (RUNTIME, `theme-probe`, `#/security`):** in light mode there are 15 light-coloured text nodes that sit on dark card surfaces, and 0 on the light canvas. In dark mode the same 15-node pattern appears. Cards therefore stay dark in light mode because `admin-security.js` hard-codes its palette.

**Light islands inside the dark theme (STATIC):** 73 light-background rules in `admin.css` are not scoped under `html.dark`, for example `.tbl.items tr.k-head td` (`#faf6ef`), `.s17-next`, `.ql.on`, `.ib-tip`, and `.lc.ib .lc-msgs`.

**State listener cascade:** `#dark-btn` (`admin.js:328`) re-renders only when the current view is the dashboard. Chart.js instances keep the colours they were drawn with (`admin.js:529–537`, `admin-dash.js:177`, `admin-reports.js:50`), so charts on other screens go stale after a toggle (AD-18).

### 1.6 Breakdown 3 — Intermittent feature dropping and link isolation

**Sales CRM and Leads handoff**
- `admin-crm.js:23` polls every 60 s and re-fetches on hashchange. There is no in-flight guard (SA-01).
- `admin-sales17.js:33` replaces the `enquiries` view. It delegates to the CRM version only for `#/enquiries/classic` (SA-02). Which code runs depends on which script loaded last.
- `fresh()` (`admin.js:19`) discards responses when the screen has changed, but compares only the **first** hash segment (AD-23, SA-04). A response from an earlier sub-route with the same first segment can paint into the current view.
- `api/sales-lib.php` has no `try` block (RC-6, SA-03). Lead and invoice writes can fail without a usable error. Static only; runtime BLOCKED.

**Automation webhooks (WhatsApp and Telegram polling)**
- `api/wa-cron.php` calls `wag_tick()`. The cron schedule is documented in the header comment at `p18g-lib.php:7` as every 5 minutes. When the lock is held, `wag_tick()` returns `busy` silently (`p18g-lib.php:94`, AU-02). The UI cannot show this.
- `api/wa-cron.php:14` rejects the request with HTTP 403 when `key` does not equal `cfg.cronKey`. `wag_load()` regenerates `cronKey` when the stored value is empty (`p18g-lib.php:16–17`). **HYPOTHESIS (AU-03):** a failed or empty read of the store changes the key, so cron starts returning 403 until an admin re-reads the key. This is the most likely explanation for "cron stopped working for no reason". It needs a runtime test.
- `admin/admin-chat2.js:137` runs `setInterval(load, 3000)` with no in-flight guard (AU-04). `admin/admin-tg.js:89` and `admin/admin-p18g.js:67` poll the same way (AU-05). Responses can arrive out of order and repaint older messages.

**Page Builder**
- Save (`api/builder.php:237–251`, `case 'save'`) checks the page's modification time at `:244` (`filemtime`, **1-second resolution**) and writes at `:249` under `LOCK_EX`. The check and the write are not under a shared lock, so two saves in the same second can overwrite each other (WC-01).
- Restore (`:266–275`, `case 'restore'`) writes at `:275` with **no** check at all.
- The builder token derives from `bsecret()`. An empty read regenerates the secret and invalidates the token (`admin.php:40`). The builder then reports "not signed in" (`admin.js:32`, which toasts "see Settings → System check"). WC-03.

**Database boot path**
- `admin.js:700` (pro; `:693` in the plain tree) redirects to `/wx-install.php` when `st.needsSetup || st.dbError`. The reconnect form is not reached when `dbError` is set (AD-19). **RUNTIME:** the redirect fires (jsdom reports "Not implemented: navigation").
- `api/admin.php` `status` (`:288–290`) sets `dbError` when `db()` throws. `db()` reads `_private/db.json` expecting `{host, name, user, pass}` (`:46`). The shipped `_private/db.json` holds user records (`role`, `perms`, `pass_hash`), not connection fields (STATIC: key-shape check, values not read).
- So a transient database error sends the owner to the installer, and the reconnect form is never shown.

**Absolute paths (Linux/Apache, case-sensitive)**
- Missing files: `/assets/panoramas/dha6-luxury-living-360.jpg` (referenced in `admin-settings.js`) and `/assets/img/qr-placeholder.png` (referenced in `admin-security.js`). `/assets/images/` is referenced in `admin-seo.js` and does not exist (WC-04).
- `admin/index.html:8` sets `<base href="/admin/">`. `admin/index.html:182` loads `/builder/wx-css.js` as an absolute path, which must exist in the deployed tree.
- Case-sensitivity failures are invisible on case-insensitive local machines and appear only on Linux.

**Routing layer:** `router.php` is a `php -S` test router. Production behaviour is governed by `.htaccess`, which the Docker image may not read (RC-7).

---

---

## 2. Defect Verification Matrix

Columns follow the requested format. Each row is one distinct defect. Stable IDs are the same as in `woodex-audit/06-defect-verification-matrix.md`, which holds the full set of fields (status, rollback, residual owner). Severity and status are in the first column. Status **Fixed pending verification** means a code change exists and a narrow test passed. It does **not** mean closed. Counts: **Critical 8 · High 28 · Medium 17 · Low 3 · Informational 3 (one of which is a false positive) · Withdrawn 1 · total 60.**

| Core Hub Category | File/Module Path Target | Verified Code / UI Defect | Technical Failure Mechanism | Exact Fix Matrix Logic Required |
|---|---|---|---|---|
| **SEC-001** · Security · Critical · score 75 (5×5×3), P0 override · Confirmed | `admin/index.html:43`; `admin/admin.js:235, 256, 274, 284` | Admin login form pre-fills the shared literal (LIT-1, fp `7e4cbcf8995b`). Empty password is replaced by the same literal before submit. *Evidence:* STATIC E2; local check E3. | Credential is in browser-served HTML/JS, so any visitor receives it. | Remove the `value=` attribute and the `\|\| "<literal>"` fallback; send the typed value only. Needs approval (authentication UI, §5.3). *Validation now:* Not run: login UI test. Code check: literal present (grep). Live validity: UNKNOWN.. *Rollback:* Restore from git.. |
| **SEC-002** · Security / data exposure · Critical · score 75, P0 override · Confirmed | `downloads.html:70` (public page); `.env:14`, `.env.example:14`, `config.php:19`; 151 tracked files | Public page tells visitors to sign in at `/admin/` with a master account email and LIT-1. LIT-1 is also the database password value. *Evidence:* STATIC E2; local bcrypt check E3 (controls passed). | Credential published in a public repository and a public web page. Dumps: LIT-1 verifies against 0 of 6 `$2y$` hashes in each committed SQL dump. Live database: not accessible. | Rotate DB password and master password in the hosting panel. Remove the sign-in line from `downloads.html`. Purge from history only with approval. *Validation now:* Verified: literal not a match for committed hashes (controls: positive ok, negative ok, `$2y$` ok). Not verified: live state.. *Rollback:* Not applicable (rotation is one-way).. |
| **SEC-003** · Security · Critical · score 75, P0 override · Confirmed | 36 locations: P29 trees (`.env`, `.env.example`, `config.php`, `admin/admin-tg.js:27`, `_database/*.sql:318`, `woodex-database.sql:318`) in 4 P29 trees and `frontend-v1`; root `V2.1-VS-V2.5-PRO-BREAKDOWN.md:45` | One Telegram bot token (fp `5cce5b5c16`) appears in 36 tracked locations. Browser-served copy at `admin-tg.js`. *Evidence:* STATIC E2; fingerprint E3. | Public repository plus client-side JS and SQL dumps. | Revoke/regenerate in BotFather; update the server env only; remove literal from all files; purge history with approval. *Validation now:* Not verified: token validity (no external call made).. *Rollback:* Not applicable.. |
| **AD-24** · Security / DevOps · Critical · score 75, P0 override · Confirmed (repository visibility OBSERVED) | Repository; `.gitignore` covers only `frontend-v1/_private/*` | Repository is **public**. Secret-bearing files are tracked: pro `.env`, `config.php`, `_private/db.json`, `_private/admin-db.json`, `_private/system.json`, `_private/company.json`. *Evidence:* OBSERVED (`gh repo view`) + STATIC (git). | Anyone can read tracked files and history. | Make repo private (decision D-1: owner chose "later"). Rotate values. Remove files from history (requires approval). Add ignore rules. *Validation now:* Visibility unchanged. Rotation not done.. *Rollback:* Visibility can be reverted; history rewrite cannot.. |
| **AD-27** · Security · Critical · Confirmed | `admin/admin-tg.js:27` | Telegram token literal inside browser-served admin JS. Same token as SEC-003. *Evidence:* STATIC E2 (reverify PASS). | Client JS is downloadable by any visitor. | Remove literal; read token server-side only; rotate. *Validation now:* reverify PASS (defect present).. *Rollback:* Restore from git.. |
| **AD-28** · Security · Critical · Confirmed | `.env.example:18`; `woodex-database.sql:318` | Same token in the example env file and the root SQL dump. *Evidence:* STATIC E2 (reverify PASS). | Dump and example files are tracked and public. | Replace with placeholder; remove from dump by re-export (approval). *Validation now:* reverify PASS.. *Rollback:* Restore from git.. |
| **SEC-004** · Security / config · Medium · New | Root `.env`; `p22-preview/.env`; `p23-live/.env`; `woodex-live-p23/.env` | Four more `.env` files are tracked. Secret-named keys are empty or placeholder. Other keys include an admin email. *Evidence:* STATIC E2. | Tracking config files is an exposure path if values change later. | Untrack and add ignore rules. *Validation now:* Key names checked; no values printed.. *Rollback:* Restore from git.. |
| **SEC-005** · Security (scan) · Informational (false positive) · Confirmed FP | `admin/vendor/html2pdf.bundle.min.js:2` in 10 trees | AWS-pattern hit. Base64-style encoded data run; no credential keyword; a key ID alone is not a credential. *Evidence:* STATIC E3 (fingerprint equal across 10 copies, context read). | Detector pattern false positive. | None. Allow-list the vendor path with a note. *Validation now:* Triage evidence in `evidence/sanitized-command-output/triage-2026-10-11.txt`.. *Rollback:* n/a. |
| **SEC-006** · Docs / config · Low · New | `HOSTINGER-DEPLOYMENT-GUIDE.md:76` | DB connection snippet with a placeholder-like value. *Evidence:* STATIC E2. | Copy-paste risk. | Replace with `<your-db-password>` form. *Validation now:* Classified placeholder-like (value not printed).. *Rollback:* Restore from git.. |
| **SEC-007** · Tools · Informational · New | `tools/sectest/t3.php:21` | Attack-payload test fixture tracked in repo. *Evidence:* STATIC E1. | Intended for testing; public. | Document as test-only; keep out of web root. *Validation now:* Not run.. *Rollback:* n/a. |
| **DB-01** · Privacy · Medium · Confirmed | `woodex-database.sql` (root) | 14 email-like strings in a tracked SQL dump. *Evidence:* STATIC E2 (count). | Personal data in a public repository. | Remove dump from tracking; provide a schema-only export. *Validation now:* Count only (reverify INFO).. *Rollback:* Restore from git.. |
| **DB-02** · Data / security · Medium · Hypothesis | `_private/admin-db.json` (7 `pass_hash` entries, `scrypt$` format) | No PHP reader for `admin-db.json` in the tree (grep). Format differs from `password_verify` bcrypt used by login. *Evidence:* STATIC E1. | Unknown whether any runtime path reads it. | Confirm no runtime use; remove file from tracking. *Validation now:* `grep admin-db` in `*.php` returns no match (checked).. *Rollback:* Restore from git.. |
| **AD-01** · Build integrity · High (Critical if plain tree is deployed — UNKNOWN) · Confirmed (plain tree) | `woodex-live-p29-v2.1/admin/admin-settings.js:608` (and space-named copy) | Duplicated 24-line MCP block; stray `}` closes `renderConnectionsTab` early. *Evidence:* RUNTIME+STATIC E3. | Parse error → `VIEWS.settings` never registered → "coming soon" fallback. | Replace plain/space copies with pro files. Needs approval to delete duplicate trees (D-3). *Validation now:* `node --check` plain: FAIL (expected = defect). Pro: PASS.. *Rollback:* Git revert.. |
| **AD-02** · Build integrity · High (Critical if plain tree is deployed — UNKNOWN) · Confirmed (plain tree) | `woodex-live-p29-v2.1/admin/admin-chat.js:334`, `admin-social.js:333` | Duplicated fragment after IIFE close; stray `};`. `renderActiveChat` ×6 (should be ×3). *Evidence:* STATIC E2 (+ syntax E3). | Parse error drops module. | As AD-01. *Validation now:* `node --check` plain: FAIL.. *Rollback:* Git revert.. |
| **AD-03** · Routing · High · Confirmed (plain) | `woodex-live-p29-v2.1/admin/admin.js:680`; NAV `admin.js:83` | Plain build prints "Phase undefined". Pro guards `def[4]`. NAV has no `phase`. *Evidence:* RUNTIME E3 (prior harness). | `def[4]` undefined. | Add `phase` to NAV tuples; keep guard. *Validation now:* Plain not re-run this pass (UNKNOWN for current plain).. *Rollback:* Git revert.. |
| **AD-04** · Routing · High · Confirmed (pro, RUNTIME) | `admin.js:461` `route()`; `admin-settings.js:586–588` | `#/integrations` runs dashboard loader. Not in NAV. *Evidence:* RUNTIME E3 (prior). | Unknown hash falls back to dashboard; alias never consulted. | Add aliases to NAV/registry; log unknown hashes. *Validation now:* Not re-run after labels edit. Still open.. *Rollback:* Git revert.. |
| **AD-05** · Integrations (fake status) · High · In progress | `admin-settings.js:9–31` (`APPS`), `:121` (`renderIntegrationsTab`) | 23 hard-coded cards, 14 `connected:true`, zero `api()` calls. **Correction:** Claude is **not** in the Integrations list. Claude appears only in the MCP block (`admin-settings.js:331–539`); the earlier "missing Claude AI-key card" claim is withdrawn. *Evidence:* STATIC E2 (reverify PASS: 14 `connected:true`). | Status is a literal, not server state. | Add read-only `integrations_status` action (per-provider `{configured, lastCheck}`, no secrets). Build cards from it. *Validation now:* Wording now honest (static). Literals still present.. *Rollback:* Git revert.. |
| **AD-06** · Integrations (false success) · High · Fixed pending verification | `admin-settings.js` Save handler (single handler; `#st-save-btn`) | "saved live!" toast with no request. Now shows "Not saved". *Evidence:* STATIC E2; regression E2 (14/14). | False success. | Post to a real save action; toast only on `{ok:true}`. *Validation now:* Static: `saved live!` absent in both trees. jsdom click test T-16 (`tools/qa-p29/ui-regression.js settings`): HEAD toast claimed success; working tree shows "Not saved"; no request sent. Real browser test **not** run. Persistence **not** implemented.. *Rollback:* Git revert `46045f2`.. |
| **AD-07** · Integrations (canned health) · High · Fixed pending verification | `admin-settings.js:78` (hidden template), `:96` (handler) | Canned "Ping successful: 200 OK" removed. Now "Not verified… No request was sent". Connect still sets `app.connected` locally; card says "marked connected in this browser only". *Evidence:* STATIC E2 (reverify: 2 lines → 0). | Fabricated health. | Real health call through the server with timeout (later). *Validation now:* jsdom click test T-16 (`ui-regression.js settings`): HEAD printed "Ping successful: 200 OK"; working tree prints "Not verified… No request was sent." No request made. Real browser test **not** run.. *Rollback:* Git revert `46045f2`.. |
| **AD-08** · Integrations (dead tiles) · High · Confirmed | `admin-integ.js:60,89` vs `admin-p8.js:64–74`, `admin-settings.js:42` | Tiles target `#st-tabs [data-t]`; Settings renders `#st-subnav`. Click is swallowed by `if (b) b.click()`. Tile click not exercised (UNKNOWN). *Evidence:* STATIC E2. | Missing target fails silently. | One tab-container contract; log missing target. *Validation now:* Not run.. *Rollback:* Git revert.. |
| **AD-09** · Integrations · Medium · Confirmed | `admin-integ.js:93` | Observer waits for `#view .st-grid`, which Settings never renders. *Evidence:* STATIC E2 (reverify PASS). | Enhancement skipped. | Scope observer to Integrations container. *Validation now:* Static.. *Rollback:* Git revert.. |
| **AD-10** · Routing (key overwrite) · High · **Fixed pending verification** (C-008) | `admin/admin-security.js:203` (overwrite, now removed) vs `admin/admin-appr.js:21` (queue, owner); `admin.js` route reads the key at call time | `VIEWS.approvals` was overwritten by the security view when `admin-security.js` executed. After in-app navigation the Security page rendered instead of the queue. On initial load the queue rendered in 15/15 harness runs, because the route call ran before `admin-security.js` executed. A timing race that could reverse the initial load was **not** reproduced. *Evidence:* RUNTIME E3 (`approvals-race.js`, `ad10-t16-t18-2026-10-11.txt`): navigation to `#/approvals` rendered the Security page in 6/6 pre-fix runs and the queue in 4/4 post-fix runs; reversed-order control rendered the queue; the fix also passes the initial-load check. STATIC E2 (assignment at `admin-security.js:203`).. | Two scripts assigned one key; the last script to execute replaced the view for every later route call. | Line 203 removed in both `woodex-live-p29-v2.1-pro` and `frontend-v1` (one line each, mirror byte-identical). Keep one owner per view key; boot-time duplicate-key check (AD-12). *Validation now:* Pre-fix: navigation shows security 3/3 (jitter seeds 1–3, committed tree). Post-fix: navigation shows queue 4/4 (jitter and shipped order), reversed control queue 1/1, `#/security` still renders with 0 errors. Browser test **not** run.. *Rollback:* Restore `W.VIEWS.approvals = W.VIEWS.security;` in both trees.. |
| **AD-11** · Routing · Medium · Confirmed | `admin-settings.js:586–588`; `admin-conn.js:8`; `admin-fields.js:317` | `connections`, `business` defined twice; last script wins. *Evidence:* STATIC E2. | Order-dependent. | One owner per key; registry check. *Validation now:* Static.. *Rollback:* Git revert.. |
| **AD-12** · Routing (registry) · High · Confirmed | `admin/admin.js` `VIEWS` registry; `admin-dash.js:15`, `admin-p36.js:129`, `admin-appr.js:130` | `dashboard` defined 4 times; `clients`, `seo`, `library` 3 times. *Evidence:* STATIC E2 (reverify PASS: 20 keys with 2+ definers). | Last `<script defer>` wins. | `register(key, fn, {owner})` throwing on second non-wrapper owner. *Validation now:* reverify PASS.. *Rollback:* Git revert.. |
| **AD-13** · Theme (sidebar) · High · Confirmed | `admin.css:1284, 1391, 1614` (**correction:** three occurrences, not only 1283–1286) | `#0a0c10 !important` on `.side`. Sidebar `rgb(10,12,16)` in both themes. *Evidence:* RUNTIME+CALC E3 (prior) + STATIC. | `!important` overrides token rules. | Delete `!important` and background; define `--side-bg`, `--side-fg` tokens. *Validation now:* reverify PASS (3 occurrences). Visual not re-run.. *Rollback:* Git revert.. |
| **AD-14** · Theme · High · Confirmed | `admin.css:74` (`var(--card)`), `:439` (navy), `:1284`/`:1391`/`:1614` (obsidian) | Three competing `.side` rule sets. **Correction:** `.cx-h` (`:1613–1621`) is a valid dark/light pair, not a defect. *Evidence:* STATIC E2. | Cascade and `!important`. | One `.side` definition. *Validation now:* Static.. *Rollback:* Git revert.. |
| **AD-15** · Theme (literals) · High · Confirmed | `admin/admin-security.js` (65 hex, 0 `var(`); `admin-integ.js` (10 hex, 0 `var(`); `admin-settings.js` (88 hex, 38 `var(`) | Hard-coded palettes bypass `html.dark`. *Evidence:* STATIC E2 (reverify INFO counts). | Light cards stay dark. | Token replacement; lint rejecting hex outside token file. *Validation now:* Counts re-checked by reverify (INFO).. *Rollback:* Git revert.. |
| **AD-16** · Theme · Medium · Confirmed (report count) | `admin.css` (73 unscoped light-bg rules, examples `.tbl.items tr.k-head td`, `.s17-next`, `.ql.on`) | Light backgrounds not scoped under `html.dark`. *Evidence:* STATIC E2 (count **not** re-run this pass). | Light islands in dark mode. | Token + `html.dark` override. *Validation now:* UNKNOWN: count to be re-run.. *Rollback:* Git revert.. |
| **AD-17** · Theme (token drift) · Medium · Confirmed | `admin/master-components.html` vs `admin.css:7–25` | Two token systems (`--tx`/`--mu` with `data-theme` vs `--txt`/`--mut` with `html.dark`). *Evidence:* STATIC E2 (reverify PASS: admin.js has 0 `data-theme`). | New components will not theme. | Pick `html.dark`; add aliases or update the doc. *Validation now:* Static.. *Rollback:* Git revert.. |
| **AD-18** · Theme (charts) · Medium · Confirmed | `admin.js:328` (`#dark-btn`); Chart.js at `admin.js:529–537`, `admin-dash.js:177`, `admin-reports.js:50` | Toggle re-renders only dashboard; charts keep stale colours. *Evidence:* STATIC E2. | No `themeChanged()` hook. | Single `themeChanged()` that rebuilds charts. *Validation now:* Not run in browser.. *Rollback:* Git revert.. |
| **AD-19** · Persistence / boot · Critical · Confirmed | `api/admin.php:288–290` (`status`), `admin.js:700` in pro (`:693` in plain), `_private/db.json` shape | `db()` reads connection credentials from the data-store file. A failure is treated as "not installed". Redirects to `/wx-install.php`; reconnect form unreachable (shipped file lacks host/name/user/pass keys). *Evidence:* RUNTIME (navigation, prior) + STATIC. | Failure branch conflates "missing credentials" with "not installed". | Split credentials from the store. Redirect only when the credential file is missing; otherwise show reconnect form. *Validation now:* Harness DB-dashboard run exists (`harness-db-dashboard.txt`). Re-test after fix: not done.. *Rollback:* Git revert.. |
| **AD-20** · Error envelope · High · Planned · **BLOCKED for runtime** | `api/admin.php:591` (catch), `:10` (`strict_types`), `:16` (`display_errors`) | Only `catch (PDOException)`. Other `Throwable`s escape as empty 500. *Evidence:* STATIC E2 (reverify PASS). | No `set_exception_handler`. | `catch (Throwable)` returning `{ok:false,error,requestId}` JSON + `set_exception_handler`. *Validation now:* Parse only (48/48). **PHP runtime blocked** (`18`).. *Rollback:* Git revert.. |
| **AD-21** · Persistence · Critical · Confirmed | `api/admin.php:36` (`jread`, no lock), `:37` (`jwrite`, truncate before `LOCK_EX`), `:40` (`bsecret`, regenerates on empty), `:47` (503) | Concurrent reader sees empty file → 503; `bsecret` regenerates signing secret → invalidates all admin and builder tokens. *Evidence:* STATIC E2 (reverify PASS ×3). | Non-atomic write; fail-open read. | Temp file + `rename()`; `LOCK_SH` in read; `LOCK_EX` around RMW; `bsecret` fails closed. *Validation now:* Static. Race not reproduced (PHP runtime blocked).. *Rollback:* Git revert.. |
| **AD-22** · Persistence · — · **Withdrawn** | — | Cited counter `seqL` is data-only; not in `api/`. The general claim of unlocked RMW is re-scoped under AD-21 and AU-01 (which have their own evidence). *Evidence:* STATIC E2 (correction). | Citation error. | — *Validation now:* reverify INFO ("WITHDRAWN").. *Rollback:* —. |
| **AD-23** · Stale responses · Medium · Confirmed | `admin.js:19` (`fresh()`), `:23` (`api0`) | Compares first hash segment only. Sub-route responses can paint into a sibling view. *Evidence:* STATIC E2. | Partial key compare. | Compare normalised full hash. *Validation now:* Static.. *Rollback:* Git revert.. |
| **AD-25** · Deployment (deny rules) · High · Hypothesis (strong) · **BLOCKED live** | `Dockerfile:15` (`chmod -R 777 /var/www/html/_private`), `Dockerfile:4`; `.htaccess:26` (`Require all denied`) | Deny rules live in `.htaccess` only. If `AllowOverride None` applies, `_private/*.json` and `_database/*.sql` are downloadable. *Evidence:* STATIC E2 (reverify PASS: Dockerfile sets no `AllowOverride`; 777 on `_private`). | Apache ignores `.htaccess` unless `AllowOverride` permits it. | `chmod 0750` on `_private` (not 777); move secrets outside web root; add `<Directory>` deny in Apache config. *Validation now:* **Live curl check BLOCKED** (no host access). Exact check in `20`.. *Rollback:* Revert Dockerfile line.. |
| **AD-26** · Caching · High · Confirmed | `.htaccess:35–36` (30-day cache); `admin/index.html` (69 script tags, 0 with `?v=`) | Old JS/CSS persists after deploy → partial failures. *Evidence:* STATIC E2 (reverify INFO: script tags without `?v=`). | Fixed names with long cache. | `?v=<sha>` on every asset; `no-cache` for `admin/*.js\|css`. *Validation now:* Static count.. *Rollback:* Git revert.. |
| **OV-01** · Overview (dashboard, base path) · High · **Fixed pending verification** | `admin/admin.js:495–530` (`VIEWS.dashboard`), `dashFail` helper | Loader read `r.stats.folders` unguarded; no `.catch`; "Loading" stays. Patched with payload guard, `dashFail`, `.catch`. *Evidence:* RUNTIME E3 (jsdom before/after). | Unhandled rejection. | (Done) *Validation now:* Owner-chain test: BEFORE TypeError (`Object.keys`), AFTER error card, no crash. **Editor/support role not run separately.**. *Rollback:* Git revert `46045f2`.. |
| **OV-03** · Overview (dashboard, owner path) · High · **Fixed pending verification** | `admin/admin-dash.js:30–31` guard; `:33` `.catch`; original read `r.crm.kpi` at `:36` | Owner/admin dashboard (`dash_data`) read `r.crm.kpi` unguarded → uncaught `TypeError`, stuck "Loading dashboard…". Found this pass. *Evidence:* RUNTIME E3 (jsdom before/after, happy path). | Same class as OV-01 in the module that renders for owners. | (Done) *Validation now:* BEFORE: crash (exit 1). AFTER: error card for incomplete payload; happy path renders with no error. **Browser not run.**. *Rollback:* Git revert `46045f2`.. |
| **OV-02** · Overview (polling) · Low · Confirmed | `admin.js:165` (`navBadges`, 60 s) | No in-flight guard. *Evidence:* STATIC E2. | Overlap on slow host. | In-flight flag. *Validation now:* Static.. *Rollback:* Git revert.. |
| **SA-01** · Sales (polling) · Medium · Confirmed | `admin-crm.js:23` (60 s) + hashchange | Duplicate fetch; out-of-order render. *Evidence:* STATIC E2 (reverify INFO). | No guard, no abort. | One fetch path per screen; `AbortController`. *Validation now:* Static.. *Rollback:* Git revert.. |
| **SA-02** · Sales (ownership) · Medium · Confirmed | `admin-sales17.js:33` vs `admin-crm.js:101` | `enquiries` owned by two modules; classic CRM only via `#/enquiries/classic`. *Evidence:* STATIC E2 (reverify PASS). | Order-dependent. | Explicit owner + sub-route. *Validation now:* Static.. *Rollback:* Git revert.. |
| **SA-03** · Sales (error handling) · High · Confirmed (static) · **BLOCKED runtime** | `api/sales-lib.php` (0 `try`) | Lead and invoice writes can fail without a usable error. *Evidence:* STATIC E2. | Errors escape to dispatcher (AD-20). | Per-action `try/catch (Throwable)`; transactions. *Validation now:* Count: 0 `try` (grep).. *Rollback:* Git revert.. |
| **SA-04** · Sales (stale rows) · Medium · Confirmed | `admin.js:19` | Same as AD-23 for sales screens. *Evidence:* STATIC E2. | — | AD-23 fix. *Validation now:* —. *Rollback:* —. |
| **AU-01** · Automation (lock) · High · Confirmed | `api/p18g-lib.php:94` (`wag_tick`, `wa-auto.lock`), `p18g-lib.php:236–313`, `api/wahub-lib.php:121–188` (`wag_save` callers, no lock) | Admin writes race with cron; opt-outs and campaigns can be overwritten. *Evidence:* STATIC E2 (reverify PASS). | Unlocked RMW vs locked cron. | One `wag_mutate(fn)` with `flock(LOCK_EX)` used by all writers; re-read inside lock. *Validation now:* Static. Not reproduced.. *Rollback:* Git revert.. |
| **AU-02** · Automation (silent busy) · High · Confirmed | `p18g-lib.php:94` (`busy` return), `api/content-lib.php:50` (`0` return) | Busy/zero not surfaced; campaign reports success. *Evidence:* STATIC E2 (reverify PASS). | Silent return. | Explicit `{ok:false, code:'busy'}`; cron retry with backoff. *Validation now:* Static. Caller of `content-lib.php:50` not yet traced (UNKNOWN).. *Rollback:* Git revert.. |
| **AU-03** · Automation (cron key) · Medium · **Hypothesis** | `p18g-lib.php:16–17`, `api/wa-cron.php:14` | Empty read may regenerate `cronKey` in memory → cron 403. *Evidence:* STATIC E1 (reverify PASS anchors). | Fail-open on config read. | Fail closed (AD-21); persist key at install. *Validation now:* Not run.. *Rollback:* Git revert.. |
| **AU-04** · Automation (polling) · High · Confirmed | `admin/admin-chat2.js:137` (`setInterval(load, 3000)`) | No in-flight guard; responses can repaint older messages. *Evidence:* STATIC E2 (reverify PASS). | Timer does not wait. | Self-scheduling `setTimeout` after response. *Validation now:* Static.. *Rollback:* Git revert.. |
| **AU-05** · Automation (polling) · Medium · Confirmed | `admin/admin-tg.js:89`; `admin/admin-p18g.js:67` | Same pattern as AU-04. *Evidence:* STATIC E2 (reverify INFO). | — | Same fix. *Validation now:* Static.. *Rollback:* Git revert.. |
| **WC-01** · CMS (lost update) · High · Confirmed | `api/builder.php:237–251` (`case 'save'`: `filemtime` check `:244`, write `:249` under `LOCK_EX` but after the check, no shared lock); `:266–275` (`case 'restore'`: writes `:275` with no check) | Check and write are not atomic, so two saves in the same second, or a save racing a restore, can overwrite each other. `filemtime` has 1-second resolution. Restore never checks. *Evidence:* STATIC E2 (reverify PASS). | No ETag or content hash. | Content hash as ETag; compare and write under one lock; `409` on mismatch; add the same check to `restore`. *Validation now:* Static only (reverify PASS anchors). Race not reproduced.. *Rollback:* Git revert.. |
| **WC-02** · CMS (silent busy) · High · Confirmed | `api/content-lib.php:50` | Lock busy returns `0`; callers treat as "nothing to change". *Evidence:* STATIC E2 (reverify PASS). | Silent failure. | Return error code; caller check; short timeout. *Validation now:* Static.. *Rollback:* Git revert.. |
| **WC-03** · CMS (builder token) · High · Confirmed | `api/admin.php:40`, `:96`; `admin.js` `bapi0` (29–30) | Builder token derives from shared secret; empty read regenerates → builder logged out. *Evidence:* STATIC E2. | Fail-open secret read. | AD-21 fix; own file and lock for builder token. *Validation now:* Static.. *Rollback:* Git revert.. |
| **WC-04** · CMS (assets) · Medium · Confirmed | `admin/admin-settings.js` (`/assets/panoramas/dha6-luxury-living-360.jpg`); `admin-security.js` (`/assets/img/qr-placeholder.png`); `admin-seo.js` (`/assets/images/`) | Referenced files absent in tree. *Evidence:* STATIC E2 (reverify PASS: files absent). | Broken images / 404. | Add files or relative paths; build check resolving `/assets/…`. *Validation now:* Static existence check.. *Rollback:* Git revert.. |
| **WC-05** · Deployment (router) · High · Confirmed (STATIC) + Hypothesis | `router.php` (`php -S` dev router); `.htaccess` (`RewriteCond www` at lines 15, 50; `IfModule` at 9, 47) | Dev router differs from production; `_private` and `-lib.php` reachable only if `.htaccess` ignored. *Evidence:* STATIC E2 (reverify PASS). | Environment divergence. | Document router dev-only; consolidate rewrites; curl-verify on live. *Validation now:* Static. Live curl BLOCKED.. *Rollback:* Git revert.. |
| **CC-01** · Error envelope · High · Confirmed | `api/admin.php:591`; `admin.js:25` | Non-JSON 500 shown as "Server error (500). Open /wx-check.php". Cause not shown. *Evidence:* STATIC E2. | See AD-20. | AD-20 + `requestId` in toast. *Validation now:* Static.. *Rollback:* Git revert.. |
| **CC-02** · Error envelope · High · Confirmed | 12 libs with 0 `try`: `content-lib`, `dash-lib`, `sales-lib`, `roles-lib`, `sheets-lib`, `redirects-lib`, `logos-lib`, `google-data-lib`, `phase8-lib`, `p18e-lib`, `p18h-lib`, `p18j-lib` (**correction:** 12, not 13) | No local error handling in any of the 12 libraries. *Evidence:* STATIC E2 (reverify INFO: 12 present, `r404-lib.php` absent). | An exception in one action escapes the library and reaches the dispatcher, which only catches `PDOException` (`admin.php:591`); the client receives an empty HTTP 500. | Per-action try/catch; `set_exception_handler`. *Validation now:* Static count (grep).. *Rollback:* Git revert.. |
| **A11Y-001** · Accessibility (forms) · Medium · **Fixed pending verification** | `estimator/index.html` (`#est-name`, `#est-phone`, `#est-email`) | Three visible inputs had placeholder text only. Added `aria-label`. Found this pass. *Evidence:* RUNTIME E3 (jsdom: 3 → 0 unlabelled). | Placeholder is not an accessible name. | (Done) *Validation now:* jsdom check (`evidence/…/remediation-verification-2026-10-11.txt`). Screen reader not run.. *Rollback:* Git revert `46045f2`.. |
| **SEO-01** · SEO (positive control) · Informational · Verified (positive) | `robots.txt`, `sitemap.xml` (pro root) | Both files present. *Evidence:* STATIC E2 (reverify PASS). | — | — *Validation now:* Present.. *Rollback:* —. |
| **SEO-02** · SEO (metadata) · Low · Confirmed | `blocks.html`, `coming-soon.html`, `downloads.html` (no meta description); `404.html`, `500.html`, `503.html`, `blocks.html`, `coming-soon.html`, `downloads.html` (no Open Graph) | Missing metadata on utility and content pages. *Evidence:* STATIC E2 (site static audit). | Template gaps. | Add description and OG tags to content pages. *Validation now:* Static count.. *Rollback:* Git revert.. |
| **PERF-01** · Performance (payload) · Medium · Confirmed (static) | First-party JS ≈ 1.9 MB, CSS ≈ 1.0 MB; 2 images at 623 KB (`assets/img/img-469cf01b2548.jpg`) | Large first-party payload, image not resized. *Evidence:* STATIC E2 (site static audit). | No bundling/compression step. | Minify/split admin JS for public pages; resize image. *Validation now:* **No Lighthouse or real-user CWV run** (UNKNOWN).. *Rollback:* Git revert.. |

---

## 3. Step-by-Step Resolution Blueprint

Phases are chronological. Each phase must pass its acceptance check before the next begins. Steps marked **[APPROVAL]** need explicit owner approval before any action. Steps marked **[OWNER]** are done by the owner in a provider console or on the host. Packaging scripts are written only after Phase 10 passes.

**Status of work already done (not closed):**
- Done, pending verification: C-001 to C-004 (`46045f2`): AD-05/06/07 honest wording; OV-01 and OV-03 dashboard error card; A11Y-001 estimator labels. Mirrored byte-identically in `frontend-v1/`.
- Done, evidence only: `7f3f413`, `24157f6`, and the audit pack (`woodex-audit/`).

### Phase 0 — Containment (before anything else)
1. **[OWNER]** Rotate the shared password (SEC-001/002), the Telegram bot token (SEC-003), the maintenance token (`_private/system.json:5`), and the app key (`.env`). Update the server's `.env` and `config.php` out of band. Record date and dependent services.
2. **[OWNER]** Decide repository visibility (AD-24). Current: public. The owner's answer was "later"; keep flagging until answered.
3. **[APPROVAL]** Decide history rewrite (`git filter-repo` to remove the secret-bearing files, then force-push). It is **not** approved. It requires an explicit "yes, rewrite history". Collaborators must re-clone afterwards.
4. **[APPROVAL]** Untrack `.env`, `config.php`, `_private/*.json` and `_private/company.json`; keep `.htaccess` in `_private`. Move bank constants out of `config.php` into a file that is not tracked. Add ignore rules for these paths.
5. **Acceptance:** `git ls-files | grep -E '(\.env$|_private/|config\.php)'` returns only templates; the secret-scan command (`woodex-audit/evidence/sanitized-command-output/secret-scan-tracked-2026-10-11.txt`, re-run) shows no Telegram or password hit in a shipped file; the old values fail to authenticate (**OWNER-verified**).

### Phase 1 — Baseline, source of truth, and build gate
1. **[APPROVAL]** Owner decides the source of truth (D-3). The audit recommends the pro tree, because it is the only tree whose admin JavaScript parses. `frontend-v1/admin/` is byte-identical for the four edited files.
2. **[APPROVAL]** Remove the duplicate plain and space-named trees, or regenerate them from the chosen source. This is destructive; do it after Phase 0.
3. Add a build gate: `node --check` on every `admin/*.js`; `phplint.js` on every PHP file (`tools/qa-p29/`); a duplicate top-level-symbol check per file (catches AD-01 and AD-02 patterns).
4. **Acceptance:** the gate passes on the chosen tree; `diff -rq` between the deployed tree and the chosen source is empty.

### Phase 2 — Route and registry (Breakdown 1)
1. Add a `phase` field to every `NAV` tuple. Keep the `VIEWS.soon` guard (AD-03). Do not render "Phase undefined" for any route.
2. Add `integrations`, `business`, and `connections` to the alias table so they resolve in `NAV` (AD-04, AD-11).
3. Introduce `register(key, fn, {owner})`. Convert the 20 multiply-assigned keys (AD-12). Name one owner each for `approvals` (AD-10; **done, C-008, fixed pending verification**), `connections`/`business` (AD-11), and `enquiries` (SA-02).
4. **Acceptance:** the harness on `#/integrations` renders Settings with zero SyntaxErrors; the harness shows `VIEWS.approvals !== VIEWS.security`, and `#/approvals` renders the queue.

### Phase 3 — Integrations truth (Breakdown 1 symptom; trust defect)
1. Add an `integrations_status` action in `api/admin.php` that returns, per provider, `{configured, lastCheck}` with no secret values (AD-05).
2. Rebuild `renderIntegrationsTab()` from that response. Remove the hard-coded `connected: true` values from `APPS`.
3. **Done, pending verification (C-001):** Save and Ping wording is honest. Next: make Save post to a real action and toast only on `{ok:true}` (AD-06). Replace the canned Ping with a server-side health check with a timeout, or keep the honest label (AD-07).
4. Point tile handlers at the tab container that Settings really renders, `#st-subnav` (AD-08). Scope the `.st-grid` observer (AD-09).
5. **Acceptance:** status matches the server for one configured and one unconfigured provider; Save persists after reload; a tile click activates the matching tab.

### Phase 4 — Persistence and concurrency (AD-19, AD-21, WC-03)
1. Split connection credentials from the JSON data store. Redirect to `/wx-install.php` only when the credential file is missing; otherwise show the reconnect form (AD-19). Confirm in the browser (T-22).
2. Replace `jwrite` with a temp file plus `rename()`. Take `LOCK_SH` in `jread`. Take `LOCK_EX` across every read-modify-write (AD-21).
3. Make `bsecret()` fail closed: never regenerate a secret when the file exists but cannot be read (AD-21, WC-03).
4. Add a `mutate(file, fn)` helper and route admin mutations through it (AD-22 is withdrawn; the general claim is kept as AD-21 scope).
5. **Acceptance:** concurrent reads and writes (about 200 in a loop) leave the file valid JSON; no 503 "not set up" responses; no token invalidation. Runtime test **BLOCKED** until a PHP runtime is approved (L-8).

### Phase 5 — Automation locking and polling (AU-01 to AU-05, SA-01, SA-04)
1. Introduce `wag_mutate(fn)` with blocking `flock(LOCK_EX)`. Route every WhatsApp writer through it, including `wag_tick` (AU-01).
2. Return explicit `busy` codes instead of silent `0` or `['busy'=>true]` (AU-02, WC-02). Show queued or retrying state in the UI.
3. Convert the polling in `admin-chat2.js`, `admin-tg.js`, `admin-p18g.js`, and `admin-crm.js` to self-scheduling loops with an in-flight guard (AU-04, AU-05, SA-01).
4. Fix `fresh()` to compare the full hash route, not only the first segment (AD-23, SA-04).
5. **Acceptance:** an opt-out written during a cron tick survives; a busy tick is visible in the UI; chat responses never repaint older messages. Runtime test **BLOCKED** (L-8).

### Phase 6 — Error envelope (AD-20, CC-01, CC-02, SA-03)
1. Replace `catch (PDOException $e)` at `api/admin.php:591` with `catch (Throwable $e)` that returns JSON with a `requestId` and logs the cause server-side (AD-20, CC-01).
2. Register `set_exception_handler` as a fallback.
3. Add per-action `try` blocks to the 12 library files listed in CC-02, starting with `sales-lib.php` (SA-03).
4. Change the client (`admin.js:25`) to show the `requestId` in the toast.
5. **Acceptance:** injecting a `TypeError` into one action returns JSON with an error code, not an empty 500. **BLOCKED** until a PHP runtime is approved (L-8). **[APPROVAL]** The runtime decision is D-10.

### Phase 7 — Dashboard and page builder integrity (OV-01, OV-03, WC-01, WC-04)
1. **Done, pending verification (C-002, C-003):** the base and owner dashboards validate the payload and show an error card on failure. Confirm in a browser for editor and support roles (T-18).
2. **[APPROVAL]** Builder save: compare a content hash, not a 1-second `filemtime`, under the same lock as the write. Return `409` on mismatch. Add the same check to `restore` (WC-01). Needs builder UX approval.
3. Add the three missing absolute assets, or convert them to relative paths. Add a build check for every `/assets/…` reference (WC-04).
4. **Acceptance:** the dashboard shows an error card, not "Loading…", when `stats.folders` or `crm.kpi` is missing; two-tab content edit produces a `409` on the second save (BLOCKED until T-16/T-18 are run in a browser).

### Phase 8 — Automation and Sales surfaces (SA-02, AU-02)
1. Resolve the `enquiries` ownership so that CRM and classic views have one owner (SA-02).
2. Confirm the Leads handoff persists after reload (manual, BLOCKED).
3. **Acceptance:** a lead handoff persists after a reload; the `#/enquiries/classic` route reaches the classic view.

### Phase 9 — Theme and visual system (AD-13 to AD-18, AD-26)
1. Delete `!important` and the obsidian background from `admin.css:1283–1286`. Define `--side-bg` and `--side-fg` in `:root` and `html.dark`. Keep one `.side` rule set (AD-13, AD-14).
2. **Before step 1 ships,** give the sidebar identity colours (`#fff`, `#9ca3af`, `#00d3f2`) their own tokens. Otherwise brand and role text become unreadable when the sidebar is no longer forced dark (fix coupling, §1.5).
3. Replace the literal palettes in `admin-security.js` (65 hex, 70 inline styles), `admin-integ.js` (10 hex), and `admin-settings.js` with `var(--…)` tokens. Start with the inline styles in `admin-security.js` (AD-15).
4. Scope the 73 light-background rules under `html.dark` or move them to tokens (AD-16). Align `admin/master-components.html` with `html.dark` and `--txt` (AD-17).
5. On theme toggle, re-render the current view and rebuild all Chart.js instances (AD-18).
6. Add a build-hash `?v=` to every asset reference in `admin/index.html` and set `no-cache` for `admin/*.js` and `admin/*.css` in `.htaccess` (AD-26). Note: `admin/index.html` currently has 70 `<script` tags and zero version strings.
7. **Acceptance:** `THEME=light` and `THEME=dark` runs of `tools/qa-p29/theme-probe.js` report 0 light text nodes on light surfaces in light mode and 0 dark text nodes on dark surfaces in dark mode, for `#/security`, `#/settings/integrations`, and `#/dashboard`. The sidebar's computed background changes with the theme. Browser test **NOT RUN** after the Phase 9 changes.

### Phase 10 — Deployment hardening and verification (must pass before packaging)
1. **Live, read-only [OWNER/operator]:** `curl -I` each of `/_private/db.json`, `/_private/system.json`, `/_database/woodex-database.sql`, `/api/wa-cron.php?key=`, `/api/p18g-lib.php`, and `/router.php`. Expect 403 or 404 for all (AD-25, WC-05). Any 200 on a private path means **contain immediately**.
2. **[APPROVAL]** Set `_private` to `0750`. Remove `chmod -R 777` from the `Dockerfile` (line 15). Move secrets outside the web root. Fix the Apache 2.2 `Deny from all` in `_private/.htaccess`.
3. Run the full harness set in `tools/qa-p29/`: `phplint.js`; `harness.js` on `#/settings/integrations`, `#/approvals`, and `#/integrations`; `harness-db.js` on `#/dashboard`. Record zero SyntaxErrors and no navigation except the intended installer redirect.
4. Manual smoke test per category (checklist below) in Chrome and Safari, light and dark, with a cleared and a warm cache.
5. **Acceptance:** all checks pass; the defect matrix (`06`) is updated with each fix and its evidence. **Current status: BLOCKED** (no live access, no browser run, no PHP runtime).

**Manual smoke checklist (one pass per category):**
- OVERVIEW: dashboard renders counts and charts; a failure shows an error card.
- SALES: enquiries and leads screens load; the classic view is reachable; invoices and projects open; a lead handoff persists after reload.
- AUTOMATION: a WhatsApp opt-out survives a cron run; a busy state shows in the UI; chat does not repaint older messages.
- WEBSITE & CMS: a page edited in two tabs gives a `409`; the builder stays signed in after an admin save; no 404 on images.
- ADMIN & SETTINGS: Integrations shows real status; Save persists; tiles open their tabs; the approvals queue opens; the sidebar follows the theme; security cards are readable in both themes.
- DevOps: secret files return 403 or 404; `admin/*.js` cache headers are `no-cache`.

### Phase 11 — Packaging (only after Phase 10 acceptance)
1. Generate the package from the single verified tree, with a build hash that matches the `?v=` values.
2. Include a manifest with per-file SHA-256 and the QA gate results, and check it against the secret scan.
3. Only then write packaging scripts.

---

## 4. Coverage by Category

| Category | Status | What was covered | Defects |
|---|---|---|---|
| OVERVIEW | Partially audited (static + jsdom) | Dashboard loaders on both paths; navigation badges; route fall-through | OV-01, OV-02, OV-03, AD-04 |
| SALES | Partially audited (static) | CRM and enquiries polling and ownership; sales library | SA-01 – SA-04 |
| AUTOMATION | Partially audited (static) | WhatsApp cron lock and writers; chat and Telegram polling; cron key | AU-01 – AU-05 |
| WEBSITE & CMS | Partially audited (static) | Builder save, restore and token; content scheduler; assets; router | WC-01 – WC-05 |
| ADMIN & SETTINGS | Partially audited (largest; static + jsdom) | Registry; Integrations; theme; persistence; error envelope; secrets; cache; Docker | AD-01 – AD-28, CC-01, CC-02 |
| Security | Partially audited (secret scan of 7,286 tracked files; static) | Credentials; login path; public pages | SEC-001 – SEC-007 |
| Database | Partially audited (static) | Committed dumps; `_private` stores | DB-01, DB-02 |
| Performance | Static only | First-party asset sizes (JS ≈ 1.9 MB, CSS ≈ 1.0 MB) | PERF-01 |
| SEO and content | Static only | `robots.txt` and `sitemap.xml` present; metadata gaps | SEO-01, SEO-02 |
| Accessibility | Partially audited (jsdom) | Estimator form labels | A11Y-001 |

**Projects not audited:** `woodex-vlive-P20`, `p23-live`, `p22-preview`, `wf-admin`, `tools`, `woodex-live-v3`, `netlify`, `supabase`. Several have secret hits (see `02-resource-inventory.md`). A scope decision is pending (L-6).

---

## 5. Open Items and Limits

- **No live check was run.** No Hostinger, Apache or Render instance was inspected. Backend findings are STATIC unless labelled otherwise. The `curl` checks in Phase 10 are the confirmation step.
- **No PHP runtime.** PHP was checked for parse errors only (`php-parser`, PHP 8.2 grammar). `@php-wasm/node` needs Node ≥ 24.18; the sandbox has Node 22.22.3, and init fails with `processId must be set before init`. Behaviour of `flock`, `rename`, and exception paths was not executed (BLOCKED; decision D-10).
- **jsdom limits.** jsdom does not resolve `var()` and does not lay out pages. Canvas colour judgments come from CSS source and CALC, not computed style. The canvas is a test-only shim.
- **Stubbed API.** Harness responses are hand-written.
- **Not yet traced:** (a) the identity of the five cards the harness counts on `#/settings/integrations` (the static `APPS` list is the likely source); (b) tile click behaviour in a browser; (c) how the caller of `content-lib.php:50` handles `0`; (d) Chart.js palette and stale colours after toggle, in a browser; (e) the Claude AI Keys card: Claude appears only in the MCP block, and no card with that name was found in `APPS`.
- **Repository visibility** comes from `gh repo view --json isPrivate` (false). Confirm on the GitHub settings page.
- **Secret scope:** the scan covered all 7,286 tracked files. Values were not triaged one by one; hits were grouped by type and fingerprint (311 hex-entropy hits are not all triaged).

---

## 6. Reproducing the Evidence

- Probes: `tools/qa-p29/` (see its `README.md`). They are read-only and make no network calls. Run copies from a folder that has `jsdom` installed. Scripts cannot `require('jsdom')` in place.
- Static scripts: `woodex-audit/evidence/scripts/` — `reverify_findings.py` (56 PASS, 10 INFO, 0 FAIL), `regression_static.py` (15/15), `site_static_audit.py`, `bcrypt_literal_check.py` (boolean output only).
- Syntax: `node --check` on every `admin/*.js`; `tools/qa-p29/phplint.js` on every `api/*.php`.
- Secret scan: `detect-secrets` 1.5.0 over `git ls-files`. Output lists type, line, path and fingerprint only; values are never printed.
- Command outputs: `woodex-audit/evidence/sanitized-command-output/` (access-controlled; no values).

---

## 7. Errata from Revision 1

Every correction below was checked against the code in this revision.

| # | Revision 1 said | Corrected | Source |
|---|---|---|---|
| 1 | `wa-cron.php` has no empty-key bypass; `wag_load()` always makes a non-empty `cronKey` | `wag_load()` regenerates `cronKey` when the stored value is empty; AU-03 is a Hypothesis | `p18g-lib.php:16–17`, `wa-cron.php:14` |
| 2 | Six secret files "not covered by `.gitignore`" | None of the secret files is covered by any ignore rule; the only `_private` rule targets `frontend-v1/` | `git check-ignore` (exit 1); root `.gitignore:5` |
| 3 | "13 library files" have no `try` | 12 library files | STATIC count |
| 4 | Content save is at `builder.php:275` with no check | `:275` is the restore action. Save checks `filemtime` at `:244` and writes at `:249` | `builder.php:237–275` |
| 5 | `admin.js:693` is the boot redirect | `:700` in the pro tree; `:693` in the plain tree | grep, both trees |
| 6 | "Save" handler at `admin-settings.js:579` | `:578` | STATIC |
| 7 | Claude does not appear; "Claude AI Keys" card has no source | Claude appears only in the MCP block (`:331–539`) | grep |
| 8 | `admin-security.js` has 14 hard-coded values | 65 hex literals, 0 `var(`, 70 inline styles | grep counts |
| 9 | `.htaccess` lines 20 and 25 | Lines 20–21 and 26 | grep |
| 10 | "The fix in commit `f86258a` deletes the duplicate and no unique feature was lost" | Not verified and removed. Duplicates remain in the plain tree (T-02) | — |
| 11 | `frontend-v1/` is "the source of truth" | Pending owner decision D-3 | `24-decision-log.md` |
| 12 | `wa-cron` runs "every 5 minutes" (as a fact) | Cron schedule per the header comment at `p18g-lib.php:7` | comment |
| 13 | Phase 7 acceptance uses a stub missing `recent` | The fix guards `stats.folders` and `crm.kpi` | `admin.js:504`, `admin-dash.js:30–31` |
| 14 | Phase 0 step 4 (history rewrite and force-push) as a plain step | Gated **[APPROVAL]**; not approved | owner answer D-2 |
| 15 | Phase 1 deletes duplicate trees as a plain step | Gated **[APPROVAL]** | — |
| 19 | The approvals effect (`#/approvals` shows the Security page) was a Hypothesis | Runtime-confirmed in jsdom after in-app navigation (pre-fix 3/3). Fixed pending verification as C-008 (one line in both trees). Initial-load race not reproduced | `approvals-race.js`; `ad10-t16-t18-2026-10-11.txt` |

**Also corrected in the pack in this revision:** WC-01 (`builder.php` line 275 and the 1-second check), AD-19 (`admin.js:700` in pro), the executive-summary severity for AD-05/06/07 (High, not Critical/High), the bcrypt result (six occurrences per dump share one hash), and the decision-log entry for severity.

---

*Earlier revision: `QA-MASTER-REPORT-P29-V2.1-PRO.md` at commit `fec16c6`.*

