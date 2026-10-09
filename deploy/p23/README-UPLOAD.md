# WOODEX — Hostinger upload instructions (build P23.1 · flat `public_html` layout)

**Website:** `woodex-diploy 23.zip` (27.3 MB · 640 files · extracts straight into `public_html`)
**Database:** `woodex-diploy 23-database.zip` — `woodex-database.sql` (20 tables + starter data),
`woodex-v20.sql` (tables only), `00-verify-import.sql`, `01-security-cleanup.sql`, `README-IMPORT.txt`.
Single-file variant `woodex-database.sql.zip` is also fine for phpMyAdmin (it unzips on import).
**Site:** https://woodex.com.pk · **Stack:** PHP 8.2 + MySQL + Apache/LiteSpeed (no Node, no Vercel, no Supabase)

---

## 0. Structure you must end up with

`index.php` and every folder sit **directly inside `public_html`** — no `woodex-live-p23/` wrapper.

```
public_html/
├── index.php              ← entry point (serves the homepage, maintenance mode)
├── index.html             ← the homepage markup itself
├── .htaccess              ← HTTPS force, 31 redirects, security, caching
├── config.php             ← master config (reads _private/db.json)
├── .env                   ← environment values (blocked from the web)
├── includes/
│   └── config.php         ← bridge for code that expects includes/config.php
├── css/  js/  images/  uploads/      ← Hostinger convention folders
├── assets/                ← site CSS/JS/fonts + img/ (images) + uploads/ (media library)
├── admin/                 ← admin dashboard (v2.5)
├── builder/               ← page builder UI
├── api/                   ← PHP backend (admin.php, builder.php, chat, crm, …)
├── _database/             ← SQL for the installer (web-blocked; delete after install)
├── _private/              ← db.json, sessions, logs, backups (web-blocked, must be writable)
├── _templates/            ← starter quotation/page templates (web-blocked)
├── 404.html 500.html 503.html coming-soon.html
├── robots.txt  sitemap.xml  llms.txt  favicon.ico
└── wx-check.php  wx-install.php  wx-demo.php   ← helpers, delete after setup
```

`/images/x.webp` and `/uploads/x.jpg` are aliased to `/assets/img/` and `/assets/uploads/`,
so both folder conventions work — nothing inside the 150 pages had to be rewritten.

## 1. Upload the website (hPanel → Files → File Manager)

1. Open `public_html`. Delete the default `iframe.html` / `default.php` placeholder if present.
2. **Upload** `woodex-diploy 23.zip` into `public_html` itself.
3. Right-click the zip → **Extract** → tick **Overwrite existing files**.
4. If the files landed inside `public_html/woodex-diploy 23/`, open that folder, select
   **everything**, use **Move** → target `public_html`. `index.php` must be visible in `public_html`.
5. File Manager → ⚙ → **Show hidden files**, and confirm `.htaccess`, `_private/`, `_database/`
   uploaded (these are the two things extraction sometimes drops).
6. Open `https://woodex.com.pk/` — the homepage must show (a white page or HTTP 500 = step 4 failed).

## 2. Create + import the database

hPanel → **Websites → Databases → Management**:

1. **Create a MySQL database**: name `woodex`, user `woodex`, pick a strong password.
   Hostinger prefixes them → `u128159657_woodex` / same user. Note the password, it is used once.
2. **Host** is always `localhost`.
3. Import (choose ONE):
   - **phpMyAdmin** → select the database → **Import** → upload `woodex-database.sql`
     from `woodex-diploy 23-database.zip` (kept **outside** `public_html`).
   - **no import needed** if you use `/wx-install.php` in step 3 — it creates all tables itself
     from `_database/woodex-v20.sql` (verified: the same 20 tables as the full dump) and is the
     recommended route.
4. In phpMyAdmin → SQL, run `00-verify-import.sql` → the first answer must be **20**.
5. Then run `01-security-cleanup.sql` (see the red box in step 3 — the dump seeds `admin`).
   - Larger than 256 MB → import over SSH: `mysql -u u128159657_woodex -p u128159657_woodex < woodex-database.sql`
     (hPanel → Advanced → SSH Access, then `sftp` the file in).

## 3. Connect the website to the database

Open **`https://woodex.com.pk/wx-install.php`** once:

| Field | Value |
|---|---|
| Database host | `localhost` |
| Database name | `u128159657_woodex` |
| Database user | `u128159657_woodex` |
| Database password | the one you created in hPanel |
| Owner name / email / password | your name, your email, 8+ characters |

It writes `public_html/_private/db.json` (never web-readable) and creates the tables + your login.

> **DO THIS NOW — the SQL dump ships weak logins.** `woodex-database.sql` seeds three accounts
> (`master@woodex.pk`, `manager@woodex.pk`, `developer@woodex.pk`) whose bcrypt password is the word
> `admin`. If you import that dump and then publish the site, anyone can sign in as owner. Either set
> your own owner login through this installer (it updates/creates your account, but the other two stay
> usable), or run this in phpMyAdmin → SQL right after the import:
>
>     DELETE FROM wx_users;                    -- no login at all yet, then use /wx-install.php
>     -- or keep the rows but switch them off until you set real passwords:
>     UPDATE wx_users SET active = 0;
>
> After go-live: Admin → Team & Roles → remove what you do not need, and change every password in
> Admin → My security. `wx-install.php` on an *empty* user table creates `admin` / `admin`, so never
> leave the installer on the server.
Prefer to do it in the UI instead? Sign in at `/admin/` — the **Setup** screen asks for exactly the
same four values and stores them in the same place.

Manual alternative (only if you skip both screens): create `public_html/_private/db.json` from
`_private/db.example.json`, or put the values in `config.php` (`$db_host`, `$db_name`, `$db_user`, `$db_pass`).
Use the **Hostinger** values, never the old host's.

## 4. Sign in and check the server

1. `https://woodex.com.pk/admin/` → sign in with the owner email + password from step 3
   (or `admin` / `admin` only if the user table was empty — change it at once).
2. `https://woodex.com.pk/wx-check.php` → all rows green: PHP 8.0+, `pdo_mysql`, `mbstring`, `curl`,
   `zip`, `fileinfo`, `_private` writable + protected, database connected, tables found.
3. Admin → **System** → run a page edit → **Publish** → the live page changes instantly
   (PHP writes the HTML in place; no rebuild, no GitHub deploy).

hPanel → **Advanced → PHP Configuration**: PHP **8.2**, extensions
`pdo_mysql, mbstring, curl, json, zip, openssl, fileinfo`, and
`upload_max_filesize = 16M`, `post_max_size = 20M`, `memory_limit = 256M`.

## 5. Cron jobs (hPanel → Advanced → Cron Jobs)

```
*/5 * * * *  wget -q -O /dev/null "https://woodex.com.pk/api/wa-cron.php?key=YOUR_KEY"        # WhatsApp queue (key: Admin → WhatsApp → Settings)
*/30 * * * * wget -q -O /dev/null "https://woodex.com.pk/api/admin.php?action=cron"            # scheduled publishing + nightly backups (keep 14) + booking reminders
```

`?action=cron` is a GET by design (it only runs tasks that are due and answers with counts),
so no login or key is needed for it.


## 5b. What this build already did for you (nothing to change)

- the login screen no longer contains the "SSO demo" shortcut that typed the owner email +
  password into the form — that password was readable in `admin/admin.js` by any visitor
- `admin/index.html` no longer prints a suggested builder password in its placeholders
- **`/services/` works again**: a stale “Old website menu” 301 (written before that page existed)
  sent `/services/` → `/interior-design/`, hiding a real 124 KB page linked 458 times and listed in
  the sitemap. The rule is gone from `.htaccess` **and** from the seed file `api/redirect-plan.json`.
  If a server already has `_private/redirects.json` with that row, delete it in Admin → Redirects.
- dotfiles are now blocked at **any** depth (`(^|.*/)\.(?!well-known)`), not only at the docroot
- `config.php` and `/includes/` return **403** if anyone requests them over HTTP
  (`.env`, `*.sql`, `*.log`, `*.md`, dotfiles and `_private/ _database/ _templates/` were already blocked)
- an uploaded file can never execute: `assets/uploads/.htaccess` and `uploads/.htaccess` deny
  `php|phtml|phar|pl|py|cgi|sh|html|svg` (written without `php_flag`, which LiteSpeed rejects with HTTP 500)
- no leftover media from the old server is shipped (the `assets/uploads/avatars/` test photo is gone;
  the folder is recreated on demand by Admin → My profile)

## 6. Lock the site down after setup (do not skip)

1. **Delete** `wx-install.php`, `wx-demo.php` (File Manager → right-click → Delete). They ask for the
   database password, but they should not be sitting on a live site.
2. **Delete** `_database/` after the import succeeded — or move it one level up, outside `public_html`.
3. Keep the `.sql` backup **outside** `public_html`; never leave `woodex-database.sql` in the web root.
4. `500.html` / `503.html` / `coming-soon.html` stay (they are the error + maintenance pages).

## 7. DNS (only if the domain is not on Hostinger yet)

hPanel → **Domains → woodex.com.pk → DNS Zone**:

| Type | Name | Value |
|---|---|---|
| A | `@` | Hostinger IP shown in hPanel → Domains |
| A | `www` | same IP |
| CNAME | `mail` | `mail.hostinger.com` |

Remove old Vercel/Netlify `A`/`CNAME` records. `.htaccess` then forces `https://woodex.com.pk`
(no `www`) and all 31 legacy redirects.

## 8. Troubleshooting

| Symptom | Cause → fix |
|---|---|
| Blank page / HTTP 500 at `/` | files inside a sub-folder → move contents into `public_html`; or PHP < 8.0 → switch to 8.2 |
| "Admin is not set up yet" (503) | no `_private/db.json` → run step 3, or delete `_private/db.json` and use Admin → Setup |
| `Access denied for user` | wrong DB password/user → reset it in hPanel → Databases, then Admin → System → Database |
| Login shows Setup instead | `_private/db.json` missing → step 3 |
| 404 on `/api/admin.php` | `api/` not uploaded → re-extract with "Show hidden files" on |
| Builder can't upload images | `assets/uploads` not writable → chmod `755`, and the folder's `.htaccess` must stay |
| Homepage 404 | `index.html` missing next to `index.php` |

---
Build P23.1 · 2026-10-09 · fixed in this package: PHP/JS syntax-fatal merge-conflict remnants in
`index.php`, `config.php`, `.env`, `admin/index.html`, `admin/admin.css`, `admin/admin.js`,
`js/main.js`, `google…html`; `php_flag` removed from upload `.htaccess` files (LiteSpeed 500);
nested `Woodex Live P23.zip` and the web-readable root `woodex-database.sql` removed; dead
`/woodex-live-v3/` entry removed from `sitemap.xml`.
