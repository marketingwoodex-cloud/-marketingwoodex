# Woodex Master TODO — QA and Fix Plan

**Date:** 2026-10-11 (Asia/Karachi)
**Branch:** `arena/4ba510f0-marketingwoodex`
**Source of truth:** `woodex-live-p29-v2.1-pro/` only. Other copies are read-only references.
**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked (needs your approval or an owner action)

Credential values are never written here. Credentials are referred to by file and fingerprint only.

---

## 0. What the audit found (basis for this plan)

| Area | Fact | Source |
|---|---|---|
| Release status | Existing QA verdict is **BLOCK**. Runtime checks were partial, not production-verified. | `QA-MASTER-REPORT-P29-V2.1-PRO.md` |
| Old shared password | Still present in **119 tracked files**. The admin sign-in no longer uses it (commit `75ecf7d`). It is still in the **public** `downloads.html` of the live tree, which tells visitors to sign in with it. | `git grep` count |
| Repo visibility | Repository is **public** (`isPrivate: false`). You approved "private after the deploy check". | `gh repo view` |
| Tracked secrets | `.env`, `config.php`, and `_private/*` (including `db.json`, `admin-db.json`, `outbox.jsonl`) are tracked. Untracking needs approval (G3, you answered "not yet"). | `git ls-files` |
| Login API | Password-only. `wx_users` with `password_verify`, throttle, demo expiry, 2FA ticket path, forgot/reset with HMAC token. | `api/admin.php` `case 'login'`, `pw_forgot`, `pw_reset` |
| Google sign-in | UI button is a stub. It shows "not set up yet". There is no OAuth code in the sign-in path. | `admin/admin.js` SSO handler |
| Database | 20 `wx_*` tables. Schema in `woodex-database.sql` and `_database/woodex-v20.sql`. Not verified to match each other. | `CREATE TABLE` count |
| Admin | 64 admin JS modules, 64 views, 31 `case` actions in `api/admin.php`, 44 PHP files in `api/`. | file counts |
| Public site | 144 `index.html` pages in the live tree. | file count |
| Runtime limits | PHP runs in syntax-only mode (no install approved). Real MySQL and real Google OAuth cannot be tested in this sandbox. | constraints |

---

## Phase 0 — Security containment (do first)

- [!] **0.1 Remove the old password from the public `downloads.html`** in the live tree. Approval needed (public page text change).
- [!] **0.2 Remove the old password literal from all other tracked files in the live tree.** Admin files are already clean. Remaining files in the live tree need a list (run `git grep -l` on `woodex-live-p29-v2.1-pro/`). Approval needed.
- [ ] 0.3 Other copies (`frontend-v1`, `p22-preview`, `p23-live`, `woodex-live-p23`, `woodex-live-v3`, `woodex-vlive-P20`, etc.) are read-only references per your rule. Report only. Do not edit.
- [!] 0.4 **Credential rotation.** Owner action in each provider console (database, Telegram, any Google keys). I cannot do this. Needed before go-live.
- [!] 0.5 **Untrack `.env`, `config.php`, `_private/`, and SQL dumps.** Requires G3 approval (you answered "not yet"). Re-ask when ready.
- [!] 0.6 **Repository visibility.** Make private only after the Hostinger deploy check passes and the deploy guide no longer depends on GitHub raw links. You confirm.
- [ ] 0.7 History rewrite to remove secrets from past commits: **not approved** (G15). Do not do it without a new instruction.

---

## Phase 1 — Sign-in (login, Google, redesign)

### 1A. Email and password login
- [x] Email is remembered in browser storage (`wxaLastEmail`, commit `70c12cb`). The password is never stored.
- [x] Built-in default password removed from the admin UI (commit `75ecf7d`).
- [x] Browser test: email and password sign-in works with `the email set in PREVIEW_EMAIL`. Preview only; the live database is not connected.
- [ ] 1A.1 Confirm what you saw when you tested. Your last message did not say whether it worked.
- [ ] 1A.2 Empty-field messages: the browser's required check runs first. Decide whether to keep native messages or show our own text.
- [ ] 1A.3 Wrong password: throttle lockout message appears and the counter resets after success.
- [ ] 1A.4 Two-factor step (`need2fa` ticket) renders and accepts a code. Preview stub does not cover it. Mark as "not testable in sandbox" until a real database exists.
- [ ] 1A.5 Forgot password: always gives the same reply. Reset link expires after 1 hour. Reset link cannot be reused.
- [ ] 1A.6 Demo account expiry shows the "demo expired" message.
- [ ] 1A.7 Session expiry sends the user back to sign-in without losing unsaved work where possible.

### 1B. Google sign-in (only for allowed emails) — **decision needed**
- [!] 1B.1 Confirm the rule. Proposed: Google sign-in succeeds only when the Google account email matches an **active** user in `wx_users` (Team & roles). All other emails are refused with a clear message.
- [ ] 1B.2 Server-side check: verify the Google ID token signature, audience, issuer, `email_verified = true`, and the email must be in `wx_users` with `active = 1`.
- [ ] 1B.3 Owner setup: OAuth client ID and secret entered in Settings (not in code, not in chat). Authorised redirect URL documented.
- [ ] 1B.4 Until OAuth is set up, the Google button stays disabled with the "not set up yet" message (current behaviour).
- [ ] 1B.5 Test: allowed email signs in; unknown Google email is refused; unverified email is refused. Real Google cannot be tested in this sandbox. Use a mocked token check in tests.

### 1C. Sign-in page redesign (visual reference: Preline)
- [!] 1C.1 Approval needed before building. Preline is a **visual reference only**. Build our own code with Woodex colours, brand blue `#2563eb`, and the same layout ideas (centred card, clear labels, inline errors, clear primary button). Do not copy any template file.
- [ ] 1C.2 Design pass: before screenshots (light and dark, desktop and mobile), after mockups, your approval.
- [ ] 1C.3 Build with shared tokens. Motion 150–200 ms. Honour `prefers-reduced-motion`.
- [ ] 1C.4 Fix known issue: in light mode the "Continue with Google" label is white on a white button. Fix as part of the redesign.
- [ ] 1C.5 Light and dark panels both readable (contrast check). Focus rings visible. Keyboard-only sign-in works.
- [ ] 1C.6 Mobile layout checked at 375 px and 768 px.

---

## Phase 2 — Database modules

- [ ] 2.1 Compare `woodex-database.sql` with `_database/woodex-v20.sql`. Record differences. Pick one source of truth with you.
- [ ] 2.2 List all 20 `wx_*` tables with purpose, owner module, and the PHP file that reads or writes them.
  - `wx_users`, `wx_throttle`, `wx_activity`, `wx_settings`, `wx_clients`, `wx_leads`, `wx_lead_notes`, `wx_quotes`, `wx_invoices`, `wx_projects`, `wx_bookings`, `wx_templates`, `wx_chats`, `wx_chat_msgs`, `wx_notify_log`, `wx_ai_events`, `wx_ai_unans`, `wx_wa_seen`, `wx_tg_seen`, `wx_tg_map`
- [ ] 2.3 Check each table for: primary key, indexes on lookup columns (for example `wx_users.email` unique), column types, and default values.
- [ ] 2.4 Check that every `case` in `api/admin.php` and the libs uses prepared statements (`q()` with params). No string concatenation of user input.
- [ ] 2.5 Check that passwords are hashed with `password_hash` and no plain text is stored.
- [ ] 2.6 Backup and restore: the backup module produces a file that restores into an empty database. Test if a MySQL instance is available; otherwise mark **blocked (sandbox)**.
- [ ] 2.7 Migrations: a fresh install and an upgrade from the previous schema both work.
- [ ] 2.8 PHP parse lint for every `api/*.php` (syntax only, as approved).

---

## Phase 3 — Admin pages (all 64 views)

For each view, check: loads without console errors · empty state · error state · light and dark · mobile · role permissions (owner, admin, manager, editor, viewer).

- [ ] 3.1 OVERVIEW: Dashboard, Approvals
- [ ] 3.2 SALES: Leads, Pipeline, Bookings, Clients, Quotes & invoices, Projects, Timeline
- [ ] 3.3 AUTOMATION: Inbox, Team feed, WhatsApp, Telegram, AI centre
- [ ] 3.4 WEBSITE & CMS: Pages, Builder, Media, Portfolio, Testimonials, SEO, Redirects, Blog/insights
- [ ] 3.5 ADMIN & SETTINGS: Team & roles, Settings, Integrations, Security, Updates, Reports, Print
- [ ] 3.6 Sidebar rail (approved, commit `819dd81`): verify on every view. Remaining item: `--side-bg` / `--side-fg` tokens. The old `!important` block is still in place and will be removed only after your approval.
- [ ] 3.7 Create/edit/delete flows on each module write to the database and survive a reload.
- [ ] 3.8 Hostinger note: sidebar, theme and pin settings live in browser storage. A move to a new domain resets them. Decide: keep and document (your choice so far), or move to the server (needs database work and approval). Document in the Hostinger upload notes.

---

## Phase 4 — Public site (144 pages)

- [ ] 4.1 Crawl all pages for broken links, missing images, and console errors.
- [ ] 4.2 Forms (contact, book a visit, estimator, downloads) submit and show a confirmation. Check the notification email path.
- [ ] 4.3 `robots.txt`, `sitemap.xml`, canonical tags, and `llms.txt` match the live URLs.
- [ ] 4.4 Remove any password or secret text from public pages (see Phase 0).
- [ ] 4.5 Mobile layout checked on a sample of 10 pages from each section.

---

## Phase 5 — Deployment (Hostinger)

- [ ] 5.1 Upload package boots with no extra setup.
- [ ] 5.2 Deployment guide has no dependency on GitHub raw links.
- [ ] 5.3 Staging test on the subdomain, then cutover checklist.
- [ ] 5.4 Owner rotates credentials before go-live (Phase 0.4).

---

## Phase 6 — Repository hygiene

- [ ] 6.1 Confirm the open pull requests stay open (#5, #4, #1), as you chose.
- [ ] 6.2 Remove dead tooling that is not used (only after you approve a list).
- [ ] 6.3 Keep generated artifacts out of Git. Store evidence under `deliverables/` only when needed.

---

## Blocked in this sandbox (needs your environment)

- Real MySQL database (Phase 2.6, 1A.4, 3.7).
- Real Google OAuth (1B.5).
- PHP runtime beyond syntax checks (approved as syntax-only).
- Live site checks (production is not reachable from here).

## Decisions needed from you (ask before building)

1. Google sign-in rule (1B.1).
2. Approve the sign-in redesign direction (1C.1) after the design pass.
3. Approve removal of the old password from public and tracked files in the live tree (0.1, 0.2).
4. What happened when you tested login (1A.1).
