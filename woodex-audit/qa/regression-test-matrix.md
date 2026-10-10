# Regression Test Matrix

Each row maps a finding to its test, the last result, and what is still needed. "Fixed pending verification" is not closure.

| Finding | Change | Test | Last result (this pass) | Needed for closure |
|---|---|---|---|---|
| AD-05 | Not started (static fake status remains) | Harness `#/settings/integrations` | Prior: 14 `connected:true` static | Phase 3 step 1–2; browser test |
| AD-06 | C-001 wording (Save) | `regression_static.py`; `node --check`; jsdom and headless browser T-16 | 15/15 PASS; T-16 PASS (browser and jsdom) | Live Save action |
| AD-07 | C-001 wording (Ping) | `regression_static.py`; jsdom and headless browser T-16 | 15/15 PASS; T-16 PASS (browser and jsdom) | Real health check, or permanent honest label; live check |
| OV-01 | C-002 base dashboard guard | jsdom `test-dashboard-error.js`; headless browser T-18 (editor) | Editor BEFORE: 1 page error; AFTER: 0 page errors, no stuck Loading | Support role in browser |
| OV-03 | C-003 owner dashboard guard | jsdom `test-dashboard-error.js`, `happy-dash.js`; headless browser T-18 | AFTER: error card or no crash; happy path unchanged; browser 0 page errors | Owner-path browser run with an incomplete payload |
| A11Y-001 | C-004 estimator labels | jsdom `a11y-labels.js` | HEAD 3 → WORKING 0 | Screen-reader check (not run) |
| AD-01 / AD-02 | None (plain tree) | `node --check` on every tree | Plain: 3 SyntaxErrors; pro: 62/62 PASS | Phase 1 decision and removal |
| AD-03 / AD-04 | None | Harness `#/integrations` | Prior pro run: no Phase text | Phase 2 |
| AD-10 | C-008 (line 203 removed, both trees) | `approvals-race.js`; headless browser `approvals` and `approvals-initial` (seeds 1-8) | Navigation: pre-fix Security 1/1, post-fix queue 1/1. Fresh load: pre-fix Security 3/8, post-fix queue 8/8 | Live browser check; owner confirms intended view (D-13) |
| AD-13 / AD-14 | None | `sidebar-probe.js` | Sidebar `rgb(10,12,16)` in both themes | Phase 9 |
| AD-15 / AD-16 | None | `theme-probe.js` `THEME=light` and `THEME=dark` | Prior: 15 light-text nodes on dark cards per mode | Phase 9 |
| AD-20 | None | `phplint.js` (parse only) | 48/48 PASS (parse only) | Runtime test BLOCKED (D-10) |
| AD-21 / AU-01 / WC-03 | None | Concurrency harness | Not run (PHP runtime BLOCKED) | Phase 4, Phase 5 |
| WC-01 | None | Two-tab save test | Not run | Phase 7 step 2 |
| SEC-001 / SEC-002 / SEC-003 | None | Secret scan (`detect-secrets`); bcrypt boolean check | Scan: 219 files / 395 hits; literal matches none of the committed hashes | Owner rotation; Phase 0 |
| AD-24 | None | `gh repo view --json isPrivate` | Public (OBSERVED) | Owner decision |
| AD-25 | None | `curl -I` on private paths | Not run | Phase 10 (live, read-only) |
