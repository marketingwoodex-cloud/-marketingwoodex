# Changelog

## P25 — admin v2.5, first release (14 October 2026)

**What ships.** One payload: the live 150-page site (unchanged), plus the v2.5 stack — `api/v2/` (the new
API, with 150 of v2.1's 365 actions bridged to it), `db/` (migrations 000–014, `migrate.php`,
`owner.php`), and `admin-next/` (the built console). Additive by design: no live page is replaced, `/admin/`
stays the v2.1 admin, and the console lives at `/admin-next/` until the remaining Phase 3 screens are done.

**What the console can do today** — 24 live screens against `api/v2`: dashboard (still the prototype's
sample data), leads and pipeline, quotations and the BOQ builder, quotation templates, clients, bookings,
invoices and payments, the unified inbox, projects and the timeline, client updates, forms and the rate
book, page heroes, the content CMS, the header and footer as one change across every page, the section
library and placements, the page editor with history, media and the library, redirects, site theme,
business info, the announcement bar, and **the Master's approval queue** — read the queue, judge one
request, decide it (approval replays the stored request as the Master), and change the policy.

**The six things decided while building it.** The bridge translates v2.1's parameter names (`path` → `rel`).
The nine BOQ templates are generated from the site's own `assets/js/quotation-templates.js`, never typed
twice. Business details are read off the site rather than out of a copy of the defaults. Demo mode
(`?demo=1` / `VITE_WX_DEMO=1`) is the only source of sample data, and a screen with no sample gets no
answer. The status strip never calls an unreachable host a preview. The dashboard's sample count says it is
a sample.

**Packaging.** `tools/make-release.mjs` builds the payload deterministically: it refuses to ship a
credential, refuses to build on a broken console, appends the one `.htaccess` block the console's deep
links need, and writes `MANIFEST.json` (git SHA, console build stamp, file counts, hashes, migration list).
The repository was tidied in the same release: the loose audit and plan documents moved to `docs/`, and the
superseded release zips (P15–P22, `deploy/`) were removed from the tree — their record is below and their
bytes are recoverable from history (`git log --diff-filter=A -- <path>`).

**Not done yet, and known:** the real gate (publish an article → change the header across 150 pages → roll
it back) is a host run and has never been executed; migrations have never run against MySQL; the dashboard
is still wired to `lib/mock.ts`; the remaining Phase 3 screens (services & cities, SEO, integrations) and
the `cms_announce_*` / `cms_ai_*` endpoints are next — see `MEMORY-PLAN.md` §8.

## P22.1 (8 October 2026) — the previous release
- Rebuilt as a standard zip with folder entries (158 folders, 623 files). Same code as P22.
- Upload via File Manager → Extract (Hostinger's import tool cannot recognise this site).
- **Removed from the tree in P25**; the payload it carried is the base of the P25 zip.

## P22 (8 October 2026) — removed from the tree in P25
- Gmail connector: real SMTP test email + "Use for all email alerts".
- GitHub + Google Drive connectors: "Back up now" + daily automatic backup of pages and database.
- Drive via an Apps Script web app (works on a free Gmail account).
- Pending tasks card at the bottom of the dashboard; Quick actions and Connected apps cards.
- Fix: Drive script code box height.

## Before that — removed from the tree in P25
- **Master P22 r6/r5/r3/r2** — dashboard Quick actions and Connected apps status; full five-role QA sweep;
  connectors with real Test checks; `wx-install` asks for the owner name/email/password and no longer
  resets the admin password on a re-run.
- **P21** — deep QA and security audit, three fixes, `_templates/` folder and import from file, to-do plan,
  credentials sheet.
- **P20 (V20)** — first full Hostinger package with the installer.
- **P41** — SEO agent (Claude/Codex/Hermes/local), LinkedIn + Google Business posting, smoother chat
  typing, alert phone.
- **P40** — Telegram channel + QR, one website button, social planner and comments, CSV lead import,
  chatbot training.
- **P39** — five roles + Master approvals, inbox upgrades.
- **P1–P38** — website v26, Builder v3, Admin v2, CRM, quotations, WhatsApp, SEO, speed.
