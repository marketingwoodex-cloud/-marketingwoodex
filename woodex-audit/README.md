# Woodex Audit Pack — woodex-live-p29-v2.1-pro (+ repository registry)

| Item | Value |
|---|---|
| Repository | `marketingwoodex-cloud/-marketingwoodex` (**public**, `isPrivate: false`, checked 2026-10-11 via `gh repo view`) |
| Branch | `arena/4ba510f0-marketingwoodex` |
| Revision for this pack | `24157f6` (last code commit before pack) — pack commit recorded in `manifest.json` |
| Primary target | `woodex-live-p29-v2.1-pro/` (650 tracked files) |
| Secondary (registry) | 4 duplicate P29 trees, `frontend-v1/`, and about 20 other top-level projects (see `02-resource-inventory.md`) |
| Audit date | 2026-10-11 (Asia/Karachi) |
| Environments inspected | Local repository checkout, jsdom harness, PHP parse lint, static scans. **No live host, no staging, no database, no browser on the deployed site.** |
| Auditor role | Principal audit engineer (agent). Findings are attributed to tooling and evidence, not to people. |
| Overall release recommendation | **BLOCK** — see `21-release-readiness.md` |

## Pack contents
00 Executive summary · 01 Scope & method · 02 Resource inventory · 03 Architecture map · 04 Journey map · 05 Risk register · **06 Defect verification matrix** · 07 Root-cause analysis · 08 Security · 09 Performance & reliability · 10 SEO & content · 11 Accessibility · 12 UX & functional · 13 Backend & API · 14 Database integrity · 15 Deployment & DevOps · 16 Remediation roadmap · 17 Safe auto-fix log · 18 Test & validation report · 19 QA checklists · 20 Deployment & rollback · 21 Release readiness · 22 Open questions & limits · 23 Evidence index · 24 Decision log · `manifest.json` · `evidence/` · `qa/`.

## Status legend
Confirmed · Hypothesis · Blocked · Planned · In progress · Fixed pending verification · Verified fixed · Accepted risk · Won't fix · Withdrawn · New.
"Fixed pending verification" means code changed and a narrow test passed; it does **not** mean closed.

## Severity legend
Critical/P0 · High/P1 · Medium/P2 · Low/P3 · Informational. Priority score = Impact × Likelihood × Exposure (1–5, 1–5, 1–3); 40–75 = investigate immediately.

## Evidence labels
RUNTIME · STATIC · CALC · OBSERVED · EXTERNAL · HYPOTHESIS · UNKNOWN/BLOCKED. E0–E4 quality levels (E0 never closes a finding).

## Tests run vs not run
- **Run:** `node --check` on all admin JS (62/62 pro; 0 failures in `frontend-v1`); PHP parse lint (48/48, php-parser PHP 8.2 grammar); jsdom harness probes; re-verification script (56 PASS / 10 INFO / 0 FAIL); static regression script (14/14); repo-wide `detect-secrets` scan; local bcrypt verification against committed dumps (with positive/negative controls).
- **Not run:** any live HTTP check, browser on production or staging, PHP runtime execution (`@php-wasm/node` needs Node ≥24.18; sandbox has 22.22.3 — see `18-test-and-validation-report.md`), database restore test, backup verification, TLS/DNS/header checks, Lighthouse/Core Web Vitals, WCAG tooling.

## P0/P1 notice
**Credential exposure is Critical and is not contained.** The repository is public. The database password, a Telegram bot token, and an owner sign-in credential are committed and published (see `05-risk-register.md`, SEC-001 to SEC-003). Rotation and history rewrite need owner approval (`24-decision-log.md`).

## Confidentiality and evidence handling
This pack contains **no secret values, no email addresses, no bank details and no personal data**. Literal values are referred to by file and line, or by the short hash prefix produced by the scanner (for equality comparison only). Do not paste values into tickets. Treat `evidence/sanitized-command-output/` as access-controlled.

## Reproducing checks
See `evidence/README.md` and `tools/qa-p29/README.md`. Scripts: `woodex-audit/evidence/scripts/` (`reverify_findings.py`, `regression_static.py`, `site_static_audit.py`).

## Interpreting blocked items
"BLOCKED" means the check cannot run with current access. It is **not** a pass. Every blocked item has an exact next step in `22-open-questions-and-limitations.md`.
