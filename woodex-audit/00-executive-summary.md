# Executive Summary

## Overall status
- **Audit scope:** Woodex admin system (OVERVIEW, SALES, AUTOMATION, WEBSITE & CMS, ADMIN & SETTINGS) in `woodex-live-p29-v2.1-pro`, plus a repository-wide secret registry and the duplicate trees.
- **Environments actually inspected:** local git checkout only (commit `24157f6`). jsdom harness; PHP parse lint; static scans. **No live, staging, or database environment was inspected.**
- **Revision/build:** `24157f6` (pack revision recorded in `manifest.json`).
- **Audit date:** 2026-10-11.
- **Overall risk:** **Critical** (credential exposure, uncontained).
- **Release recommendation:** **Block.** Do not package or release until the Critical items in `21-release-readiness.md` are contained and verified.

## What matters most
1. **SEC-001 / SEC-002 (Critical) — an owner sign-in credential and the database password are published.** `downloads.html` (public page) tells visitors to sign in at `/admin/` with a master account email and a literal password. The same literal is the database password in `.env` and `config.php`, and is pre-filled and auto-submitted by the browser-served admin login (`admin/index.html:43`, `admin/admin.js:235`). The literal is in 151 tracked files. Live validity is **UNKNOWN**: it does not match the committed `wx_users` bcrypt hashes (0 of 6 in each dump; method validated with controls), but the live database is not accessible.
2. **SEC-003 (Critical) — one Telegram bot token is in 36 tracked locations** across 9 trees, including browser-served `admin/admin-tg.js`, both SQL dumps, `.env`, `.env.example`, `config.php`, and a root Markdown breakdown document. One value, one fingerprint.
3. **AD-24 (Critical) — the repository is public** and the secret-bearing files are tracked, with no `.gitignore` coverage for them. Visibility, rotation, and history rewrite are waiting on owner decisions. The owner deferred visibility ("later").
4. **AD-19 / AD-21 (Critical) — persistence can fail closed into a broken state.** `jwrite` truncates before locking; `jread` takes no lock; `bsecret` regenerates the signing secret on an empty read, invalidating every admin and builder token. Not reproduced live (STATIC).
5. **AD-05 / AD-06 / AD-07 (High) — the Integrations screen reports success it does not have.** Wording is now honest ("Not verified", "Not saved"), verified by static check. The underlying hard-coded `connected:true` entries remain (In progress).

## Findings by severity
Counts computed from the 60 rows of `06-defect-verification-matrix.md`. "Verified" = Fixed pending verification or Verified fixed; "Blocked" = needs live or runtime access.

| Severity | Count | Fixed pending verification | Hypothesis | Blocked (status says BLOCKED) |
|---|---:|---:|---:|---:|
| Critical | 8 | 0 | 0 | 0 |
| High | 28 | 5 | 2 | 3 |
| Medium | 17 | 1 | 2 | 0 |
| Low | 3 | 0 | 0 | 0 |
| Informational | 3 | 0 | 0 | 0 |
| Withdrawn | 1 | 0 | 0 | 0 |

Counts are computed per label, so a row can carry two labels (AD-25 is both a hypothesis and blocked). "Fixed pending verification" rows: AD-06, AD-07, AD-10, OV-01, OV-03 (High) and A11Y-001 (Medium). None is closed. Hypothesis High rows: AD-25, WC-05. Blocked High rows: AD-20, AD-25, SA-03. No Critical row is fixed pending verification.

## Category status
| Category | Status | Coverage | Main risk | Limitation |
|---|---|---|---|---|
| OVERVIEW | Partially audited | Dashboard loaders (both owner and base paths), navBadges | Dashboard shows "Loading" or crashes on bad payload | jsdom only; real payloads not tested |
| SALES | Partially audited | CRM/enquiry poll and ownership, sales library | Duplicate owners; no error handling | No live CRM data |
| AUTOMATION | Partially audited | WhatsApp cron lock, chat/TG polling | Cron/admin writes race; silent busy | No live cron run |
| WEBSITE & CMS | Partially audited | Builder save, asset paths, router | Lost updates; builder logs out | No live builder session |
| ADMIN & SETTINGS | Partially audited (largest) | Registry, Integrations, theme, persistence, deployment rules | Fake status; registry collisions | No live host or browser |
| Security | Partially audited | Secrets (repo-wide scan), auth/admin login path | Published credentials | Live login not tested (authorisation) |
| SEO / content | Partially audited (static) | robots/sitemap present; missing assets; metadata gaps | Broken images; thin metadata | No crawl, no live search data |
| Accessibility | Partially audited | Estimator labels (fixed); contrast from CSS source | Contrast failures in light theme | No screen reader, no WCAG tooling run |
| Performance | Not audited (static notes only) | Polling, payload sizes | Unknown real-user performance | No Lighthouse/CWV run |
| Deployment / DevOps | Partially audited (static) | `.htaccess`, Dockerfile, cache headers | Deny rules may not apply | No live curl checks |
| Database | Partially audited (static) | Writes, locks, dumps | Lost updates; dumped personal data | No database access, no restore test |

## Business impact
- **Security/data exposure:** A published owner credential and a database password are the most urgent items. A public Telegram token can send messages as the bot. Any one of these can give unauthorised access to customer enquiries. **Impact depends on the live state, which is unknown.**
- **Revenue/customer journey:** Enquiry handoffs, quotes, and approvals depend on the same persistence layer as AD-19/21 and AU-01. A corrupt or reset file interrupts them.
- **Reliability/operations:** Silent busy returns and unguarded error paths produce intermittent failures that are hard to diagnose.
- **Search visibility/accessibility:** Missing images, weak metadata, and light-theme contrast are real but lower-risk.
- **Maintainability/release risk:** Four duplicate admin trees, 20 view keys with multiple owners, and 6 committed copies of one token make every fix risky.

## Recommended next steps
- **Immediate containment (owner action, now):** (a) change the master account password and the database password in the hosting panel; (b) revoke and regenerate the Telegram bot token in BotFather; (c) remove the sign-in line from `downloads.html` and the pre-filled/fallback literal from `admin/index.html` and `admin/admin.js` (needs approval: changes the authentication UI, §5.3); (d) confirm `/_private/`, `/_database/`, and `*.sql` return 403/404 on the live host.
- **Next remediation phase:** Phase 0 → 2 in `16-remediation-roadmap.md` (containment, source-of-truth, registry).
- **Required decisions:** repository visibility (currently public; owner said "later"); credential rotation scope; approval for history rewrite; approval for a Node 24 runtime for PHP tests; which tree is the source of truth.
- **Release blockers:** SEC-001, SEC-002, SEC-003, AD-24, AD-19, AD-21, and the missing live verification in `21-release-readiness.md`.

## Confidence and limitations
- **Verified in this pass (RUNTIME, jsdom):** owner dashboard no longer crashes on a bad payload; happy path unchanged; estimator labels 3 → 0.
- **Verified in this pass (STATIC):** overstated status wording removed in both trees; mirrors byte-identical; 14/14 regression checks at the time of the C-001 fix; 15/15 after the mirror check was added and C-008 applied; re-verification 56 PASS / 10 INFO / 0 FAIL after the AD-10 expectation update.
- **Not verified:** any live behaviour; whether published credentials are active; browser behaviour after the settings edit; approvals race (AD-10); PHP runtime behaviour of AD-20.
- **Withdrawn:** AD-22 (cited counter `seqL` is data-only, not code).
