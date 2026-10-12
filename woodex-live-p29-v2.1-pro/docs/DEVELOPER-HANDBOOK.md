# Woodex Admin — developer handbook

**The master document for the Woodex Interior Design Studio admin panel.**
Everything a developer needs to run it, understand it, extend it, test it and deploy it.

| | |
| --- | --- |
| Product | Woodex Admin V2.1.1 — the back office for woodex.com.pk |
| Stack | PHP 8 (no framework) · MySQL · vanilla ES5 JavaScript · one committed Tailwind build |
| Front end | 64 JS files in `admin/`, ES5 only, no build step at runtime |
| Backend | 44 PHP files in `api/`, **366 actions**, single POST endpoint |
| Database | **25 MySQL tables** + **49 JSON stores** in `_private/` |
| Screens | **59 sidebar routes** + 11 detail views |
| Companions | [`API-REFERENCE.md`](API-REFERENCE.md) · [`MODULE-MAP.md`](MODULE-MAP.md) · [`DATA-MODEL.md`](DATA-MODEL.md) |
| Deploy target | Hostinger shared hosting, `public_html/` top level |

> **Read this first if you are new:** §2 (architecture), §4 (one screen from top to bottom),
> then §9 (how to work on it without breaking anything). The three companion files are generated
> from the code — when in doubt, they are right.

---

## 1. What this project is

A single-tenant admin panel that runs the whole business behind the website:

* **Sales** — leads, pipeline, clients, quotations, invoices, payments, projects, bookings
* **Website** — page builder, section library, header/footer, hero slides, redirects, media, SEO
* **Conversations** — website live chat with an AI agent, WhatsApp Cloud API, Telegram
* **Automation** — broadcasts, discount offers, client updates, notifications, AI training
* **Operations** — users and roles, approvals, activity log, backups, database inspector, files, maintenance

It is deliberately **framework-free PHP + vanilla JS**. There is no composer, no npm at runtime, no
build step on the server. Upload the files, set one config file, import one SQL file, done.

### The five rules the code follows

1. **One endpoint.** The admin talks to `POST /api/admin.php` with `{"action": "…"}` and JSON out.
   A second endpoint (`/api/builder.php`) serves the page builder.
2. **No PHP in HTML.** Pages are static `.html`; data arrives over the API.
3. **Actions are gated by name and by group.** `need([...])` plus the role/permission engine (§5).
4. **Frequent state lives in `_private/`.** Records live in MySQL. Config and caches live in JSON files
   that survive a code update.
5. **Every screen must survive a reload.** No screen may show "Loading…" forever, and no screen may
   print `undefined` — both have happened and are now guarded by the QA harness (§9).

---

## 2. Architecture

### 2.1 Directory layout

```
woodex-live-p29-v2.1-pro/          ← upload this whole folder into public_html/
├── index.php                      Hostinger entry point
├── config.php                     DB credentials + site constants  ← EDIT ON DEPLOY
├── router.php                     PHP built-in server router (local testing only)
├── wx-install.php                 One-time installer
├── wx-check.php                   Environment check
├── wx-audit.php                   Master audit — run once on the live server (§10)
├── *.html                         ~145 public website pages
├── admin/                         the admin panel
│   ├── index.html                 shell: nav, topbar, #view mount point
│   ├── admin.js                   core: boot, auth, router, nav, users, activity
│   ├── admin-*.js                 63 feature modules (one per area)
│   ├── admin.css                  legacy shell styles
│   ├── woodex-tw.css              committed Tailwind build (do not edit by hand)
│   └── woodex-v21.css             V2.1.1 design tokens + components
├── api/                           endpoints + *-lib.php handler modules
│   ├── admin.php                  main endpoint: boot, auth, dispatch
│   ├── builder.php                page builder endpoint
│   ├── roles-lib.php              role + permission engine
│   ├── *-lib.php                  one per domain (sales, media, telegram, …)
│   └── chat.php forms.php whatsapp.php telegram.php mcp.php r404.php quote-view.php
├── builder/                       the page builder (iframe)
├── assets/                        css, js, images of the public site
├── _private/                      JSON state — NEVER delete, NEVER commit secrets
├── _templates/                    starter content (page + quotation templates)
└── docs/                          this handbook and its companions
```

### 2.2 Request lifecycle (admin)

```
browser
  └─ POST /api/admin.php  {action, …}   header: X-WX-ADM: <token>
       ├─ api/admin.php boots
       │    ├─ config.php            constants, DB credentials
       │    ├─ helpers               jread/jwrite, q() prepared queries, fail(), out()
       │    ├─ current_user()        token → session row → wx_users row  (role canonicalised here)
       │    ├─ need([roles])         role check + permission-group engine
       │    └─ dispatch: case 'action' …  (or a *-lib.php module that claims the prefix)
       └─ {ok: true, …} or {ok: false, error: "…"}
```

The front end never talks to MySQL. Every write goes through one of the 366 named actions, which is
why the audit can enumerate the entire surface (§10).

### 2.3 The two tokens

| Token | Header | Lifetime | Purpose |
| --- | --- | --- | --- |
| Admin token | `X-WX-ADM` | 12 h | every admin action |
| Builder token | `X-WX-CSRF` | 12 h | the builder iframe only — a narrower grant than the admin token |

Both are HMAC-signed over the user id, expiry, a per-session id and `pw_ver`. **Changing a password or
signing out remotely invalidates every token instantly** because `pw_ver` / the session row changes.
Tokens live in `sessionStorage` (`wxaTok`, `wxTok`) — never in cookies — so a stolen HTML page cannot
ride an admin session.

### 2.4 Where state lives

| Kind | Home | Survives a code update? | Example |
| --- | --- | --- | --- |
| Records | MySQL (`wx_*` tables) | yes (it is the DB) | `wx_leads`, `wx_invoices` |
| Config & caches | `_private/*.json` | yes (never overwritten by uploads) | `redirects.json`, `telegram.json` |
| Uploaded files | `uploads/`, `assets/` | yes | project photos, blog images |
| Ship-with starters | `_templates/*.json` | no — replaced on deploy | quotation templates, page blocks |

`_private/` must be present and writable. On deploy it is **the one folder you never overwrite** —
which is why the deployment guide (§11) tells you to upload the zip over the top.

---

## 3. Data model at a glance

Full column lists: **[`DATA-MODEL.md`](DATA-MODEL.md)**.

**25 MySQL tables** cover the record-keeping side:

| Group | Tables |
| --- | --- |
| People & access | `wx_users`, `wx_throttle`, `wx_activity` |
| Sales | `wx_leads`, `wx_lead_notes`, `wx_clients`, `wx_templates`, `wx_quotes`, `wx_invoices`, `wx_invoices_archive` |
| Delivery | `wx_projects`, `wx_bookings`, `wx_arc_drawings`, `wx_arc_revisions`, `wx_arc_feed` |
| Conversations | `wx_chats`, `wx_chat_msgs`, `wx_bot_sessions`, `wx_wa_seen`, `wx_tg_seen`, `wx_tg_map` |
| AI | `wx_ai_events`, `wx_ai_unans` |
| System | `wx_settings`, `wx_notify_log` |

**49 JSON stores in `_private/`** carry configuration that changes without a migration — Telegram and
WhatsApp credentials, redirect plans, health scans, PageSpeed results, media alt text and trash,
per-user notification prefs, backups index, demo-account expiry. Anything you add that is settings-shaped
belongs here, not in a new table.

---

## 4. Anatomy of one screen (read this before adding one)

Take **Team & Roles** (`#/users`) — small enough to hold in your head, and it exercises every part:

```js
// admin/admin.js
VIEWS.users = function (el) {                       // 1. the route handler
  el.innerHTML = head("Team & Roles", "Team & Roles", '<button class="btn pri" id="u-add">…');
  var users = [];
  var load = function () {
    api("users").then(function (r) {                // 2. one named action
      if (!r.ok) return toast(r.error, true);
      users = r.users || [];                        // 3. never trust a payload shape
      draw();
    });
  };
  var draw = function () { … };                     // 4. render from state, always
  $("#u-add").onclick = function () { form(); };    // 5. real editor, real save
  load();
};
```

and on the server:

```php
// api/admin.php
case 'users':
    need(['owner', 'admin']);                       // 6. gate by role
    out(['ok' => true, 'users' => array_map('pub', q('SELECT * FROM wx_users ORDER BY id')->fetchAll())]);
```

Six rules that follow from it:

1. **Render from state, not from the click.** `draw()` must be callable at any moment.
2. **Null-guard every payload.** `r.users || []`. A missing key once produced a screen that printed
   five invented people (see §9, "the fake screen").
3. **A failed load must say so.** Never leave `Loading…` on screen; show the error and a retry.
4. **Every button does something real.** No `toast("Editing…")` placeholders.
5. **One action per intent**, named `domain_verb` (`media_upload`, `inv_track`, `tg_test_me`).
6. **Gate on the server.** Hiding a nav item is cosmetic; `need([...])` is the control.

Then add the route to `NAV` in `admin.js`, and give the file a cache-buster (§9.3).

---

## 5. Roles and permissions

Five roles, canonical names on the left, what the UI calls them on the right:

| Role | Label | Groups |
| --- | --- | --- |
| `owner` | Master | self, sales, conversations, updates, broadcast, ai, website, settings, **master** |
| `admin` | Manager | everything except **master** |
| `editor` | Developer | self, website, settings |
| `sales` | Sales | self, sales, conversations |
| `support` | Support | self, conversations, updates, support_view |

**Two layers of control:**

* **Roles** — `need(['owner', 'admin'])` in the action, and `def[3]` on a nav entry (`"owner,admin,editor"`).
* **Groups** — `api/roles-lib.php` maps every action to a group by regex. A user with the `website`
  group can use every website action even if the action's own `need([...])` names other roles.
  `EXPAND` and `SHARED` handle actions that legitimately serve two groups. The Master can grant extra
  groups per user (`wx_user_perms` / the perms field on `pub()`).

**Manager changes are proposals.** When a Manager or Developer edits something Master-only, the API
answers `{ok: true, pending: true, message: …}` instead of writing — the change waits in Approvals.
**Never truthy-test `pending`** — it arrives as a string on queued approvals and as `true` on others.

**Role aliases.** `role_canon()` (`api/admin.php`) and `roleCanon()` (`admin.js`) accept the words other
tools write — `master`, `superadmin`, `administrator` → `owner`; `manager` → `admin`; `developer` →
`editor`. This exists because a single unrecognised word in the `role` column locked the owner out of
the builder and half the API. Keep both copies; the client one covers a stale session.

---

## 6. Module map

Full table (section → route → view file → actions): **[`MODULE-MAP.md`](MODULE-MAP.md)**.

The sidebar has **9 sections and 59 routes**, plus 11 detail views that open from a list
(`#/invoice/<id>`, `#/quote/<id>`, `#/client/<id>`, `#/post/<id>`, `#/study/<id>`, `#/citydraft/<id>`, …).

| Section | Routes | What lives there |
| --- | --- | --- |
| OVERVIEW | Dashboard, Approvals | KPIs, pending work, the approval queue |
| SALES | Leads, Pipeline, Bookings, Clients, **Quotations + templates**, **Invoices + tracking + transactions**, Projects, Timeline | the whole money path |
| AUTOMATION | Inbox, Team feed, WhatsApp (4), Telegram, Social, Client updates, AI (3) | conversations and campaigns |
| WEBSITE & CMS | Pages & builder (5), Content (11), Media, SEO + agent, Speed, Site health | everything the public site shows |
| SETTINGS | Business info, Integrations, Users & roles, notifications, maintenance, security, backups, database, files, activity, system | administration |

**Routing rules that matter:**

* `ALIAS` (in `route()`) maps *another name for the same screen*: `leads → enquiries`, `posts → blog`,
  `st → portfolio`, `tg → telegram`, `inbox → chat`, `payments → transactions`.
* Detail views are **not** aliases. `quote`, `template`, `invoice`, `post`, `study`, `fields`,
  `citydraft` keep their own route — mapping them to the list route once made every editor unreachable.
* An unknown route falls back to the dashboard; a route the role cannot see shows a toast and falls back.
* `#/users` is the **admin** team; `#/team` is the **website** Team section manager. They are different
  screens and must stay different (see §9).

---

## 7. The API

**366 actions.** Full table with roles and call sites: **[`API-REFERENCE.md`](API-REFERENCE.md)**.

Call shape (front end):

```js
api("inv_new", { client_id: 12, sections: […] })     // uses WXA.api → POST /api/admin.php
  .then(function (r) { if (!r.ok) return toast(r.error, true); … });
bapi("save", { html: … })                              // builder token → /api/builder.php
```

Answer shape (always): `{ok: true, …}` or `{ok: false, error: "human sentence"}`.
`fail()` also sets the HTTP status (`401` not signed in, `403` role, `404` missing, `429` throttled,
`502` upstream, `503` not installed).

**Endpoints:**

| Endpoint | Purpose |
| --- | --- |
| `api/admin.php` | everything the admin does |
| `api/builder.php` | page builder: load/save pages, blocks, theme, media, uploads |
| `api/chat.php` | public website chat |
| `api/forms.php` | public form submissions → leads |
| `api/whatsapp.php` | WhatsApp Cloud webhook |
| `api/telegram.php` | Telegram bot webhook (secret header checked) |
| `api/mcp.php` | AI tool access over a bearer token |
| `api/r404.php` | records 404 hits for the monitor |
| `api/quote-view.php` | public quotation view (read-only, tokenised) |
| `api/wa-cron.php` | WhatsApp worker (queue, scheduled sends) |

---

## 8. Front-end conventions

| Topic | Rule |
| --- | --- |
| Language level | **ES5** — `var`, `function`, no arrow functions, no template literals, no `let/const` in `admin/` |
| Module shape | one IIFE per file, `var W = window.WXA; if (!W) return;` at the top |
| Shared helpers | `WXA`: `api`, `bapi`, `esc`, `ic`, `toast`, `modal`, `closeModal`, `head`, `autoHead`, `can`, `roleCanon`, `fillIcons`, `initials`, `ago`, `S` (state), `VIEWS` |
| Rendering | build a string, assign to `innerHTML`, then `fillIcons(el)`; never write `innerHTML` without asserting the node exists |
| Icons | Lucide via `WXA.ic(name)` — icons are hydrated after render, so re-run `fillIcons` on any new subtree |
| Styling | CSS custom properties from `woodex-v21.css`; **every element ships a `dark:` variant**; no dark-only literal colours in shared markup |
| Responsive grids | `repeat(auto-fit, minmax(min(Npx, 100%), 1fr))` with `min-width: 0` — plain `repeat(2, 1fr)` floors tracks at min-content and overflowed the page once |
| Router | `location.hash`; screens are functions on `WXA.VIEWS`, receiving `(el, parts, navDef)` |
| State | `WXA.S` for cross-screen state; `sessionStorage` for tokens |

**Design system.** Tokens come from `admin/woodex-v21.css` — the V2.1.1 layer built from the owner's
DESIGN.md. Two older sheets (`woodex-ui.css`, `woodex-ds.css`) were deleted; their component rules live
in `woodex-v21.css` with every `var(--ui-*)` / `var(--ds-*)` re-pointed at a v2.1.1 token.
`admin/woodex-tw.css` is a **committed Tailwind build** — regenerate it out of band, never at runtime.

---

## 9. Working on it safely

### 9.1 The five bug classes this codebase has actually produced

Every one of these shipped at least once. All five are now machine-checked.

| # | Class | Symptom | Guard |
| --- | --- | --- | --- |
| 1 | **Fake screen** | A screen that renders from hardcoded data when its API call fails, with buttons that only toast. It looked finished and did nothing. | `users-probe.mjs`; audit that every `api("…")` has a PHP handler |
| 2 | **Hollow payload** | The API answers `{ok:true}` with no keys the screen expects → empty table or `undefined`. | action-vs-Handler audit; probes assert real row counts |
| 3 | **Dead-end load** | `Loading…` forever, or a refusal card with no retry. | every `fail()` path renders an explanation + retry; `master-qa.mjs` flags stuck routes |
| 4 | **Silent CSS truncation** | An in-place edit cut a rule short → an unbalanced `{` → the browser dropped every rule after it. | `css-check.mjs` (brace balance) after any CSS patch |
| 5 | **Spelling lockout** | A role word the code did not recognise locked the owner out of half the app. | `role_canon()` / `roleCanon()` |

Two more that are waiting to happen, both already fixed once:

* **Script order.** A later file overwriting an earlier `VIEWS.<name>` silently replaces a screen
  (`admin-users.js` replaced the website Team screen). Check who else claims a route before you add one.
* **Cache-busting.** Every `<script src>`/`<link href>` in `admin/index.html` carries `?v=…`. After
  editing a file, bump its version, or the browser keeps serving the old copy.

### 9.2 Before you commit

```bash
node --check admin/<changed>.js                  # syntax, ES5-safe
node tools/phplint.js api/<changed>.php          # PHP parse (php-parser)
node tools/css-check.mjs                         # if you touched CSS: brace balance
PREVIEW_EMAIL=… PREVIEW_PASS=… node tools/master-qa.mjs http://127.0.0.1:8080 /tmp/mq
```

`master-qa.mjs` must report **58 routes · stuck 0 · page errors 0** (§10.4 shows the current numbers).

### 9.3 Adding a screen or an action — checklist

1. Action: add `case 'your_action':` in the right `api/*-lib.php` with `need([...])` first.
2. Front end: `api("your_action", payload)`; null-guard the answer; handle `!r.ok`.
3. Route: add to `NAV` (section, route, label, icon, roles) and `VIEWS.yourroute = function (el) {…}`.
4. Cache-buster: bump `?v=` for the file you edited (and `admin.js` if you touched `NAV`).
5. Test: `node --check`, then probe the route, then `master-qa.mjs`.
6. Document: add the action to the reference (`python tools/…` regeneration) and note the screen in the module map.

### 9.4 Two habits that save hours

* **Print `e.stack`, not `e.message`,** when tracing a browser error. A `.then()` that throws shows up
  as an unhandled rejection, not a page error — attach a listener when a silence is suspicious.
* **`scrollWidth > innerWidth` on `<html>`** is the overflow test. The Integrations page once scrolled
  sideways on a 1440 px screen because a two-column grid had nowrap descriptions.

---

## 10. QA harness

The whole harness is read-only and never touches production. It lives outside the shipped project, in
`tools/qa-p29/`, and drives an approved headless Chromium against a **preview server** that serves the
real files and answers the API.

### 10.1 The preview server — it now runs the real PHP

There are two ways to preview, and the real one is the default:

**`tools/qa-p29/php-preview.mjs [--port 8080]` — real backend.** Serves the project *and* runs its own
`api/*.php` (PHP 8.3 in WebAssembly, §10.5) against a SQLite copy of the database. Every screen is
then the real thing: real sign-in, real role gates, real data access, real builder saves.

* works on a copy in `tools/qa-p29/.qa-run/preview` — clicking around can never damage the shipped
  tree; the copy is refreshed from the project on each start while runtime files (database, sessions,
  migration memo) are kept,
* keeps the browser signed in: a session token is minted per account at start-up and refreshed when it
  ages, and the old fixture tokens are bridged to freshly signed ones, so a browser holding a preview
  token from the previous preview keeps working,
* blanks outbound service credentials (Telegram / WhatsApp / Google / SMTP / Sheets) so no screen can
  call a live service from the preview,
* restarts the PHP runtime by itself if the WASM runtime ever aborts, and serves static files with
  `no-store` so an updated build always shows.

**`tools/qa-p29/preview-server.py <project-dir> <port>` — fixture mode.** A stdlib HTTP server that
answers the API from fixtures in milliseconds. It is the fast option for pure UI sweeps (58 routes in
under a minute) and it still runs real local work where that is possible (media listing, the redirect
plan, the site-health page scan). It is **not** PHP and **not** MySQL: it proves the UI, the wiring and
the contracts, never execution. Keep it for UI iterations; use the PHP preview — and ultimately the
host — for anything that depends on the server answering correctly.

### 10.2 The probes

| Tool | What it proves |
| --- | --- |
| `master-qa.mjs` | every nav route loads, no stuck screens, no page errors |
| `website-probe.mjs` | the website/CMS routes: headings, row/card counts, refusal cards, tracker chips |
| `invoice-probe.mjs` | the money path end to end: create → track → pay → balance → detail |
| `telegram-probe.mjs` | the Telegram screen: token refusal, connect, QR, test DM, settings, disconnect |
| `health-probe.mjs` | Site health runs for real; Speed prints no `undefined` |
| `users-probe.mjs` | Team & Roles shows real members; editor saves; validation refusals; the website Team screen stays separate |
| `theme-contrast.mjs` | light + dark contrast on key screens (belowAA must stay 0) |
| `css-check.mjs` | CSS brace balance per sheet |
| `phplint.js` | PHP parse for every `api/*.php` (php-parser) |
| `sales-tpl-probe.mjs` | quotation template cards + import |
| `responsive-sweep.mjs` | horizontal overflow per route (58 screens, must be 0) |
| `php-runner.mjs` | boots real PHP 8.3 (WASM) and answers one API action |
| `php-sweep.mjs` | every API action × every role, classified (see §10.5) |
| `api-matrix.mjs` | the write paths: lead → client → quote → invoice → payment → project, plus every settings screen (write, read back, restore) |

### 10.3 Running it

```bash
cd tools/qa-p29
python3 -u preview-server.py ../../woodex-live-p29-v2.1-pro 8080 &
PREVIEW_EMAIL=<owner> PREVIEW_PASS=<pass> node master-qa.mjs http://127.0.0.1:8080 /tmp/mq
```

### 10.4 The numbers that must hold

| Gate | Expected |
| --- | --- |
| `master-qa.mjs` | 58 routes · stuck 0 · page errors 0 |
| `theme-contrast.mjs` | 8/8 runs, belowAA 0 |
| `responsive-sweep.mjs` | 58 screens · 0 with overflow |
| `phplint.js` | 54/54 parse |
| `css-check.mjs` | balanced |
| every probe above | exit 0 (non-zero = a regression) |

### 10.5 Running the real PHP locally (no MySQL needed)

`tools/qa-p29/php-runner.mjs` boots PHP 8.3 compiled to WebAssembly and serves the project's own
`api/*.php` against the host filesystem, so the API runs unmodified on a machine with no PHP and no
MySQL installed:

```bash
cd tools/qa-p29
npm install                                   # @php-wasm/node + @php-wasm/universal
node php-runner.mjs --check                   # PHP version, extensions, PDO drivers
node php-runner.mjs --install                 # create the local database from the real schema
node php-runner.mjs --seed                    # create the QA logins
node php-runner.mjs --action dashboard --email <owner>   # one real action
node php-sweep.mjs                            # every action × every role (~3 min)
node api-matrix.mjs                           # the write paths, on its own sandbox database
```

Two pieces make that possible:

* **`api/_lib/db.php`** — one factory for every connection. `_private/db.json` decides the driver:
  **`mysql` is the production path and is byte-for-byte the old code path**; `{"driver":"sqlite"}`
  opens a SQLite file instead (path from `"file"`, default `_private/woodex.sqlite`).
* **`api/_lib/db-sqlite.php`** — translates the MySQL dialect the API is written in: `SHOW TABLES`,
  `SHOW TABLE STATUS`, `SHOW COLUMNS`/`DESCRIBE`, `LIMIT a,b`, `FOR UPDATE`, `ON DUPLICATE KEY UPDATE`,
  `INSERT IGNORE`, `TRUNCATE`, `DATE_SUB`/`DATE_ADD … INTERVAL`, plus `NOW()`, `CURDATE()`, `RAND()`,
  `DATE_FORMAT()`, `CONCAT()`, `GREATEST()`/`LEAST()` and `VERSION()` as functions, and the MySQL
  column types in `CREATE`/`ALTER TABLE`. With `"trace": true` in db.json every translation is
  appended to `_private/qa-sql-trace.log` (string literals are redacted).

The sweep runs in a copy of the project (`tools/qa-p29/.qa-run/project`) so no action can write to the
source tree, blanks every outbound credential first, and classifies each answer: `ok`, `gated` (the
role gate fired), `validated` (input refused), `DB-ERROR`, `SERVER-500`, `FATAL` (PHP crash),
`NON-JSON`. PHP warnings are counted separately — they never reach the browser but they are defects.

`api-matrix.mjs` is the counterpart to the sweep: the sweep sends empty payloads (so it sees every
refusal), the matrix performs the real business chain — create a lead, note it, convert it to a client,
quote it, approve the quote, turn it into an invoice, mark it delivered, take a payment and check the
balance — and, for the settings screens, reads the current value, writes a changed one, reads it back
and restores it. It works on its own copy (`.qa-run/matrix`) so the preview's data stays clean.

**Rules:** SQLite mode is for local runs, QA and demos. Hosting stays MySQL — before a release, the
schema and the hot queries still get one pass on MySQL/XAMPP. A translation the layer cannot make
throws with the original SQL attached rather than guessing.

### 10.6 Schema migrations run once per deployment

Every `api/*-lib.php` keeps its tables in a `*_migrate()` (`CREATE TABLE IF NOT EXISTS` plus
`ALTER TABLE … ADD COLUMN` for columns added later). The guard used to be `static $done`, which only
lasts for one request, so on MySQL the app re-ran that DDL on **every request** — wasted metadata
locks and an error log full of swallowed "duplicate column" failures (a sweep measured 2,924
`CREATE TABLE` + 1,319 `ALTER` for 2,795 calls).

Now `mig_skip()` / `mig_done()` (in `api/_lib/db.php`) memoise it in **`_private/schema.json`**, keyed
by the lib file's path + mtime + size + a hash of `db.json`. So:

* a normal request runs **zero** schema statements,
* editing a lib (new table or column) re-runs its migration exactly once,
* pointing `db.json` at a different database re-runs everything once,
* deleting `_private/schema.json` forces every migration to run again — the installer and
  `tools/qa-p29/php-runner.mjs` call `mig_reset()` after creating a database.

If the DDL itself throws, nothing is written for that file, so the next request retries (and the
error is logged, not swallowed). Measured after the change: 40 `CREATE TABLE` (25 of them the
installer) + 9 `ALTER` for 3,144 calls.

---

## 11. Deployment (Hostinger)

1. **Build the zip** — the whole `woodex-live-p29-v2.1-pro/` folder.
2. **Upload** it into `public_html/` and extract **into the top level** (you should see `index.php`,
   `index.html`, `config.php`, `admin/`, `api/` directly inside `public_html/`).
3. **Database** — hPanel → MySQL Databases → create the database and user; phpMyAdmin → Import →
   `woodex-database.sql`.
4. **Config** — two places, both simple:
   * `config.php` — site constants (`APP_NAME`, `SITE_URL`, `ADMIN_EMAIL`) and the `DB_*` defines,
     which read the environment first (`getenv('DB_PASSWORD') ?: '…'`) so a host-level env var wins.
   * `_private/db.json` — what the admin actually connects with. `wx-install.php` writes it from the
     values you type; nothing else has to be edited by hand.
5. **Permissions** — `_private/` must exist and be writable (755 is enough on Hostinger).
6. **First run** — open `/wx-install.php` once: it writes `_private/db.json`, imports the schema and
   creates the Master account. It never deletes anything, so **delete the file when you are done**.
7. **Verify** — the first call to `/wx-audit.php` creates `_private/audit.key` and stops (that is what
   keeps strangers out). Open that file in File Manager, copy the value, then open
   `/wx-audit.php?k=<the value>` — add `&json=1` for machine-readable output. Delete both the file and
   the key when you are finished.
   It is read-only, masks credentials and reports the real database against the real files.
8. **Cron** (optional) — `api/wa-cron.php` for scheduled WhatsApp work; daily for backups.

**Never overwrite `_private/` on an update** — it holds the live tokens, caches and settings, and the
deployed site's configuration is not in the zip. Uploading over the top leaves it intact.

---

## 12. Known gaps and open items

### What is verified

* UI and wiring for all 59 routes + 11 detail views (preview, real files).
* One full money path (invoice create → track → pay) against the API contract.
* Media, redirects and Site health against the **real project files**.
* Static PHP: 44/44 files parse; 366 actions all have exactly one handler; no duplicate `case` labels;
  every `need([...])` uses canonical roles; no action answers with an empty payload.

### What is not verified (and what unblocks it)

| Gap | Unblocked by |
| --- | --- |
| ~~**PHP runtime** — no action has ever executed on this machine~~ | **done** — all 349 actions execute locally via `tools/qa-p29/php-sweep.mjs` (§10.5); see `deliverables/PHP-EXECUTION-REPORT-2026-10-12.md` |
| **MySQL dialect** — the local runs use the SQLite driver, so a MySQL-only difference would not show | one pass on MySQL/XAMPP with the real database |
| **Real records** — ~50 lesser-used screens read the preview's generic stub, so they render but their data is not proven | the owner's SQL dump (§13) |
| **PageSpeed** — Google's API needs outbound HTTP; measured only against a synthetic row | run "Test page" once on the host |
| Invoice print designs | owner decision — invoices print in one design today |
| Section library: 51 blocks vs the 70-block plan | owner decision |
| Template cards: no *copy HTML* / 375-768-1280 preview actions | owner decision |
| Dark-mode palette: DESIGN.md vs the branch's obsidian/cyan plan | owner decision |

### Security items the owner must action (outside the code)

* Rotate the **Telegram bot token** — a literal once leaked into documentation on another branch.
* Rotate the **shared team password** — printed in the deployment guide on that same branch.
* The tree still contains a tracked `.env`, a `config.php` DB-password fallback and a
  `TELEGRAM_BOT_TOKEN` define; move those values to environment variables on the host and treat the
  repo as compromised for them.
* Keep the GitHub repo **private**.

---

## 13. Handover checklist

| # | Item | Owner |
| --- | --- | --- |
| 1 | SQL dump (`phpMyAdmin → Export → SQL`) → Drive link | owner |
| 2 | Run `wx-audit.php` once on the host, send the output | owner |
| 3 | Rotate Telegram token + shared password | owner |
| 4 | Decide: dark palette, section-library count, template actions, invoice designs | owner |
| 5 | Repo made private | owner (or I will, on your word) |
| 6 | Deploy the master zip per §11 | owner |
| 7 | Post-deploy smoke: sign in, one invoice, one page edit, Site health, Telegram | owner + developer |

---

## 14. Glossary

| Term | Meaning |
| --- | --- |
| **Action** | one named API operation, `{"action": "media_upload"}` |
| **Group** | a permission bundle (sales, website, ai…) granted to roles |
| **Builder** | the iframe page editor at `/builder/`, driven by `api/builder.php` |
| **Block / section** | a reusable page section from the section library |
| **Template** | a starter quotation or page, imported from `_templates/` |
| **Store** | a JSON file in `_private/` |
| **Pending change** | a Manager/Developer edit waiting for Master approval |
| **Preview server** | the QA harness's stand-in for PHP+MySQL (§10.1) |
| **Master** | the `owner` role — the only role with the `master` group |

---

*Generated for the Woodex Admin V2.1.1 master project. The three companion files are produced from the
code; this handbook explains them. When the code and this document disagree, the code wins — and the
companions can be regenerated in one command.*
