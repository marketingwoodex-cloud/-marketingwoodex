# Woodex Live P21 — complete release

One zip for Hostinger: **woodex-live-P21.zip** (website + Admin v2 + database installer).
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

## Cache fix update (8 Oct 2026)
Problem: after upload, Hostinger CDN kept serving OLD `site.css` / `v1.css` (30-day cache) → FAQ text invisible, services strip broken.
Fix: every page now loads `site.css?v=p21`, `v1.css?v=p21`, `theme.css?v=p21`, `site.js?v=p21`, so the cache fetches the new files.
- Already uploaded P21? Upload **woodex-P21-update-cachefix.zip** to `public_html` → Extract → Overwrite. Then Cache Manager → Purge all once.
- New install: use **woodex-live-P21.zip** (fix included).
Next release: change `p21` to the new version name in pages to force a refresh.
