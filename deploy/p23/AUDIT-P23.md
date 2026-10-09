# WOODEX — Complete project analysis + Hostinger deploy package

**Date:** 2026-10-09 · **Branch:** `arena/83a37223-marketingwoodex`
**Deliverables (this folder):** `deploy/p23/woodex-diploy 23.zip` — 28.6 MB · 641 files · extracts **straight into
`public_html`**, no wrapper folder — plus `deploy/p23/woodex-diploy 23-database.zip` (the SQL, kept **out** of the
web root) and `deploy/p23/README-UPLOAD.md` (the same instructions that ship inside the zip as `DEPLOY-HOSTINGER.md`).

---

## 1. What this repository actually contains

One website, **eight generations of it**, plus planning docs:

| Location | Size | What it is | Deployable? |
|---|---|---|---|
| repo root | ~11 MB | oldest static export: `index.html` (29 KB, v1 markup), 87 page folders, `assets/`, `admin/`, `netlify/`, `vercel.json`, `supabase/` | **no** — static only, `index.html` only, no PHP |
| `frontend-v1/` | 43 MB | the page-builder working copy (V1 builder + `_private/` data) | dev only |
| `wf-admin/` | 13 MB | the old "ready-to-upload" copy from the Vercel/Netlify plan (`UPLOAD-NOTES.md` still says Vercel) | **no** — obsolete |
| `woodex-vlive-P20/` | 70 MB | P20 snapshot | no |
| `woodex-master-P22/` | 28 MB | P22 master + zip + changelog | superseded |
| `woodex-live-p23/` (branch `arena/8a776c65-marketingwoodex`) | 70 MB / 640 files | **P23 = current build: static pages + PHP 8 backend + MySQL** | **yes** ← the one to ship |
| `deploy/*.zip` | 139 MB | 29 release archives, P1 → P26 + `agentbridge.zip` | history |
| `tools/`, `seo-audit/`, `mcp-server/`, `content/`, `docs/` | — | build scripts, SEO crawls, MCP server, block JSON, plans | no |

`woodex-live-p23/` holds 639 files: 145 page folders (each with its own `index.html`),
40 PHP endpoints in `api/`, 66 files in `admin/`, 18 in `builder/`, 287 image files in
`assets/img/`, and `css/js/php/json` totalling ~43 MB. `HOSTINGER-MASTER-PLAN.md` (decision D11) is the governing plan:
**Hostinger only — PHP + MySQL, no Supabase, no Vercel** — and P23 is the implementation of its
phase H7 ("ready-to-upload package").

## 2. Why the live site was misbehaving — 6 real defects in P23

All of these were in the already-uploaded `Woodex Live P23.zip`, not guesses:

| # | Severity | Defect | Effect on the live domain |
|---|---|---|---|
| 1 | **P0** | `index.php` and `config.php` contained **unresolved Git conflict markers** (`<<<<<<< HEAD`, `=======`, `>>>>>>> 7c4e980…`) | PHP parse error → `.htaccess` sets `DirectoryIndex index.php index.html`, so **every request to `/` returned HTTP 500** while deep pages still opened. This is the classic "site half-broken" symptom. |
| 2 | **P0** | `admin/admin.js:286` — orphaned ternary fragment left by a bad conflict resolution (`? '<svg …' : '<svg …'; };` with no `if`) | `SyntaxError: Unexpected token '?'` kills the whole admin bundle → **login button, dashboard, builder all dead** (500 HTML page but a blank admin) |
| 3 | **P1** | `.env` and `js/main.js` also carried conflict markers; `.env` had DB name/user with an empty password, `config.php` hardcoded `u128159657_woodex` | web-readable credentials + a `.env` no PHP could parse; Hostinger's scanner read a broken config |
| 4 | **P1** | `Woodex Live P23.zip` (**28.6 MB**) was stored *inside* the package | after extract: the full site downloadable from the web, plus 28 MB of pointless upload |
| 5 | **P1** | `woodex-database.sql` sat at the web root (and a second copy in `_database/`) | exactly what Hostinger's own instructions warn about — a downloadable database backup |
| 6 | **P1** | `assets/uploads/.htaccess` used `php_flag engine off` | LiteSpeed (Hostinger) rejects `php_flag` in `.htaccess` → **HTTP 500 on `/assets/uploads/*`**, i.e. uploaded media fails to load |
| 7 | P2 | `css/style.css`, `js/main.js`, `includes/config.php` existed but **nothing references them**; no `images/`, no `uploads/` | the folders were stubs created to satisfy a layout check rather than to work |
| 8 | P2 | `sitemap.xml` advertised `/woodex-live-v3/` (does not exist); unlinked dev pages `blocks.html` + `downloads.html` linked `/admin-v3/v3.css` (does not exist) | crawl noise + 404 sub-resources |

Backend health, for contrast, is genuinely good: all 45 other PHP files parse cleanly, the API
(`api/admin.php`, `api/builder.php`, 20-table MySQL schema, `_private/db.json` for credentials,
PHP-session auth, roles, approvals, HMAC builder token) is self-contained and does **not** depend
on the broken root `config.php` — which is why the dashboard could load data even while the
homepage 500'd.

## 3. Fixes applied in build P23.1 (`woodex-diploy 23`)

**Repaired (behaviour preserved, conflict content resolved by reading the code that uses it):**

- `index.php` — rewritten clean: config load that can never fatal, security headers, maintenance
  mode (`_private/maintenance.flag` **or** `system.json → maint.on`, staff cookie `wx_mt` and
  `?asvisitor` bypass, matching `router.php` and Admin → System), `readfile('index.html')`, and a
  useful 503 screen when `index.html` is missing (instead of a blank page) that tells the uploader
  their files are inside a sub-folder.
- `config.php` — rewritten clean: `$db_host/$db_name/$db_user/$db_pass` (Hostinger's expected
  pattern) filled from `_private/db.json` → env → defaults, `ROOT_DIR/PRIVATE_DIR/UPLOADS_DIR/
  IMAGES_DIR/LOGS_DIR`, `SITE_URL`, SMTP + WhatsApp keys, a `getWoodexDB(): ?PDO` helper that
  returns **null** instead of throwing when the DB isn't configured, double-include guard,
  `return [...]` array for procedural callers. **No password in the file.**
- `.env` — clean, real Hostinger DB name/user, password deliberately empty (it belongs in
  `_private/db.json`), SMTP/WhatsApp block, still web-blocked by the dotfile rule.
- `includes/config.php` — now a real bridge to the master config with a safe fallback.
- `admin/admin.js` — orphan fragment deleted → `node --check` clean.
- `admin/index.html` — kept the login form that `admin.js` expects (`#l-pass-toggle`, `#l-forgot`,
  `type="submit"`), removed the duplicate Google-button markup.
- `admin/admin.css` — kept the `.auth-divider` rule the markup uses.
- `js/main.js` — clean loader shim.
- `assets/uploads/.htaccess` + new `uploads/.htaccess` — LiteSpeed-safe PHP-execution block
  (`FilesMatch … Require all denied`, no `php_flag`).
- `google0b104c3cfb7a4943.html` — one line, so Search Console verification keeps working.

**Hostinger structure (their checklist, satisfied):**

- **flat**: `index.php`, `index.html`, `.htaccess`, `config.php` at the **root of the zip** →
  extracting in `public_html` leaves no `woodex-live-p23/` wrapper (verified: every zip entry is a
  site path, none is `woodex-diploy 23/…`).
- `css/` + `js/` are now **functional** (`css/style.css` imports the real stylesheets instead of one).
- **new `images/` and `uploads/`** folders, wired by alias rules in `.htaccess`:
  `/images/x.webp → /assets/img/x.webp`, `/uploads/x.jpg → /assets/uploads/x.jpg` (only when the
  file is not really there). Both layouts work, and the 6,944 `/assets/img/` references and the
  media-URL rows already stored in MySQL stayed untouched — no risky global rewrite.
- `includes/config.php`, `admin/`, `api/`, `assets/`, `uploads/` all present as in Hostinger's example.
- `_database/`, `_private/`, `_templates/` are blocked twice: their own `Require all denied`
  **and** `RewriteRule ^_database(/|$) - [F,L]` in the root `.htaccess` (hidden files are what
  extraction usually loses).
- `robots.txt` now disallows `/_private/`, `/_database/`, `/_templates/`, `wx-install.php`, `wx-demo.php`.
- Removed from the package: the nested 28.6 MB zip, the root `woodex-database.sql`, the unlinked
  dev pages `blocks.html` / `downloads.html`. Dead `/woodex-live-v3/` entry dropped from `sitemap.xml`.
- `DEPLOY-HOSTINGER.md` added at the site root — the exact hPanel steps (upload → DB → connect →
  PHP settings → cron → lock-down → DNS → troubleshooting table).
- The database ships **separately** (`woodex-diploy 23-database.zip`) with a README: per Hostinger's
  own instruction the `.sql` must not live inside `public_html`. Both dumps were checked: 20 InnoDB
  tables, no `CREATE DATABASE`/`USE`/`DROP TABLE` → safe to import into a fresh DB; the schema
  matches `migrate()` in `api/admin.php` table-for-table.

## 4. Final structure inside `woodex-diploy 23.zip`

```
public_html/                     ← the zip root IS public_html
├── index.php   index.html   .htaccess   config.php   .env
├── includes/config.php          ← bridge → ../config.php
├── css/style.css                ← @import of the real design sheets
├── js/main.js                   ← runtime shim
├── images/ uploads/               ← new convention folders, aliased to /assets/img and /assets/uploads
├── assets/                      ← site-p21.css, v1-p21.css, theme.css, site.js, fonts/, img/, uploads/, js/
├── admin/                       ← 66 files: dashboard v2.5 (login, CRM, quotes, invoices, chat, users)
├── builder/                     ← block/page builder UI
├── api/                         ← 40 PHP endpoints + cacert.pem (admin, builder, chat, crm, sales, seo, whatsapp, mcp…)
├── 145 page folders             ← about/, lahore/, insights/*/, projects/*, services/, estimator/ …
├── _database/                   ← woodex-v20.sql + woodex-database.sql for /wx-install.php (delete after install)
├── _private/                    ← db.json, sessions, logs, backups  (must be writable, 755)
├── _templates/                  ← quotation/page/chat starter JSON
├── 404.html 500.html 503.html coming-soon.html robots.txt sitemap.xml llms.txt favicon.ico
├── wx-check.php  wx-install.php  wx-demo.php     ← run once, then delete
└── DEPLOY-HOSTINGER.md
```

Hostinger's checklist mapped: entry file `index.php` directly in `public_html` ✔ · `.htaccess` ✔ ·
`assets/` ✔ · `css/` `js/` `images/` `uploads/` ✔ · `includes/config.php` ✔ · `admin/` `api/` ✔ ·
database imported separately, `.sql` not left publicly readable ✔ · config uses **Hostinger** values
(read from `_private/db.json`) ✔

## 5. Verification run on the package (not on faith)

| Check | Tool | Result |
|---|---|---|
| PHP syntax, all 47 `.php` | `php-parser` (real PHP 7/8 grammar) | **0 failures** |
| JS syntax, all 87 `.js` | `node --check` | **0 failures** |
| Conflict markers, all 641 files | regex scan | **0** |
| Reference integrity (`href`/`src`/`poster`) | custom scanner over 200 HTML/PHP files | **13,941 refs → 0 missing** (was 2) |
| `sitemap.xml` locatable | resolved all `<loc>` against the tree | **144/144 valid** (was 145 with 1 dead) |
| Structure | zip entry audit | flat, `index.php` at root, no wrapper folder |
| Round-trip | unzip → `diff -r` against the built tree | **identical**, lint re-run clean |
| Secrets | scan of shipped `.env`, `config.php` | no passwords/keys; DB password only ever in `_private/db.json` |

Not verified here (no PHP binary in this sandbox): live HTTP responses. `wx-check.php` is included
for that first 60 seconds after upload.

## 6. Upload — short version (full detail in `DEPLOY-HOSTINGER.md` inside the zip)

1. hPanel → File Manager → `public_html` → upload `woodex-diploy 23.zip` → **Extract** (Overwrite,
   "Show hidden files" on). `index.php` must sit **directly** in `public_html`; if it landed in a
   folder, move the contents up.
2. Databases → create MySQL DB `woodex` + user + password (→ `u128159657_woodex`), host `localhost`.
3. Import `woodex-database.sql` from `woodex-diploy 23-database.zip` in phpMyAdmin — **or** skip it,
   step 4 creates the tables.
4. Open `https://woodex.com.pk/wx-install.php`, enter the four DB values + your owner name/email/
   password → writes `_private/db.json`, creates 20 tables + your login.
5. `https://woodex.com.pk/wx-check.php` → all green (PHP 8.2, `pdo_mysql, mbstring, curl, zip,
   fileinfo`, `_private` writable).
6. `/admin/` → sign in → edit a page → Publish → live instantly.
7. Two cron jobs (`api/wa-cron.php?key=…` every 5 min, `api/admin.php?action=cron` every 30 min),
   then **delete `wx-install.php`, `wx-demo.php`, `_database/`** and keep the DB zip off the server.

## 7. Left for you to decide (deliberately not changed)

- **The repo has 8 parallel copies of the site.** Pick one canonical source (suggested:
  `woodex-live-p23/` = P23) and delete/archive `wf-admin/`, `woodex-vlive-P20/`,
  `woodex-master-P22/`, `frontend-v1/` + the 29 old zips (139 MB) — every one of them can be
  uploaded by mistake, which is how a 29 KB static `index.html` ended up next to a 130 KB one.
- Repo-root `vercel.json`, `netlify.toml`, `supabase/`, `mcp-server/` are dead on Hostinger (D11).
- `api/admin.php?action=cron` is unauthenticated by design (it only runs due tasks and answers with
  counts) — fine, but worth knowing.
- `wx-demo.php` seeds 4 demo logins behind the DB password; delete it with `wx-install.php`.
- The builder writes to `assets/uploads/` while the Hostinger-style folder is `uploads/` — the alias
  hides that today; if you ever want one physical location, that is a small follow-up job.
- Consider serving the 150 pages from the DB-rendered HTML only (H5 in the master plan) — today the
  pages are real files, so an empty database still shows the whole site.
