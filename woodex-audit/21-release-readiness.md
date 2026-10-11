# Release Readiness

## Recommendation: **BLOCK**

A release cannot be recommended while SEC-001, SEC-002, SEC-003 and AD-24 are open. The gates below are not met.

| Gate (prompt §12) | Status | Reason |
|---|---|---|
| A. Scope integrity | Partly met | Registry built (`02`); other projects "Not yet verified". |
| B. Baseline integrity | Partly met | Revision recorded; baseline tests run except runtime; backups not verified. |
| C. Finding quality | Met for this pack | 60 unique IDs, evidence labels, hypotheses marked. |
| D. Fix quality | Partly met | Three narrow fixes with tests; no rollback test in production. |
| E. Functional/technical verification | **Partly met** | jsdom and headless Chromium (stub API, local copy) pass for T-16, T-17, T-18. Not met: live site, real API, PHP runtime. |
| F. Deployment | **Blocked** | No live access. Private-path protection unverified (AD-25). |
| G. Packaging | **Blocked** | Secrets still tracked; QA results do not yet match a packaged artifact. |

## Release criteria (§11.10) — checkboxes
- [ ] No unresolved Critical issue (**8 open**).
- [ ] High issues fixed or accepted by the owner in writing (**28 High; 5 fixed pending verification**).
- [ ] Build, syntax, security, regression and smoke tests pass (**syntax and regression pass; smoke not run**).
- [ ] Production access controls verified (**BLOCKED**).
- [ ] Backups and rollback documented and tested (**documented in `20`; not tested**).
- [ ] Artifact, revision, asset hashes and manifest agree (**manifest generated for the pack only, not for a release artifact**).
- [ ] Secrets and private data excluded from the package (**NOT met**).
- [ ] Monitoring and ownership clear (**owner named as role; monitoring UNKNOWN**).
- [ ] Open limitations and accepted risks visible (**this pack**).

## What would change the recommendation to "Conditional"
1. Owner has rotated SEC-001/002/003 and removed the literal from tracked files (verified by the secret-scan command).
2. Repository is private (verified by `gh repo view`).
3. Operator confirms private-path 403/404 on the live host.

For High rows that stay open, the owner must accept each one in writing with a mitigation before a conditional release.
