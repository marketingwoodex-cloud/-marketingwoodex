# `woodex-diploy 23.zip` — Hostinger upload guide

**Upload this file:** `deploy/p23/woodex-diploy 23.zip` (28.6 MB · 810 entries)
Extracting it inside `public_html` puts `index.php` **directly** in `public_html` — there is no
wrapper folder, so nothing has to be moved afterwards.

```
public_html/
├── index.php              ← entry file (Hostinger recognises PHP + MySQL)
├── index.html             ← home page markup, served by index.php
├── .htaccess              ← HTTPS, canonical host, 301s, security, caching
├── config.php             ← DATABASE CONFIG (edit this, or run wx-install.php)
├── includes/config.php    ← loads ../config.php
├── router.php             ← local testing only (php -S localhost:8000 router.php)
├── 404.html 500.html 503.html coming-soon.html
├── favicon.ico robots.txt sitemap.xml llms.txt google0b104c3cfb7a4943.html
├── wx-install.php wx-check.php wx-demo.php   ← delete after go-live
├── admin/       Admin v2.5 Pro (61 JS modules + vendor)
├── api/         43 PHP endpoints (admin, builder, forms, chat, mcp, whatsapp…)
├── assets/      img/ (274 images) · uploads/ · css · js · fonts · data
├── builder/     live page builder
├── css/ js/     site-level style.css and main.js
├── images/      alias → /assets/img/        (Hostinger checklist)
├── uploads/     alias → /assets/uploads/    (Hostinger checklist)
├── _private/    db.json, pages.json, backups   — web-blocked
├── _database/   SQL used by wx-install.php     — web-blocked
├── _templates/  JSON templates                 — web-blocked
├── + 87 page folders (about, contact, lahore, insights, projects, 56 services…)
└── _DO-NOT-UPLOAD_database/   ← import into MySQL, then delete. NOT a website folder.
      ├── 00-READ-FIRST-HOSTINGER.txt
      ├── woodex-database.sql
      ├── woodex-database.sql.zip
      └── woodex-v20.sql
```

---

## Step 1 — Upload the website files

1. hPanel → **Files → File Manager** → open `public_html`.
2. Settings → turn **ON "Show hidden files"** — otherwise `.htaccess`, `.env` and
   `_private/.htaccess` are not extracted and the security rules are lost.
3. Upload `woodex-diploy 23.zip` into `public_html`.
4. Right-click → **Extract** → target `/public_html` → confirm.
5. Verify: `public_html` must contain `index.php`, `index.html`, `.htaccess`, `config.php`,
   `admin/`, `api/`, `assets/` **directly**.
   * ❌ `public_html/woodex-diploy 23/index.php`
   * ✅ `public_html/index.php`
   If a wrapper folder appeared, open it, select all, move the contents up one level.
6. Delete the ZIP from `public_html`.
7. Permissions: folders `755`, files `644`. `_private/` must be **writable** — the admin panel
   stores `db.json`, page metadata and backups there.

## Step 2 — Create the database

1. hPanel → **Websites → Dashboard → Databases → Management**.
2. Create a MySQL database + user + password. Hostinger prefixes them: `u128159657_woodex`.
3. Note all four values (name, user, password, host = `localhost`).
4. Open **phpMyAdmin** for that database → **Import** → choose
   `_DO-NOT-UPLOAD_database/woodex-database.sql` (or the `.sql.zip`) → **Start import**.
   14 KB, far below the 256 MB phpMyAdmin limit — SSH is not needed.
   20 tables are created: `wx_users wx_activity wx_settings wx_throttle wx_leads wx_lead_notes
   wx_clients wx_notify_log wx_wa_seen wx_templates wx_quotes wx_invoices wx_projects wx_chats
   wx_chat_msgs wx_bookings wx_ai_events wx_ai_unans wx_tg_seen wx_tg_map`.

## Step 3 — Connect the site to the database

**(a) Easiest — run the installer once**
`https://your-domain/wx-install.php` → enter host / name / user / password + your owner name,
e-mail and a password of 8+ characters → **Install**. It writes `_private/db.json` (web-blocked),
creates any missing table and creates your owner login. Then **delete `wx-install.php`**.

**(b) Manually — edit `public_html/config.php`**
```php
$db_host = "localhost";
$db_name = "u128159657_woodex";   // your real Hostinger value
$db_user = "u128159657_woodex";   // your real Hostinger value
$db_pass = "your_password";       // your real Hostinger value
```
Use the Hostinger values, **not** the old provider's. `config.php` reads `_private/db.json` first,
so if the installer already ran you do not have to touch `config.php` at all. Environment variables
set in hPanel (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) override both.

## Step 4 — PHP version and extensions

hPanel → **Advanced → PHP Configuration** → **PHP 8.2** (8.0+ required by the admin API; the code
ships a 7.4 shim) → extensions: `pdo_mysql mbstring curl json zip openssl fileinfo gd` → Save.

## Step 5 — Verify

| URL | Expected |
|---|---|
| `/` | home page (`index.php` → `index.html`) |
| `/admin/` | admin sign-in |
| `/interior-design/` | a page folder |
| `/insights/` | blog index (48 articles) |
| `/wx-check.php` | PHP version, extensions, DB connection, tables, permissions, last errors |
| `/sitemap.xml` | 145 URLs |
| `/_private/` | **403** |
| `/_database/woodex-database.sql` | **403** |
| `/.env` | **403** |

## Step 6 — Security, same day

1. `/admin/` → **My security** → change **every** seeded password. The dump seeds all team accounts
   with one shared password; treat it as public (it lived in ZIPs and Git history).
2. Delete `wx-install.php`, `wx-check.php`, `wx-demo.php`.
3. Delete `_DO-NOT-UPLOAD_database/` from `public_html` if you extracted it. Never leave a `.sql`
   backup publicly reachable.
4. Keep `_private/.htaccess`, `_database/.htaccess`, `_templates/.htaccess`,
   `assets/uploads/.htaccess` in place.
5. Do not edit anything between `# BEGIN WOODEX-ADMIN` and `# END WOODEX-ADMIN` in `.htaccess` —
   `api/admin.php` rewrites that block (redirects, maintenance mode, drafts, error documents).
6. Enable 2FA for the owner account.

---

## What was repaired while building this package

See `AUDIT-P23.md` §2 for detail and `P23-FIXES.diff` for the exact patch. Headlines:

* **7 files contained unresolved Git merge-conflict markers** — `index.php` and `config.php` had a
  PHP parse error, so the site returned a blank page / HTTP 500 on every request. All merged clean.
* **`admin/admin.js` had a broken statement** (`SyntaxError`) that killed all 61 admin scripts.
* **Plaintext admin password** was published in `admin/admin.js`, `downloads.html` and as a form
  placeholder — removed. Both SQL dumps no longer overwrite existing password hashes on re-import.
* **`assets/uploads/.htaccess` used `php_flag`**, which 500s on Hostinger's LiteSpeed + PHP-FPM and
  would have broken every uploaded image.
* **`woodex-database.sql` removed from the web root**, and a **28 MB nested ZIP** removed from the
  package.
* **2 broken links** (`/admin-v3/…`) fixed → 0 missing references out of 14,024 checked.
* **`uploads/` and `images/`** added as safe aliases to the real `/assets/uploads/` and
  `/assets/img/`, so the folder layout matches the Hostinger checklist.

Validation on the finished ZIP: 47/47 PHP files parse · 87/87 JS files parse · 0 conflict markers ·
0 broken local references · 9/9 JSON valid · all `.htaccess` balanced · 0 plaintext passwords.
