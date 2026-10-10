# Scope and Methodology

## Authorised scope
- Repository `marketingwoodex-cloud/-marketingwoodex`, branch `arena/4ba510f0-marketingwoodex`, read access via local checkout. Owner authorised the audit and the containment work described in `24-decision-log.md`.
- **Primary target:** `woodex-live-p29-v2.1-pro/` (OVERVIEW, SALES, AUTOMATION, WEBSITE & CMS, ADMIN & SETTINGS).
- **Registry:** every tracked top-level project is listed in `02-resource-inventory.md`. Projects not audited are marked *Not yet verified*.
- **Out of scope / not authorised:** production hosts, Hostinger panel, Render service, Telegram/WhatsApp APIs, live database, any external message. No live request was made to any Woodex host during this pass.

## Method (prompt §8 phases)
| Phase | Done | Result |
|---|---|---|
| 0 Safety & containment | Scope recorded; secret locations inventoried by **name only**; no values printed except one accidental display (see `22`, item L-1) | Containment items escalated; owner decisions logged |
| 1 Inventory & stack | Repository, trees, manifests, entry points, routes, API actions | `02`, `03` |
| 2 Baseline | `node --check` (all admin JS), PHP parse lint, jsdom harness, re-verification and regression scripts | `18` |
| 3 Category audits | Static code reads with line cites; RUNTIME jsdom probes for dashboard, estimator, settings | `08`–`15` |
| 4 Root cause & matrix | Symptoms grouped to root causes RC-1..RC-7 | `06`, `07` |
| 5 Remediation planning | Ordered per prompt §5 and the Woodex pattern | `16` |
| 6 Safe fixes | Three narrow changes, each with a test and a rollback | `17` |
| 7 Regression | Narrow tests + re-verification + regression script; before/after on HEAD tree | `18` |
| 8 Staging/deploy | **Not performed** — no staging or live access | `15`, `20` |
| 9 Packaging | **Not performed** — gates not passed | `21` |

## Evidence protocol
- Every finding has an evidence label and E-level (`README.md`).
- Secret values were never written to any file. Token and password values were compared by **fingerprint** only (SHA-1 from `detect-secrets`; SHA-256 prefix for the literal). Their shape is recorded, not the value.
- Credential checks used local committed data only. Bcrypt verification was validated with a positive and a negative control (`18`).

## Tools and versions
- Node v22.22.3, npm 10.9.8; jsdom 24; php-parser 3 (PHP 8.2 grammar); PHP **not installed** (no runtime).
- Python 3.11.2; `detect-secrets` 1.5.0 (isolated venv outside repo); `crypt` (bcrypt, deprecated in 3.11 but used only for local comparison).
- `gh` CLI (authenticated) for `gh repo view`.

## Known limits of the method
- jsdom does not lay out pages, resolve `var()`, or provide canvas. Colour findings are CALC/STATIC, not computed-style RUNTIME.
- Harness API responses are hand-written stubs. They prove code paths, not real data behaviour.
- Static analysis cannot prove a live `.htaccess` is honoured by the real server.
- `detect-secrets` finds high-entropy strings and keywords; it has false positives (see SEC-006) and can miss credentials in unusual formats.
