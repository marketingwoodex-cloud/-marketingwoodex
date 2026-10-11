# woodex-live-p29-v2.1-pro QA probes

Read-only probes used for the master QA report (`QA-MASTER-REPORT-P29-V2.1-PRO.md`).

    cd tools/qa-p29 && npm install
    node phplint.js ../../woodex-live-p29-v2.1-pro          # PHP parse lint (php-parser, PHP 8.2 grammar)
    node harness.js ../../woodex-live-p29-v2.1-pro "#/settings/integrations" 2000
    THEME=light node theme-probe.js ../../woodex-live-p29-v2.1-pro "#/security"
    THEME=dark  node theme-probe.js ../../woodex-live-p29-v2.1-pro "#/security"
    THEME=dark  node sidebar-probe.js ../../woodex-live-p29-v2.1-pro "#/security"

Notes:
- jsdom does not resolve `var()` or run layout. Judge canvas colour from the CSS source, not from computed style.
- `harness-db.js` is a copy that returns `dbError:true` from `status` and tags navigation errors.
- `bad.php` is a deliberate syntax error used as a negative control for `phplint.js`.

## Browser checks (headless Chromium, QA only)

- **Install (approved 2026-10-11, decision D-12):** `npm install @sparticuz/chromium puppeteer-core` inside `tools/qa-p29` only. Not part of the shipped app. `node_modules/` is gitignored.
- **Runtime notes:** the sandbox has no system Chromium libraries, so `browser-regression.mjs` extracts the bundled `al2023.tar.br` and sets `LD_LIBRARY_PATH` before launch.
- **Scope:** serves a local copy of the admin folder and stubs `/api/*` with fixtures. Every other non-local request is blocked. It never talks to a live site, database, or real API.
- **Checks:** `t16`, `editor-dash`, `approvals`, `approvals-initial` (add `JITTER=<seed>` for seeded script delay), `security`.
- **Full evidence run:** `bash run-browser-evidence.sh`, with `PREFIX` and `HEADT` pointing at `git archive` extracts of the pre-fix and HEAD trees (outside the repo).

## Preview sign-in accounts (role testing)

The preview stub has **no built-in account** — every account comes from the environment, so no
credential value is ever written into this repo:

```bash
PREVIEW_ACCOUNTS='[{"email":"you@example.pk","role":"sales","password":"…"}]' \
  python3 preview-server.py ../../woodex-live-p29-v2.1-pro 8080
```

- `role` uses the stored codes from `api/roles-lib.php`: `owner` (Master), `admin` (Manager),
  `editor` (Developer), `sales` (Sales), `support` (Support). Optional `name` and `token` per account.
- `PREVIEW_ACCOUNTS_FILE` points at the same JSON in a file — keep it at
  `.preview-accounts.local.json` (git-ignored pattern `.preview-accounts*.json`).
- `PREVIEW_EMAIL` / `PREVIEW_PASS` still add one extra account (role `owner`), so the older probes
  keep working unchanged.
- Each account gets its **own token**, so `me` / `status` return that account after a reload and the
  sidebar gating can be checked per role. Never use real production passwords here.

## Design-batch checks (2026-10-12)

- `ui-design-batch.mjs` — routes × both themes in one run: page errors, screenshots, an inline-hex
  census, the icon-to-label gap in the AI sub-nav (`#ai-subnav`), and **chart ink sampling**: it reads
  the canvas pixels and asserts the dashboard chart repaints with the other palette when the theme
  flips (`window.WXPalette`; light mean ink ≈ blue-600, dark ≈ blue-400).
- `login-contrast.mjs` — rendered AA audit of the sign-in page alone (no sign-in performed).
- `preview-server.py` now answers `dash_data` with a **seeded fixture** (U4), so the KPI row, chips,
  funnel, target ring, follow-up and overdue lists, latest-enquiries table and the statistics chart
  all render in the preview. Values are invented; shapes follow `api/*.php`.

    PREVIEW_EMAIL=you@example.com PREVIEW_PASS=preview-only \
      node ui-design-batch.mjs http://127.0.0.1:8080 /tmp/ui-out
    PREVIEW_EMAIL=you@example.com PREVIEW_PASS=only-the-browser-sees-this \
      node login-contrast.mjs http://127.0.0.1:8080

## Static preview server (not production)

- `preview-server.py <dir> <port>`: serves the public front-end files of the pro tree, and blocks PHP source, `api/`, `_private/`, `_database/`, `_templates/`, SQL, env/dotfiles, Markdown, JSON, and `admin/admin-tg.js` (token literal, SEC-003).
- It answers `POST /api/admin.php` and `/api/builder.php` with a **preview-only stub**: no PHP, no database, no real accounts. Login accepts one test account set by environment variables `PREVIEW_EMAIL` (default `the email set in PREVIEW_EMAIL`) and `PREVIEW_PASS`. Everything else is rejected, including the shared pre-filled password.
- Why: Python's plain static server returns 501 for POST, which the admin shows as "Server error (501)". Serving `.php` files as plain text leaks source, so the filter is required.
- Test: `PREVIEW_PASS=... node preview-login-test.mjs http://127.0.0.1:8080` (headless browser; prints booleans only).
