# Woodex — Complete Project Audit (P23)

**Date:** 2026-10-09
**Source analysed:** `woodex-live-p23/` on branch `arena/8a776c65-marketingwoodex` (commit `b5dd09d`), plus the whole repository at `782b50b`.
**Deliverable produced:** `deploy/p23/woodex-diploy 23.zip` — Hostinger-ready, entry files at the ZIP root.

---

## 1. What this project actually is

Woodex Architecture & Luxury Interior (`woodex.com.pk`) is **not** a WordPress site and **not** a static
site either — it is a hybrid:

| Layer | Technology | Where |
|---|---|---|
| Public pages | Hand-built static HTML (153 pages) | 91 top-level folders |
| Entry point | `index.php` gateway + `.htaccess` | web root |
| Backend | Plain PHP 7.4–8.3, no framework, no Composer | `api/` (43 endpoints) |
| Database | MySQL / MariaDB, 20 `wx_*` tables via PDO | `_database/*.sql` |
| Fallback store | JSON files (`db.json`, `pages.json`, `config.json`, `activity.jsonl`) | `_private/` |
| Admin | Single-page app, vanilla JS, 61 modules | `admin/` |
| Page builder | Drag-drop builder that writes the HTML files | `builder/` + `api/builder.php` |
| Media | 274 images in `assets/img`, uploads to `assets/uploads` | `assets/` |

**Key architectural fact:** the live pages are generated HTML files on disk. MySQL holds leads, CRM,
quotes, invoices, bookings, chats, users and settings. So the site still renders if MySQL is down —
only the admin panel and the forms stop working. That is why `index.php` + `config.php` matter for
Hostinger's "is this a database website?" check, while the pages themselves stay static and fast.

### Size of the shipped package
```
645 files · 166 folders · 43 MB uncompressed · 28.6 MB zipped
153 HTML · 47 PHP · 87 JS · 9 CSS · 274 images
```

### Content inventory
```
 91 top-level folders      56 service / design pages (interior-design, kitchen-design,
                                           office-fit-out, retail-design, …)
 12 city pages             lahore, karachi, islamabad, rawalpindi, faisalabad, multan,
                           gujranwala, sialkot, hyderabad, peshawar, quetta, bahawalpur
  8 Lahore area pages      dha, bahria-town, gulberg, model-town, johar-town, cantt,
                           lake-city, wapda-town
 48 insight articles       cost guides, checklists, material & lighting guides
  6 project case studies   courtyard-house, office-floor, clinic-fit-out, …
145 sitemap URLs
```

### Backend surface (`api/`)
`admin.php` (52 KB, auth/users/roles/dashboard/redirects/SEO), `builder.php` (page save/backup/
upload/theme), `forms.php` (leads + honeypot + Turnstile), `chat.php` + `chat-lib.php` (42 KB live
chat with attachments), `mcp.php` (28 KB Model-Context-Protocol endpoint for AI agents),
`whatsapp.php` / `wahub-lib.php` / `wa-cron.php` (WhatsApp Cloud API), `telegram.php` / `tg-lib.php`,
`sales-lib.php` + `sales17-lib.php` (quotes & invoices, 77 KB), `crm-lib.php`, `booking-lib.php`,
`media-lib.php`, `seo-lib.php`, `seo-agent-lib.php`, `social-lib.php`, `security-lib.php`,
`notify-lib.php`, `redirects-lib.php`, `roles-lib.php`, `approvals-lib.php`, plus P18/P19 module libs.

All `*-lib.php` files are blocked from direct web access by `.htaccess` and are only reachable
through their front controller. Every one of them carries a PHP 7.4 shim for
`str_starts_with / str_ends_with / str_contains`, so the code runs on PHP 7.4 → 8.3.

---

## 2. Blocking defects found (all fixed in this package)

### 🔴 D1 — Unresolved Git merge-conflict markers in 7 files
The previous packaging commit was merged badly and the conflict markers were shipped inside the
files. Two of them are fatal:

| File | Impact |
|---|---|
| `index.php` | **PHP parse error → blank page / HTTP 500 on every request.** 4 nested conflict blocks. |
| `config.php` | **PHP parse error.** 3 nested conflict blocks. No database connection possible. |
| `.env` | Garbage lines; two contradictory APP_NAME/DB blocks. |
| `js/main.js` | `SyntaxError: Unexpected token '<<'`. |
| `admin/index.html` | Login form rendered twice, one copy without the `#l-pass-toggle` id that `admin.js` requires. |
| `admin/admin.css` | Stray markers inside the auth stylesheet. |
| `google0b104c3cfb7a4943.html` | Search Console verification file corrupted → verification fails. |

This is the reason the live site "only had index.html working": `index.php` could not execute at all.

### 🔴 D2 — `admin/admin.js` had a broken statement (whole admin dashboard dead)
Line 286 contained an orphaned ternary left behind by the same merge:
```js
        ? '<svg …eye-off…>'
        : '<svg …eye…>';
    };
  }
```
`node --check` → `SyntaxError: Unexpected token '?'`. Because `admin/index.html` loads **61 scripts**
and `admin.js` is the core, one parse error disabled the entire dashboard (no nav, no login, no
views). Removed the fragment; the password "eye" toggle it duplicated is still wired at line 265
(`var eye = $("#l-pass-toggle")`), and that is exactly why the `#l-pass-toggle` id had to be kept in
the `admin/index.html` merge.

### 🔴 D3 — Plaintext admin credentials published to visitors
* `admin/admin.js` auto-filled `admin@woodex.pk` + its password into the login form when
  "Continue with Google" was clicked. Anyone could read the password from a public JS file.
  → Removed. The button now hands over to the real Google Identity Services widget in `#g-btn`.
* `downloads.html` printed the master e-mail + password on a **public page listed in sitemap.xml**.
  → Replaced with deployment steps.
* `admin/index.html` used the same password as the `placeholder` of the page-builder password field.
  → Neutral placeholder.
* Both SQL dumps contained `ON DUPLICATE KEY UPDATE pass_hash=VALUES(pass_hash)`, so **re-importing
  the dump silently reset every live admin password** back to the seeded one.
  → Changed to `ON DUPLICATE KEY UPDATE active=1` (schema/data still upsert, hashes are never
  overwritten). `wx-install.php` already stripped that clause, so the installer is unaffected.

### 🔴 D4 — `assets/uploads/.htaccess` would 500 on Hostinger
It used a bare `php_flag engine off`. Hostinger serves PHP through **LiteSpeed + PHP-FPM**, where
`php_flag`/`php_value` in `.htaccess` is not recognised → *every* request inside that folder returns
`500 Internal Server Error`, i.e. all uploaded images and chat attachments break.
→ Wrapped in `<IfModule mod_php.c>` / `<IfModule mod_php7.c>` and backed by `RemoveHandler`,
`RemoveType` and `FilesMatch … Require all denied` rules that work on both mod_php and PHP-FPM.

### 🟠 D5 — Database dump sitting in the web root
`woodex-database.sql` was a direct child of the site root (the exact thing Hostinger warns about).
→ Deleted from the root. The dump now lives only in `_database/` (web-blocked, needed by
`wx-install.php`) and in `_DO-NOT-UPLOAD_database/` for the phpMyAdmin import.

### 🟠 D6 — A 28 MB ZIP inside the deploy folder
`woodex-live-p23/Woodex Live P23.zip` (28.6 MB) was inside the website tree, so it was both
uploaded to `public_html` and shipped inside the next ZIP. → Removed from the package.

### 🟠 D7 — Two broken local links
Out of **14,024** local `src`/`href` references checked, exactly two were dead:
`blocks.html` → `/admin-v3/`, `/admin-v3/#/builder`; `downloads.html` → `/admin-v3/v3.css`.
`/admin-v3/` does not exist in this package. → Repointed to `/admin/`, `/builder/`,
`/assets/v3-blocks.css`. Result: **0 missing references**.

---

## 3. Hostinger structure compliance

| Hostinger requirement | Status |
|---|---|
| Entry file directly inside `public_html` | ✅ `index.php` is at the ZIP root — no wrapper folder |
| `index.php` present for a database website | ✅ gateway: config → maintenance → headers → `/api/` → page → 404 |
| `.htaccess` present | ✅ rewritten & hardened (managed admin block preserved byte-for-byte) |
| `config.php` with `$db_host/$db_name/$db_user/$db_pass` | ✅ exact Hostinger variable names + `_private/db.json` override + env vars |
| `includes/config.php` | ✅ bridge that loads `../config.php` |
| `admin/`, `api/`, `assets/`, `css/`, `js/` | ✅ all present |
| `uploads/` | ✅ added as a safe alias → `/assets/uploads/` (where the code really writes) |
| `images/` | ✅ added as a safe alias → `/assets/img/` (where the 274 images really live) |
| Database **not** inside the website folders | ✅ `_DO-NOT-UPLOAD_database/` (+ `.sql` and `.sql.zip` for phpMyAdmin) |
| No `.sql` publicly reachable | ✅ root `.htaccess` denies `.sql .sql.zip .zip .tar .gz .bak .old .md .env`, `_private/ _database/ _templates/`, and all dotfiles |

The `# BEGIN WOODEX-ADMIN … # END WOODEX-ADMIN` markers in `.htaccess` were preserved exactly, and
verified against the regex `api/admin.php::publish_rules()` uses
(`~\n?# BEGIN WOODEX-ADMIN.*?# END WOODEX-ADMIN\n?~s`) — the 3,383-byte hand-written header survives
every admin republish.

---

## 4. Validation performed on the finished ZIP

| Check | Result |
|---|---|
| Merge-conflict markers in the extracted ZIP | **0** |
| PHP syntax (AST parse of every file) | **47 / 47 OK** |
| JavaScript syntax (`node --check`) | **87 / 87 OK** |
| HTML local references (14,024) | **0 missing** |
| JSON validity | **9 / 9 OK** |
| `.htaccess` tag balance (8 files) | **all balanced** |
| Admin-managed `.htaccess` block integrity | **markers unique, regex re-simulated OK** |
| Plaintext passwords in shipped code | **0** (only bcrypt hashes in the SQL seed) |
| ZIP entries / wrapper folder | **810 entries, none at root level** |

> No PHP interpreter exists in this sandbox, so the gateway could not be executed live. Static AST
> parsing plus a manual trace of every branch was used instead. On the server, open
> `https://your-domain/wx-check.php` — it reports PHP version, extensions, DB connection, table
> count, folder writability and the last PHP errors, each with the exact hPanel path to fix it.

---

## 5. Remaining issues — reported, deliberately NOT changed

These need a product decision, so they were left alone:

1. **`sitemap.xml` lists `https://woodex.com.pk/woodex-live-v3/`** — no such folder exists (1 of 145
   URLs). Remove the line, or the admin panel will regenerate it as long as the page is in
   `_private/pages.json`.
2. **`/services/` is in the sitemap but `.htaccess` 301-redirects it to `/interior-design/`**
   (inside the admin-managed block). A sitemap URL that redirects wastes crawl budget — either drop
   it from the sitemap or drop the redirect.
3. **`downloads.html` is public and in the sitemap** and links to internal GitHub release ZIPs
   (`woodex-master-P22.1.zip`, 28 MB). Decide whether that page should be public at all; it is a
   deployment artefact, not a marketing page.
4. **`admin/features.html` and `admin/master-components.html`** are static documentation inside
   `/admin/` and are readable without signing in. Move them to `_templates/` or delete them.
5. **The seeded `wx_users` rows share one bcrypt hash** for all 6 accounts (2 of them `owner`).
   Rotate every password on day one — the hash has been circulating in ZIPs and Git history.
6. **`wx-install.php`, `wx-check.php`, `wx-demo.php` are publicly reachable.** They are
   rate-limited/noindex and require the DB password, but they should be deleted after go-live.
7. **`.env` in the web root.** Blocked twice over by `.htaccess`, but it adds nothing at runtime
   (PHP does not read it) — safe to delete once `config.php`/`_private/db.json` hold the values.
8. **Performance:** `assets/site-p21.css` is 696 KB and `admin/vendor/html2pdf.bundle.min.js` is
   888 KB. Splitting the CSS per template and lazy-loading html2pdf only on quote/print screens
   would be the biggest PageSpeed win. `builder/vendor/icons.json` is 552 KB.
9. **`assets/img/_orig/` (1.8 MB)** stores pre-compression originals inside the web root. Keep them
   in the repo, not on the server.
10. **Repository hygiene:** the repo root also holds `frontend-v1/` (43 MB), `wf-admin/` (13 MB),
    `tools/` (11 MB), `woodex-master-P22/` (28 MB), `woodex-vlive-P20/` (70 MB) and `deploy/`
    (139 MB of historical ZIPs). None of it is part of the live site. Only `woodex-live-p23/` was
    used as the source for this package.

---

## 6. Files in this folder

```
deploy/p23/
├── woodex-diploy 23.zip     ← upload THIS to public_html (28.6 MB, 810 entries)
├── README-UPLOAD.md         ← Hostinger step-by-step
├── AUDIT-P23.md             ← this analysis
├── CHANGES.md               ← every change, file by file
└── P23-FIXES.diff           ← exact unified diff vs woodex-live-p23/ (16 files, 949 lines)
```

Inside the ZIP there is also `_DO-NOT-UPLOAD_database/00-READ-FIRST-HOSTINGER.txt` — the same
guide in plain text, plus `woodex-database.sql` and `woodex-database.sql.zip` for phpMyAdmin.
