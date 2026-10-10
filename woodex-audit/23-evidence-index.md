# Evidence Index

All files are sanitised: no credential values, no hash values, no bank details, no personal data. Paths are relative to `woodex-audit/`. Raw outputs that contained values were kept outside the repository and are not referenced here.

## sanitized-command-output/
| File | What it shows | Produced by | Status |
|---|---|---|---|
| `node-check-all-trees.txt` | `node --check` per tree. Plain trees fail (3 errors). | Earlier session | Prior run; pro re-checked (62/62) in this pass |
| `phplint-all-trees.txt` | PHP parse results per tree | `tools/qa-p29/phplint.js` | Prior run |
| `phplint-negative-control.txt` | Lint catches a known-bad file (`bad.php`) | same | Control |
| `phplint-pro-after-fix.txt` | Pro tree 48/48 parse after edits | same | Current |
| `reverify-findings.txt` | 56 PASS / 10 INFO / 0 FAIL on anchored findings | `scripts/reverify_findings.py` | Current |
| `regression-static.txt` | 14/14 static regression checks | `scripts/regression_static.py` | Current |
| `remediation-verification-2026-10-11.txt` | jsdom before/after for OV-01/OV-03 and A11Y-001 | `tools/qa-p29/test-dashboard-error.js`, `happy-dash.js`, `a11y-labels.js` | Current (jsdom only) |
| `secret-scan-tracked-2026-10-11.txt` | Per-hit type, line, path, fingerprint for all 7,286 tracked files (no values) | `detect-secrets` 1.5.0 | Current |
| `bcrypt-literal-check-2026-10-11.txt` | Boolean: literal matches committed hashes (0); controls pass | `scripts/bcrypt_literal_check.py` | Current |
| `triage-2026-10-11.txt` | html2pdf AWS false positive; visibility; plain Phase path | This pass | Current |
| `php-runtime-attempt-2026-10-11.txt` | `@php-wasm/node` attempt, Node version error | This pass | BLOCKED |
| `harness-pro-settings-integrations.txt`, `harness-plain-settings-integrations.txt` | Integrations screen on pro and plain | Earlier session | Prior run; not re-run after edits |
| `harness-pro-approvals.txt` | Approvals route on pro | Earlier session | Prior run |
| `harness-db-dashboard.txt` | `#/dashboard` on pro (renders; 0 integration cards on that route; 1 jsdom navigation error) | Earlier session | Prior run |
| `theme-probe-dark-security.txt`, `theme-probe-light-security.txt` | Light-text nodes on `#/security` in each mode | Earlier session | jsdom; `var()` not resolved |
| `sidebar-probe-dark.txt`, `sidebar-probe-light.txt` | Sidebar computed colour in each mode | Earlier session | jsdom; sidebar `rgb(10,12,16)` in both |
| `site-static-audit-pro.txt` | Static site metadata and sizes | `scripts/site_static_audit.py` | Current |

## scripts/
| File | Purpose | Network | Writes |
|---|---|---|---|
| `reverify_findings.py` | Re-checks anchored findings against the tree | none | stdout only |
| `regression_static.py` | Static regression checks for this pass | none | stdout only |
| `site_static_audit.py` | Static site metadata | none | stdout only |
| `bcrypt_literal_check.py` | Boolean-only hash check with controls | none | stdout only |

## Supporting files
| File | Purpose |
|---|---|
| `QA-MASTER-REPORT-P29-V2.1-PRO.md` (repo root) | Master QA report (v1). Revised separately; the matrix in `06` is the current source for findings. |
| `WOODEX_MASTER_AUDIT_SYSTEM_PROMPT (1).md` (repo root) | Governing prompt v1.0. |
| `tools/qa-p29/*.js` | jsdom harness and probes. Run copies from a folder with `jsdom` installed; they cannot `require` it in place. |
