# Deployment and DevOps Audit

## Scope and method
Static review of `Dockerfile`, `render.yaml`, `.htaccess` (root and per directory), `router.php`, and cache headers. **No live host, no `curl` checks, no Render or Hostinger access.** Every live check below is BLOCKED.

## Summary and risk
High. Protection of private files depends on `.htaccess` being honoured, and the Docker image appears to grant broad write access. Cache policy can serve stale admin assets.

## Findings
### AD-25 — Private-file protection may not apply (High, Hypothesis, live BLOCKED)
- `Dockerfile:15` — `chmod -R 777 /var/www/html/_private` (also `chmod -R 755 /var/www/html` at line 14).
- `Dockerfile:4` — `a2enmod rewrite headers`; no `AllowOverride` setting (reverify PASS: defect present).
- `.htaccess:26` `Require all denied` for protected paths, effective only if `AllowOverride` permits. Apache default for `/var/www/` is `None` in the stock config (**EXTERNAL claim, not checked against this image**).
- **Live check (owner or operator, safe, read-only):** `curl -I https://<host>/_private/db.json` and `curl -I https://<host>/_database/woodex-database.sql`. Expect 403 or 404. Any 200 with a body = confirmed exposure (contain immediately).
- **Fix:** `chmod 0750` on `_private`; move secrets outside the web root; add `<Directory>` deny in Apache config.

### AD-26 — Cache policy for mutable assets (High)
`.htaccess:35–36` — 30-day `public` cache on JS and CSS; `admin/index.html` has 69 script tags, none versioned (`?v=`). STATIC E2.

### WC-05 — Dev router and duplicate rewrite blocks (High, STATIC + Hypothesis)
`router.php` is a `php -S` router. Root `.htaccess` repeats the `www` redirect in two `IfModule` blocks (lines 9, 47; `RewriteCond www` at 15, 50). Behaviour difference between dev and live unverified.

### AD-24 — Secrets in a public repository (Critical)
See `08`. Remediation is in `16` phase 0.

### Deployment target
Render (`render.yaml`, pro only) and Hostinger guide. Which is live is **UNKNOWN** (decision D-3).

## Controls verified (positive)
- `_private` and `*.sql` deny rules are present in `.htaccess` (STATIC).
- `Dockerfile` pins `php:8.2-apache` (STATIC).

## Checks passed
- Syntax and parse of PHP (48/48).

## Checks not run / blocked (all BLOCKED live)
- TLS certificate, HSTS, security headers.
- Actual response to `/_private/`, `/_database/`, `*-lib.php`, `router.php`.
- Asset cache headers on the live host.
- Backups, restore, rollback drill.
- Monitoring, alerts, uptime, error tracking.
- Container runtime user and file permissions on the running image.
