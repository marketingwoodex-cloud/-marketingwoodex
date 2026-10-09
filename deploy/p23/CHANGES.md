# P23 — Changes made while building `woodex-diploy 23.zip`

Source: `woodex-live-p23/` on branch `arena/8a776c65-marketingwoodex` (commit `b5dd09d`).
Full patch: [`P23-FIXES.diff`](./P23-FIXES.diff) — 16 files, 949 lines.

## A. Removed from the package

| Item | Why |
|---|---|
| `Woodex Live P23.zip` (28.6 MB) | A ZIP must not be shipped inside the deploy ZIP; it was also being uploaded into `public_html`. |
| `woodex-database.sql` (web root copy) | Database dumps must not sit in the document root. Kept in `_database/` (web-blocked) and moved to `_DO-NOT-UPLOAD_database/` for the phpMyAdmin import. |

## B. Merge-conflict markers resolved (7 files)

| File | Resolution |
|---|---|
| `index.php` | Rewritten as one clean gateway: PHP 7.4 shim → `config.php` → maintenance mode (proper `503` + `Retry-After`) → security headers → `/api/` pass-through → home → pretty URLs (`/slug/` → `slug/index.html`, `/slug.html`, static file with MIME map) → `404.html`. Added path-traversal, dotfile and `_private/_database/_templates` guards that the conflicted versions lacked. Removed `declare(strict_types=1)` + `str_starts_with()` so the file also runs on PHP 7.4. |
| `config.php` | Rewritten: Hostinger's standard `$db_host/$db_name/$db_user/$db_pass`, `_private/db.json` override, environment-variable override, `DB_*`/`SITE_*`/`APP_*` constants (all `if (!defined())`-guarded because `api/*.php` declare their own `ROOT_DIR`), guarded path constants, `MAINTENANCE_MODE`, lazy `getWoodexDB(): ?PDO` + `woodexDbOnline()`. Deliberately does **not** define `ROOT_DIR` unconditionally. |
| `.env` | One clean block (app, Hostinger MySQL, mail/WhatsApp). Still web-blocked by `.htaccess`. |
| `js/main.js` | Kept the runtime comment + the load log; markers removed (`SyntaxError` gone). |
| `google0b104c3cfb7a4943.html` | Single verification line restored → Search Console verification works again. |
| `admin/admin.css` | Kept the `.auth-divider` rule, markers removed. |
| `admin/index.html` | Merged both sides: accessible `<label for>` markup and `id="l-pass-toggle"` (**required** by `admin.js:265`) from one side, `hidden` on `#login-form` (`admin.js:showAuth()` un-hides it, prevents a flash) and `type="submit"` from the other. Page-builder password placeholders no longer echo a real password. |

## C. Code defects fixed

| File | Fix |
|---|---|
| `admin/admin.js` | Removed the orphaned `? '<svg…>' : '<svg…>'; };` fragment at line 286 left by the merge → `SyntaxError: Unexpected token '?'` was killing **all 61** admin scripts. The duplicated `oninput` handlers directly above it went too (they are repeated below). The password "eye" toggle at line 265 is untouched. |
| `admin/admin.js` | Removed the two blocks that auto-filled `admin@woodex.pk` / `developer@woodex.pk` + their shared plaintext password into the login form on "Continue with Google"/GitHub. The earlier `#l-soc-google` handler (real Google Identity widget in `#g-btn`) now wins. `#l-soc-github` does not exist in the markup, so that block was dead code. |
| `downloads.html` | Removed the published master e-mail + password (page is in `sitemap.xml`); replaced with the current 5-step Hostinger procedure and the new ZIP name. `/admin-v3/v3.css` → `/assets/v3-blocks.css`. |
| `blocks.html` | `/admin-v3/` → `/admin/`, `/admin-v3/#/builder` → `/builder/`. |

## D. Hostinger-specific hardening

| File | Fix |
|---|---|
| `assets/uploads/.htaccess` | Bare `php_flag engine off` **500s on LiteSpeed + PHP-FPM** (Hostinger's stack) and would have broken every uploaded image and chat attachment. Now: `php_flag` wrapped in `<IfModule mod_php.c>` / `<IfModule mod_php7.c>`, plus `Options -Indexes -ExecCGI`, `RemoveHandler`, `RemoveType`, `FilesMatch` deny for scripts and for uploaded `html/svg/js/xml` (stored-XSS), plus an Apache 2.2 fallback. |
| `.htaccess` (root) | Rewritten header, managed admin block preserved **byte-for-byte**. Added: deny `_database/`, `_templates/`, `_DO-NOT-UPLOAD_database/`; deny `.sql .sql.zip .zip .tar .gz .bak .old .md .env db.example.json` and all `*-lib.php` / `router.php` / `error_log`; Apache 2.2 fallbacks; `ErrorDocument 500/503`; `ServerSignature Off`; `Header unset X-Powered-By`; `no-cache` for HTML/PHP; `mod_expires` for images/fonts/css/js. Verified against `api/admin.php::publish_rules()`'s regex so the admin panel cannot wipe the header. |
| `uploads/` (new) | Hostinger checklist folder. Alias: `RewriteRule ^(.*)$ /assets/uploads/$1 [L]` — the code writes to `/assets/uploads/` (`api/builder.php`, `api/media-lib.php`, `api/chat-lib.php`), so no second storage location is introduced. PHP execution denied. |
| `images/` (new) | Same idea → `/assets/img/`, where the 274 real images live. PHP execution denied. |

## E. Database dumps

| File | Fix |
|---|---|
| `_database/woodex-database.sql` | `ON DUPLICATE KEY UPDATE pass_hash=VALUES(pass_hash), active=1` → `ON DUPLICATE KEY UPDATE active=1`. Re-importing the dump can no longer reset live admin passwords. Comment that printed the shared seed password replaced with a rotate-on-day-one warning. |
| `_database/woodex-v20.sql` | Same change for the seeded `admin`/owner row (`role='owner', active=1` kept). `wx-install.php` strips this clause before executing, so the installer behaves identically. |
| `_DO-NOT-UPLOAD_database/` (new) | `00-READ-FIRST-HOSTINGER.txt` (full guide), `woodex-database.sql`, `woodex-database.sql.zip` (phpMyAdmin accepts both), `woodex-v20.sql`, and a deny-all `.htaccess` in case the folder is extracted into `public_html` by mistake. |

## F. Validation run on the finished ZIP

```
merge-conflict markers      0
PHP files (AST parse)       47 / 47 OK
JS files (node --check)     87 / 87 OK
HTML local references       14,024 checked · 0 missing   (was 2)
JSON files                  9 / 9 valid
.htaccess files             8 / 8 tag-balanced
plaintext passwords         0   (only bcrypt hashes in the SQL seed)
zip entries                 810 · no wrapper folder · index.php at root
```

## G. Not changed (needs a product decision) — see `AUDIT-P23.md` §5

`/woodex-live-v3/` in `sitemap.xml` (dead URL) · `/services/` in the sitemap but 301-redirected by
the admin block · `downloads.html` public with internal GitHub ZIP links ·
`admin/features.html` + `admin/master-components.html` readable without login · 6 seeded accounts
sharing one password hash · `wx-install.php` / `wx-check.php` / `wx-demo.php` publicly reachable ·
`.env` in the web root · 696 KB `assets/site-p21.css`, 888 KB `html2pdf.bundle.min.js`,
552 KB `builder/vendor/icons.json` · 1.8 MB of originals in `assets/img/_orig/`.
