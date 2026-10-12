# Woodex Admin — project status, gaps and what I need from you

Date: **2026-10-12** · Branch `arena/7f38fddd-marketingwoodex` · HEAD **`520c891`** (pushed)
Preview: **process running on port 8080**, all 7 accounts signed in and working
Deliverable target: one master zip that replaces everything in `public_html/` on Hostinger

> Everything below is verified in this sandbox against the real project files.
> Nothing was tested against PHP/MySQL at runtime (no PHP or MySQL here) and the real
> database has not reached me yet — see §5.

---

## 1. Recent work (this session, newest first)

| Commit | What it does | Proof |
| --- | --- | --- |
| `520c891` | **Role words accepted.** The API and UI now canonicalise `master / superadmin / administrator → owner`, `manager → admin`, `developer → editor`. Builder refusal names the role and offers Retry. The preview had the same bug in miniature (dropped the account). | An account whose role column literally says `master` opens Section library (51 cards), Header & footer, Hero slides and the builder. master-qa: **58 routes · 0 stuck · 0 page errors** |
| `9a0c9ae` | **Site health runs for real.** Preview now executes the same local scan as the host over the real page files. Fix: error pages (404/500/503) and the Google verification file were counted as content problems — the top of the list was a *Critical* finding on a file nobody should touch. | **145 real pages**, score 69, 165 findings (8 SEO · 143 alt-text · 0 broken links · 14 oversized images), **0 critical**, 0 false positives |
| `9a0c9ae` | **Speed screen fixed.** The Key pages table printed literal `undefined` (the preview mirror used Lighthouse's raw field names while the app uses `perf/a11y/bp/seo`). "Test this page" now works and history accumulates. | Rings render: 88/96/100/92 mobile, 96/96/100/92 desktop; 4 suggestions; no `undefined` anywhere |
| `019c760` | **Invoice chain proven end to end.** "New invoice" opens the full-page creator (not the older pop-up), so nobody had driven it to a saved record. Fixed a real bug found on the way: the detail page and the legacy prints billed the *contact person* instead of the **company**. | Create 420,000 → track (PO + after-delivery + delivery date) → pay 200,000 → balance 220,000. Tracker rows 7→8, chips move correctly |
| `019c760` | **Telegram screen wired.** All eight `tg_*` actions existed and were sound; the preview only knew one, so Save/Connect did nothing there. | Junk token refused with the BotFather message · good token connects · QR modal renders · test DM · DM toggle · settings save · disconnect. 6 sections, 0 page errors |
| earlier | Media library on real data (105 files, 14.2 MB); tracker status chips (Paid/Partial/After delivery/Unpaid/Late delivery) no longer zero; redirects wired to the real 36-rule plan; router aliases fixed so quotation/invoice editors are reachable | screenshots in `deliverables/block1-data/` |

**Incident, handled:** the sandbox was re-provisioned mid-session (git objects, `node_modules`, `/tmp` and the git-ignored accounts file were wiped). No work was lost — commits live on origin. I re-fetched, reset to `520c891` (zero diff), reinstalled the QA deps, rebuilt the accounts file and restarted the preview. Recovery is documented and repeatable.

---

## 2. The single most important finding

**The admin running on your host is an older build — not this project.**

Two hard proofs:

1. The exact sentence you saw, `No builder access — "your role cannot edit pages"`, exists **only** in the older tree (branch `arena/8a776c65-marketingwoodex`, `admin.js:558`). It refuses immediately: no retry, no role name, no explanation.
2. That older tree has **no Telegram screen at all** (`VIEWS.telegram` does not exist there) — which is exactly why you saw no Telegram feature pages.

So several items on your "broken" list are the deployment, not the product. A correct deployment of this branch should resolve them by itself — and every one of them is verified working here first.

---

## 3. Status of every item you named

| Your complaint | Status | Evidence |
| --- | --- | --- |
| Hero slides / Header & footer / Section library → "No builder access" | ✅ **Fixed** (old build + role-alias trap) | All four screens open for owner and for a `master`-word account |
| Telegram feature pages not showing | ✅ **Fixed** | Full screen + all 8 actions green (screen did not exist in the deployed build) |
| Invoice tracking incomplete | ✅ **Fixed + proven** | Create → track → pay → balance, chips move |
| Invoice create not working | ✅ **Works** (was misdiagnosed: it opens a full page, not a pop-up) | Probe drives the real form to a saved invoice |
| Zero status chips (Paid/Partial/After delivery/Unpaid/Late delivery) | ✅ **Fixed** | `All 8 · Paid 1 · Partial 1 · After delivery 4 · Unpaid 2 · Late delivery 2` |
| Site health not working | ✅ **Fixed** | Real scan, 145 pages, explains itself on failure |
| Speed not working | ✅ **Fixed** | `undefined` gone, scores/metrics/suggestions render |
| Media library not the website's data | ✅ **Fixed** | 105 real files, used/unused and missing-alt counted |
| Redirects "complete list exists" but not connected | ✅ **Fixed** | 36 real rules on screen, 35 OK / 1 to check |
| Integrations page empty | ✅ **Not reproducible** — 22 connector cards on this build | Screenshot `deliverables/design-v211/02-integrations-light.png` |
| **Timeline — "what is Timeline?"** | ✅ **Answered** | It is the **project Gantt**: projects placed on a date axis (start → target date) with milestones and billing split. Read-only, built from existing project dates. See screenshot below |
| **Missing invoice template** | ⚠️ **Needs your decision** | Invoices print in **one** design (`classic`). Quotations have Classic / Minimal / Premium; invoices do not. Do you want invoice print designs too? |
| **New quotation / quotation templates** | ⚠️ **In progress** | Screen works (created a quotation end-to-end, templates list imports 3 starters). Not yet probed to your standard; next on my list |
| Blog stale data | ⚠️ **In progress** | Rewired to real content data; needs the real DB to prove |
| "Old design" / sidebar not matching Preline | 🟡 **Mostly done, one decision blocked** | Sidebar, cards, header, dark mode, status tokens rebuilt from DESIGN.md. Blocked by §4.1 (colour direction) |
| Business info vs Integrations on one page | ✅ **Done** | `#/integrations` is Integrations; business details live under Settings |
| THE ADMIN DESIGN V2.1.1 ("delete old design .py system") | 🟡 **Done, with a labelling problem** | Old CSS layers deleted (`woodex-ui.css`, `woodex-ds.css`). No `.py` design system exists in the project at all — see §4.1 |

Timeline, as it renders today:

![Timeline](TIMELINE-gantt.png)

*(in `deliverables/reference/TIMELINE-gantt.png`; "Preview project (stub)" is a preview fixture, not your data)*

---

## 4. Open decisions (yours)

**4.1 — Colour direction: the only thing blocking the design sign-off.**
Two design sources disagree, and both are yours:

| Source | Says |
| --- | --- |
| The DESIGN.md you pasted | **Light** theme, blue `#2563eb` primary |
| Branch `8a776c65` master plan | **Obsidian/cyan** — surface `#0b0d13`, card `#111318`, cyan `#00b8db` |

What is live now: DESIGN.md tokens for light, plus a full dark mode. The **cyan/obsidian** palette is also in the build (`woodex-v21.css` uses `#00b8db` / `#0c1628` for dark surfaces). So the build currently honours *both*: light = DESIGN.md, dark = obsidian/cyan.

**I need one line from you:** is dark mode the obsidian/cyan look, or should everything follow DESIGN.md alone?

**4.2 — Section library count.** 51 real blocks against the 70-block suite in the old master plan (gaps: Hero 10, Kitchens 10, Wardrobes 10, Office 8, Features 12, Testimonials 6, CTA 10, FAQ 4). Build the missing 19, or is 51 enough?

**4.3 — Template cards.** The plan wants each template card to offer *copy HTML*, *insert*, and previews at 375/768/1280. Today they preview only. Build the extra actions?

**4.4 — Invoice print template(s).** See §3 — one design today.

**4.5 — Housekeeping (needs your go-ahead).**
- **The GitHub repo is still public**, and the tree contains the shared team password in 118 files, a tracked `.env` with the DB password, a Telegram bot token in 25 files, and a 32-char maintenance token. Making it private is one click; I am not doing it to your account without your word.
- **Rotate two secrets** (outside the code): the **Telegram bot token** (the literal is leaked in the branch you pointed me to) and the **shared team password** (printed in the same docs).
- **Ghost folders** at the repo root: `woodex-live-p23`, `woodex-live-P23`, `woodex-live-p29-v2.1`, `woodex-live-v3`, `woodex-master-P22`, `woodex-vlive-P20`, plus a root `woodex-database.sql`. All tracked. Delete, or keep as history?

**4.6 — Technical, your call as the owner:** PHP runtime testing is off the table (no PHP here), so PHP is verified by syntax only (44/44 files parse). Do you want me to ship a `wx-audit.php` you can open once on the host to prove the live database? It is written and read-only.

---

## 5. What I need from you

**Priority 1 — the real database dump.** This is the one hard blocker.
Everything so far is verified against the real *files*; real *records* need your dump. The newest SQL on Drive (`woodex-database v2.1.sql`) is 12,627 bytes — schema only, no rows.

How to give it to me:
1. Hostinger → hPanel → **phpMyAdmin** → select the database → **Export** → Quick · SQL
2. Upload the `.sql` to Google Drive and send me the link (or the file).

I will import it into a local database and run the full audit — every table, every screen, every count — against your real data, then produce the audit you asked for.

**Priority 2 — answers to §4.** The colour decision (4.1) unblocks the design sign-off; the rest are small.

**Priority 3 — go/no-go on §4.5** (repo private + the two rotations). The secrets are exposed today; this is the one item where delay has a cost.

---

## 6. Pending work, in the order I will do it

| # | Item | Blocked by |
| --- | --- | --- |
| 1 | New quotation + quotation templates, end to end, with proof | nothing |
| 2 | Invoice tracking edge cases + CSV import (`invs_import`) | nothing |
| 3 | Blog / portfolio / services / city pages against real content data | DB dump |
| 4 | Design V2.1.1 final sign-off (dark tokens, animation, empty states) | 4.1 |
| 5 | **Master audit against the real database** — all tables, all screens, all API actions | DB dump |
| 6 | Hosting package: fresh `woodex-database.sql`, `config.php` template, deploy guide, zip | everything above |
| 7 | Final full QA sweep on the frozen build (master-qa + contrast + overflow) | #6 |

Known QA gaps I am tracking (not fixed yet):
- Preview has no answers for `lead_*`, `leads_import2`, `proj_*`, `cms_get/save`, `clients_merge`, `dash_target_save`, `invs_import` — those screens are not yet provable in the sandbox.
- PHP runs on the host only; I cannot execute it here.
- `#/timeline` needs real projects with dates before it looks like anything.

---

## 7. Current state, at a glance

- **Branch `arena/7f38fddd-marketingwoodex`**, HEAD `520c891`, pushed. Working tree clean.
- **Preview live**: port 8080, 7 accounts (6 team roles + fallback), every screen renders.
- **Gates green**: 58 routes · 0 stuck · 0 page errors · theme contrast 8/8 · overflow 65/0/0 · 44/44 PHP parse · CSS balanced.
- **Source of truth**: `woodex-live-p29-v2.1-pro/` (43 MB). The other 7 project copies are untouched.
- **No credential value** appears in this report, in any commit, or in any artifact.
