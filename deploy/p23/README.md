# deploy/p23 — WOODEX build P23.1, Hostinger-ready

| File | What it is |
|---|---|
| **`woodex-diploy 23.zip`** | **Upload this to `public_html`.** 27.3 MB · 640 files · flat: `index.php`, `index.html`, `.htaccess`, `config.php` sit at the zip root, so extraction leaves no wrapper folder. Contains the 142-page site, `/admin/` dashboard, `/builder/`, 40 PHP endpoints in `/api/`, `_private/`, `_database/`, `_templates/`, and `DEPLOY-HOSTINGER.md` (the step-by-step). |
| **`woodex-diploy 23-database.zip`** | The database, kept **outside** `public_html`: `woodex-database.sql` (20 tables + starter data), `woodex-v20.sql` (tables only), `00-verify-import.sql`, `01-security-cleanup.sql`, `README-IMPORT.txt`. |
| `woodex-database.sql.zip` | Same full dump as a single-file zip — phpMyAdmin also accepts `.sql.zip`, the shape Hostinger's own instructions name. |
| `README-UPLOAD.md` | Copy of the instructions inside the site zip (hPanel upload → DB → connect → PHP 8.2 → cron → lock-down → DNS → troubleshooting). |
| `DATABASE-README.txt` | Copy of the DB import note, incl. the seeded-password warning. |
| `00-verify-import.sql` / `01-security-cleanup.sql` | The two SQL snippets on their own, so they can be reviewed before import. |
| `AUDIT-P23.md` | Full analysis of the project + every defect found (2× P0 fatal, 2× P0 security) and what was changed. |
| `INSTALL-RUN-CARD.md` | The 10-minute install sequence, in order, with the verification table. The credentials themselves are **not** in this file — they were sent in chat on purpose. |
| `apache-sim.js` | Runs the unzipped package over HTTP with its own `.htaccess` rules applied (DirectoryIndex, 301/410 rules, 403 blocks, aliases, ErrorDocument) + 15 assertions. `serve <dir> <port>` to browse it, `test <dir>` to check it. |
| `hostinger-check.js` | The gate: 70 `public_html` readiness checks. `node hostinger-check.js <unzipped-package>` → exit code = failures. 70/70 on this package, 48/70 on the old static build. |
| `phplint.js` / `links.js` | PHP-grammar lint (`npm i php-parser` first) and the local-reference resolver used in the audit. |

**First thing after upload:** open `/wx-check.php` (all rows green) → `/wx-install.php` (writes
`_private/db.json`, builds the schema, sets your login) → then **delete `wx-install.php`,
`wx-demo.php` and `_database/`** and change every seeded password — the dump ships `admin` as the
password for `master@`/`manager@`/`developer@woodex.pk`.
