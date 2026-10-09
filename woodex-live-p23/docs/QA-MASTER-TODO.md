# WoodexADMIN v2.5 PRO — Master QA To-Do

Companion to [`QA-MASTER-AUDIT.md`](QA-MASTER-AUDIT.md). Every item is marked:

- **Will fix**: a bug or task I can fix without a product decision. Status says whether it is already done this pass.
- **Needs approval**: a product or policy decision, or an input only you can provide.

Status key: ✅ done in this pass · ⬜ open

---

## A. Bugs fixed in this pass (Will fix — done)

| ID | Item | Mark | Status |
|---|---|---|---|
| B-01 | Lead "Log activity" called `lead_act`; backend is `lead_activity`. Renamed | Will fix | ✅ |
| B-02 | "My security" never showed the Google sign-in card (`wrap` on an undefined view). Base view added | Will fix | ✅ |
| B-03 | "Phase undefined" on placeholder screens. Now "Coming soon" with fallback text | Will fix | ✅ |
| B-04 | Insights "Open leads" link `#/leads` → `#/enquiries` | Will fix | ✅ |
| B-05 | Connections note link `#/leads` → `#/enquiries` | Will fix | ✅ |
| B-06 | WhatsApp Cloud API status link `#/offers` → `#/settings` | Will fix | ✅ |
| B-07 | Heatmap label "last 14 days" hard-coded; now follows the selected period | Will fix | ✅ |
| B-08 | `previewModal` stacked overlays; now one at a time | Will fix | ✅ |
| B-09 | Script version tags bumped to 2.5.6 for changed files (cache) | Will fix | ✅ |

## B. Will fix (open)

| ID | Item | Where | Evidence | Mark | Status |
|---|---|---|---|---|---|
| W-01 | Visitor heatmap caps at 20,000 rows (`ORDER BY chat_id LIMIT`), silently dropping newest chats on busy sites. Aggregate by window without the silent cap | `api/wahub-lib.php` `wah_insights` | Audit F-08 | Will fix | ⬜ |
| W-02 | Quote, invoice, template, citydraft routes without an ID show "not found" and call an API that 404s. Redirect to the list or show a clear empty state | `admin/admin.js`, `admin-*` | Crawl | Will fix | ⬜ |
| W-03 | Unknown routes (e.g. `#/soon`) silently show the dashboard. Show "not found" or redirect explicitly | `admin/admin.js` `route()` | Crawl | Will fix | ⬜ |
| W-04 | Duplicate HTML ID `ce-tpl` in the post editor | `admin/admin-content.js` line 421 | Crawl | Will fix | ⬜ |
| W-05 | Empty `href="#"` anchors on Redirects (2) and Files (3) | Redirects and Files screens | Crawl | Will fix | ⬜ |
| W-06 | Builder canvas console noise "Blocked script execution in about:srcdoc". Strip page scripts from the canvas preview (the sandbox is intentional) | `builder/builder.js` line 144 | Crawl | Will fix | ⬜ |
| W-07 | `assets/data/launch.json` is untracked, so fresh deploys 404 on the maintenance page. Ship a default file | `assets/data/` | `git status` | Will fix | ⬜ |
| W-08 | Dead `SOON` entries for screens that are built elsewhere. Remove | `admin/admin.js` `SOON` map | Audit F-09 | Will fix | ⬜ |
| W-09 | Roadmap breakdown report counts and names need correcting (52 vs ~62 screens; sidebar group names; `#cx-dock` vs `#cx-bub`) | `docs/V2.5-PRO-vs-ROADMAP-breakdown.md` | Audit F-11 | Will fix | ⬜ |
| W-10 | Manual check of study editor toolbar and block controls with text selected, and the logo "Sliding row" button. No bug confirmed yet | Pages → study, Logos | Click verification | Will fix | ⬜ |
| W-11 | Check the Pages "Edit" hash link `#/builder/index.html`. It works through the builder route but was not exercised | Pages | Click verification | Will fix | ⬜ |
| W-12 | Re-run the browser crawl and click verification on the final build. Confirm 0 page errors | QA | This pass | Will fix | ⬜ |

## C. Needs approval

| ID | Item | Decision needed | Recommendation |
|---|---|---|---|
| N-01 | **Users & roles shows fabricated staff** (`admin-users.js` overrides the working manager in `admin.js`; `team_list` has no backend). Add/Edit/Roles are toasts. **Critical.** | Option A: remove the `admin-users.js` override, so the real list, Add, Edit and permissions work (one-line change). Option B: keep the card design and rewire it to the real `users` and `user_save` actions | A now, B later if you want the design |
| N-02 | Offers (Discount offers) screen is a placeholder. The WhatsApp hub's "Offers" button and tab link to it | Build it, or hide the button and tab | Hide until built |
| N-03 | Projects and Templates are "coming soon" placeholders in the sidebar | Build, or hide from the sidebar | Hide until built |
| N-04 | GitHub sign-in is on the roadmap but not built | Build (needs an OAuth app and secret) or drop from the roadmap | Drop unless you have an OAuth app |
| N-05 | Flat-file database fallback `_private/admin-db.json` is not in the code | Build or drop | Drop unless you need it when MySQL is down |
| N-06 | Role names differ: roadmap Master, Manager, Developer, Sales, Support vs app owner, admin, editor, sales, support. Your table's mapping (manager→admin, developer→editor) is applied | Keep app names, or rename | Keep app names |
| N-07 | "Search page" bug (page search still shows reports) could not be reproduced | Send a description or screenshot | — |
| N-08 | Google sign-in is built but inactive | Owner's OAuth client ID in "My security" / Connections | — |
| N-09 | Other accounts in your table share the password `admin` (not applied) | Give each account its own password | Unique passwords |
| N-10 | Owner password must be changed before production use | Change it in the admin, before go-live | Required |
| N-11 | `admin/features.html` is a stale standalone guide with dead `#/` links | Keep and update, or delete | Delete if unused |
| N-12 | "quick fix l" (from your earlier message): meaning unclear | Tell me what you meant | — |
| N-13 | Login throttle: 8 failed attempts lock for 10 minutes (by design, confirm) | Keep or change | Keep |

## D. Verified OK (no action)

| Item | Result |
|---|---|
| JS syntax (61 admin files + builder + assets) | 0 errors |
| PHP lint (40 API files + others) | 0 errors |
| Integrations (`#/settings`) in expanded sidebar | Visible |
| Add-lead modal close-button layout | OK |
| `matchMedia` in `admin/index.html` line 10 | Inside try/catch. Not a bug |
| Pager, segmented and delegated controls | Work (see audit §5) |
| Broken images | None |
| Page-level JS exceptions across 66 routes | None |
