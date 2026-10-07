# Woodex Live P21 — complete release

One zip for Hostinger: **woodex-master-P21.zip** (website + Admin v2 + database installer).
Code source (browsable): `frontend-v1/` on this branch. Commit: `3e7c11c`.

## Install (Hostinger, PHP 7.4+)
1. hPanel → Databases → create MySQL DB + user (e.g. `u128159657_woodex`).
2. File Manager → `public_html` → upload zip → Extract (Overwrite).
3. Open `https://woodex.com.pk/wx-install.php` → enter DB password → Install.
4. Log in `/admin/` with `admin` / `admin` → **change password at once**.
5. Delete `wx-demo.php` and `wx-check.php` after testing.
6. Cron (every 5 min): `php public_html/api/wa-cron.php` (social posts, follow-ups, SEO agent).

## Structure
| Path | What |
|---|---|
| `/` html pages, `assets/` | Public website (v26 design) |
| `admin/` | Admin v2 (navy + gold, 5 roles) |
| `api/` | PHP API (`admin.php` main, `*-lib.php` modules, webhooks `whatsapp.php`, `telegram.php`) |
| `_database/woodex-v20.sql` | DB structure (used by installer) |
| `_private/` | Settings + secrets (web-blocked, never in git) |
| `wx-*.php` | Installer, demo users, health check |

## After install — connect (Admin)
WhatsApp Cloud API · Telegram bot (BotFather) · Meta Page token (FB/IG) · LinkedIn · Google Business · AI key (Claude/OpenAI/OpenRouter/local) · Turnstile · SMTP.

See FEATURES.md, QA-REPORT.md, SECURITY-AUDIT.md, CHANGELOG.md.

## Templates
`_templates/` (web-blocked) has backup copies of all templates. If any are missing: Admin → Sales → Templates → **Import from file**. See `_templates/README.md`.

## Logins
First login `admin` / `admin` (change it). Fill `CREDENTIALS-TEMPLATE.md` offline — real passwords are never stored in the zip.

Also: TODO-PLAN.md.


## Style cache fix (built in)
Styles are now `assets/site-p21.css` and `assets/v1-p21.css` (new names), plus `theme.css?v=p21` and `site.js?v=p21`. Hostinger's cache can't serve the old files, so the FAQ and services sections and the footer icons display correctly right after upload. The old `site.css` / `v1.css` on the server can stay or be deleted.
After uploading, run Cache Manager → Purge all once.

## Telegram
Revoke the old token in @BotFather (`/revoke`) → Admin → Telegram → paste the NEW token → Connect → scan the QR code → Start → Send test. Never put the token in files.

## Important: db.json and the setup pages
- **db.json is never in the zip** (it holds your database password). It is created on the server when you run the installer.
- Use only ONE setup page: `https://woodex.com.pk/wx-install.php`. Enter Host `localhost` and the database name, user and password from hPanel. Then fill in **Owner account** (your name, email and a password of 8+ characters) and click Install. That creates `_private/db.json`, the 20 tables and YOUR login. If you leave Owner empty on a new site, the login is admin / admin. Re-running the installer never resets existing passwords.
- If `/admin/` shows "Set up Woodex Admin" (db.json missing) and the database already has users: fill only the Database box and **leave the Owner account empty**, then submit. The site reconnects and you sign in with your existing login.
- File Manager may hide db.json (permission 600). That's normal. Test by signing in.
- If files like `wx-demo.php` or `_database/woodex-v20.sql` are missing after extracting, the extraction did not finish. Extract the zip again with Overwrite.
