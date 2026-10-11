# Tracked secrets — verified scope (2026-10-12)

**No values are recorded in this document by design.** Findings are described by file and line so the
values can be checked on the machine. This is the evidence half of **AD-24** (Critical, score 75,
P0 override) and **C-6 / D-1** (repository visibility — the owner previously answered "later").

## Why this was re-checked today

The owner supplied the five team logins (`master@woodex.pk`, `manager@`, `developer@`, `sales@`,
`support@woodex.pk`). While making them work in the preview, the shared password was found in the
tracked tree — which means the same string that opens the Master account is also the value the live
deployment falls back to for its database connection.

## Verified facts

| Fact | Evidence |
|---|---|
| The shared team password appears in **117 tracked files** | `git grep -l` (names only) |
| In the source-of-truth tree it is a **database password fallback**, next to the live DB name/user | `woodex-live-p29-v2.1-pro/config.php:19` — `define('DB_PASS', getenv('DB_PASSWORD') ?: …)` |
| The deployment `.env` is **tracked and not ignored**, and holds the DB password, an `APP_KEY`, an `ADMIN_EMAIL` and a Telegram bot token | `woodex-live-p29-v2.1-pro/.env`, key list only |
| **One distinct Telegram bot token** (46 chars, 10-digit bot id — the real shape) appears in **25 tracked files** plus the `.env` | `git grep -hoE` distinct count = 1 |
| A **32-character maintenance token** is tracked | `woodex-live-p29-v2.1-pro/_private/system.json` → `/maint/token` |
| Older copies ship the password **pre-filled in the sign-in form** | e.g. `frontend-v1/admin/index.html`, `p22-preview/admin/index.html`, `p23-live/admin/index.html` |
| The **active** admin app is clean of the pre-fill | `woodex-live-p29-v2.1-pro/admin/index.html` — both inputs `value=""` |
| Correction to the audit list | `_private/db.json` / `_private/admin-db.json` are **no longer tracked** (only `.htaccess`, `company.json`, `db.example.json`, `system.json` are) |
| No Stripe / OpenAI / Google / Slack / GitHub-token / private-key patterns found | pattern sweep, 0 files each |

## Impact

The repository is **public** (C-6 unresolved; `gh repo edit --visibility private` is refused here —
the connection's token has no repo-administration permission). So today, anyone can read:

- the live database password together with its host, database and user names,
- a working Master login for the live admin panel,
- a Telegram bot token that can post as the studio's bot,
- a maintenance token.

Rotating the admin password alone is not enough — the database credential and the bot token are in
the same string/file. All three classes need rotation.

## Options (each needs the owner's explicit go-ahead)

| # | Action | Notes |
|---|---|---|
| 1 | **Make the repository private** | 30 seconds, owner-only: Settings → General → Danger zone → Change visibility. Stops new exposure; history keeps whatever already leaked. |
| 2 | **Rotate** the DB password (Hostinger), the five team passwords, the Telegram bot token (BotFather `/revoke`) and `APP_KEY` | Production change. Must be done by the owner; after rotation the committed values are dead. |
| 3 | **Strip the literals from tracked files** and read them from the environment only | Touches `config.php` / `.env`, so the deployment must have its env vars set first, otherwise the site loses its DB connection. Needs a deploy-window decision. |
| 4 | **Untrack `.env` + private data files** (`git rm --cached`) and extend `.gitignore` | Safe for git, but if the host deploys by `git pull`, the file disappears from the deployment — must be confirmed first. |
| 5 | **History rewrite** (filter-repo/BFG) to purge the values from past commits | Out of bounds by the owner's own rule; only worth it after 1–2 are done, and it rewrites every clone. |
| 6 | Replace the shared team password with distinct per-account passwords | Removes the single-point failure where one leaked string opens Master, the DB and the bot. |

Recommended order: **1 → 2 → 6 → 4 → 3**, with 5 only if the owner wants the history cleaned too.

## Rollback notes

- Visibility can be flipped back at any time.
- Rotation cannot be undone — old values stop working immediately.
- A history rewrite cannot be undone; it invalidates every existing clone.
