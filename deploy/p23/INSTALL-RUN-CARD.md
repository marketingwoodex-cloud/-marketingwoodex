# WOODEX P23.1 — install run card (10 minutes, in this order)

Values marked `<…>` were sent in chat and are deliberately **not** stored in this repo.

| What | Value |
|---|---|
| Admin email | `master@woodex.pk` |
| Admin password | `<ADMIN_PASSWORD>` (17 chars, changed on first login) |
| MySQL password (hPanel) | `<MYSQL_PASSWORD>` |
| DB name / user / host | `u128159657_woodex` / `u128159657_woodex` / `localhost` |
| Packages | `woodex-diploy 23.zip` (site) · `woodex-diploy 23-database.zip` (SQL, stays off the server) |

## 1 · Park the current state (30 s)
hPanel → File Manager → `public_html` → select all → **Zip** → download as `before-P23.1.zip`.
Then delete the leftovers from `public_html` (right now the domain only serves `robots.txt`, so there is
nothing to lose — but keep the copy).

## 2 · Upload + extract (2 min)
1. Upload `woodex-diploy 23.zip` **inside** `public_html`.
2. Right-click → **Extract** → tick **Overwrite existing files**.
3. ⚙ → **Show hidden files** → you must see: `index.php`, `index.html`, `.htaccess`, `config.php`,
   `admin/`, `api/`, `assets/`, `_private/`, `_database/`.
   If they are inside `woodex-diploy 23/`, select all → **Move** → target `public_html`.

## 3 · PHP (1 min)
hPanel → **Advanced → PHP Configuration**: version **8.2**; extensions
`pdo_mysql, mbstring, curl, json, zip, openssl, fileinfo`;
`upload_max_filesize 16M`, `post_max_size 20M`, `memory_limit 256M`. Save (reload takes ~20 s).

## 4 · Database (2 min)
1. **Websites → Databases → Management** → Create: database `woodex`, user `woodex`, password
   `<MYSQL_PASSWORD>` → Hostinger shows `u128159657_woodex` for both.
2. **No import needed** — `wx-install.php` builds all 20 tables. (Want to import instead? Extract
   `woodex-diploy 23-database.zip` **on your computer**, phpMyAdmin → the database → Import →
   `woodex-database.sql`, then run `00-verify-import.sql` → first answer must be **20**.)

## 5 · Connect + create the login (1 min)
Open `https://woodex.com.pk/wx-install.php` and enter:

```
host  localhost        name  u128159657_woodex
user  u128159657_woodex   pass  <MYSQL_PASSWORD>
name  Woodex Owner    email  master@woodex.pk    password  <ADMIN_PASSWORD>
```

Writes `_private/db.json`, creates the tables, creates your owner login.
If the dump was imported first, run `01-security-cleanup.sql` **before** you sign in — it ships **six**
accounts whose password is the word `admin` (`master@`, `manager@`, `developer@`, `sales@`, `support@`,
`admin@woodex.pk`). Put those values into `/wx-install.php`'s Owner block rather than the in-app setup
screen: the installer `UPDATE`s an existing email, while `api/admin.php` `setup` deliberately refuses to
overwrite a login it finds and ignores the password you typed ("Your existing accounts are kept").

## 6 · Verify (1 min)
| Open | Expect |
|---|---|
| `https://woodex.com.pk/` | homepage renders (it is 404 today, and 500 on the P23 zip) |
| `https://woodex.com.pk/services/` | the Services page — it was being 301'd away by a stale rule before P23.1 |
| `https://woodex.com.pk/wx-check.php` | every row green (PHP, extensions, `_private` writable + protected, DB connected, 20 tables) |
| `https://woodex.com.pk/config.php` | **403 Forbidden** |
| `https://woodex.com.pk/_database/woodex-v20.sql` | **403 Forbidden** |
| `https://woodex.com.pk/.env` | **403 Forbidden** |
| `https://woodex.com.pk/admin/` | luxury sign-in → the credentials above |
| locked out for any reason | `02-login-recovery.sql` in the database zip — 7 numbered checks: who exists + which hash, `wx_throttle`, `active=0`, wrong DB, hash reset |

## 7 · Lock down (1 min — do not skip)
1. Delete `wx-install.php`, `wx-demo.php`, and the `_database/` folder.
2. Admin → **My security** → change the password (this pair has been in a chat log).
3. Admin → Team & Roles → remove `manager@` / `developer@` if you don't need them.
4. Keep the `.sql` backups only on your own computer.

## 8 · Cron (hPanel → Advanced → Cron Jobs)
```
*/5 * * * *   wget -q -O /dev/null "https://woodex.com.pk/api/wa-cron.php?key=<from Admin → WhatsApp>"
*/30 * * * *  wget -q -O /dev/null "https://woodex.com.pk/api/admin.php?action=cron"
```

## 9 · Function test (5 min, after login)
Send a test enquiry from `/contact/` → row appears in Admin → Leads.
Upload one image in the Builder → it loads from `/assets/uploads/`.
Publish any page → the live page changes within a second.
Sign out, sign in again (proves the session path), then enable 2-step in Admin → My security.

## Re-run these tests yourself, any time
```bash
node deploy/p23/hostinger-check.js <unzipped-package>   # 70 public_html readiness checks
node deploy/p23/apache-sim.js test <unzipped-package>   # 15 HTTP behaviour checks (needs node only)
# optional, from deploy/p23: npm i php-parser && node phplint.js <dir>   (PHP grammar)
```
Both exit non-zero on any failure, so they can gate a release. `apache-sim.js serve <dir> 8099`
also browses the package locally with the real `.htaccess` behaviour applied.
