# Woodex ADMIN V2.1 — Master QA Report
**Target:** `woodex-live-p29-v2.1-pro/` (primary), with the sibling trees used for comparison
**Repository:** `marketingwoodex-cloud/-marketingwoodex` · branch `arena/4ba510f0-marketingwoodex` · base `f86258a`
**Date:** 2026-10-10
**Scope:** OVERVIEW · SALES · AUTOMATION · WEBSITE & CMS · ADMIN & SETTINGS (incl. security/DevOps)

---

## 0. Read this first — credential exposure (Critical)

`gh repo view` reports the repository as **public** (`isPrivate: false`). Six secret-bearing files are **tracked** and **not** covered by `.gitignore` (the only `_private` rule targets `frontend-v1/_private/*`). Anything in them should be treated as already disclosed, including anything in git history:

- `woodex-live-p29-v2.1-pro/.env` — application key, database password, Telegram bot token
- `woodex-live-p29-v2.1-pro/config.php` — database password constant (line 19), Telegram bot token constant (line 23), two bank IBAN constants (lines 29, 33)
- `_private/db.json` and `_private/admin-db.json` — 7 `pass_hash` entries each
- `_private/system.json` — maintenance token
- `_private/company.json` — bank account details

This report does not reproduce any value. Required action is in Phase 0 of the blueprint (§3), and it must run **before** any packaging.

---

## 1. Root-Cause Structural Diagnosis

### 1.1 Evidence legend
- **RUNTIME** — executed in jsdom 24 against the real `admin/index.html` with a stubbed API (`tools/qa-p29/`).
- **STATIC** — confirmed by reading the cited file and line.
- **CALC** — computed from CSS values (WCAG contrast ratio).
- **HYPOTHESIS** — follows from the code, but needs a live Hostinger/Render check to confirm.

### 1.2 What was verified clean
- All 48 PHP files parse under the PHP 8.2 grammar (`phplint.js`) in the `-pro`, plain, and space-named `-pro` trees. Negative control fails as expected.
- `woodex-live-p29-v2.1-pro/admin/*.js` passes `node --check`.
- `frontend-v1/admin/` and `woodex-live-p29-v2.1-pro/admin/` are byte-identical. `frontend-v1/` is the source of truth for the admin UI.
- `wa-cron.php` rejects an empty key. `wag_load()` always generates a non-empty `cronKey` (`p18g-lib.php:16–17`), so there is no empty-key bypass.
- `.cx-h` (`admin.css` 1614–1620) is correctly scoped with `:root:not(.dark)`. It is the model for the theme fix.
- Theme key is consistent: both `index.html:11` and `admin.js:328` use `localStorage` key `wxaTheme`.

### 1.3 Root causes (ranked)

**RC-1 — Source-of-truth fragmentation and paste duplication (causes Breakdown 1).**
Four admin copies exist, and five admin files differ between the plain and `-pro` trees. The plain `woodex-live-p29-v2.1/` and the space-named `woodex live p29-v2.1 pro/` each contain a *duplicated* fragment pasted into the middle of a module:

| Symbol (count) | `frontend-v1` / `-pro` (correct) | plain `woodex-live-p29-v2.1` |
|---|---|---|
| `renderActiveChat` (admin-chat.js) | 3 | 6 |
| `updateClientView` (admin-settings.js) | 2 | 4 |
| `Instant Quick Broadcast` (admin-social.js) | 1 | 2 |

Each duplicate breaks parsing (admin-settings.js:608, admin-chat.js:334, admin-social.js:333). When `admin-settings.js` fails to parse, `VIEWS.settings` is never registered, and the router falls through to the "coming soon" template. The fix in commit `f86258a` deletes the duplicate and changes nothing else. **No unique feature was lost.** The three `.js` files in the `-pro` build are the single correct copies.

**RC-2 — Route and view registry relies on script order (causes Breakdown 1 and 3).**
- Navigation is a tuple table with no `phase` field. `VIEWS.soon` reads `def[4]` (admin.js:680), which is undefined in the plain build. The `-pro` build guards it.
- Hash aliases exist in `admin-settings.js:586–588` (`business`, `connections`, `integrations`) but are not in the `NAV` table, so `route()` falls back to the dashboard (admin.js:461). **RUNTIME:** navigating to `#/integrations` executed the dashboard loader (admin.js:498–530 stack trace).
- **20 view keys are assigned by two or more modules.** The last script to load wins, and the order is set by `<script defer>` tags in `index.html`. Most overrides are deliberate wrappers (`wrap()` in admin-p8.js:42, `OLD.invoices`/`OLD.projects` in admin-sales17.js:392/502, `OLD.enquiries` for `#/enquiries/classic`). One is a genuine silent overwrite: **`approvals` is replaced by `admin-security.js:203`**, so the approvals queue is unreachable. **RUNTIME:** `VIEWS.approvals === VIEWS.security`.

**RC-3 — Sidebar pinned by `!important`, and components hard-code palettes (causes Breakdown 2).**
- `admin.css:1283–1286` (block "PRELINE OBSIDIAN & CYAN V2.1 ENHANCEMENTS") sets `.side{background:#0a0c10 !important;border-right:1px solid #1a1e27 !important}`. This overrides the token-driven rule at `admin.css:74` (`var(--card)`) and the navy rule at `admin.css:439`.
- The workspace (`.main`, `#view`) follows `var(--bg)`, which is `#f8fafc` in light mode. Result: obsidian sidebar beside a light canvas.
- Components bypass tokens. `admin-security.js` has 65 hex literals and 0 `var(` references; `admin-integ.js` has 10 and 0; `admin-settings.js` has 88 hex and 38 `var(`.
- There is no token contract. Theme is `html.dark` (set by `index.html:11`). `master-components.html` documents `data-theme` with `--tx`/`--mu`, while the live admin uses `--txt`/`--mut`. The runtime has no `data-theme` at all.

**RC-4 — The Integrations screen reports success it does not have (causes Breakdown 1 symptom and is a trust defect).**
`renderIntegrationsTab()` (admin-settings.js:121) makes **zero** `api()` calls. Its 23-entry `APPS` array (lines 9–31) is hard-coded, and 14 entries are `connected:true`. "Save" (admin-settings.js:579) only shows a toast. "Ping" (line 96) prints a canned "200 OK · 148 ms" without a request. "Connect" (line 113) sets `app.connected = true` in memory. Claude does not appear in `APPS`, and no Claude producer exists in `admin-aicenter.js` either. The "Claude AI Keys" card named in the brief has no source in this build. WhatsApp (`in-wa`, produced by `admin-google.js:46` and `admin-offers.js:108`) and Google data (`in-gdata`, `admin-google.js:46–47`) do have producers, but they are not wired to the status of the cards on this page.

**RC-5 — Non-atomic persistence, unlocked read-modify-write, and silent busy returns (causes Breakdown 3).**
- `jwrite()` (`api/admin.php:37`) calls `file_put_contents(..., LOCK_EX)`. The file is truncated before the lock is taken. `jread()` (line 36) takes no lock.
- A reader that hits the truncated file gets an empty array. `db()` (line 47) then answers "Admin is not set up yet" (503). `bsecret()` (line 40) regenerates the HMAC secret on an empty read, which invalidates every outstanding admin and builder token.
- WhatsApp: `wag_tick()` (`p18g-lib.php:94`) holds `wa-auto.lock` and returns `['busy'=>true]` silently when it cannot take it. Admin writers (`wag_save` callers at `p18g-lib.php` 236–313 and `wahub-lib.php` 121–188) take no lock at all. Cron and admin writes can therefore overwrite each other, including opt-outs.

**RC-6 — The error envelope is incomplete (causes intermittent blank failures).**
- `api/admin.php` declares `strict_types=1` (line 10) and sets `display_errors=0` (line 16).
- The only catch in the dispatcher is `catch (PDOException $e)` at line 591. Any `TypeError`, `ValueError`, or other `Throwable` escapes. The response is an empty HTTP 500.
- The client (`admin.js:25`) turns a non-JSON 500 into "Server error (500). Open /wx-check.php to see why." — the user sees a message, not the cause.
- None of the 13 library files listed in CC-02 (SALES, WEBSITE, AUTOMATION, ADMIN) has a local try/catch. `set_exception_handler` is never registered.

**RC-7 — Deployment and cache (causes "works for me, fails for them").**
- `.htaccess:35–36` sets `Cache-Control: public, max-age=2592000` (30 days) on every `css|js|…`. `admin/index.html` has **zero** `?v=` query strings on script or stylesheet tags.
- After any fix, returning browsers keep the broken `admin-settings.js` and old `admin.css`. Cached CSS with fresh HTML produces partial themes.
- The deny rules for `_private/`, `*.sql`, `*-lib.php`, and `router.php` live in the root `.htaccess` (lines 20, 25) and in four per-directory files (`_database/`, `_private/`, `_templates/`, `assets/uploads/`). The `Dockerfile` (`php:8.2-apache`) runs `a2enmod rewrite headers` but never sets `AllowOverride`, and it sets `chmod -R 777 /var/www/html/_private` (line 15). **HYPOTHESIS (strong):** the stock Apache config uses `AllowOverride None` for `/var/www/`, so none of these `.htaccess` files would be read in the container. Verify with `curl` (Phase 9).

---

### 1.4 Breakdown 1 — "Phase undefined" in Admin & Settings → Integrations

**Payload trace (plain build):**
1. `route()` (`admin.js:461`) resolves `#/settings/integrations`. `VIEWS.settings` is undefined because `admin-settings.js` threw a SyntaxError at parse (608).
2. Route falls to `VIEWS.soon(el, a, def)` (`admin.js:678`).
3. `VIEWS.soon` prints `'Phase ' + def[4]` (`admin.js:680`). `def[4]` is undefined in this build, so the header reads "Phase undefined" inside `.soon-box`.

**RUNTIME (harness):** plain build — 3 SyntaxErrors, `VIEWS.settings` undefined, `.soon-box` shown, "Phase undefined" rendered. `-pro` build — 0 errors, `VIEWS.settings` defined, `#st-subnav` present, header "Settings & Integrations".

**Conditional guards that hide failure:**
- `renderIntegrationsTab()` writes into `#st-tab-content` behind `if (!cont) return;` (admin-settings.js ~121). A missing container returns silently, with no error and no placeholder.
- `admin-integ.js:60,89` click handlers do `if (b) b.click()`. A missing target is a silent no-op. The target `#st-tabs [data-t]` is created by `admin-p8.js:64–74`, but Settings renders `#st-subnav` (admin-settings.js:42, 567–569). **RUNTIME:** `#st-tabs` is absent on `#/settings/integrations` in the `-pro` build.
- `admin-integ.js:93` attaches its enhancement to `#view .st-grid:not([data-ig])`. `.st-grid` is emitted by `admin-content.js`, `admin-integ.js`, and `admin-sheets.js`, not by Settings itself, so the observer may never find a matching grid on this page.

**What the `-pro` build actually shows:** five cards (the harness counts 5 matching nodes; their identity is not yet traced — see §5). The "active" status comes from the static `APPS` array, not from the server.

### 1.5 Breakdown 2 — Split theme canvas and low contrast in My Security & Approvals

**Mechanism:**
1. `index.html:11` sets `html.dark` from `localStorage.wxaTheme` or `prefers-color-scheme`.
2. Tokens (`admin.css:7–25`) switch on `html.dark`. `--bg` is `#f8fafc` in light mode.
3. `.side` is styled three times: `admin.css:74` (`var(--card)`), `admin.css:439` (`#0c1628`), and `admin.css:1283–1286` (`#0a0c10 !important`). The third wins in both themes.
4. **RUNTIME (sidebar-probe):** `#side` computes to `rgb(10,12,16)` in light **and** dark. Brand is `#fff`. `#sf-role` is `rgb(156,163,175)`.

**Contrast in the light workspace (CALC):**

| Foreground | Background | Ratio | Note |
|---|---|---|---|
| `#fff` | `#fff` | 1.00:1 | Card on light canvas (sidebar-identity colours; become invisible if the sidebar is ever made light) |
| `#cbd5e1` | `#fff` | 1.48:1 | Text on light surface |
| `#00d3f2` | `#fff` | 1.81:1 | Cyan accent text |
| `#9ca3af` | `#fff` | 2.54:1 | Muted text |
| `#94a3b8` | `#f8fafc` | 2.45:1 | Muted text on canvas |

**Local dark islands (theme-probe, `#/security`):** `html.class` is `""` in light and `"dark"` in dark. In both modes, 15 light-coloured text nodes sit on dark card surfaces and 0 sit on the light canvas. `admin-security.js` contains 14 hard-coded `#f9fafb`/`#cbd5e1` values and 70 inline `style=` attributes. Cards therefore stay dark in light mode.

**Light islands in dark mode:** 73 light-background rules in `admin.css` are not scoped under `html.dark`, for example `.tbl.items tr.k-head td` (`#faf6ef`), `.s17-next`, `.ql.on`, `.ib-tip`, `.lc.ib .lc-msgs`.

**State listener cascade:** `#dark-btn` (`admin.js:328`) re-renders only when `S.view === "dashboard"`. Chart.js instances (`admin.js:529–537`, `admin-dash.js:177`, `admin-reports.js:50`) keep the colours they were drawn with, so charts on other screens go stale.

**Fix coupling (important):** the sidebar text colours (`#fff`, `#9ca3af`, `#00d3f2`) only pass contrast because the sidebar is always dark. Removing the `!important` override without also giving the sidebar its own light tokens would make the brand and role text invisible.

### 1.6 Breakdown 3 — Intermittent feature dropping and link isolation

Trace by surface:

**Sales CRM and Leads handoff**
- `admin-crm.js:23` polls every 60 s, plus a hashchange re-fetch. There is no in-flight guard.
- `admin-sales17.js:33` replaces the `enquiries` view with its own. It delegates to the CRM version only for `#/enquiries/classic`. Behaviour depends on which module ran last.
- `fresh()` (`admin.js:19`) drops read responses when the screen has changed, but compares only the **first** hash segment. A response from an earlier sub-route with the same first segment can paint into the current view.
- `sales-lib.php` has no try/catch (see RC-6).

**Automation webhooks (WhatsApp / Telegram polling)**
- `wa-cron.php` runs `wag_tick()` every 5 minutes. A tick that finds the lock held returns `busy` and does nothing (`p18g-lib.php:94`). The admin UI has no way to see this.
- `admin-chat2.js:137` runs `setInterval(load, 3000)` with no in-flight guard. Responses can arrive out of order.
- `admin-tg.js:89` and `admin-p18g.js:67` poll the same way.
- If the JSON store is read empty during a write, `wag_load()` assigns a random `cronKey` (`p18g-lib.php:17`). The next cron request gets `403 bad key` until the admin re-reads the key. **HYPOTHESIS:** this is the most likely cause of "cron stopped working for no reason."

**Page Builder**
- `builder.php:244` checks `filemtime` before saving a page, with 1-second resolution. The content save at `builder.php:275` has **no** check: a second tab can overwrite it silently.
- Page Builder token derives from `bsecret()`. An empty read regenerates the secret and invalidates the token (`admin.php:40`), so the builder reports "not signed in" (`admin.js` bapi0, lines 29–30, which toasts "see Settings → System check").

**Database boot path**
- `admin.js:693` redirects to `/wx-install.php` on `st.needsSetup || st.dbError`. `admin.js:694` (the reconnect form) is unreachable when `dbError` is set. **RUNTIME:** the redirect fires (jsdom reports "Not implemented: navigation").
- `api/admin.php` `status` (lines 288–290) sets `dbError` when `db()` throws. `db()` reads `_private/db.json` expecting `{host,name,user,pass}` (line 47). The shipped `_private/db.json` is a data store and has none of those keys (STATIC: key-shape check).
- So a transient database error sends the owner to the installer, and the reconnect form is never shown.

**Absolute paths on Hostinger (Linux/Apache, case-sensitive):**
- Real missing files: `/assets/panoramas/dha6-luxury-living-360.jpg` (admin-settings.js) and `/assets/img/qr-placeholder.png` (admin-security.js). `/assets/images/` (admin-seo.js) does not exist.
- `admin/index.html` uses `<base href="/admin/">` (line 8). Relative admin asset names are safe, but `/builder/wx-css.js` (line 182) is absolute and must exist in the deployed tree.
- Case-sensitivity and absolute-path failures are invisible on case-insensitive local dev and only appear on Linux.

**Routing layer**
- `router.php` is a `php -S` test router and does not represent production. Production behaviour is governed by `.htaccess`, which is not executed by the Docker image (RC-7).

---

## 2. Defect Verification Matrix

**Verification tag key:** RUNTIME = jsdom harness · STATIC = code read with line cite · CALC = computed · HYPOTHESIS = needs live check.
**Severity:** Critical / High / Medium / Low.

| Core Hub Category | File/Module Path Target | Verified Code / UI Defect | Technical Failure Mechanism | Exact Fix Matrix Logic Required |
|---|---|---|---|---|
| ADMIN & SETTINGS | `woodex-live-p29-v2.1/admin/admin-settings.js` (also `woodex live p29-v2.1 pro/`) | **AD-01 · Critical · RUNTIME+STATIC.** Duplicated 24-line MCP block; unmatched `}` closes `renderConnectionsTab` early; parse error at line 608. Settings page does not load; "Phase undefined" renders. | Parse fails → `VIEWS.settings` never registered → `route()` falls to `VIEWS.soon`. | Delete the plain and space-named copies or regenerate them from `frontend-v1/admin/`. Gate packaging on `node --check admin/*.js` for every shipped JS file. |
| ADMIN & SETTINGS | `woodex-live-p29-v2.1/admin/admin-chat.js`, `admin-social.js`; `woodex live p29-v2.1 pro/` | **AD-02 · Critical · STATIC.** Duplicated fragment appended after the IIFE close: admin-chat.js:334, admin-social.js:333. `renderActiveChat` ×6 (should be ×3); `Instant Quick Broadcast` ×2 (should be ×1). | Stray `};` after `})();` is a parse error; the module is dropped whole. | Replace with the `-pro`/`frontend-v1` copies. Add a duplicate-symbol check (fail if any top-level function name appears twice in one file). |
| ADMIN & SETTINGS | `woodex-live-p29-v2.1-pro/admin/admin.js:680` (`VIEWS.soon`); `admin.js` NAV table (approvals entry at line 83) | **AD-03 · High · RUNTIME.** Plain build prints "Phase undefined"; the `-pro` build guards `def[4]`. NAV tuples have no `phase` field. | `def[4]` is undefined for every NAV entry → string concatenation prints "undefined". | Add an explicit `phase` field to each NAV tuple. Render "Coming soon" when the field is absent. Keep the guard. |
| ADMIN & SETTINGS | `woodex-live-p29-v2.1-pro/admin/admin.js:461` (`route()`); `admin-settings.js:586–588` | **AD-04 · High · RUNTIME.** `#/integrations` executes the dashboard loader (stack trace admin.js:498–530). Route is not in NAV. | Unknown hash falls back to `dashboard`; the alias map in `admin-settings.js` is never consulted. | Add `integrations`, `business`, and `connections` to the NAV/alias registry. Make `route()` log unknown hashes to the console. |
| ADMIN & SETTINGS | `woodex-live-p29-v2.1-pro/admin/admin-settings.js:9–31` (`APPS`), `:121` (`renderIntegrationsTab`) | **AD-05 · Critical · STATIC.** 23 hard-coded cards; 14 `connected:true`; zero `api()` calls. Claude is not in the list. | Status is a literal, not server state. The UI cannot distinguish configured from unconfigured. | Add a read-only `integrations_status` action in `api/admin.php` that returns per-provider `{configured, lastCheck}` without secret values. Build cards from that response only. |
| ADMIN & SETTINGS | `admin-settings.js:579` (Save) | **AD-06 · Critical · STATIC.** Toast "Global settings and Google service configs saved live!" with no request. | False success: values are lost on reload. | Post to a real save action, await `{ok:true}`, toast only on success, and show the server error otherwise. |
| ADMIN & SETTINGS | `admin-settings.js:96` (Ping); `:113` (Connect) | **AD-07 · High · STATIC.** Ping prints canned "200 OK · 148 ms". Connect sets `app.connected = true` locally. | Fabricated health and connection state. | Ping must call the provider's real health endpoint through the server, with a timeout. Connect must go through the OAuth/key flow and persist the result. Until then, label the control "Not yet available". |
| ADMIN & SETTINGS | `admin-integ.js:60,89` (tile click) vs `admin-p8.js:64` and `admin-settings.js:42` | **AD-08 · High · STATIC.** Tiles target `#st-tabs [data-t]`. Settings renders `#st-subnav`. Tiles do nothing. | `if (b) b.click()` swallows the missing target. | Make one tab-container contract (`#st-subnav`, `[data-t]`) and update both `admin-integ.js` and `admin-p8.js`. Log when a target is missing. |
| ADMIN & SETTINGS | `admin-integ.js:93` (MutationObserver) | **AD-09 · Medium · STATIC.** Observes `#view .st-grid:not([data-ig])`; Settings does not emit `.st-grid`. | Enhancement attaches only on pages that happen to render a grid. | Scope the observer to the Integrations tab container. Remove the dependency on other modules' grid classes. |
| ADMIN & SETTINGS | `woodex-live-p29-v2.1-pro/admin/admin-security.js:203` vs `admin-appr.js:21` | **AD-10 · High · RUNTIME.** `VIEWS.approvals === VIEWS.security`; the approvals queue marker is absent. Queue unreachable. | Later script assigns the same key and overwrites the approvals view. | Rename the security view key, or wrap it through the `wrap()` helper. Detect duplicate view keys at boot and log a warning. |
| ADMIN & SETTINGS | `admin-settings.js:586–588`; `admin-conn.js:8`; `admin-fields.js:317` | **AD-11 · Medium · STATIC.** `connections` and `business` are each defined in two modules; the later script wins. | Order-dependent: moving one `<script>` tag changes which screen renders. | Establish one owner per view key. Add a registry check in `admin.js` that fails the build if any key has more than one non-wrapping owner. |
| ADMIN & SETTINGS | `woodex-live-p29-v2.1-pro/admin/admin.js` (`VIEWS` registry, 20 keys with 2+ definers) | **AD-12 · High · STATIC.** 20 view keys defined in multiple modules, including `dashboard` ×4, `clients` ×3, `seo` ×3, `library` ×3. | Last-writer-wins is decided only by `<script defer>` order in `index.html`. | Replace direct assignment with `register(key, fn, {owner})`. Make `register` throw on a second non-wrapper owner. |
| ADMIN & SETTINGS | `woodex-live-p29-v2.1-pro/admin/admin.css:1283–1286` | **AD-13 · Critical · RUNTIME+CALC.** `.side{background:#0a0c10 !important}` in "PRELINE OBSIDIAN & CYAN V2.1" block. Sidebar `rgb(10,12,16)` in light and dark. | `!important` overrides every token-driven `.side` rule. | Delete the `!important` and the `background` line from the block. Define `--side-bg` and `--side-fg` tokens under `:root` and `html.dark`, and make `.side` consume them. |
| ADMIN & SETTINGS | `admin.css:74`, `:439`, `:1283–1286` | **AD-14 · High · STATIC.** Three competing `.side` rule sets (token, navy, obsidian). | Cascade resolved by source position plus `!important`. Any new rule can silently change the sidebar. | Keep one `.side` definition. Move the navy and obsidian values into the token block. |
| ADMIN & SETTINGS | `admin/admin-security.js` (65 hex, 0 `var(`); `admin-integ.js` (10 hex, 0 `var(`); `admin-settings.js` (88 hex, 38 `var(`) | **AD-15 · High · STATIC.** Inline and literal palettes: `#111318`, `#20242f`, `#1a1e27`, `#232836`, `#181c24`, `#161922`, `#f9fafb`, `#cbd5e1`. | Components ignore `html.dark`, so cards stay dark in light mode and text turns light-on-light in dark mode. | Replace every literal with a `var(--…)` token. Start with `admin-security.js` (70 inline `style=`, all cards). Add a lint that rejects hex in `admin/*.js` outside a token file. |
| ADMIN & SETTINGS | `woodex-live-p29-v2.1-pro/admin/admin.css` (73 unscoped light-background rules) | **AD-16 · Medium · STATIC.** Examples: `.tbl.items tr.k-head td` (`#faf6ef`), `.s17-next`, `.ql.on`, `.ib-tip`, `.lc.ib .lc-msgs`. | Light backgrounds are not scoped under `html.dark`, so they appear as light islands in dark mode. | Move each into a token and add a `html.dark` override, or scope under `:root:not(.dark)` as `.cx-h` does (admin.css:1614–1620). |
| ADMIN & SETTINGS | `admin/master-components.html` vs `admin.css:7–25` | **AD-17 · Medium · STATIC.** Reference doc uses `[data-theme=dark]` with `--tx`/`--mu`. Live admin uses `html.dark` with `--txt`/`--mut`. Runtime has no `data-theme`. | Two token systems; new components written from the reference doc will not theme. | Pick `html.dark` and `--txt`/`--mut` as the contract. Update the reference doc, or add aliases `[data-theme=dark]` → `html.dark`. |
| ADMIN & SETTINGS | `admin/admin.js:328` (`#dark-btn`) | **AD-18 · Medium · STATIC.** Toggle re-renders only when `S.view === "dashboard"`. Chart.js instances on other screens are not re-created. | Charts keep stale colours after toggle until navigation. | On toggle, call a single `themeChanged()` hook that re-renders the current view and destroys and rebuilds all Chart.js instances (`admin.js:529–537`, `admin-dash.js:177`, `admin-reports.js:50`). |
| ADMIN & SETTINGS | `admin.js:693–694` (boot); `api/admin.php:288–290` (`status`); `_private/db.json` | **AD-19 · Critical · RUNTIME+STATIC.** Any `dbError` redirects to `/wx-install.php` (RUNTIME: navigation fired). Reconnect form (`showAuth("db")`) is unreachable. Shipped `db.json` lacks `host`/`name`/`user`/`pass`. | `db()` reads credentials from the data-store file. Failure is interpreted as "not installed." | Split `_private/db.json` (credentials) from the JSON data store. Only redirect to the installer when the credentials file is missing. Otherwise show the reconnect form. |
| ADMIN & SETTINGS | `api/admin.php:591` (dispatcher catch) | **AD-20 · High · STATIC.** Only `catch (PDOException $e)`. `strict_types=1` (line 10), `display_errors=0` (line 16). | Any `TypeError`/`Error` escapes → empty HTTP 500 → UI shows "Server error (500). Open /wx-check.php". | Replace with `catch (Throwable $e)` that logs and returns `{ok:false, error, requestId}` as JSON. Register `set_exception_handler` as a fallback. |
| ADMIN & SETTINGS | `api/admin.php:36–37` (`jread`/`jwrite`); `:40` (`bsecret`); `:47` (`db`) | **AD-21 · Critical · STATIC.** `jwrite` truncates before `LOCK_EX`. `jread` takes no lock. Empty read → 503 "Admin is not set up yet" (line 47); empty read in `bsecret` regenerates the secret. | Concurrent reader sees an empty file. Secret regeneration invalidates every admin and builder token. | Write to a temp file and `rename()` it into place. Take `LOCK_SH` in `jread` and `LOCK_EX` around read-modify-write. Make `bsecret()` fail closed when the file exists but is unreadable; never regenerate. |
| ADMIN & SETTINGS | `api/admin.php` read-modify-write sequences (e.g. ID counters such as `seqL`) | **AD-22 · Medium · STATIC.** Admin mutations use unlocked load-modify-save, including on files the cron also writes. | Last write wins; a concurrent admin edit can be lost. | Route every mutation through one `mutate(file, fn)` helper with `flock(LOCK_EX)` and atomic rename (see AD-21). |
| ADMIN & SETTINGS | `woodex-live-p29-v2.1-pro/admin/admin.js` (`fresh()` line 19; `api0` line 23) | **AD-23 · Medium · STATIC.** Stale-response guard compares only the first hash segment. | Response from a previous sub-route with the same first segment is written into the current view. | Compare the full normalised hash (`scr()` including sub-route) when deciding whether to drop a response. |
| ADMIN & SETTINGS (Security/DevOps) | `.env`, `config.php` (lines 19, 23, 29, 33), `_private/db.json`, `_private/admin-db.json`, `_private/system.json`, `_private/company.json`; `.gitignore` | **AD-24 · Critical · STATIC (git).** Six secret-bearing files tracked; repo is public; `.gitignore` only covers `frontend-v1/_private/*`. | Credentials and bank details are readable by anyone with the URL, including in history. | **Do not copy values anywhere.** Rotate DB password, Telegram token, and app key. Reset all admin password hashes. Rotate maintenance token. Remove files from history (`git filter-repo`). Make the repo private. Add ignore rules for `.env`, `config.php` secrets, and `_private/*`. |
| ADMIN & SETTINGS (Security/DevOps) | `Dockerfile:15` (`chmod -R 777` on `_private`); `Dockerfile` (`a2enmod rewrite headers`, no `AllowOverride`); `.htaccess:20,25`; `_private/.htaccess`; `_database/.htaccess` | **AD-25 · High · HYPOTHESIS (strong).** Every deny rule lives in `.htaccess` files. The image enables `mod_rewrite` but never sets `AllowOverride`, and the Apache default is `None` for `/var/www/`. The `_private` directory is world-writable (777). | If `.htaccess` is ignored, `_private/*.json` (including the credential files) and `_database/*.sql` are downloadable. | Run `curl -I https://<host>/_private/db.json` and `/_database/woodex-database.sql`; expect 403/404. Set `_private` to `0750`, and move secrets outside the web root. Add an `Apache` `<Directory>` deny in the Dockerfile config. |
| ADMIN & SETTINGS | `.htaccess:35–36`; `admin/index.html` (no `?v=` on script/CSS tags) | **AD-26 · High · STATIC.** 30-day `public` cache on all JS/CSS, no cache-busting. | Fixed JS/CSS names persist in browsers after deploy. Old `admin-settings.js` plus new HTML causes partial failures. | Add `?v=<git-sha or build-hash>` to every `admin/index.html` asset reference, or emit hashed filenames. Use `no-cache` for `admin/*.js` and `admin/*.css`. |
| OVERVIEW | `woodex-live-p29-v2.1-pro/admin/admin.js:498–530` (dashboard loader) | **OV-01 · High · RUNTIME.** Loader reads `r.stats.folders`, `r.recent`, and a daily series without validation. Stub with a missing key throws inside `.then`; "Loading…" stays. | Unhandled rejection inside the handler; no `.catch` renders an error state. | Validate the payload shape. Render an explicit error card on failure. Add `.catch` to the dashboard `api()` chain. |
| OVERVIEW | `admin.js:165` (`navBadges` every 60 s) | **OV-02 · Low · STATIC.** Badge poll runs on a timer with no in-flight guard. | Overlapping requests on slow hosts; out-of-order badge counts. | Add an in-flight flag and skip the tick if one is pending. |
| SALES | `woodex-live-p29-v2.1-pro/admin/admin-crm.js:23` (60 s poll) and hashchange re-fetch | **SA-01 · Medium · STATIC.** Pipeline and Leads re-fetch on both timer and hashchange with no in-flight guard. | Duplicate requests; out-of-order renders overwrite newer data. | Use one fetch path per screen with an in-flight guard and an `AbortController` on hashchange. |
| SALES | `admin-sales17.js:33` (`enquiries`) vs `admin-crm.js:101` | **SA-02 · Medium · STATIC.** Enquiries replaced by sales17. Classic CRM view reachable only via `#/enquiries/classic`. | Handoff screen depends on script order and hash suffix. | Declare one owner for `enquiries`, with an explicit `classic` sub-route in the registry. |
| SALES | `api/sales-lib.php` (0 try blocks) | **SA-03 · High · STATIC.** Sales library has no local try/catch; errors escape to the dispatcher (AD-20). | Lead and invoice writes can fail without a usable error. | Wrap each action in `try { … } catch (Throwable $e)` that logs and returns JSON. Use transactions for multi-row writes. |
| SALES | `woodex-live-p29-v2.1-pro/admin/admin.js:19` (`fresh`) | **SA-04 · Medium · STATIC.** See AD-23. Sales sub-routes share the first segment. | Stale rows painted into a reused screen. | Apply the AD-23 fix. |
| AUTOMATION | `api/p18g-lib.php:94` (`wag_tick`); `p18g-lib.php` 236–313 and `api/wahub-lib.php` 121–188 (`wag_save` callers) | **AU-01 · Critical · STATIC.** Cron holds `wa-auto.lock`; admin writers take no lock. Opt-out and campaign edits can be overwritten. | Unlocked read-modify-write interleaves with the cron's load-save. | One `wag_mutate(fn)` helper with blocking `flock(LOCK_EX)` used by every writer, including the cron. Re-read inside the lock. |
| AUTOMATION | `p18g-lib.php:94`; `api/content-lib.php:50` | **AU-02 · High · STATIC.** `busy` and `0` returns are silent. Callers don't surface them. | Campaign send reports success while nothing is queued; cron appears to "skip" silently. | Return an explicit `{ok:false, code:'busy'}`. Retry with backoff in the cron, and show "Queued, retrying" in the UI. |
| AUTOMATION | `p18g-lib.php:16–17` (`cronKey` default) and `api/wa-cron.php:14` | **AU-03 · Medium · HYPOTHESIS.** Empty read regenerates a random `cronKey` in memory. Cron returns 403 until the admin re-reads the key. | Cron stops silently after a transient read race. | Fail closed on unreadable config (AD-21). Do not regenerate the key; persist it once at install. |
| AUTOMATION | `woodex-live-p29-v2.1-pro/admin/admin-chat2.js:137` | **AU-04 · High · STATIC.** `setInterval(load, 3000)` with no in-flight guard. | Out-of-order chat responses repaint older messages; timer piles up on slow responses. | Replace with a self-scheduling `setTimeout` loop that starts the next poll only after the previous one resolves. |
| AUTOMATION | `admin-tg.js:89`; `admin-p18g.js:67` | **AU-05 · Medium · STATIC.** Same polling pattern as AU-04. | Same as AU-04. | Apply the AU-04 pattern. |
| WEBSITE & CMS | `woodex-live-p29-v2.1-pro/api/builder.php:275` (content save) vs `:244` (page save check) | **WC-01 · High · STATIC.** Content save has no `filemtime` check. Page save check uses 1-second resolution. | Second editor overwrites content silently; same-second saves are not detected. | Use a content hash as the ETag. Compare on every save and return `409` on mismatch. |
| WEBSITE & CMS | `api/content-lib.php:50` | **WC-02 · High · STATIC.** Lock busy → `return 0` without an error. | Callers that treat `0` as "nothing to change" report success and drop the save. | Return an error code. Make callers check it. Retry the lock with a short timeout. |
| WEBSITE & CMS | `api/admin.php:40,96` (`bsecret`, builder token); `admin.js` `bapi0` lines 29–30 | **WC-03 · High · STATIC.** Builder token derives from the shared secret. An empty read regenerates the secret and logs out the page builder. | "Page builder: not signed in" after a transient read race. | Apply AD-21 (fail closed). Keep the builder token in its own file with its own lock. |
| WEBSITE & CMS | `woodex-live-p29-v2.1-pro/admin/admin-settings.js` (`/assets/panoramas/dha6-luxury-living-360.jpg`); `admin-security.js` (`/assets/img/qr-placeholder.png`) | **WC-04 · Medium · STATIC (file existence).** Both absolute paths are missing from the tree. `/assets/images/` (admin-seo.js) also missing. | Broken images / 404s. Case-sensitive on Linux, may pass on dev machines. | Add the missing files or change to relative paths. Add a build check that resolves every `/assets/…` reference against the tree. |
| WEBSITE & CMS | `woodex-live-p29-v2.1-pro/router.php`; `.htaccess` (`RewriteCond www` at lines 15 and 50; two `<IfModule mod_rewrite.c>` blocks at lines 9 and 47) | **WC-05 · High · STATIC + HYPOTHESIS.** `router.php` is a `php -S` dev router. Production relies on `.htaccess`, which the Docker image probably does not read (AD-25). The root file repeats the `www` redirect in two rewrite blocks. | Behaviour differs between local test server and production; `_private` and `-lib.php` may be reachable. | Document `router.php` as dev-only. Consolidate the two `.htaccess` blocks. Verify all deny rules with `curl` on the live host. |
| CROSS-CUTTING (Admin API) | `api/admin.php` (`declare(strict_types=1)` line 10; `display_errors` line 16); `admin.js:25` | **CC-01 · High · STATIC.** See AD-20. Error envelope covers `PDOException` only. | Intermittent blank 500s that look random to the user. | Apply AD-20. Surface a `requestId` in the toast so the owner can match it to the log. |
| CROSS-CUTTING (Admin API) | 13 library files, 0 try blocks each: `content-lib.php`, `dash-lib.php`, `sales-lib.php`, `roles-lib.php`, `sheets-lib.php`, `redirects-lib.php`, `logos-lib.php`, `google-data-lib.php`, `phase8-lib.php`, `r404-lib.php`, `p18e-lib.php`, `p18h-lib.php`, `p18j-lib.php` | **CC-02 · High · STATIC.** No local error handling. | Any runtime error bubbles to the dispatcher and is returned as an empty 500. | Add per-action try/catch with JSON error payload, and a single `set_exception_handler` in `admin.php`. |

---

## 3. Step-by-Step Resolution Blueprint

Each phase must pass its acceptance check before the next begins. **Packaging scripts are written only after Phase 9.**

### Phase 0 — Containment (before anything else)
1. Rotate the database password, Telegram bot token, and app key. Do not copy the old values anywhere.
2. Reset all admin password hashes. Rotate the maintenance token.
3. Make the repository private (`gh repo edit --visibility private` or in the GitHub UI).
4. Rewrite history to remove the six secret-bearing files (`git filter-repo --path … --invert-paths`) and force-push the rewritten branch. Notify collaborators to re-clone.
5. Add ignore rules: `.env`, `_private/*` (keep `.htaccess`), and move bank/IBAN constants out of `config.php` into a non-tracked file.
6. **Acceptance:** `git ls-files | grep -E '(\.env$|_private/|config\.php)'` returns only non-secret templates; the old values fail to authenticate.

### Phase 1 — Build integrity
1. Designate `frontend-v1/admin/` as the single source of truth for the admin UI.
2. Delete the plain `woodex-live-p29-v2.1/` and space-named `woodex live p29-v2.1*` duplicates, or regenerate them from source. Keep one deployable tree.
3. Add a build gate: `node --check` on all `admin/*.js`; `phplint.js` (`tools/qa-p29/`) on all PHP; a duplicate top-level-symbol check per file (AD-02).
4. **Acceptance:** gate passes on the single tree; `diff -rq` against `frontend-v1/admin` is empty.

### Phase 2 — Route and registry
1. Add `phase` to every NAV tuple; keep the `VIEWS.soon` guard (AD-03).
2. Register `integrations`, `business`, and `connections` as aliases in the NAV/alias table (AD-04).
3. Introduce `register(key, fn, {owner})`. Convert all 20 multiply-defined keys (AD-12). Resolve `approvals` (AD-10), `connections`/`business` (AD-11), and `enquiries` (SA-02) by naming one owner each.
4. **Acceptance:** boot in the harness logs zero duplicate-key warnings; `VIEWS.approvals` renders the queue, not the security page; `#/integrations` renders Settings.

### Phase 3 — Backend truth for Integrations
1. Add `integrations_status` to `api/admin.php` that returns per-provider `{configured, lastCheck}` with no secret values (AD-05).
2. Rebuild `renderIntegrationsTab()` from that response. Remove the literal `APPS.connected` values.
3. Make Save post to a real action and toast only on `{ok:true}` (AD-06). Replace canned Ping with a server-side health check with timeout, or label it "Not yet available" (AD-07).
4. Unify the tab container to `#st-subnav` / `[data-t]` in `admin-integ.js` and `admin-p8.js` (AD-08). Scope the `.st-grid` observer (AD-09).
5. **Acceptance:** Integrations status matches the server for at least one configured and one unconfigured provider; Save persists across reload; a tile click activates the matching tab.

### Phase 4 — Persistence and concurrency
1. Split `_private/db.json` (credentials only) from the JSON data store (AD-19).
2. Replace `jwrite` with temp-file + `rename()`. Add `LOCK_SH` to `jread` and `LOCK_EX` to read-modify-write (AD-21, AD-22).
3. Make `bsecret()` fail closed; never regenerate when the file exists (AD-21, WC-03).
4. Add `mutate(file, fn)` helper and route all admin mutations through it (AD-22).
5. **Acceptance:** 200 concurrent reads and writes in a loop leave the file valid JSON with no 503 "not set up" responses and no token invalidation.

### Phase 5 — Automation locking and polling
1. Introduce `wag_mutate(fn)` with blocking `flock(LOCK_EX)`; route every WhatsApp writer through it, including `wag_tick` (AU-01).
2. Return explicit `busy` codes instead of silent `0` / `['busy'=>true]` (AU-02, WC-02). Show queued/retrying state in the UI.
3. Convert `admin-chat2.js`, `admin-tg.js`, `admin-p18g.js`, and `admin-crm.js` polling to self-scheduling loops with an in-flight guard (AU-04, AU-05, SA-01).
4. **Acceptance:** an opt-out written during a cron tick survives; a busy tick is visible in the UI; chat responses never repaint older messages.

### Phase 6 — Error envelope
1. Replace `catch (PDOException $e)` at `admin.php:591` with `catch (Throwable $e)` returning JSON with a `requestId` (AD-20, CC-01).
2. Register `set_exception_handler` as fallback.
3. Add per-action try/catch to the 13 library files listed in CC-02, starting with `sales-lib.php` (SA-03).
4. Make the client (`admin.js:25`) show the `requestId` in the toast.
5. **Acceptance:** injecting a `TypeError` into one action returns JSON with an error code, not an empty 500.

### Phase 7 — Dashboard and page builder integrity
1. Validate the dashboard payload; render an error card on failure (OV-01).
2. Add content-hash ETag to `builder.php` content save; return `409` on mismatch (WC-01).
3. Add the two missing absolute assets or convert to relative paths; add a build check for every `/assets/…` reference (WC-04).
4. **Acceptance:** dashboard shows an error state, not "Loading…", for a stub missing `recent`; two-tab content edit produces a 409 on the second save.

### Phase 8 — Theme and visual system
1. Delete `!important` and the obsidian `background` from `admin.css:1283–1286`. Define `--side-bg` / `--side-fg` tokens in `:root` and `html.dark`. Keep one `.side` rule set (AD-13, AD-14).
2. Before step 1 ships, give the sidebar identity colours their own tokens (fix-coupling, §1.5) so the brand and role text stay readable when the sidebar is no longer forced dark.
3. Replace every literal palette in `admin-security.js`, `admin-integ.js`, and `admin-settings.js` with `var(--…)` tokens; start with the 70 inline `style=` attributes in `admin-security.js` (AD-15).
4. Scope the 73 light-background rules under `html.dark` or move them to tokens (AD-16). Align `master-components.html` with `html.dark` / `--txt` (AD-17).
5. On theme toggle, re-render the current view and rebuild all Chart.js instances (AD-18).
6. Add `?v=<build-hash>` to every asset reference in `admin/index.html` and set `no-cache` for `admin/*.js` and `admin/*.css` in `.htaccess` (AD-26).
7. **Acceptance:** `THEME=light theme-probe` and `THEME=dark theme-probe` both report 0 light text nodes on light surfaces in light mode and 0 dark text nodes on dark surfaces in dark mode, for `#/security`, `#/settings/integrations`, and `#/dashboard`. Sidebar computed background changes with the theme.

### Phase 9 — Deployment hardening and verification (must pass before packaging)
1. On the live host, `curl -I` each of: `/_private/db.json`, `/_private/system.json`, `/_database/woodex-database.sql`, `/api/wa-cron.php?key=`, `/api/p18g-lib.php`, `/router.php`. Expect 403 or 404 for all (AD-25, WC-05).
2. Set `_private` to `0750`; remove `chmod 777` from the Dockerfile; move secrets outside the web root.
3. Run the full harness set in `tools/qa-p29/`: `phplint.js`, `harness.js` for `#/settings/integrations`, `#/approvals`, `#/integrations`, `#/dashboard`, and `harness-db.js` for `#/dashboard`. Record zero SyntaxErrors and zero unhandled navigation except the intended installer redirect.
4. Manual smoke test per category (below), on Chrome and Safari, light and dark, with a cleared cache and a warm cache.
5. **Acceptance:** all checks pass; the QA report's Verification Matrix is updated with each defect marked fixed and its evidence.

**Manual smoke checklist (one pass per category):**
- OVERVIEW: dashboard renders counts and charts; stub or real failure shows an error card.
- SALES: enquiries/leads screen loads, classic view reachable; invoices and projects open; a lead handoff persists after reload.
- AUTOMATION: WhatsApp opt-out survives a cron run; busy state shows in UI; chat does not flicker old messages.
- WEBSITE & CMS: page edit in two tabs yields a 409; builder stays signed in after an admin save; no 404 on images.
- ADMIN & SETTINGS: Integrations shows real status; Save persists; tiles open tabs; approvals queue opens; sidebar follows theme; security cards are readable in both themes.
- DevOps: secret files return 403/404; cache headers on `admin/*.js` are `no-cache`.

### Phase 10 — Packaging (only after Phase 9 acceptance)
1. Generate the `woodex-live-p29-v2.1-pro` package from the single verified tree, with a build hash that matches the `?v=` values.
2. Include a manifest with per-file SHA-256 and the QA gate results.
3. Only then write packaging scripts.

---

## 4. Coverage by Category

| Category | Status | Defects |
|---|---|---|
| OVERVIEW | Dashboard loader unguarded; route falls to dashboard for unknown hashes | OV-01, OV-02, AD-04 |
| SALES | Duplicate `enquiries` owner; polling without guard; sales library without try/catch | SA-01 – SA-04 |
| AUTOMATION | Lock/writer mismatch; silent busy; overlapping chat polling; cron key fragility | AU-01 – AU-05 |
| WEBSITE & CMS | Content save without ETag; silent lock failure; builder token regeneration; missing assets; dev-only router | WC-01 – WC-05 |
| ADMIN & SETTINGS | Build fork (fails to parse); route/registry; static Integrations; theme; persistence; error envelope; secrets; cache; Docker | AD-01 – AD-26, CC-01, CC-02 |

## 5. Open items and limits

- **Not run live.** No Hostinger, Apache, or Render instance was reachable. Backend findings are STATIC except where marked HYPOTHESIS. The `curl` checks in Phase 9 are the confirmation step.
- **No PHP runtime.** PHP was checked for parse errors only (`php-parser`, PHP 8.2 grammar). Runtime behaviour of `flock`, `rename`, and exception paths was not executed.
- **jsdom limits.** jsdom does not resolve `var()` and does not lay out pages. Canvas colour judgments come from CSS source and CALC, not computed style.
- **API stubbed.** Harness responses are hand-written. The dashboard probe needs a fuller daily-series fixture before it can render end to end.
- **Not yet traced:** (a) the five cards that the harness counts on `#/settings/integrations` — identity still to be confirmed (the static `APPS` list is the likely source); (b) tile click behaviour, not yet exercised; (c) the caller of `content-lib.php:50` to confirm how `0` is handled; (d) the `Chart.defaults` palette in `admin/admin-chrome.js` and `admin-p19f.js`; (e) the Claude AI Keys card named in the brief does not exist in this build — confirm with the owner whether it should be added or whether AI keys belong on another screen; (f) the `admin-chat.js` and `admin-social.js` feature blocks, plain vs `-pro`, were compared by symbol count only.
- **Repository visibility** is taken from `gh repo view --json isPrivate` (false). Confirm in the GitHub settings page.

## 6. Reproducing the evidence

Probes are in `tools/qa-p29/` (see its `README.md`). They are read-only and make no network calls.
