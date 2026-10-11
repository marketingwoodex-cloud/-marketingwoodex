# Performance and Reliability Audit

## Scope and method
Static review of polling, locks, cache policy, and asset sizes; static site audit script (`evidence/scripts/site_static_audit.py`) output. **No Lighthouse, WebPageTest, or real-user Core Web Vitals were measured.** No Core Web Vitals values are reported.

## Summary and risk
Medium. Polling without in-flight guards and non-atomic writes are the reliability risks. Asset payloads are large but not measured live.

## Findings
### AU-04 — Chat polls every 3 s with no in-flight guard (High)
`admin/admin-chat2.js:137` `setInterval(load, 3000)`. Slow responses overlap and can repaint older messages. Fix: self-scheduling `setTimeout` after each response. STATIC E2.

### AU-05 — Telegram and WhatsApp admin polling (Medium)
`admin/admin-tg.js:89`, `admin/admin-p18g.js:67`. Same pattern. STATIC E2 (reverify INFO).

### SA-01 — CRM poll every 60 s plus hashchange (Medium)
`admin/admin-crm.js:23`. Duplicate fetch. STATIC E2.

### OV-02 — Badge poll every 60 s (Low)
`admin/admin.js:165`. No in-flight guard. STATIC E2.

### AD-18 — Charts keep stale colours after theme toggle (Medium)
`admin/admin.js:328`, Chart.js at `admin.js:529–537`, `admin-dash.js:177`, `admin-reports.js:50`. Charts not rebuilt on toggle. STATIC E2.

### AD-21 — Non-atomic write and fail-open read (Critical, reliability)
Concurrent read of a truncated file gives a 503 for every admin request until the write completes. STATIC E2. Reproduction HYPOTHESIS (PHP runtime unavailable).

### PERF-01 — Large first-party payload (Medium)
Site static audit (`evidence/sanitized-command-output/site-static-audit-pro.txt`): first-party JavaScript ≈ 1,906,331 bytes, CSS ≈ 1,006,845 bytes. Two images at 623 KB each (`assets/img/img-469cf01b2548.jpg` and its `_orig` copy). These are byte counts from the repository, not transfer sizes.

### Cache policy (see AD-26) — High
`.htaccess:35–36` sets 30-day cache on JS/CSS without versioning. STATIC E2.

## Checks passed
- Retry and timeout logic: not reviewed in this pass.

## Checks not run / blocked
- Lighthouse / WebPageTest (**not run**; no approved test target).
- Real-user CWV (**BLOCKED**: no analytics access).
- Server response time, DB query count, slow query log (**BLOCKED**: no live DB).
- Load testing (**not run**; not authorised, and no staging).
- Backups and restore (**BLOCKED**; see `14`).
