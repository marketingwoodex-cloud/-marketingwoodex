# Security audit — P21 (7 Oct 2026)

## Checked ✅
- Every admin action behind login + role permission; Manager writes queued for approval.
- Passwords hashed; login lock after 8 fails / 10 min; forgot/reset tokens expire.
- SQL: prepared statements; table names whitelisted; numbers cast to int.
- XSS: user/AI text escaped in admin + widget (textContent / esc).
- Webhooks: WhatsApp HMAC SHA-256 (refuses if secret missing); Telegram secret header; MCP Bearer hash.
- Uploads: PHP engine off, php/html/js/svg blocked in `assets/uploads`.
- `_private/`, `_database/`, `*-lib.php`, `.sql/.log/.md` web-blocked; secrets never sent to the browser.
- Installer re-run only with the same DB password; demo page rate-limited, accounts expire in 7 days.
- Chat: per-IP message limit; lead forms Turnstile + honeypot.
- Headers: HSTS, nosniff, X-Frame-Options, Referrer-Policy.

## Fixed in P21
| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | Medium | Social post image path could use `../` → private file sent to LinkedIn; any URL fetched (SSRF) | Images only, inside `/assets`, no `..`; remote https only, 8 MB, image bytes checked |
| 2 | Low | `api/chat-rules.json`, `redirect-plan.json` publicly readable | Blocked in `.htaccess` |
| 3 | Bug | `microphone=()` header blocked chat voice notes | `microphone=(self)` |

## Owner to-do
1. Change `admin` password; delete `wx-demo.php`, `wx-check.php`.
2. Set WhatsApp App secret and Telegram webhook secret (Admin).
3. Keep Hostinger SSL on; enable daily backups.
