# Release Gate Checklist (prompt §12)

Current recommendation: **BLOCK.** Gates are marked MET, PARTLY MET, NOT MET, or BLOCKED.

## Gate A — Scope integrity: PARTLY MET
- [x] Known Woodex trees inventoried (`02-resource-inventory.md`).
- [ ] Unknown or inaccessible assets listed for all projects (eight projects not audited, see `02`).
- [x] Authorisation and environment boundaries recorded (`01-scope-and-methodology.md`).
- [x] Technology detection supported by evidence.

## Gate B — Baseline integrity: PARTLY MET
- [x] Revision and working-tree state captured (`24157f6`; the pack commit is recorded in `manifest.json`).
- [x] Baseline tests run or blockers recorded (`18-test-and-validation-report.md`).
- [x] Source-of-truth and duplicate trees identified (RC-1).
- [ ] Backup and rollback readiness assessed: **BLOCKED** (no access; L-17).

## Gate C — Finding quality: MET for this pack
- [x] Stable IDs, evidence labels, E-levels.
- [x] Hypotheses marked and given confirmation steps.

## Gate D — Fix quality: PARTLY MET
- [x] Four narrow fixes with tests (C-001 to C-004).
- [ ] Rollback tested. Not tested in any environment.

## Gate E — Functional and technical verification: NOT MET
- [x] Syntax checks pass for the pro tree.
- [x] Browser tests for changed behaviour (T-16, T-17, T-18): PASS in headless Chromium with a stub API on the local copy (`browser-regression-2026-10-11.txt`). Live-site browser run: NOT RUN (needs owner approval).
- [ ] Negative and failure cases tested in the live system: BLOCKED.
- [ ] Data persists after reload or restart: NOT RUN.
- [ ] Concurrency and stale-response tests: BLOCKED (PHP runtime; L-8).
- [ ] Permissions and tenant isolation: NOT RUN.
- [ ] UI checked across viewports, themes, and inputs: NOT RUN (jsdom only).

## Gate F — Deployment: BLOCKED
- [ ] Environment-specific configuration verified: BLOCKED.
- [ ] Private resources inaccessible publicly: BLOCKED (AD-25; Phase 10 step 1).
- [ ] Caching and build hashes match: NOT MET (AD-26; no `?v=`).
- [ ] Smoke tests pass: NOT RUN (`smoke-test-checklist.md`).
- [ ] Backup, rollback, monitoring, and owner documented: PARTLY (rollback in `20`; monitoring UNKNOWN).

## Gate G — Packaging: BLOCKED
- [ ] One verified source tree packaged: NOT MET (D-3 pending).
- [ ] Manifest contains revision and file hashes: PARTLY (pack manifest only).
- [ ] Secret and private-data scan passes: **NOT MET** (SEC-001 to SEC-003).
- [ ] QA results match the exact artifact: NOT MET.
- [ ] Critical gates passed or release explicitly blocked: **BLOCKED**, as stated.
