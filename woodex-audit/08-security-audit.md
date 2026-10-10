# Security Audit

## Scope and method
Static review of the P29 pro tree, repository-wide secret scan, local credential verification against committed data (with controls), and reading of authentication and token code. **No live login, no network request to any Woodex host, no exploitation attempt.**

## Environment and revision
`24157f6`. Tools: `detect-secrets` 1.5.0 (all 7,286 tracked files, 395 hits, 219 files); `git grep`; Python `crypt` bcrypt with positive and negative controls.

## Summary and risk
**Critical.** Credentials are published in a public repository and in a public web page, and browser-served code pre-fills and submits a shared literal. Live validity of each credential is **UNKNOWN** (no live access). Treat all as compromised.

## Controls verified (positive)
- Login uses `password_verify()` (bcrypt) and throttles failures (`api/admin.php:364`, `throttle(true)` on failure). STATIC.
- Session and reset tokens compared with `hash_equals()` on HMAC (`admin.php:96`, `:382`; `builder.php:60–81`). STATIC.
- Builder password checked with `password_verify` (`admin.php:319`). STATIC.
- Robots and sitemap present (SEO-01). STATIC.
- `strict_types=1` in `admin.php:10`. STATIC.
- Cron endpoint is keyed (`wa-cron.php:14`), although key handling has a fail-open risk (AU-03, Hypothesis).

## Findings
### SEC-001 — Browser-served admin login pre-fills and falls back to a shared literal (Critical)
- **Evidence:** STATIC E2. `admin/index.html:43` `value=` on `#l-pass`. `admin/admin.js:235` `|| "<literal>"` fallback; `:256`, `:274`, `:284` write it into the field. Literal fingerprint SHA-256/12 `7e4cbcf8995b` (value not recorded).
- **Expected:** no credential in client code; empty password rejected.
- **Actual:** any visitor can read the literal and submit it.
- **Root cause:** a development shortcut shipped in production UI code (RC-8).
- **Fix:** remove the `value=` attribute and the fallback. Approval required (authentication UI change, §5.3).
- **Validation:** after fix: grep for the fingerprint in client files = 0; login with empty field returns the normal error; live login test by the owner only.
- **Rollback:** `git revert`. **Residual:** published value stays in git history until rotated and purged (decision D-2).

### SEC-002 — Owner sign-in hint and database password published (Critical)
- **Evidence:** STATIC E2 `downloads.html:70` (public page) — sign-in instruction with a master account email and the literal. `.env:14`, `.env.example:14` (`DB_PASSWORD`), `config.php:19` (`DB_PASS` fallback). Repository-wide: 151 tracked files contain the literal (`git grep -F`).
- **Local verification (E3):** the literal does **not** verify against the six `$2y$10$` bcrypt hashes in each of `woodex-database.sql`, `_database/woodex-database.sql`, `_database/woodex-v20.sql` (0/6 each). Positive control (own-password hash accepted) and negative control (wrong password rejected) passed; `$2y$` prefix handled.
- **Interpretation:** the committed dumps do not hold a live match. The live database may differ. **Status UNKNOWN for live.**
- **Action:** owner rotates the master and DB passwords now; removes the sign-in line.
- **Residual:** history. Rotation first; purge only with approval.

### SEC-003 — Telegram bot token in 36 tracked locations (Critical)
- **Evidence:** STATIC E3 (single fingerprint `5cce5b5c16` across 36 `detect-secrets` hits). Locations: P29 `.env`, `.env.example`, `config.php:23`, `admin/admin-tg.js:27` (browser-served), `_database/*.sql:318`, `woodex-database.sql:318`; `frontend-v1` copies; root `V2.1-VS-V2.5-PRO-BREAKDOWN.md:45`.
- **Action:** revoke and regenerate in BotFather; load from server environment only; remove literal from every file (requires history purge decision).
- **Validation:** after rotation, old token rejected — **owner check only; not performed by agent (no external calls)**.

### AD-24 — Repository public; secret files tracked (Critical)
- **Evidence:** OBSERVED (`gh repo view --json isPrivate` → `false`). STATIC: `.gitignore` covers only `frontend-v1/_private/*`.
- **Decision:** owner chose "later" for visibility (D-1). Recorded; not changed.

### AD-27 / AD-28 — Token literal in client JS and example/dump files (Critical)
Same value as SEC-003. Listed separately because the browser-served copy and the tracked dump are distinct exposure surfaces.

### SEC-004 — Other tracked `.env` files (Medium)
Root `.env`, `p22-preview/.env`, `p23-live/.env`, `woodex-live-p23/.env`. Secret-named keys empty or placeholder. Admin contact address present in two env files (personal data class).

### DB-02 — `_private/admin-db.json` holds 7 `scrypt$` password hashes (Medium, Hypothesis)
No PHP reader in the tree; login uses bcrypt on MySQL. Whether any runtime path reads it is unknown. Remove from tracking regardless.

### SEC-005 — html2pdf AWS-pattern hit (Informational, false positive)
Ten copies of one vendor bundle, one fingerprint, base64-style data run, no credential keyword. Triage recorded in `evidence/sanitized-command-output/triage-2026-10-11.txt`.

### SEC-006 — Placeholder-like DB snippet in deployment guide (Low)
`HOSTINGER-DEPLOYMENT-GUIDE.md:76`. Value shape placeholder-like (not printed).

### SEC-007 — Attack-payload test script tracked (Informational)
`tools/sectest/t3.php:21`. Keep out of web root (verify in `15`).

### AD-25 — Deny rules may not apply (High, Hypothesis, live BLOCKED)
Dockerfile sets `chmod -R 777` on `_private` (line 15) and does not set `AllowOverride`; deny rules are only in `.htaccess`. If Apache ignores them, `_private/*.json` and `_database/*.sql` are downloadable. Requires live curl check (see `20`).

## Checks passed
- Positive controls above (STATIC).
- No `eval(`/shell execution review performed in this pass (**not run**).

## Checks not run / blocked
- Live login, session expiry, password reset, MFA (none found), logout invalidation.
- CSRF token checks on state-changing actions (not traced).
- SQL injection / XSS dynamic tests (no runtime).
- Security headers, CSP, HSTS, cookie flags (live check **BLOCKED**).
- Dependency vulnerability scan of vendor bundles (not run).
- Upload handling (not traced).

## Recommendations
1. Owner rotates credentials now (SEC-001/002/003, AD-27/28).
2. Remove literals from source and docs; add secret scanning to pre-commit and CI.
3. Make the repository private (D-1) and plan history purge with collaborators (D-2).
4. Verify deny rules on the live host before any release.
