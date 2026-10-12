# PHP EXECUTION REPORT — 2026-10-12

**What this is:** the first time in this project's history that its PHP has actually *run* — every API
action, against a real database, on this machine. Four real defects came out of it and all four are
fixed and re-verified. Nothing here is read from source code; every claim is an execution result.

**How:** `tools/qa-p29/php-runner.mjs` boots PHP 8.3 (WebAssembly, `@php-wasm`) and serves the
project's own `api/*.php` off the host filesystem. The database is the real 25-table schema from
`woodex-database.sql`. Because no MySQL server exists in this environment, the app was given one extra
connection path (`api/_lib/db.php` → `api/_lib/db-sqlite.php`) that translates the MySQL dialect the
API is written in. **MySQL remains the production driver and the MySQL code path is unchanged.**

---

## 1. The sweep

`node php-sweep.mjs` — 323 admin actions + 26 builder actions (the full action surface, read straight
from the source) × 8 sessions (anonymous + the seven real role accounts).

| | |
| --- | --- |
| Calls executed | **2 795** |
| Distinct actions | **345** |
| Wall clock | **150 s** |
| PHP fatals | **0** |
| Runtime restarts (WASM heap) | 27 |
| Answers by result | 1 768 gated (role gate fired) · 427 ok · 413 not-found (empty payload) · 165 validated (input refused) · 11 DB-error · 5 external-blocked · 6 binary (correct ZIP download) · 1 gated-text (webhook GET) |

`gated` dominates on purpose: the sweep sends an empty payload as every role, so most calls *should*
be refused. What matters is that a refusal is a clean JSON refusal — not a crash.

**SQL translations logged** (from `_private/qa-sql-trace.log`): 2 924 `CREATE TABLE`, 1 319 `ALTER
TABLE … ADD COLUMN`, 17 `SHOW TABLES`, 8 `ON DUPLICATE KEY UPDATE`, 6 server statements skipped,
3 `SHOW COLUMNS`. See §3 — the first two numbers are a defect in their own right.

---

## 2. Defects found by execution

| # | Defect | Where | Impact | Status |
| --- | --- | --- | --- | --- |
| 1 | `Undefined constant "GLOB_BRACE"` → `Uncaught Error`, HTTP 500 | `api/builder.php` (media library) | On any PHP build without the GNU brace glob (musl/Alpine, Windows, several shared hosts) **the entire Media library screen dies**. Not a style issue — a hard 500. | **Fixed** — new `media_glob()` helper falls back to per-extension globbing |
| 2 | `SQLSTATE… near "13": syntax error` → `Database error`, HTTP 500 | `api/admin.php` `case 'dashboard'` (`DATE_SUB(CURDATE(), INTERVAL 13 DAY)`) | **The admin home screen fails to load** whenever the SQLite path is used; on MySQL it works, so it hid until the query was executed. | **Fixed** — `DATE_SUB`/`DATE_ADD … INTERVAL` translation |
| 3 | `SQLSTATE… near "SHOW": syntax error` → `Database error`, HTTP 500 | `api/p18h-lib.php` `case 'dbx_tables'` (`SHOW TABLE STATUS LIKE 'wx\_%'`) | **The database browser screen fails** on the same path. | **Fixed** — `SHOW TABLE STATUS` translation |
| 4 | `PHP Warning: Undefined array key "status"` | `api/ai-agent-lib.php:128` (`ai_unans_list`) | Silent today; a crash the day this runs on PHP 9, and it means the "unanswered questions" filter reads a key that may not exist. | **Fixed** — read once with `??` before validating |

Defect 1 is the one worth the whole exercise: it is a **production** bug. Defects 2–4 were surfaced
because the SQL actually executed.

### Verified after the fix (fresh sandbox, same runner)

```
admin  dashboard      200 {"ok":true,"stats":{"pages":149,…}}
admin  dbx_tables     200 {"ok":true,"tables":[{"name":"wx_activity"…}]}
admin  ai_unans_list  200 {"ok":true,"items":[]}          ← no warning
builder media         200 {"ok":true,"media":[…]}  (272 items)  ← was FATAL
builder pages         200 (149 items)
```

Not defects (checked, expected in this sandbox):
* `health_psi` → 502 *"could not reach Google"* with a clean message — outbound HTTPS to Google is
  blocked here; the code degrades correctly.
* `fm_zip` → a real ZIP stream (binary body, correct for a download).
* `whatsapp.php` GET → plain-text `forbidden` — the webhook refusing anything that is not Meta.

---

## 3. Defect the numbers themselves revealed: DDL on every request

The trace log shows 2 924 `CREATE TABLE` and 1 319 `ALTER TABLE … ADD COLUMN` for 2 795 calls —
**~1.5 schema statements per API request**. Every `*_migrate()` function in `api/*-lib.php` guards
itself with `static $done`, which only lasts for one request, so on MySQL every request re-runs the
create-table and the "add column if missing" dance (those ALTERs fail and are swallowed). On shared
MySQL that is wasted metadata-lock work on every screen and a flooded MySQL error log.

Scheduled fix: a file-memo guard (`_private/schema.json`, keyed by the lib file's mtime) so DDL runs
once per deployment (or once after a file changes) instead of once per request. Re-measure with the
same trace log.

---

## 4. What the environment still cannot prove

| Gap | Why | Unblocked by |
| --- | --- | --- |
| MySQL-specific behaviour | the local database is SQLite behind a translator | one pass on XAMPP/MySQL with the real dump |
| Real records | every screen was exercised, but against an empty/schema-seeded database | the owner's SQL dump |
| Google PageSpeed, Telegram, WhatsApp, SMTP, Sheets | outbound network is blocked here (and outbound calls are deliberately blanked) | the host |

The translator throws with the original SQL attached when it meets something it cannot map, so a
mismatch shows up loudly in the next sweep instead of silently returning wrong data.

---

## 5. How to reproduce

```bash
cd tools/qa-p29
npm install                       # @php-wasm/node + @php-wasm/universal
node php-runner.mjs --check       # PHP 8.3.33 · pdo_mysql · pdo_sqlite · gd · curl · zip
node php-sweep.mjs --fresh        # 2 795 calls, ~3 min, writes .qa-out/php-sweep.json
```

The sweep never touches the shipped tree: it works on a copy in `.qa-run/project`, and blanks every
outbound credential (`wx_settings` keys matching token/secret/key/pass/smtp, and the same keys inside
`_private/*.json`) so no action can call a real service with real credentials.

---

# SECOND PASS — same day, after the fixes

**Re-swept after the migration guard and the four fixes (§2).** 3,144 calls · 323 admin + 26 builder
actions × 9 sessions · 171 s.

| | before | after |
| --- | --- | --- |
| PHP fatals | 0 | **0** |
| DB-error answers | 11 | **0** |
| PHP warnings | 1 distinct | **0** |
| `CREATE TABLE` (trace) | 2,924 | **40** (25 of them the installer) |
| `ALTER TABLE` (trace) | 1,319 | **9** |

The only remaining flags are environmental and correct: `fm_zip` returns a real ZIP (binary body —
that is what a download looks like) and `health_psi` reports a clean 502 because outbound Google is
blocked in this environment.

## The preview now runs the real PHP

`tools/qa-p29/php-preview.mjs` replaced the fixture preview as the default: the browser talks to the
project's own PHP against a SQLite database, so every screen is the real backend — real sign-in, real
role gates, real data, real builder saves. It works on a copy (`.qa-run/preview`), keeps the browser
signed in across restarts, and blanks outbound service credentials.

Verified against it:

| Check | Result |
| --- | --- |
| `master-qa.mjs`, 58 routes signed in as the owner | **stuck 0 · page errors 0** |
| `users-probe.mjs` (Team & Roles, validation, add, `#/team` split) | green, `problems: []` |
| `invoice-probe.mjs` (create → track → pay → balance → detail) | green, `problems: []` |
| `health-probe.mjs` | green except "PageSpeed cards show no scores" — Google unreachable here |
| builder `pages` / `media` through the bridge | 149 pages · 272 media files (the GLOB_BRACE fix, in the real app) |
| anonymous and unknown-token requests | still refused (`Not signed in`) |

Two things this surfaced that were not code defects:

* **`status` claimed `"driver":"mysql"` unconditionally.** True on hosting, wrong in a local run; the
  admin shows this string to the owner, so it now reports the driver really in use (`PDO::ATTR_DRIVER_NAME`).
  The System-check card likewise said "MySQL connection → MySQL SQLite 3.51.0"; it now says
  "Database connection → SQLite 3.51.0".
* **`invoice-probe` measured too early.** It waited a fixed 1.2 s after opening the tracker; the real
  backend can take longer, so it read "no rows" mid-load and reported a defect that did not exist. It
  now waits for the tracker to finish loading (`#it-rows` no longer saying "Loading" and the year
  selector populated). A probe that guesses timing will lie about a slower-but-correct server.
