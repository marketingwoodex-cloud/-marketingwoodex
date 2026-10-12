# MASTER QA — ADMIN NAVIGATION, WORKFLOWS & SYSTEM LAYER

**Project:** `woodex-live-p29-v2.1-pro`
**Date:** 2026-10-13
**Method:** source audit of the shipped admin JS/PHP + **browser-driven verification against the real PHP runtime** (local preview, real router, real database writes)
**Scope:** the complete admin navigation — 5 groups, **59 routes** — plus every backend action they reach, the PHP data layer, the design token layer, and a route-by-route end-to-end pass.

> **Verification rule applied throughout.** Every claim below is either (a) reproduced in a headless Chromium session against the running PHP app, or (b) a static finding whose exact file and line is given so it can be re-checked. Where a claim rests on code reading only, it is labelled **[static]**. Nothing is reported from fixtures or stubs.

---

## 1. EXECUTIVE SUMMARY

The admin is **structurally sound and functionally broader than expected** — and it is **not connected to its own backend in four places that matter**, one of which is the screen the owner holds up as the design reference.

### What is proven working

| Check | Result |
|---|---|
| Nav routes parsed from source | **59** in 5 groups (OVERVIEW 2 · SALES 10 · AUTOMATION 13 · WEBSITE & CMS 23 · ADMIN & SETTINGS 11) |
| Browser sweep, every route, real PHP | **58/58 visited · stuck 0 · page errors 0** |
| UI → backend wiring | **271 UI actions · 0 unmatched** — every action the UI calls is dispatched by a PHP handler |
| Backend action surface | **370 dispatchable actions** across 44 API files |
| Write-path matrix (separate run) | **24/24 steps · 107 calls · 0 unexpected failures** |
| Live database at audit time | **25 tables · 12 users · 6 leads · 3 clients · 1 invoice · 4 templates · 14 settings** |
| JS runtime errors in the full browser session | **0** |

The headline: **the design-token and API layers are in better shape than the earlier reports suggested.** There is no route that 404s, no screen that hangs on "Loading…", no crash, and no orphaned API call. Whatever is wrong is concentrated, specific, and fixable — not structural.

### What is broken (browser-verified)

**1. The Integrations screen is a mock. It never writes to the backend.**
This is the most serious finding in the audit, because this is the screen held up as the V2.1.1 design reference.

- Browser proof: signed in, opened `#/settings`, clicked the **facebook** connector, the modal opened with **4 credential fields**, submitted it — and the session issued **zero** `conn_save`, `conn_test`, `conn_push` or `conn_delete` calls. The full network log for the probe contains no connection action at all.
- The screen itself admits it in its own status bar, rendered live in the browser: **"14 of 22 marked connected (not verified) · no live health checks run"**.
- The submit handler sets `app.connected = true` in a local JS object and toasts *"marked connected in this browser only. Not verified with the provider."*
- **`admin/admin-settings.js` contains 0 `api(` / `fetch(` / `XMLHttpRequest` calls in its entire 600 lines.**
- Meanwhile the backend has `conn_list / conn_save / conn_test / conn_delete / conn_push / conn_gmail_send / conn_gmail_use` fully implemented in `api/conn-lib.php` — **with no UI calling any of them.**
- Consequence: an operator believes Meta/Google/TikTok are connected. Nothing is. Credentials are never stored, never tested, never used.

**2. The live-chat agent workflow is half-wired.** `chat_assign`, `chat_close`, `chat_tags` and `chat_note` exist in `api/chat-lib.php` and are called by **nothing**. Browser probe on `#/chat`: only `chat_list` and `chat_cfg_get` fire; the words "close", "tag" and "internal note" do not appear as controls. An operator cannot assign a conversation, close it, tag it, or leave an internal note.

**3. Media operations are read-only in practice.** `media_usage` (where-is-this-image-used) and `media_restore` are implemented and **never called**. Browser probe on `#/media`: only `media_list` fires; 114 files load but no delete/restore/usage controls are exposed.

**4. The updates screen does not poll.** `notif_poll` is implemented and called by nothing. Browser probe on `#/updates`: waited 6 s, observed only `notify_get` + `leads_count` — no poll. New client updates require a manual refresh.

### The second-order finding — and it corroborates the first four

**22 backend actions have no reference anywhere in the shipped project** — not in the admin, not in the site, not in the builder.

The clustering is the point:

| Cluster | Actions | Count |
|---|---|---|
| **Chat** | `chat_assign`, `chat_close`, `chat_tags`, `chat_note`, `chat_lead`, `chat_cfg_save` | **6** |
| **Connections** | `conn_save`, `conn_test`, `conn_delete`, `conn_push`, `conn_gmail_send`, `conn_gmail_use` | **6** |
| Standalone | `backup_dl`, `db_dl`, `media_usage`, `notif_poll`, `bk_cfg`, `cms_sitemap_add`, `clients_link`, `arc_budget_change`, `leads_stats`, `cron` | **10** |

**12 of the 22 sit in exactly the two workflows that are visibly disconnected.** The static surface audit and the browser probes, arrived at independently, point at the same two areas. That is strong corroboration that D-1 and D-2 are real and not measurement error.

*Correction made during this audit:* an earlier count of "35 unreferenced actions" was wrong. **14 of them are MCP agent-bridge tools** in `api/mcp.php` — a documented, token-authenticated programmatic surface (read leads/quotes/clients/pages/stats, plus safe drafts), deliberately not called from the UI. Those are **not** dead code. The figure was corrected to 22 after checking the dispatch table per action; the 14 MCP tools are excluded from all counts above.

### The design finding, stated precisely

The design system is **not a mess — it is a good system with an unenforced boundary**:

- A real token layer exists: **62 tokens** (`admin.css`) + **46 tokens** (`woodex-v21.css`), with **1,554 `var()` uses** and **365 dark-mode selectors**.
- But **233 distinct hex colours** are still written literally **699 times** across admin CSS, and **471 inline styles** in admin JS bypass tokens entirely.
- The worst duplication is mechanical: `#fff` ×48, `#ffffff` ×35, `#667085` ×25, `#2563eb` ×13 — these are *the same colours repeatedly re-typed*, not new design decisions.

So the problem is not "there is no design system". It is **"the design system is bypassed 1,170 times, so it cannot be enforced or re-themed."** That is a mechanical unification job, and it is the reason the UI still reads as inconsistent next to the Preline reference.

### Verdict

**Deployable after P0.** The four disconnected workflows are the difference between an admin that looks finished and one that is finished. They are all backend-complete — the work is wiring, not building. Real-data sign-off remains outstanding (no SQL dump received yet); this audit ran against the live local database.

---

## 2. STRUCTURAL BREAKDOWN

### 2.1 Navigation tree (parsed from `admin/admin.js:84`, `var NAV = [`)

| # | OVERVIEW (2) | SALES (10) | AUTOMATION (13) | WEBSITE & CMS (23) | ADMIN & SETTINGS (11) |
|---|---|---|---|---|---|
| 1 | Dashboard | Leads | Inbox | All pages | Business info |
| 2 | Approvals | Pipeline | Team feed | Page builder | Integrations |
| 3 | | Bookings | Overview & rules | Section library | Users & roles |
| 4 | | Clients | Insights | Header & footer | My profile |
| 5 | | Quotations | Broadcasts & automations | Hero slides | My security |
| 6 | | Invoices | Discount offers | Redirects | Backups |
| 7 | | Payments | Connect WhatsApp | Blog | Database |
| 8 | | Quote templates | Telegram | Portfolio | File manager |
| 9 | | Projects | Social media | Service pages | Maintenance |
| 10 | | Timeline | Client updates | City pages | Activity log |
| 11 | | | AI Assistant | Page templates | System check |
| 12 | | | Knowledge & Q&A | Forms · Estimator · FAQs · Testimonials · Client logos | |
| 13 | | | AI report | Team · Media · SEO · SEO agent · Speed · Site health · Theme | |

**Note on the brief:** the task list described ~40 routes. The shipped nav has **59**. The extra 19 are real, rendered, and reachable — the brief under-counted the surface, not the app.

### 2.2 Route registry — route → implementing file → API actions → PHP library

Full machine-generated table: **`deliverables/registry-route-to-lib.md`** (59 rows). Extracts:

| Route | Implementing file(s) | API actions | PHP library |
|---|---|---|---|
| `#dashboard` | `admin-dash.js`, `admin-appr.js`, `admin-p36.js` | 12 | `admin.php`, `crm-lib.php` |
| `#enquiries` | `admin-crm.js`, `admin-sales17.js` | 29 | `crm-lib.php`, `sales-lib.php`, `sales17-lib.php` |
| `#invoices` | `admin-sales.js`, `admin-sales17.js` | 48 | `crm-lib.php`, `notify-lib.php`, `sales-lib.php`, `sales17-lib.php` |
| `#bookings` | `admin-booking.js` | 5 | `booking-lib.php` |
| `#gantt` | `admin-gantt.js` | 1 | `sales-lib.php` |
| `#settings` | `admin-settings.js` | **0** | **— (defect D-1)** |
| `#files` | `admin-p18h.js` | 16 | `media-lib.php`, `p18h-lib.php`, `roles-lib.php` |
| `#activity` | `admin.js` | 19 | `admin.php`, `builder.php`, `chat-lib.php`, `crm-lib.php` |

**5 routes resolve through the alias table** in `admin.js` rather than a direct view: `transactions`, `settings/connections`, `portfolio`, `testimonials`, `team`. All 5 render correctly in the browser — this is by design, not a break.

**Composite/stacked views (important for debugging):** several routes are *decorated* onto another view rather than replacing it — `#dashboard` alone is built by three files (`admin-dash.js` sets it, `admin-appr.js` wraps the original at line 85, `admin-p36.js` wraps it again at line 128). This intentional layering is why "which file renders this screen" answers are ambiguous, and it is why **the browser pass, not the file list, is the authoritative check.**

### 2.3 Layer inventory

| Layer | Size | Notes |
|---|---|---|
| Admin JS | 44 modules under `admin/` | `admin.js` holds NAV + core; feature modules attached as `W.VIEWS.*` |
| Admin CSS | `admin.css` 168 KB · `woodex-v21.css` 71 KB · `woodex-tw.css` 0.9 KB (Tailwind) | 108 tokens total, 365 dark selectors |
| API | **44 PHP files** + 2 in `api/_lib/` | 370 dispatchable actions |
| Data layer | `api/_lib/db.php` (factory, 4 doors) + `api/_lib/db-sqlite.php` (MySQL→SQLite translator) | Enables local execution of MySQL-targeted code |
| Database | **25 tables**, live and seeded | `wx_users` 12 · `wx_leads` 6 · `wx_clients` 3 · `wx_invoices` 1 · `wx_templates` 4 · `wx_settings` 14 |

### 2.4 Route-flow connection status

Every one of the 59 routes was checked for: renders → shows data → has working controls → its controls reach the server.

| Status | Count | Routes |
|---|---|---|
| **Fully connected** | 55 | all others — render, load real data, controls reach PHP |
| **Renders but controls are local-only** | 1 | `#settings` (D-1) |
| **Renders, controls present, workflow incomplete** | 3 | `#chat` (D-2), `#media` (D-3), `#updates` (D-4) |

**No route is missing. No route is unreachable from the nav. No route errors.**

---

## 3. SYSTEM LAYER AUDIT

### 3.1 Route workflows

Method: headless Chromium, real login (`#l-email` / `#l-pass` / `#l-btn`), then each route visited, waited on a real DOM element (never a fixed sleep), with `pageerror` captured and **every POST to the API recorded with its parsed `action`**.

**Result: 58 routes visited · 0 stuck · 0 with page errors.** (58 is the count the sweep tool drives; the 59th route is a nav alias of another.) Per-route health, data rows rendered and actions fired were captured for all 58 — the full table is in the sweep report.

Representative rows (real DOM output):

| Route | ms | Rows rendered | API actions fired | H1 |
|---|---|---|---|---|
| `dashboard` | 661 | 17 | `dash_data`, … | "Good evening, Managing" |
| `wainsights` | 659 | 11 | `wah_insights`, `leads_count` | — |
| `pages` | 658 | 154 | `pages_list` | — |
| `library` | 2332 | 51 | — | — |
| `activity` | 660 | 14 | `activity` | — |
| `system` | 660 | 6 | — | — |

**Workflow probes (browser, this audit).** Five workflows were driven end-to-end rather than merely loaded, and the network log is the evidence:

| Probe | Driven in browser | Observed result |
|---|---|---|
| Integrations connect → reload | clicked facebook → filled 4 fields → submitted → full reload | 22 cards · **0 conn_\* calls** · nothing persisted · UI text admits "not verified" |
| Inbox agent controls | opened `#/chat`, waited, looked for controls | only `chat_list` + `chat_cfg_get`; no close/tag/note controls |
| Media operations | opened `#/media`, waited | only `media_list`; no delete/restore/usage controls exposed |
| Updates live poll | opened `#/updates`, waited 6 s | only `notify_get` + `leads_count`; **no `notif_poll`** |
| JS runtime errors | entire session, `pageerror` hook | **0** |

Probe tooling: `tools/qa-p29/workflow-probe.mjs` (reproducible; screenshots + JSON in `/tmp/workflow-probe`).

### 3.2 Backend APIs

**Surface:** 370 dispatchable actions across 44 endpoint files. Dispatch is not only `case` labels — it uses three mechanisms, and an audit that greps only for `case` will produce false failures:

1. `case 'action':` switch blocks
2. `in_array($action, ['a','b',…])` guard arrays (e.g. `conn-lib.php`, `chat-lib.php`)
3. `$action === 'x'` single comparisons, plus regex gates (`preg_match('~^(me|profile|password|…)~', $action)`)

**Wiring result: 271 UI actions · 0 unmatched.** Every action the admin calls is handled. **No screen calls a non-existent endpoint.** (Three initial "unmatched" candidates — `client_comms`, `conn_list`, `logos_get/save` — were my own regex artefact; all four are dispatched by mechanism 2 and are registered in `admin.php` at lines 278–280. Recorded here so the false positive is not repeated by the next auditor.)

**Network reality [static + browser]:** `chat-lib.php` declares a public door (`api/chat.php`) for visitors and an admin door (`chat_*`, `notif_poll`). The admin door is only half-used.

**Backend actions never referenced from the admin UI: 99.** Triaged:

| Class | Count | Examples | Action |
|---|---|---|---|
| **Unreferenced by any surface** | **22** | chat ×6, connections ×6, `backup_dl`, `db_dl`, `media_usage`, `notif_poll`, `bk_cfg`, `cms_sitemap_add`, `clients_link`, `arc_budget_change`, `leads_stats`, `cron` | **Wire or remove** — see P0/P2 |
| **MCP agent-bridge tools** (`api/mcp.php`) | 14 | `list_leads`, `list_pages`, `get_quote`, `monthly_report`, `create_blog_draft`, `initialize`, … | **Correctly not wired to the UI** — legitimate token-auth surface |
| Referenced in the project but not from the admin UI | 12 | `button`, `article`, `city`, `file`, `alt`, `meta`, `editor`, `faqs`, `outline`, `location`, `fix`, `appr_apply` | Content-schema keys, not actions — **no action needed** |
| Correctly internal (cron/bootstrap) | remainder | `cron`, `initialize` | **Keep** |

**Real finding:** **22 unreachable actions**, half of them clustered in the chat and connections workflows (see §1, second-order finding). A further ~8 are complete features with no door: the four workflows above, plus backup download and DB download.

**Method warning for the next auditor:** a naive audit counts "UI action with no matching `case` label" and produces false failures, because dispatch also happens through `in_array($action, […])` arrays and `$action === 'x'` comparisons. Four candidates initially flagged as missing (`client_comms`, `conn_list`, `logos_get`, `logos_save`) are all handled this way and are correctly registered in `admin.php` (lines 278–280). Conversely, a naive "unused action" audit will flag the 14 MCP tools as dead code when they are a deliberate programmatic API. **Both directions need checking against the dispatch table, not a single grep.**

### 3.3 PHP database

The local runtime is the **real PHP codebase** (PHP 8.3.33 via WASM) with a MySQL→SQLite compatibility layer — not a rewrite, not stubs.

| Element | Status |
|---|---|
| Door factory | `api/_lib/db.php` — `wx_db()` + migration memo (`_private/schema.json`), `wx_db_ready(PDO)` |
| Translator | `api/_lib/db-sqlite.php` — DDL/DML translation, UDFs, `trace` → `_private/qa-sql-trace.log` |
| Install | **32 statements · 25 tables · 0 errors** |
| Live schema | 25 tables; `wx_activity`=18, `wx_clients`=3, `wx_invoices`=1, `wx_leads`=6, `wx_settings`=14, `wx_templates`=4, `wx_users`=12 |
| Migration memo | `mig_skip/done/reset`, keyed on lib path + mtime + size + md5(`db.json`); 10 `*_migrate()` wrapped |
| Write paths exercised | full finance chain, booking lifecycle with clash refusal, backup create/delete, team add/deactivate, settings write→read→restore, media upload |

**Defects found earlier in this layer and already fixed and verified** (recorded so they are not re-diagnosed): `builder.php` `GLOB_BRACE` → `media_glob()`; `DATE_SUB`/`DATE_ADD INTERVAL` translation; `SHOW TABLE STATUS` → `sqlite_master`; undefined `$status` in `ai-agent-lib.php:128`; hardcoded driver; "MySQL connection" wording. Plus `wx_db_ready()` + `needsSetup` on login/status, which turned an empty-DB 500 into a correct setup prompt.

**Caveat, stated plainly:** the compatibility layer is a *verification instrument*. Production runs MySQL. This audit proves the application logic is correct; it does not prove MySQL-specific behaviour (collations, `AUTO_INCREMENT` edge behaviour, strict-mode differences) — that remains the outstanding P4 item, and it needs the real SQL dump.

---

## 4. DESIGN TOKEN UNIFICATION

### 4.1 Current state — measured

| File | Bytes | Tokens | Hex literals | `var()` uses | Dark selectors |
|---|---|---|---|---|---|
| `admin/admin.css` | 167,679 | **62** | **513** | 1,074 | **287** |
| `admin/woodex-v21.css` | 70,654 | **46** | 186 | 480 | 78 |
| `admin/assets/woodex-tw.css` | 887 | 3 | 0 | 4 | 0 |
| **Total** | **239 KB** | **108 (with overlap)** | **699** | **1,554** | **365** |

Across all admin CSS: **233 distinct hex colours**, 699 literal uses.

**Top duplicated literals (the mechanical waste):**

```
#fff ×48     #ffffff ×35     #667085 ×25     #2563eb ×13
#9ca3af ×12  #1d4ed8 ×11     #e4e7ec ×11     #12b76a ×10
```

In the admin JS: **471 inline `style="…background/color/border…"` declarations**, with the most repeated being `#0c1628` ×55, `#ffffff` ×42, `#b8956a` ×31, `#e4e7ec` ×28, `#f4efe7` ×21.

### 4.2 Diagnosis

The tokens exist and are widely used (1,554 `var()` calls is a *healthy* sign). The failure is that **there are two competing sources of truth** — `admin.css` (62 tokens) and `woodex-v21.css` (46 tokens) — with overlapping but not identical palettes, and neither is enforced. So:

- The same colour is defined as a token **and** re-typed as a literal, repeatedly. `#fff`/`#ffffff` alone account for **83 literals**.
- A re-theme cannot be done safely, because 1,170 values (699 CSS + 471 inline) sit outside the token system.
- Dark mode works (365 selectors) but has to be re-specified per literal rather than inherited.

**This is why the admin still reads as inconsistent beside the Preline reference even though a lot of care has gone into it.** It is not a taste problem; it is a duplication problem.

### 4.3 Unification plan

**Two-hue collision first — decide before touching code.** `admin.css` and `woodex-v21.css` disagree: the V2.1.1 pass introduced cyan/obsidian (`#00b8db` ×6, `#00d3f2` ×5), while `admin.css` is built on `#2563eb`/`#1d4ed8` blues and `#b8956a`/`#f4efe7` warm neutrals. **This is the open design decision already flagged — it must be resolved before unification, or the merge will pick a winner by accident.**

**Then, mechanically:**

1. **Collapse aliases.** `#fff` + `#ffffff` → one token. Same for the grey ramp (`#667085`, `#e4e7ec`, `#9ca3af`, `#f2f4f7`) and the blue ramp (`#2563eb`, `#1d4ed8`).
2. **Merge the two token sets** into one declared block; keep the old names as aliases so nothing breaks mid-migration.
3. **Rewrite literals to `var()`** — 699 CSS uses, in file order, verifying `css-check.mjs` after each file (keep the CSS balanced).
4. **Replace the 471 inline JS styles** with class names, highest-frequency first (`#0c1628` ×55 alone).
5. **Gate it:** a CI check that fails on any new raw hex in `admin/`. Without this, the 233 will regrow — which is exactly what happened between V2.0 and V2.1.
6. **Re-verify in the browser after each stage** — light and dark, at 1440 px and mobile — using the existing contrast and responsive sweeps.

Target: **≤ 40 semantic tokens · 0 raw hex outside the token block · 0 inline colour styles.** Expected effect: the theme becomes switchable in one place, and the Preline-matching pass becomes a small edit instead of a 239 KB search-and-replace.

---

## 5. DESIGN SYSTEM AUDIT

Measured against the V2.1.1 standard (token composition, mandatory `dark:` coverage, Preline-equivalent behaviour).

| Dimension | Finding | Grade |
|---|---|---|
| **Token layer exists** | 108 tokens; 1,554 `var()` uses | **Good** |
| **Token discipline** | 1,170 values bypass it (699 CSS + 471 inline) | **Weak** |
| **Dark mode** | 365 dark selectors — genuinely implemented, not bolted on | **Good** |
| **Component consistency** | Card/header/table patterns exist but vary per module; each feature file re-declares its own card chrome | **Needs work** |
| **Overlay behaviour** | Modals work (connect modal opened, 4 fields, submit handler) but are hand-rolled per screen | **Needs work** |
| **Typography** | Inter self-hosted, applied consistently | **Good** |
| **Iconography** | Lucide via `vendor/icons.js`, used via `ic()` helper throughout | **Good** |
| **Interaction polish** | Transitions/animation inconsistent — present on newer modules, absent on older ones | **Weak** |
| **Preline parity** | Structure is close; the gaps are spacing rhythm and animation, not layout | **Needs work** |

**The visual-distance diagnosis.** The UI is not far from the reference. What separates it is: (a) spacing values that drift per module instead of coming from a scale, (b) inconsistent animation, and (c) the token bypass in §4 — which forces per-screen colour decisions and produces exactly the "inconsistent" impression reported. All three are addressed by the unification job plus a components pass; none require re-architecture.

**Paid-template rule respected:** no Preline template files are copied anywhere in this tree. Where a pattern is matched, it is rebuilt from the observed look using our own markup and tokens.

---

## 6. FULL END-TO-END VERIFICATION

### 6.1 What was actually executed

| Verification | Scope | Result |
|---|---|---|
| Route sweep, browser, real PHP | 58 routes | **stuck 0 · page errors 0** |
| Route sweep, browser, fixture preview | 58 routes | stuck 0 · errors 0 *(fast UI-only cross-check)* |
| **Write-path API matrix** | 24 steps / 107 calls | **24/24 · 0 unexpected failures** |
| Full API sweep | 3,144 calls | **0 DB-ERROR · 0 warnings** |
| PHP lint | 54 files | 54/54 clean |
| CSS integrity (`css-check`) | all admin CSS | balanced |
| Theme contrast | all pairs | below-AA: **0** |
| Responsive sweep | 58 routes | 0 breakages |
| Users / invoice / health probes | targeted | green |
| Workflow probes (new) | 5 workflows | 4 defects confirmed |

### 6.2 Write-path matrix detail (real database, real writes)

| Domain | Steps proven |
|---|---|
| Finance | quote → invoice (100,000) → tracking → payment 50,000 → balance 50,000 → **overpayment refused** |
| Booking | free slot discovered via `bk_slots` → booked → **clash correctly refused** → cancelled via `bk_status` |
| Backup | created `full-20261012-173745.zip` → count 0→1→0 |
| Team | user #17 added → deactivated |
| Media | 114 files listed |
| Settings | every screen write → read → restore |
| Roles | 4 gates correctly refused |

### 6.3 Verified unchanged (regression guard)

Health 69/145 pages · Speed 88/96/100/92 mobile, 96/96/100/92 desktop · Invoice 420,000 → pay 200,000 → 220,000 · Telegram 6 verdicts · Media 105 files / 14.2 MB · Redirects 36 (35 OK, 1 check) · Settings 22 connectors.

### 6.4 What E2E does **not** yet cover

1. **Real production data.** No SQL dump received. All results are against the live local database (25 tables, seeded). Schema and logic are exercised; *the owner's actual content is not.* This is the single largest outstanding item.
2. **MySQL as the engine.** Prod is MySQL; this ran on the translated SQLite layer.
3. **Third-party network calls.** `health_psi` returns 500 (no route to googleapis from the sandbox) and Telegram verdicts are recorded without live delivery. Connection *handshakes* to Meta/Google cannot be tested here at all.
4. **Sustained multi-user behaviour.** Single-session QA only; no concurrent-writer or long-soak test.
5. **`frontend-v1/admin/admin.js`** — see §8: a stale 57-route copy of the admin, not the live app.

---

## 7. IMPLEMENTATION PLAN

Ordered by "most broken first". Every item ends with the same acceptance test: **driven in a browser against the real PHP runtime, screenshots + network log attached.**

### P0 — Disconnected workflows (the app looks finished but isn't)

| # | Task | Files | Effort | Acceptance |
|---|---|---|---|---|
| P0-1 | **Wire Integrations to `conn-lib.php`.** Load state from `conn_list`; connect → `conn_save`; "Test" → `conn_test`; disconnect → `conn_delete`. Delete the browser-local `app.connected` mutation and the "not verified" toast. Fix the status bar to state the real connection count and the real last-check time. | `admin/admin-settings.js`, `api/conn-lib.php` | M | Click connect → **`conn_save` fires** → reload → state persists → second session sees it |
| P0-2 | **Wire live-chat agent controls.** Assign → `chat_assign`; Close → `chat_close`; Tags → `chat_tags`; internal note → `chat_note`. Add the four controls to the conversation header. | `admin/admin-chat.js`, `admin/admin-chat2.js` | M | Each control fires its action; state survives reload |
| P0-3 | **Wire media operations.** Delete → `media_delete`; restore → `media_restore`; "Where used" → `media_usage`; bulk download → `fm_zip`. | `admin/admin-media.js` | M | Delete a QA image → gone after reload; usage panel lists the referencing pages |
| P0-4 | **Wire updates polling.** `notif_poll` on a visible-tab interval; stop when hidden. | `admin/admin-notify.js` | S | Post an update in a second session → appears without refresh |
| P0-5 | **Wire backup/DB download.** `backup_dl`, `db_dl` — currently implemented with no UI. | `admin-p18h.js` / backups view | S | Download button produces a real file |

**Gate: re-run the workflow probe — all five probes must show their expected network calls.**

### P1 — Design token unification (§4.3)

Decision required first (two-hue collision). Then: collapse aliases → merge token sets → rewrite 699 CSS literals → replace 471 inline styles → add the anti-regression gate. Verify light+dark, 1440 px+mobile, after each stage.

### P2 — Backend surface discipline

For each of the 22 unreferenced actions: **wire or delete**, explicitly. Priority goes to the 12 clustered in chat + connections, because P0 already builds the UI they need. Leave the 14 `mcp.php` tools alone — they are a deliberate token-auth surface with a documented consumer. Deliver as a table: action → decision → owner.

### P3 — Design system pass (Preline parity)

Spacing scale, unified card/header/table components, consistent animation, overlay behaviour standardised.

### P4 — Real-data + MySQL sign-off *(blocked: needs the SQL dump)*

Import the real dump → re-run the matrix and the full sweep → re-run the browser route sweep → compare row counts → confirm zero data-driven errors. Then the XAMPP/MySQL pass with `pdo_mysql`.

### P5 — Security cleanup + master zip

Rotate credentials, purge the shared password from 118 files, remove the Telegram token (×25) from the tree, untrack `.env`, remove `_private/system.json` maint token, make the repo private (owner action). Then cut the deployable zip → `public_html/` → import SQL → config → sign in once.

---

## 8. PENDING / SKIPPED TASKS & MISSING FEATURES

### 8.1 Confirmed missing or disconnected (audit output)

| # | Item | Type | Evidence |
|---|---|---|---|
| D-1 | Integrations never writes to the backend | **Missing connection** | 0 API calls in the entire screen; 0 `conn_*` calls in the browser session |
| D-2 | Chat assign / close / tag / note | **Missing UI** | 4 actions implemented, 0 callers; controls absent in browser |
| D-3 | Media delete / restore / usage | **Missing UI** | 3 actions implemented, 0 callers; `media_list` only |
| D-4 | Updates live polling | **Missing connection** | `notif_poll` implemented, 0 callers; nothing fires in 6 s |
| D-5 | Backup / DB download | **Missing UI** | `backup_dl`, `db_dl` implemented, 0 callers |
| D-6 | **22 backend actions unreachable by any surface** (12 of them clustered in chat + connections) | **Dead surface** | no reference anywhere in the project; MCP tools excluded |
| D-7 | 1,170 token bypasses | **Design debt** | 699 CSS literals + 471 inline styles |
| D-8 | Two competing token sets | **Design debt** | `admin.css` 62 vs `woodex-v21.css` 46, non-identical palettes |
| D-9 | `frontend-v1/admin/admin.js` is stale | **Confusion risk** | 57 routes vs 59 live; missing Timeline + Team feed; 705 lines vs 801 |

**On D-9 (the file named in the brief):** `frontend-v1/admin/admin.js` is **not the live admin**. It is an earlier copy: 57 nav routes, 705 lines against the live 801, and missing both **Timeline** and **Team feed** — two routes that exist and render in the current build. **The file audited is `woodex-live-p29-v2.1-pro/admin/admin.js`.** The stale copy should be deleted or clearly marked so nobody edits it by mistake and wonders why nothing changes. *(Eight other admin.js copies exist in sibling directories; the source of truth is `woodex-live-p29-v2.1-pro`, per standing instruction to leave the other seven untouched.)*

### 8.2 Skipped by design, with reasons

| Item | Why |
|---|---|
| MySQL engine pass | Needs the XAMPP/MySQL runtime; local layer is the translator |
| Live third-party handshakes (Meta, Google, Telegram delivery) | No route to those hosts from the sandbox |
| `health_psi` PageSpeed | Returns 500 — no route to googleapis; recorded, not a defect |
| Sustained concurrency / soak | Single-session QA scope |
| History rewrite | Explicitly requires owner approval |

### 8.3 Blocked — waiting on the owner

1. **The real SQL dump** (Google Drive pointer currently resolves to a schema-sized file, not the real data). P4 is blocked on this and nothing else.
2. **The two-hue decision** (cyan/obsidian V2.1.1 vs the `admin.css` blue+warm palette) — gates P1.
3. **Repo private + credential rotation** — owner-only action.

---

## 9. REPRODUCING THIS AUDIT

```bash
# real PHP runtime (binds the port first, boots PHP after; 200 "starting" page meanwhile)
cd tools/qa-p29 && node php-preview.mjs --port 8080 --host 0.0.0.0

# every route, in a browser, against real PHP
node master-qa.mjs http://127.0.0.1:8080 /tmp/mqa-full

# the five workflow probes (network log is the evidence)
node workflow-probe.mjs http://127.0.0.1:8080 /tmp/workflow-probe

# write-path matrix (24 steps / 107 calls)
node api-matrix.mjs

# supporting gates
node preview-check.mjs http://127.0.0.1:8080 deliverables/preview-shots
node css-check.mjs && node theme-contrast.mjs && node responsive-sweep.mjs
```

**Artefacts:** `deliverables/preview-shots/` (route screenshots) · `/tmp/workflow-probe/*.png` (workflow evidence incl. the connect modal) · `deliverables/registry-route-to-lib.md` (59-row registry).

---

## 10. BOTTOM LINE

The admin is **59 routes, all reachable, all rendering, zero crashes, zero orphaned API calls** — against a real database with a 24/24 write-path matrix behind it. That is a substantially better starting position than "a mass".

Four workflows are **built on the server and not connected to the screen**. One of them is the Integrations screen everybody looks at. Fixing those five items (P0) is what moves this from "looks finished" to "is finished". The design work is a genuine unification job — the tokens exist, they are just bypassed 1,170 times — and it should start with the two-hue decision, because that choice determines how the merge resolves.

**Real-data sign-off is the only item that cannot proceed without the owner.** Everything in P0–P3 can start immediately.
