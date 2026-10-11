# Remediation Roadmap

Ordered per prompt §5 and the Woodex pattern: containment → source of truth → registry → truthful integrations → persistence → automation → error handling → dashboard/CMS → theme → deployment verification → packaging. Each task names its approval need.

## Phase 0 — Containment (owner action first)
**Objective:** stop active exposure of credentials and private files.
**Priority:** P0. **Dependencies:** none.
**Allowed autonomous work:** none that changes production or history.
**Approval required:** yes for history rewrite, visibility change, and auth-UI change.
**Files/services affected:** `downloads.html`, `admin/index.html`, `admin/admin.js`, `admin/admin-tg.js`, `.env*`, `config.php`, `_private/*`, hosting panel, BotFather, database.

### Tasks
- [ ] Rotate master account password and DB password (owner, hosting panel). Target: SEC-001, SEC-002.
- [ ] Revoke and regenerate Telegram token in BotFather (owner). Target: SEC-003, AD-27, AD-28.
- [ ] Remove the sign-in line from `downloads.html:70`. Target: SEC-002. **Safe after owner OK (content change).**
- [ ] Remove pre-filled value and fallback literal from `admin/index.html:43`, `admin/admin.js:235, 256, 274, 284`. Target: SEC-001. **Approval (auth UI).**
- [ ] Live curl check of `/_private/`, `/_database/`, `*.sql`, `router.php`. Target: AD-25, WC-05. **Owner or operator.**
- [ ] Make repository private (D-1). Target: AD-24.
- [ ] Plan history purge with collaborators (D-2). **Approval.**
- [ ] Untrack `.env*`, `config.php` secrets, `_private/*.json`, SQL dumps; add ignore rules. Target: AD-24, SEC-004, DB-01.

### Acceptance gate
- [ ] Repository visibility is private (OBSERVED via `gh repo view`).
- [ ] Old credentials are rejected (owner verification; not agent).
- [ ] Live curl returns 403/404 for private paths (BLOCKED until operator runs it).
- [ ] Secret scan (`detect-secrets`, same command) reports no token-shaped or literal hits in tracked files.

### Exit decision
Pass/Fail/Blocked: **Blocked** (owner action pending).

## Phase 1 — Build integrity and source of truth
**Objective:** one tree; every shipped JS parses.
**Dependencies:** Phase 0 started (so that a fork does not carry the literal).
**Approval:** yes for deleting duplicate trees (D-3).
- [ ] Choose source of truth (D-3). Target: AD-01, AD-02.
- [ ] Replace plain/space copies with the pro files, or delete them after approval.
- [ ] Add `node --check` gate and duplicate top-level symbol check to packaging. Regression test: `regression_static.py` extended.
- [ ] Re-run `reverify_findings.py`.

### Acceptance gate
- [ ] `node --check` passes on every shipped admin JS (pro: 62/62 today).
- [ ] No top-level symbol defined twice in one file.

## Phase 2 — Route and registry
**Objective:** one owner per view key; no silent fallback.
- [ ] Add NAV/alias entries for `integrations`, `business`, `connections`. Target: AD-04, AD-11.
- [ ] `register(key, fn, {owner})` with duplicate-owner error. Target: AD-12, RC-2.
- [ ] Fix approvals key collision and run the delayed-load test. Target: AD-10. **Test not yet run.**

### Acceptance gate
- [ ] Harness: `#/integrations`, `#/approvals`, `#/enquiries`, `#/enquiries/classic` each render the intended view.
- [ ] Harness with delayed `admin-security.js` renders the same result.

## Phase 3 — Truthful integrations
- [ ] Server `integrations_status` action (per provider `{configured, lastCheck}`; no secret values). Target: AD-05.
- [ ] Real Save action with `{ok:true}` check. Target: AD-06.
- [ ] Real Ping through server with timeout, or label "Not yet available". Target: AD-07.
- [ ] Fix tile targets to one container contract. Target: AD-08, AD-09.

### Acceptance gate
- [ ] Browser: each card status matches server response for a configured and an unconfigured provider.
- [ ] No "saved", "connected" or "200 OK" text without a successful request.

## Phase 4 — Persistence and concurrency (approval required)
- [ ] `jwrite` temp file + `rename()`; `LOCK_SH` in read; `LOCK_EX` around RMW. Target: AD-21, AD-22 (re-scoped).
- [ ] `bsecret` fails closed; never regenerates on empty read. Target: AD-21, WC-03.
- [ ] Separate builder token file with its own lock. Target: WC-03.
- [ ] Fix DB reconnect path: credentials separate from store. Target: AD-19.

### Acceptance gate
- [ ] PHP runtime test (**BLOCKED** until Node 24 or alternative runtime approved): concurrent writers produce no empty reads.
- [ ] Token signing unchanged for valid tokens; invalid tokens rejected.

## Phase 5 — Automation locking and polling
- [ ] `wag_mutate(fn)` with blocking `flock` for every writer. Target: AU-01.
- [ ] Explicit `busy` error codes and cron retry. Target: AU-02, WC-02.
- [ ] Fail-closed cron key; persist once at install. Target: AU-03.
- [ ] Self-scheduling polls for chat, TG, p18g, CRM. Target: AU-04, AU-05, SA-01.

### Acceptance gate
- [ ] Opt-out written by admin is preserved after a cron tick (PHP runtime test, BLOCKED until runtime).

## Phase 6 — Error envelope
- [ ] `catch (Throwable)` JSON envelope with `requestId` in `admin.php`. Target: AD-20, CC-01.
- [ ] Per-action try/catch in 12 libraries. Target: CC-02, SA-03.
- [ ] `set_exception_handler` fallback.

### Acceptance gate
- [ ] Induced `TypeError` returns JSON with `requestId`, not an empty 500 (PHP runtime test, BLOCKED).

## Phase 7 — Dashboard and CMS integrity
- [x] Owner dashboard guard and error card. Target: OV-03 (done, pending browser test).
- [x] Base dashboard guard. Target: OV-01 (done, pending role test).
- [ ] Builder content ETag and `409` on mismatch. Target: WC-01.
- [ ] `content-lib.php:50` returns error; caller checked. Target: WC-02.

### Acceptance gate
- [ ] Two-tab edit test returns `409` for the stale save (browser, BLOCKED until run).

## Phase 8 — Theme and visual system
- [ ] Delete `!important` sidebar block; add `--side-bg`, `--side-fg` tokens. Target: AD-13, AD-14.
- [ ] Replace literal palettes in `admin-security.js`, `admin-integ.js`. Target: AD-15.
- [ ] Scope light-background rules. Target: AD-16.
- [ ] Single `themeChanged()` for charts. Target: AD-18.

### Acceptance gate
- [ ] Browser: light and dark, desktop and mobile; contrast measured on rendered pixels (not jsdom).

## Phase 9 — Deployment verification (must pass before packaging)
- [ ] Live curl checks for private paths (AD-25).
- [ ] Cache policy and `?v=` on admin assets (AD-26).
- [ ] TLS and headers (not yet checked).
- [ ] Backup and restore drill (not yet checked).

### Acceptance gate
- [ ] All Phase 9 checks pass on the live host, or are explicitly accepted by the owner.

## Phase 10 — Packaging (only after Phase 9)
See `21-release-readiness.md`.
