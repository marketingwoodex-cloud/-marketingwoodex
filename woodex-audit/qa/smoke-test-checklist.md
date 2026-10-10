# Smoke Test Checklist (post-deploy)

**Status: NOT RUN.** No live or staging environment was available. Every item is open. Mark each as PASS, FAIL, BLOCKED, or NOT RUN with the date, browser, and evidence (screenshot or log, with no secrets).

Environment: ______ · Revision/hash: ______ · Tester: ______ · Browser: ______ · Theme: light / dark · Cache: cold / warm

| # | Area | Check | Expected | Status | Evidence |
|---|---|---|---|---|---|
| S-01 | Access | `curl -I` on `/_private/db.json`, `/_private/system.json`, `/_database/woodex-database.sql` | 403 or 404 | NOT RUN | — |
| S-02 | Access | `curl -I` on `/router.php`, `/api/p18g-lib.php`, `/api/wa-cron.php?key=` (no key) | 403 or 404, or a JSON 403 without data | NOT RUN | — |
| S-03 | Secrets | Login form does **not** pre-fill a password | Empty field | NOT RUN (SEC-001 open) | — |
| S-04 | Public page | `downloads.html` contains no sign-in instructions with a password | None | NOT RUN (SEC-002 open) | — |
| S-05 | Auth | Sign in with a rotated test account | Dashboard loads | NOT RUN | — |
| S-06 | OVERVIEW | Dashboard renders counts and charts | Values shown | NOT RUN | — |
| S-07 | OVERVIEW | Dashboard with an incomplete payload (test stub) | Error card, not "Loading…" | NOT RUN (C-002/C-003 pending) | — |
| S-08 | SALES | Enquiries and leads screen loads; `#/enquiries/classic` reachable | Both views load | NOT RUN | — |
| S-09 | SALES | Lead handoff persists after reload | Same data after reload | NOT RUN | — |
| S-10 | AUTOMATION | WhatsApp opt-out survives a cron run | Opt-out still set | NOT RUN (AU-01 open) | — |
| S-11 | AUTOMATION | Busy cron tick is visible in UI | Message shown | NOT RUN (AU-02 open) | — |
| S-12 | AUTOMATION | Chat view does not repaint older messages | Newest only | NOT RUN (AU-04 open) | — |
| S-13 | WEBSITE & CMS | Page edited in two tabs gives `409` on second save | 409 shown | NOT RUN (WC-01 open) | — |
| S-14 | WEBSITE & CMS | Builder stays signed in after an admin save | Still signed in | NOT RUN (WC-03 open) | — |
| S-15 | WEBSITE & CMS | No 404 for images on the pages checked | None | NOT RUN (WC-04 open) | — |
| S-16 | ADMIN | `#/integrations` shows Settings, not "Phase undefined" | Settings | NOT RUN (AD-03/04 open) | — |
| S-17 | ADMIN | Integrations status matches server for one configured and one unconfigured provider | Matches | NOT RUN (AD-05 open) | — |
| S-18 | ADMIN | Save on Integrations: no success toast without a request | "Not saved" shown | Headless browser PASS (T-16, stub API); live NOT RUN | `browser-regression-2026-10-11.txt` |
| S-19 | ADMIN | `#/approvals` renders the approvals queue after in-app navigation | Queue | Headless browser PASS (stub API); live NOT RUN | `browser-regression-2026-10-11.txt` |
| S-20 | ADMIN | Sidebar and workspace both follow the theme | Consistent | NOT RUN (AD-13 open) | — |
| S-21 | ADMIN | `#/security` cards readable in light and dark | Contrast OK | NOT RUN (AD-15 open) | — |
| S-22 | DevOps | `admin/*.js` and `admin/*.css` cache headers | `no-cache` | NOT RUN (AD-26 open) | — |
| S-23 | Estimator | Name, phone, and email fields have accessible names | Labelled | jsdom only (A11Y-001) | `remediation-verification-2026-10-11.txt` §3 |
