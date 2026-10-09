# WoodexADMIN v2.5 PRO — Master QA Audit

**Date:** 2026-10-10 · **Branch:** `arena/dc8cace3-marketingwoodex` · **Scope:** every admin page, section and module reachable from the sidebar, the Ctrl+K palette, or the route table (`WXA.VIEWS`).
**Companion checklist:** [`QA-MASTER-TODO.md`](QA-MASTER-TODO.md) — every item is marked **Will fix** or **Needs approval**.

---

## 1. Summary

| Area | Result |
|---|---|
| JavaScript syntax (61 admin files + builder + assets) | 0 errors |
| PHP lint (40 API files + others) | 0 errors |
| Frontend API action names (245) vs backend (366) | 2 real orphan calls. 1 fixed, 1 needs approval |
| Browser crawl, 66 routes, logged in as owner | 0 uncaught page errors on any screen. 6 routes with 404s or empty views (see §4) |
| Orphan `#/` links | 2 real (`#/leads`, `#/offers`), both now fixed or queued |
| Placeholder ("coming soon") screens | 3 in use: Offers, Projects, Templates |
| Fabricated data shown as real | 1 critical: **Users & roles** screen (see F-01) |
| Dead buttons (click verification) | **0 confirmed.** 58 no-reaction clicks all explained (see §5) |
| Duplicate HTML IDs | 1 (`ce-tpl`, post editor) |
| Broken images | 0 |

**Headline:** the admin is stable (no JS exceptions, no broken images, no dead buttons confirmed). The serious problem is that the **Users & roles screen is a mock**: it shows five hard-coded staff members with real-looking emails, and its Add / Edit / Roles buttons only show toasts. The real account list (the one you created from your table) is never shown there. This needs your decision because it changes which screen is the "real" one.

---

## 2. Method

1. **Static checks.** `node --check` on every admin, builder and assets JS file; `php -l` on every API file. Result: 0 errors.
2. **API orphan scan.** Every frontend `api("action")` / `bapi("action")` call matched against backend `case`, `in_array($action, [...])`, and `$action === '…'` checks. The first scan produced 12 false positives (it only read `case` labels); the corrected scan is the one used.
3. **Hash-link scan.** All `#/route` literals in `admin/*.js` and `admin/*.html` matched against the real route set. Routes registered dynamically (for example `aicenter`, `wahub`, `transactions`) were confirmed by the browser crawl, not by the static scan.
4. **Browser crawl** (headless Chromium, owner login). For each of 66 routes: page errors, console errors, HTTP ≥ 400, orphan hash links, local file links, empty `href`s, duplicate IDs, broken images, and up to 5 tab-like controls with error capture.
5. **Click verification.** Every button without a direct handler was clicked (up to 20 per screen; destructive or state-changing labels skipped, see §6). Each click was classified as request, modal, DOM change, or **no reaction**. The 58 no-reaction results were then checked for listeners on ancestors.
6. **Targeted checks** of each suspicious item in code, plus in-browser confirmation of each fix.

---

## 3. Confirmed bugs and fixes (this pass)

| ID | Where | Bug | Impact | Fix | Status |
|---|---|---|---|---|---|
| B-01 | `admin/admin-sales17.js` (lead drawer) | Called `lead_act`; backend action is `lead_activity` | "Log activity" always failed | Renamed call to `lead_activity` (payload already matched) | **Fixed** |
| B-02 | `admin/admin-p8.js` (My security) | `wrap("security")` ran with no base view, so it did nothing. The Google sign-in card never appeared | Google SSO setup was unreachable from the UI | Defined a base `security` view so the card mounts. Browser-verified: "Sign in with Google · Not set up" now shows | **Fixed** |
| B-03 | `admin/admin.js` (placeholder screen) | Placeholder text read "Phase undefined" on Offers and My security | Visible text bug | Shows "Coming soon" when no phase is set; the body text falls back to "This screen is not built yet." | **Fixed** |
| B-04 | `admin/admin-wains.js` (Insights) | "Open leads" linked to `#/leads` (no such route) | Dead link | Now `#/enquiries` | **Fixed** |
| B-05 | `admin/admin-p8.js` (Connections note) | Note linked to `#/leads` | Dead link | Now `#/enquiries` | **Fixed** |
| B-06 | `admin/admin-p36.js` (WhatsApp Cloud API status) | Status row linked to `#/offers` (placeholder) | Wrong destination | Now `#/settings` (Integrations, where WhatsApp Cloud API is configured) | **Fixed** |
| B-07 | `admin/admin-wains.js` (heatmap card) | Heading hard-coded "last 14 days", but data follows the period selector (7/14/30/90) | Wrong label | Label uses the selected window | **Fixed** |
| B-08 | `admin/admin-lib26.js` (`previewModal`) | Each open stacked another overlay | Stacked modals | Opening a preview replaces the open one (overlays tagged `pm-overlay`) | **Fixed** |

Cache-busting: `admin/index.html` version tags for the six changed scripts were bumped to `2.5.6`.

---

## 4. Other findings from the crawl and static checks

| ID | Where | Finding | Severity |
|---|---|---|---|
| F-01 | `admin/admin-users.js` (overrides `VIEWS.users` from `admin/admin.js`) | **Users & roles is a mock.** `team_list` has no backend (the API returns 404 "Unknown action"), so the screen falls back to 5 hard-coded people (including `master@woodex.pk` and `admin@woodex.pk`). "Add team member" only shows a toast ("send an invitation link", which does not exist). "Edit" and "Roles" are toasts. The working Users & roles manager in `admin.js` (list from `users`, edit via `user_save`) is loaded and then overridden. | **Critical** |
| F-02 | `admin/admin-content.js` line 421 (post editor) | Duplicate ID `ce-tpl` | Low |
| F-03 | Quote, invoice, template, citydraft routes with no ID | Show "not found" and fire an API call that returns 404 | Low |
| F-04 | Unknown routes (for example `#/soon`) | Silently fall back to the dashboard | Low |
| F-05 | `admin/` Redirects and Files screens | Two and three anchors with `href="#"` | Low |
| F-06 | Builder canvas (`builder/index.html` line 165, `builder/builder.js` line 144) | Console errors "Blocked script execution in about:srcdoc": the canvas is sandboxed without `allow-scripts`, and page scripts are injected into it. Harmless (the sandbox is intentional), but it is console noise | Low |
| F-07 | `assets/data/launch.json` | Not tracked in git (untracked runtime file, `git status` shows it). On a fresh deploy the maintenance page's fetch returns 404. The page handles it, but it is console noise | Low |
| F-08 | `api/wahub-lib.php` `wah_insights` | Visitor-message heatmap reads at most 20,000 rows with `ORDER BY chat_id` and `LIMIT`, so on a busy site the **newest** chats are silently dropped and the heatmap undercounts | Medium |
| F-09 | `admin/admin.js` `SOON` map | Entries for library, enquiries, quotes, media, backups and settings are dead code (those screens are built elsewhere) | Low (cleanup) |
| F-10 | `admin/features.html` | Standalone `noindex` feature guide. Not linked from the dashboard. Its `#/leads`, `#/offers` links are stale | Low |
| F-11 | `docs/V2.5-PRO-vs-ROADMAP-breakdown.md` | Some counts and names in the Thread 2 report need checking against the code: "52 Preline screens" vs about 62 nav links, sidebar group names ("SALES" vs "SALES & CRM", "ADMIN & SETTINGS" vs "ADMIN & SYSTEM"), and the chat dock id (`#cx-bub` in code vs `#cx-dock` in the plan) | Low (documentation) |

Placeholders still in use (see also the to-do): **Offers** (`#/offers`, linked from the WhatsApp hub's "Offers" button and tab), **Projects** and **Templates** (both `SOON` placeholders in the sidebar).

---

## 5. Click verification (dead-button check)

- **153** clicks triggered a network request, **26** opened a modal, and **58** showed no reaction on the first check. **237** candidates were not clicked (the 20-per-screen cap) and **46** were skipped as destructive or state-changing.
- The 58 no-reaction results, checked against listeners on each element and its ancestors:
  - **Links** (`target=_blank` or external): Open WhatsApp, View website, Open page, View live, View as visitor, View (SEO sitemap, maintenance 404 preview), Open estimator page, View on website.
  - **Same-tab builder links:** Open Builder (`/builder/`) and Edit on Pages (`#/builder/index.html`). Both are reached without a JS error; the Pages one is a hash link into the builder route and was not exercised further.
  - **Handled by property handlers** (`element.onclick =`), which the listener hook cannot see: pager buttons on Redirects, Health and Activity (`admin-lists.js` line 47 uses `bar.onclick`); segmented controls on AI Center (`admin-aicenter.js` line 103, `g.onclick`, verified by class change).
  - **Delegated handlers** on a container: rich-text toolbar and block controls (`#ce-tb`, `#ce`), theme cards and logo row (`#view`).
  - **Upload triggers** (label for a hidden file input): Add logos.
- **Not conclusively verified (manual check listed in the to-do):** study editor block controls and the toolbar when there is text selection; the logo "Sliding row" button.

Conclusion: **no confirmed dead buttons.** The crawler's "dead" counts (for example 150 on SEO) were false positives: those buttons have delegated handlers or work through the page's global click handler.

---

## 6. Not covered in this pass (limits)

- **Destructive or state-changing buttons were not clicked** (delete, publish, save, send, reset, restore, import, upload, backup, sync, approve, connect, and similar). Their wiring was read from code, not exercised.
- **At most 20 clicks per screen.**
- **No DB writes were made.** The heatmap was verified with mock data only, so real traffic has not been tested. Reconciliation was verified with mock data.
- **Not tested:** real WhatsApp, Telegram, AI or Google calls (no keys or client ID); mobile widths beyond the sidebar check; multi-user permission matrix beyond the owner role.
- **"Search page" bug** (your report that the page search still shows reports): **could not be reproduced** in this pass. Needs a description or screenshot from you.

---

## 7. Checks from the Thread 3 list

| Item | Result |
|---|---|
| Expanded sidebar shows Integrations (`#/settings`) | **Verified** (visible, 247 px wide, expanded mode). Rail mode still hides the label, which is expected |
| Dedupe `previewModal()` | **Done** (B-08) |
| Heatmap query window vs label | **Done** (B-07). Query and label now match. Data still needs a real-traffic check (F-08) |
| Modal close-button layout | **Verified** on "Add new lead": the X sits at the right of the heading, no overlap |
| `matchMedia` error at `admin-chrome.js` line 6 | **Not reproduced.** No `matchMedia` in `admin-chrome.js`. The only use is in `admin/index.html` line 10, inside a try/catch. Not a bug |
| Roadmap report in `docs/` | Thread 2 report is at `docs/V2.5-PRO-vs-ROADMAP-breakdown.md`. Counts and names need checking (F-11) |
| Commit and push | Pending (see end of report) |

---

## 8. Open questions (decisions the to-do lists under "Needs approval")

1. **Users & roles (F-01):** restore the working admin.js screen, or rewire the mock to real data with working Add/Edit.
2. **Offers, Projects, Templates placeholders:** build, or hide from the sidebar.
3. **GitHub sign-in:** build (needs an OAuth app and secret) or drop from the roadmap.
4. **Flat-file database fallback** (`_private/admin-db.json`): not in the code. Build or drop.
5. **Role names:** roadmap uses Master, Manager, Developer, Sales, Support. App uses owner, admin, editor, sales, support. Your table's mapping (manager→admin, developer→editor) is applied. Keep the app names or rename?
6. **Google sign-in:** the owner's OAuth client ID is needed to activate it.
7. **"Search page" bug:** need a description or screenshot.
8. **Shared password `admin`** for the other accounts in your table. Not applied. Decide whether each account gets its own password.
9. **Owner password** must change before production use.
10. **`features.html`:** keep (and update), or delete.
11. **"quick fix l"** (from your earlier message): meaning still unclear. Please say what you meant.

---

## 9. Ways to reproduce

- Crawl: `/tmp/woodex-runtime/chrome/crawl.mjs` → `/tmp/woodex-runtime/qa/crawl.json`
- Click verification: `/tmp/woodex-runtime/chrome/verify.mjs` → `/tmp/woodex-runtime/qa/verify.json`
- No-reaction analysis: `/tmp/woodex-runtime/chrome/nrcheck.mjs` → `/tmp/woodex-runtime/qa/nr-analysis.json`
- Static: `/tmp/woodex-runtime/qa/static.py` → `static.json`, `orphans.json`
- Screenshots: `11-modal-close.png` (close-button check), `12-security.png` (Google card) in `/tmp/woodex-runtime/chrome/`
