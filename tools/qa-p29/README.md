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

## Static preview server (not production)

- `preview-server.py <dir> <port>`: serves the public front-end files of the pro tree, and blocks PHP source, `api/`, `_private/`, `_database/`, `_templates/`, SQL, env/dotfiles, Markdown, JSON, and `admin/admin-tg.js` (token literal, SEC-003).
- It answers `POST /api/admin.php` and `/api/builder.php` with a **preview-only stub**: no PHP, no database, no real accounts. Login accepts one test account set by environment variables `PREVIEW_EMAIL` (default `preview@woodex.test`) and `PREVIEW_PASS`. Everything else is rejected, including the shared pre-filled password.
- Why: Python's plain static server returns 501 for POST, which the admin shows as "Server error (501)". Serving `.php` files as plain text leaks source, so the filter is required.
- Test: `PREVIEW_PASS=... node preview-login-test.mjs http://127.0.0.1:8080` (headless browser; prints booleans only).
