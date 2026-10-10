# Validation Report

Revision `24157f6` (+ this pack). Date 2026-10-11. Result values: PASS, FAIL, BLOCKED, NOT RUN, NOT APPLICABLE. Raw outputs are in `evidence/sanitized-command-output/`.

| Test ID | Finding IDs | Environment | Command / steps | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|---|---|
| T-01 | AD-01, AD-02 | Local, Node 22.22.3 | `node --check` on every `admin/*.js` in pro | All pass | 62/62 PASS | PASS | `node-check-all-trees.txt`; re-run this pass |
| T-02 | AD-01, AD-02 | Local | `node --check` on plain `woodex-live-p29-v2.1/admin/*.js` | Fail (defect present) | 3 SyntaxErrors (`admin-settings.js:608`, `admin-chat.js:334`, `admin-social.js:333`) | PASS as defect check | `node-check-all-trees.txt` |
| T-03 | AD-20, CC-01 | Local, php-parser | `node phplint.js <pro>` | 48/48 parse | 48/48 | PASS (parse only) | `phplint-pro-after-fix.txt` |
| T-04 | OV-03, OV-01 | jsdom, HEAD tree | `test-dashboard-error.js`, owner path, `dash_data` missing `crm.kpi` | Crash (defect present) | `BEFORE: TypeError: Cannot convert undefined or null to object` | PASS as defect check | `remediation-verification-2026-10-11.txt` §1 |
| T-05 | OV-03 | jsdom, working tree | Same | Error card; no "Loading" | `AFTER: DASH_ERROR_SHOWN: true`, `STILL_LOADING: false` | PASS | same |
| T-06 | OV-03 (regression) | jsdom, HEAD and working tree | `happy-dash.js` (realistic `dash_data` shape, canvas shim) | Normal render, no error | Both: normal content, no error card | PASS | same §2 |
| T-07 | A11Y-001 | jsdom, HEAD and working tree | `a11y-labels.js` | 0 unlabelled visible controls | HEAD 3, WORKING 0 | PASS | same §3 |
| T-08 | All anchored IDs | Local | `reverify_findings.py .` | 0 FAIL | 56 PASS / 10 INFO / 0 FAIL | PASS | `reverify-findings.txt` |
| T-09 | AD-05, AD-06, AD-07, OV-01, OV-03, A11Y-001, mirrors | Local | `regression_static.py .` | 15/15 | 15/15 (14/14 before the `admin-security.js` mirror check was added) | PASS | `regression-static.txt` |
| T-10 | SEC-001..003, SEC-005, AD-27, AD-28 | Local (all tracked files, 7,286) | `detect-secrets scan` in batches | Report only | 395 hits, 219 files; Telegram 36 hits / 1 fingerprint; AWS 10 hits / 1 fingerprint | RECORDED | `secret-scan-tracked-2026-10-11.txt` |
| T-11 | SEC-002 | Local (committed data) | `evidence/scripts/bcrypt_literal_check.py <pro tree>` (boolean output only) | Controls pass; literal result boolean | Controls: positive True, negative True. Each dump: 6 `$2y$10$` occurrences, 1 distinct hash; literal matches 0 | PASS (controls); no committed match | `bcrypt-literal-check-2026-10-11.txt` |
| T-12 | AD-20 | Local, `@php-wasm/node` 3.1.57 | Load runtime, run `<?php echo PHP_VERSION;` | PHP output | Engine mismatch (requires Node ≥24.18); init error `processId must be set before init` | BLOCKED | `php-runtime-attempt-2026-10-11.txt` |
| T-13 | AD-24 | GitHub API via `gh` | `gh repo view --json isPrivate,name,owner` | Private | `isPrivate: false` | OBSERVED: public | command output (no token) |
| T-14 | SEC-005 | Local | Triage of AWS hit (context, fingerprint equality) | FP | False positive | PASS | `triage-2026-10-11.txt` |
| T-15 | AD-25, WC-05 | Live host | `curl -I` on `/_private/db.json`, `/_database/woodex-database.sql` | 403/404 | Not run | BLOCKED | none |
| T-16 | AD-05, AD-06, AD-07 | jsdom (`tools/qa-p29/ui-regression.js settings`) | Open `#/settings/integrations`; click first Connect, then Test Ping; click Save; check text for forbidden claims; count requests | No false success text; no request | HEAD: "Ping successful: 200 OK" and "saved live!" (2 forbidden claims). Working tree: "Not verified… No request was sent", "Not saved"; 0 forbidden claims; 0 requests | PASS (jsdom). Real browser: NOT RUN | `ad10-t16-t18-2026-10-11.txt` |
| T-17 | AD-10 | jsdom (`tools/qa-p29/approvals-race.js`) | Pre-fix: navigate to `#/approvals` with random script delays (3 seeds); post-fix: same, plus shipped order, initial load, and reversed control | Queue after navigation | Pre-fix: Security page 3/3 (navigation). Post-fix: queue 4/4 navigation, 4/4 initial load, reversed 1/1. Initial-load race not reproduced in any run | PASS (fix verified in jsdom). Browser: NOT RUN | `ad10-t16-t18-2026-10-11.txt` |
| T-18 | OV-01, OV-03 | jsdom (`ui-regression.js editor-dash editor`) | Editor role, `#/dashboard`, incomplete payload | No crash; no stuck "Loading" | Dashboard action called; editor sees the Website-health view (admin-appr.js:114), which overwrites the base loader's output; no crash, no Loading. Base error card not visible to editor. Owner chain verified earlier (T-04/T-05) | PASS (no crash/no Loading). Base card for editor: not observable | `ad10-t16-t18-2026-10-11.txt` |
| T-19 | PERF-01 | Browser | Lighthouse / CWV | Scores | Not run | NOT RUN | — |
| T-20 | DB | Database | Backup recency, restore | Restore to clean DB | Not run | BLOCKED | — |
| T-21 | AD-04, AD-05, AD-10 | Harness (pro, `#/dashboard`, prior run) | `harness-db-dashboard.txt` | Route renders; integration cards and approvals marker present | Dashboard renders; integration cards 0 on `#/dashboard`; approvals marker absent; 1 jsdom navigation error | INFO (prior run, not re-run) | `harness-db-dashboard.txt` |
| T-22 | AD-19, AD-21 | Harness (DB reconnect path) | Not run | Reconnect form reachable when DB file is missing | Not run | BLOCKED (needs `_private/db.json` test case) | — |

## Baseline failures
- Plain `woodex-live-p29-v2.1` and space-named plain copy: 3 SyntaxErrors (known; T-02).
- PHP runtime: unavailable (T-12).

## New failures
None introduced by this pass. `node --check` pro 62/62 after edits; `frontend-v1` 0 failures.

## Tests skipped / blocked
T-12, T-15, T-16, T-17, T-18, T-19, T-20.

## Browser/device matrix
Not run. Harness is jsdom only (no layout, no real canvas, `var()` unresolved).

## Security negative tests
- SEC-002: negative control in bcrypt check (wrong password rejected).
- T-09 negative control: against the `HEAD` extract the script reports 0/14 PASS. This is not a clean control because that extract has no `frontend-v1` tree; treat as a sanity check only.
- No live negative tests (authorisation; no live target).

## Persistence/concurrency tests
None run (T-12 blocked).

## Deployment checks
None run live (T-15 blocked).

## Remaining regression risks
- The OV-03 guard changes the owner dashboard's error path. A real payload with a missing field will now show a card instead of crashing; verify in browser that this card is acceptable.
- The Save text change: the button still does not persist. A user may read "Not saved" as a bug. Acceptable until T-16 and Phase 3 backend work.
