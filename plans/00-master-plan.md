# Master plan: Woodex Admin + ARC.STUDIO modules (rev 1, 2026-10-11)

Scope: all pending work, in order. Each item lists status, the check that closes it, and who acts. "Done" needs evidence, not just an edit (see gates at the end).
Status key: DONE (verified) · PARTIAL (built, not fully verified) · TODO · BLOCKED (decision or approval needed).

## 0. Decisions and constraints (standing)
- No PHP runtime for QA (user decision). API work is verified by syntax only (`tools/qa-p29/phplint.js`) until that changes.
- Browser QA is allowed with the approved Chromium (`@sparticuz/chromium`, QA only).
- Preline templates are paid: own code only, rebuilt from the look. No template files copied.
- Tailwind is built once to a committed static CSS (`admin/assets/woodex-tw.css`, no preflight).
- Inter self-hosted; Lucide icons (already in `vendor/icons.js`).
- Repo stays public for now ("later"). Visibility, history rewrite, credential rotation and production changes need explicit approval.
- Credential values, personal and customer data never go in reports, logs, prompts, commits or artifacts.

## 1. Admin layout pass (U1) — the current block

### 1.1 Target skeleton (from the Preline block blueprint)
```
+------------------------------------------------------------------------------------+
| Global top bar: search (Go to screen), notifications, theme, user menu            |
+-------------------------+----------------------------------------------------------+
| Sidebar navigation      | Title bar: H1, breadcrumb, page actions                  |
| (groups, pins, footer)  |----------------------------------------------------------|
|                         | KPI row (4 tiles, progress and spark where useful)       |
|                         |----------------------------------------------------------|
|                         | Working area: table / board / form / ledger              |
|                         |                                                          |
|                         |----------------------------------------------------------|
|                         | Side or bottom widget: support chat (decision pending)  |
+-------------------------+----------------------------------------------------------+
```

### 1.2 Mapping of Preline block families to Woodex screens
| Blueprint family | Woodex screens that use it | What exists | What to build | Status |
|---|---|---|---|---|
| 1. Global shell: sidebars, workspace header, support chat | every admin route | sidebar (`admin.js` NAV), top bar, theme toggle, search, Inbox | title bar and KPI row rules (done in CSS); support chat placement decision | PARTIAL |
| 2. Overviews: KPI cards, progress, spark and trend charts, activity feeds | Dashboard, Approvals, Security, Projects | `.kpi` tiles, Chart.js (`vendor/chart.umd.js`), Activity route | chart colours follow the theme (AD-18); progress cards in Projects | PARTIAL |
| 3. Sales and CRM: kanban board, user and contact tables | Leads (`enquiries`), Pipeline, Clients, Bookings | Pipeline board (`admin-p19f.js`), clients table (`admin-crm.js`) | kanban headings and card states in both themes; contact-table density | PARTIAL |
| 4. Ledger: order and billing tables, invoice layouts, description lists | Quotations, Invoices, Payments, Projects detail | quotation/invoice screens (`admin-sales*.js`) | ledger table style, overdue state, description list for material breakdown | TODO |
| 5. Forms and builder: form pages, option pickers, switches, modals, drawers | Smart document builder, Business info, Users & roles, Quote templates | forms and modals (`.modal`, `.toast`) | form-page layout, picker cards for species and finishes, drawer for quick add | TODO |
| 6. Automation and web: file views, upload forms, product cards, cart lines, chat bubbles | Media, Pages & builder, Section library, Inbox, WhatsApp, AI Assistant | Media (`media-lib.php`), builder, chat bubbles (`--chat-bubble-*`) | file grid view, product card for catalog, message bubble styling | TODO |
| 7. Account gates: auth, verify/recover, onboarding | login, setup, two-step, reset | auth card (`.auth-card`), setup and DB reconnect forms | restyle done; onboarding copy and empty states | PARTIAL |

Rule for every family: one shared class set in `admin/woodex-ui.css` (tokens + components). Screen-specific CSS only when a screen has its own markup.

### 1.3 U1 steps (in order)
| # | Step | Check that closes it | Status |
|---|---|---|---|
| U1.1 | Page title bar: H1 24px/600, breadcrumb, toolbar gap | screenshot: Approvals, Users, Pipeline | DONE (Approvals checked) |
| U1.2 | KPI row: 4-up grid, 18px padding, tabular numbers, tinted icon | screenshot of a screen with KPIs (Dashboard shows stub "data incomplete") | PARTIAL: CSS in place; needs a screen with real KPI data |
| U1.3 | Card headers and table rhythm | screenshot: Users, Clients, Quotations | PARTIAL |
| U1.4 | Full sweep of 56 routes, both themes, 0 below AA | `ALL=1 node tools/qa-p29/theme-contrast.mjs` | DONE 2026-10-11 on the final CSS: 0 below AA in light and dark (56/56 each). Page errors are stub gaps (same as HEAD) |
| U1.5 | Regression fix: `.content` padding restored (was 4px) | Approvals screenshot | DONE |
| U1.6 | Commit CSS and screenshots manifest | `git log` shows commit; manifest refreshed (U8) | TODO |

### 1.4 U1 follow-ups
- U2. Source cleanup: replace about 60 literal colours in `admin/*.js` and `admin.css` (`#00b8db`, `#00d3f2`, `#b8956a`, `#0c1628`) with tokens. The override layer covers them now.
- U3. Charts: dashboard gold literals and theme switch re-render (AD-18).
- U4. Preview stub: returns no data for dashboard, enquiries, bookings, clients, quotes, team and others. Pre-existing on HEAD (4 routes checked). A seeded stub is needed for real data checks.
- U5. Brand tiles keep brand colours; text ink chosen per tile for contrast.
- U6. Mirror the admin changes to `frontend-v1/admin` (still old theme).
- U7. Remove `Plus Jakarta Sans` usages that remain in `admin.css`.
- U8. Refresh `woodex-audit/manifest.json` after these edits.
- U9. Mobile widths (grid cut-off at 1280 px on Integrations is pre-existing).
- U10. Support chat widget: decide whether it is a bottom-right widget on every page or stays in Inbox (decision).

## 2. ARC.STUDIO modules (phase 1, after the layout pass)
Order set by user: layout pass (section 1) first, then step 3 as unwired code.

| # | Item | Status | Verification |
|---|---|---|---|
| A0 | Gap map (30 items) | DONE `plans/arc-studio/01-gap-map.md` | read-only |
| A1 | Data model spec | DONE `plans/arc-studio/02-data-model.md` | review |
| A2 | Append-only revision log library `api/arc-lib.php` (per-scope chain) | PARTIAL: written, syntax-checked; hash chain not run | needs a runtime (declined) |
| A3 | Approvals for budget and drawing sign-offs (`arc_budget_change`, `arc_drawing_revision`) on the existing queue | PARTIAL: unwired code written (`api/arc-approvals-lib.php`), revision log changed to per-scope; syntax-checked only | runtime tests (blocked by decision) and route wiring with permission tests |
| A4 | Team Feed: project threads in Inbox (`api/arc-feed-lib.php`, `admin/admin-feed.js`, `#/team-feed`) | DONE: API and UI wired; staff roles only; plain text, 2000 chars, 15 s poll | browser check with stub passed (post, render, escaped HTML); 56-route sweep 0 below AA, no new page errors |
| A5 | Gantt timeline from existing milestones (`proj_milestones`) | TODO | browser check with stub |
| A6 | Material schedules, vendor cost, markup; PO drafts behind approval (no auto-send) | TODO | syntax only |
| A7 | Field reports with photos (moisture, delivery snags, progress) | TODO | syntax only |
| A8 | CSV import and export (QuickBooks, AutoCAD, Revit) | TODO | sample CSV round-trip (no credentials) |
| A9 | ARC roles (architect, contractor, fabricator) and field visibility (cost hidden) | TODO | API permission tests need a runtime |
| A10 | Client portal (separate login, own security review, approval before launch) | BLOCKED (approval + security review) | — |

Known issue to decide: `proj_bill` deletes a finance invoice when replaced (`api/sales17-lib.php`). Decide: soft-cancel plus revision-log entry (recommended).

## 3. Pending audit and governance items (carried over)
| # | Item | Owner | Status |
|---|---|---|---|
| G1 | Rotate SEC-001/002/003 credentials (Telegram token, demo password, DB and bank values) | user, in provider consoles | BLOCKED (user action) |
| G2 | Approval to remove the login pre-fill (`admin/index.html:43`) and `downloads.html:70` demo password | user | BLOCKED (approval) |
| G3 | Approval to untrack secret files (`_private/*.json`, `config.php`, `.env`) | user | BLOCKED (approval) |
| G4 | D-3 source of truth | user | BLOCKED (decision) |
| G5 | Node ≥24.18 or another runtime for AD-20 (D-10) | user | BLOCKED (declined for QA runtime) |
| G6 | Scope decision on six unaudited projects with secret hits | user | BLOCKED (decision) |
| G7 | Owner confirms `#/approvals` shows the queue (D-13) | user | BLOCKED (confirmation) |
| G8 | Chat-level report on SEC-001/002/003 | assistant | TODO (owed) |
| G9 | Citation fixes: `admin.js:700`/`:693`, `builder.php:244/275` in `06`, `13`, report | assistant | TODO |
| G10 | T-09 negative control in `18` shows 0/14 against HEAD; re-check | assistant | TODO |
| G11 | `/router.php` wording in `qa/smoke-test-checklist.md` S-02 and `20` line 17 | assistant | TODO |
| G12 | `qa/` references in 19–20 unchecked | assistant | TODO |
| G13 | Audit pack: unapplied edits to `17`, `18`, `21`, `22`, `23`, `24`, smoke checklist, regression matrix, release gate line 27, master report sections | assistant | TODO (the `17` patch failed on a duplicate line; re-anchor) |
| G14 | Repo visibility | user | "later" (keep flagging; do not change) |
| G15 | History rewrite | user | not approved (do not do) |

## 4. Verification gates (apply to every item)
1. Evidence labels: RUNTIME, STATIC, CALC, OBSERVED, EXTERNAL, HYPOTHESIS, UNKNOWN/BLOCKED. A finding is closed only at E4 (independently verified).
2. UI changes: headless screenshots in both themes, rendered contrast 0 below AA, no page errors beyond known stub gaps.
3. API changes: syntax check now; runtime tests when a runtime is approved; permission tests per role.
4. No production change, no external message, no credential action without approval.
5. Commit only exact paths (no `git add` of whole folders).

## 5. Next actions (in order)
1. U1.4 done (sweep passed). Refresh manifest (U8).
2. Refresh manifest and commit (U1.6 is committed as 418394f).
3. ARC A3: approval kinds written as unwired code, syntax-checked (A3).
4. Ask user to decide: support chat placement (U10), `proj_bill` soft-cancel (A-known), and the blocked items in section 3.
