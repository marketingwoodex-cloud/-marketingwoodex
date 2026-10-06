# Woodex vLive P20

The complete live version of woodex.com.pk, ready for Hostinger.

## What's in this folder
| Path | What it is |
|---|---|
| `woodex-v20-master.zip` | **The one file to upload** to Hostinger `public_html` |
| `site/` | The same zip, extracted, so you can browse the files on GitHub |
| `site/INSTALL-V20.txt` | Install steps |
| `FEATURES.md` | Full feature guide (for owner + developers) |
| `site/admin/features.html` | The same guide as a web page with search, at `/admin/features.html` |
| `site/admin/master-components.html` | Woodex component library (about 40 blocks), at `/admin/master-components.html` |
| `site/_database/woodex-v20.sql` | All 16 database tables + login |

## Install on Hostinger (4 steps)
1. hPanel → **Databases → MySQL**: create a database and user (skip this if it already exists).
2. File Manager → `public_html` → upload `woodex-v20-master.zip` → **Extract** (leave the folder name empty, tick Overwrite).
3. Open `https://woodex.com.pk/admin/`. The installer opens; type the database password → **Install**.
4. Sign in with **email `admin`, password `admin`**, then change it in **My security**.

## Site structure
```
site/
├─ index.html + pages     website (Plus Jakarta Sans, navy/cream)
├─ assets/                CSS, JS, images (WebP)
├─ blog/                  blog posts
├─ admin/                 admin panel (CRM, quotes, invoices, chat, SEO, builder)
│  ├─ features.html       feature guide
│  └─ master-components.html  component library
├─ api/                   PHP server code (PHP 7.4 to 8.3)
├─ _database/             SQL file (blocked from the web)
├─ _private/              settings + db.json (blocked from the web, created by the installer)
├─ wx-install.php         one-page installer (delete after install)
├─ wx-check.php           server health check
└─ wx-demo.php            optional demo logins (7-day expiry)
```

## Component library (`master-components.html`)
- Woodex blocks converted from UI libraries, without Tailwind, built for fast loading.
- Each block is shown with a live preview and a copy-code button.
- They use the site colours: navy `#0c1628`, cream `#f4efe7`, wood `#b8956a`.
- In the page builder, add them from **Blocks**.

## After going live
- Change the `admin` password and turn on 2FA (**My security**).
- Delete `wx-install.php`, `wx-demo.php` and `wx-check.php`.
- Change the database password in hPanel, then run the installer once more with the new password.
