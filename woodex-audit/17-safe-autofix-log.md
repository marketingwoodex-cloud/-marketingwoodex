# Safe Auto-Fix Log

Author: audit agent (this session). Repository: `marketingwoodex-cloud/-marketingwoodex`, branch `arena/4ba510f0-marketingwoodex`. Each change is listed with its commit, files, tests, and rollback. No production system was touched. No secret value was written.

| Change | Commit | Finding IDs | Files (pro tree and `frontend-v1` mirror, byte-identical) | Before → after | Why safe | Tests (actual) | Rollback |
|---|---|---|---|---|---|---|---|
| C-001 | `46045f2` | AD-05, AD-06, AD-07 | `admin/admin-settings.js` | Overstated wording (the "saved live!" toast with no request, the canned "Ping successful: 200 OK" text, and the "connected" status wording) → honest wording ("Not saved", "Not verified… No request was sent"). 9 exact-match edits, each asserted to occur once. | Text only; no new request, no removed control. | `node --check` PASS; `regression_static.py` 14/14; `reverify_findings.py` 56/10/0. **Browser test not run.** | `git revert 46045f2` |
| C-002 | `46045f2` | OV-01 | `admin/admin.js` | Dashboard loader: payload guard + `dashFail` + `.catch`. | Catches error; no data changed. | `node --check` PASS. Owner-chain jsdom: BEFORE crash (`Object.keys`), AFTER error card. | `git revert 46045f2` |
| C-003 | `46045f2` | OV-03 | `admin/admin-dash.js` | Owner/admin dashboard: payload guard (`crm.kpi`, `crm.chips`, `axis`) + `.catch` showing error card in `#dx`. | Same class as C-002. | `node --check` PASS. jsdom: incomplete payload BEFORE crash, AFTER error card; realistic payload BEFORE/AFTER both render, no error (no regression). | `git revert 46045f2` |
| C-004 | `46045f2` | A11Y-001 | `estimator/index.html` | `aria-label` on `#est-name`, `#est-phone`, `#est-email`. | Attribute only. | jsdom: unlabelled visible controls HEAD 3 → WORKING 0. | `git revert 46045f2` |
| C-005 | `7f3f413` | SEC-005, AD-24 (triage) | `woodex-audit/evidence/…/triage-2026-10-11.txt` | Evidence only. | — | — | — |
| C-006 | `24157f6` | Tooling | `tools/qa-p29/package.json` (reverted), `woodex-audit/evidence/…/php-runtime-attempt-2026-10-11.txt` | `@php-wasm/node` install not committed to manifest. | Dependency kept out of git. | `loadNodeRuntime` loads; PHP run fails (Node version). | n/a |
| C-008 | *(uncommitted at time of writing; see commit that adds this row)* | AD-10 | `admin/admin-security.js` (line 203 removed; replaced by a comment) and `frontend-v1/admin/admin-security.js` (identical) | `#/approvals` after in-app navigation rendered the Security page; now renders the approvals queue. | Removes a second owner for one view key; no other behaviour changed. | Pre-fix navigation: security 3/3 (committed tree). Post-fix: navigation queue 4/4; initial load queue 4/4; reversed control queue 1/1; `#/security` renders, 0 errors; `node --check` both files; `regression_static.py` 15/15 (mirror list now includes this file); `reverify_findings.py` 56 PASS / 10 INFO / 0 FAIL after expectation update. Browser (headless Chromium, stub API): navigation queue 1/1 post-fix (pre-fix Security 1/1); fresh load on `#/approvals` queue 8/8 post-fix, Security 3/8 pre-fix (`browser-regression-2026-10-11.txt`). | Restore `W.VIEWS.approvals = W.VIEWS.security;` in both trees |
| C-007 | *(this pack commit)* | Re-verification | `woodex-audit/evidence/scripts/reverify_findings.py` (label and expectation corrections for anchored checks); `regression_static.py` (new) | Script expectations only. | Read-only script. | 56/10/0 and 14/14 after change. | `git revert` |

## Changes considered and NOT applied
| Change | Reason not applied | Approval needed |
|---|---|---|
| Remove pre-filled literal and fallback in login (SEC-001) | Changes authentication UI behaviour (§5.3). | Yes |
| Remove sign-in line from `downloads.html` (SEC-002) | Public content change; owner should approve wording. | Yes (owner) |
| Untrack `.env*`, `config.php`, `_private/*`, dumps | Changes what ships; may break deploy. | Yes |
| Delete plain/space duplicate trees (AD-01, AD-02) | Destructive to tree contents. | Yes (D-3) |
| `jwrite`/`jread`/`bsecret` rewrite (AD-21) | Changes token and secret behaviour (§5.3). PHP runtime not available to test. | Yes |
| Error envelope (AD-20) | PHP runtime not available to test. | Needs runtime decision |
| Registry rewrite (AD-12) | Touches every module; broad change. | Design approval |

## Governance notes
- No `chmod 777` or world-writable workaround introduced.
- No production data touched; no database query run.
- Secret values never written to files. One accidental display of the shared literal in session output occurred during triage; see `22-open-questions-and-limitations.md`, item L-1.
