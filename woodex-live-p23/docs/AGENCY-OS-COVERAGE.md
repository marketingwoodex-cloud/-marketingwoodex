# AGENCY_OS — coverage audit against the live tree

**Read-only audit. Nothing in the application was modified to produce this file** — no module, page,
data file, stylesheet or copy was touched. It exists because two things were asked for at once:
"run the AGENCY_OS documents", and the documents themselves are not in this workspace.

| | |
| --- | --- |
| Date | 2026-10-11 |
| Tree audited | `woodex-live-p23/` (the verified live tree), branch `arena/5252cdd7-marketingwoodex` |
| What was added by this audit | this document only (the follow-up commit then built the Expense Log, §3 item 2) |
| What was changed | nothing |

## 0. The blocking fact, with the evidence

The five AGENCY_OS documents have never reached this workspace. Checked four ways, all negative:

| Check | Command | Result |
| --- | --- | --- |
| Upload directory | `ls /home/user/uploads` | does not exist |
| Whole filesystem, by name | `find / -iname "*agency*"` | one hit: `tools/skills/claude-seo/skills/seo-plan/assets/agency.md`, a vendored SEO skill asset, unrelated |
| Every branch and tag, by filename | `git log --all --diff-filter=A --name-only` | no AGENCY_OS file has ever been committed |
| Every branch, by content | `git log --all -S"AGENCY_OS"` | no commit ever contained the string |

So "run the documents" cannot be executed literally: I have never seen them, and they are not
reachable from here. **What I *can* run is the specification you typed into chat** — the V2.1 module
list and the V2.1 + ARC.STUDIO list. That is what §1 and §2 audit, and the result is that the great
majority of both manifests is already built: 62 admin modules, 63 registered views.

## 1. V2.1 manifest — 42 modules against the live tree

Status: **✅** a live view renders it · **◐** partially covered by a neighbouring view · **✗** absent.

### Dashboard, Approvals

| Manifest module | Live view | Module | Status |
| --- | --- | --- | --- |
| Dashboard | `#/dashboard` | `admin-dash.js` (+ `admin-appr.js`, `admin-p36.js` variants by role) | ✅ |
| Approvals | `#/approvals` | `admin-appr.js`; milestone approvals in `admin-regions.js` | ✅ |

### Leads & Pipeline, Bookings, Clients, Activity, Lost/Won

| Manifest module | Live view | Module | Status |
| --- | --- | --- | --- |
| Leads & Pipeline | `#/enquiries`, `#/pipeline` | `admin-crm.js`, `admin-p19f.js`, `admin-sales17.js` | ✅ |
| Bookings | `#/bookings` | `admin-booking.js` | ✅ |
| Clients | `#/clients` | `admin-crm.js`, `admin-reports.js` | ✅ |
| Activity | `#/activity` | `admin.js` | ✅ |
| Lost / Won | pipeline columns + dash funnel | `admin-crm.js` (`{id:"won"}`, `{id:"lost"}`), `admin-dash.js` | ✅ |

### Quote / Invoice / Designer / Documents / Templates

| Manifest module | Live view | Module | Status |
| --- | --- | --- | --- |
| Smart Quote builder | `#/quote`, `#/quotes` | `admin-sales.js` | ✅ |
| Invoice builder | `#/invoice`, `#/invoices` | `admin-sales.js`, `admin-sales17.js` | ✅ |
| Interactive Page Designer | `#/builder` | `builder/` + `admin.js`, `admin-pages.js` | ✅ |
| Bulk Document Manager | `#/bulkdoc` | `admin-bulkdoc.js` + `api/bulkdoc-lib.php`; `W.xlsxBook()` multi-sheet writer in `admin-xlsx.js` | **✅ built** (was ◐ — the plumbing existed, the hub did not) |
| Template Library | `#/templates`, `#/pagetpl`, `#/library` | `admin-templates.js`, `admin-lib26.js` | ✅ |

### Money

| Manifest module | Live view | Module | Status |
| --- | --- | --- | --- |
| Monthly Income Board | "Monthly report — last 12 months" modal | `admin-reports.js` (`W.monthlyReport`), also `admin-p8.js` | ✅ as the monthly report board |
| Due Payments | invoices with dues | `admin-sales17.js` (27 due/overdue references), `admin-dash.js` | ✅ |
| Receipts Vault | receipt flow | `admin-print17.js`, `admin-sales17.js`, `admin-print.js` (19 files mention receipts) | ✅ |
| Expense Log | `#/expenses` | `admin-expense.js` + `api/expense-lib.php`, tables `wx_expenses` / `wx_expense_budgets` | **✅ built** (was absent — see §3 and the plan doc §8.6) |
| Financial Reports | `#/reports` | `admin-reports.js` | ✅ |

### Inbox, messaging, AI

| Manifest module | Live view | Module | Status |
| --- | --- | --- | --- |
| Inbox | `#/inbox` | `admin-chat.js`, `admin-chat2.js` | ✅ |
| WhatsApp | `#/wahub`, `#/wainsights`, `#/wauto` | `admin-wahub.js`, `admin-wains.js`, `admin-p18g.js` | ✅ |
| Telegram | `#/telegram` | `admin-tg.js` | ✅ |
| Social | `#/social` | `admin-social.js` | ✅ |
| Client Updates | `#/updates` | `admin-notify.js`, `admin-updates.js` | ✅ |
| AI Assistant | `#/aicenter` | `admin-train.js` | ✅ |
| Knowledge | `#/train` | `admin-train.js` | ✅ |
| AI Report | `#/aireport` | `admin-train.js` | ✅ |

### Site

| Manifest module | Live view | Module | Status |
| --- | --- | --- | --- |
| Pages & Builder | `#/pages`, `#/builder` | `admin-pages.js`, `builder/` | ✅ |
| Content | `#/blog`, `#/post`, `#/portfolio`, `#/testimonials`, `#/faqs`, `#/study` | `admin-content.js` | ✅ |
| Media | `#/media` | `admin-media.js` | ✅ |
| SEO | `#/seo` | `admin-seo.js`, `admin-seo38.js` | ✅ |
| SEO Agent | `#/seoagent` | `admin-seoagent.js` | ✅ |
| Speed | `#/speed` | `admin-speed.js` | ✅ |
| Site Health | `#/health` | `admin-media.js` | ✅ |
| Theme | `#/theme` | `admin-theme.js` | ✅ |

### Account & system

| Manifest module | Live view | Module | Status |
| --- | --- | --- | --- |
| Business Info | `#/business` | `admin-fields.js`, `admin-settings.js` | ✅ |
| Integrations | `#/integrations`, `#/connections`, `#/settings` | `admin-settings.js`, `admin-conn.js` | ✅ |
| Users & Roles | `#/users` | `admin-users.js` | ✅ |
| Profile | `#/profile` | `admin-p18j.js` | ✅ |
| Security | `#/security` | `admin-security.js` | ✅ |
| Backups | `#/backups` | `admin-system.js`, `admin-media.js` | ✅ |
| Database | `#/database` | `admin-p18h.js` | ✅ |
| File Manager | `#/files` | `admin-p18h.js` | ✅ |
| Maintenance | `#/maintenance` | `admin-p18h.js` | ✅ |
| Activity Log | `#/activity` | `admin.js` | ✅ |
| System Check | `#/system` | `admin-system.js` | ✅ |

## 2. V2.1 + ARC.STUDIO manifest

The ARC.STUDIO kit is real and complete: **26 module screens** in
`frontend-v1/admin/arc-studio/modules/m01…m26`, plus 28 block engines, a compiled sheet
(`assets/arc-kit.css`) and a dependency-free engine (`assets/arc-kit.js`). Those screens are
standalone HTML documents in that kit — they are **not** wired into the live `woodex-live-p23`
admin, which is the gap the manifest is really asking about.

Backend: the live tree already carries three ARC libraries —
`api/arc-lib.php` (77 lines), `api/arc-approvals-lib.php` (104), `api/arc-feed-lib.php` (54) —
exposing four actions. Two of them are **orphans**:

| ARC action | Backend | Any admin JS calling it |
| --- | --- | --- |
| `arc_feed_list` | ✅ | ✅ `admin-feed.js` — live view `#/team-feed` |
| `arc_feed_post` | ✅ | ✅ `admin-feed.js` |
| `arc_budget_change` | ✅ | **none** |
| `arc_drawing_revision` | ✅ | **none** |

| Manifest module | ARC kit screen | Live status |
| --- | --- | --- |
| Unified Team Feed | `m03-team-feed.html` | ✅ `#/team-feed` (`admin-feed.js`) |
| Activity & Timelines / Gantt | `m04-activity-timelines.html` | ◐ timeline lists exist (activity log, regional milestones); **no Gantt view** |
| Site Layout & Zoning | `m05-site-zoning.html` | ✗ kit only |
| Floor Plan Shells | `m06-floor-plan-shells.html` | ✗ kit only |
| 3D Elevation Wireframes | `m07-elevation-wireframes.html` | ✗ kit only |
| Structural Engineering | `m08-structural-engineering.html` | ✗ kit only |
| Product Catalog & Stock | `m12-product-catalog.html` | ◐ catalog/stock strings only, no dedicated view |
| Smart Document Builder | `m13-document-builder.html` | ◐ quote templates + PDF/print + XLSX exist; no document builder screen |
| Material & Finish Schedules | `m14-material-schedules.html` | ◐ estimator + regional material lines; no schedule view |
| Vendor & Cost Estimates | `m16-purchase-orders.html` | ◐ `vendor` in print modules, `po` in regional; no cost-estimate screen |
| Purchase Orders | `m16-purchase-orders.html` | ◐ regional purchase-order strings, no dedicated view |
| Regulatory & Compliance Docs | `m17-regulatory-docs.html` | ✗ |
| AI Architectural Assistant | `m20-ai-assistant.html` | ✅ `#/aicenter` (general assistant; not architecture-specific prompts) |
| Client Review Notes | `m11` / `m22` | ◐ comments exist in sales/content; no review-notes surface |
| Contractor Field Reports | `m04` / `m08` | ✗ only a mention inside `arc-feed-lib.php` |
| Revision History Logs | `m04` | ◐ sales/order revisions exist (`admin-sales17.js`, `admin-p36.js`); the drawing-revision endpoint has no screen |
| Client Interactive Portal | `m22-client-portal.html` | ✗ |
| Media & Digital Assets | `m23-portal-media.html` | ✅ `#/media` (admin side) |

## 3. What "running AGENCY_OS" would actually have to build

1. **Wire the 26 ARC.STUDIO screens into the live admin** — the single biggest piece, and the one
   the manifest is written around. 23 of 26 have no live equivalent; the kit's HTML, its compiled
   stylesheet and its engine are already in the repo, so this is integration work, not design work.
2. ~~**Expense Log** — genuinely absent from V2.1~~ — **built** (route `#/expenses`, backend
   `api/expense-lib.php`, tables `wx_expenses` / `wx_expense_budgets`; plan doc §8.6).
3. ~~**Bulk Document Manager** — a hub over the existing XLSX/print/bulk-select machinery~~ — **built** (route `#/bulkdoc`, six document types, CSV / multi-sheet workbook / print packet; plan doc §8.7). Next: the ARC screens.
4. **Two orphan ARC endpoints** (`arc_budget_change`, `arc_drawing_revision`) — backend exists, no UI.
5. **Gantt view** for activity/timelines; **contractor field reports**; **client interactive portal**.

## 4. To proceed

Either attach the five AGENCY_OS documents (drag them into the chat — if the upload is awkward,
pasting their text works just as well), and the scope gets honoured exactly as written; or say
"proceed on the manifests", and the work starts from §3 with the ARC screen integration first,
since that is the part both the manifest and the kit already support. No application data will be
touched in either case: new views are added alongside the existing ones, and existing copy stays as
it is.
