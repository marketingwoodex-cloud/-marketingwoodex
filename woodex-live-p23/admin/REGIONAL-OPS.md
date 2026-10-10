# REGIONAL OPERATIONS — v2.6 module reference

Desktop-only workspace inside `/admin/` (`≥1280 px`): fixed sidebar, floating content canvas.
Everything on this screen is scoped by the **mandatory routing parameter** — one or more of the
12 verified municipal node directories.

## 1. Files

| File | Role |
| --- | --- |
| `_templates/region-nodes.json` | System template. Node registry (12 nodes + sub-areas), layout presets (5/10 marla, 1/2 kanal, farmhouse, office, retail, restaurant), categories, 6-stage delivery model, currency/GST/advance defaults. |
| `_templates/region-variants.json` | Timber variant matrix: 8 species, 6 surface coatings, 6 cores/boards, 5 hardware kits, 4 transport zones, formula reference. Species/coating keys are the tokens used by `/estimator` and the workshop cutting lists. |
| `_database/woodex-regions.sql` | Idempotent schema + seed: `wx_region_nodes`, `wx_region_rate_cards`, `wx_region_projects`, `wx_region_milestones`, `wx_region_ledger`, `wx_region_variants`; adds `wx_leads.node` + `wx_leads.area_code` and backfills them from city text. |
| `api/regions-lib.php` | Server library (46 functions). Registry, KPI aggregation, node-scoped reads, board-foot/running-foot engine, quotation hand-off, rate cards, variants, reports, health audit, CSV export. Required by `api/admin.php`. |
| `admin/admin-regions.js` | UI module. Registers `WXA.VIEWS.regional` and 10 canvases mounted at `#/regional/<tab>`. |
| `admin/regional.css` | Module stylesheet, token-driven so both themes resolve (see §6). |

Registration points that were patched:

* `api/admin.php` — `require __DIR__ . '/regions-lib.php';` (after `conn-lib.php`) and
  `!rgn_actions($action, $in) && …` at the head of the `default:` chain.
* `api/roles-lib.php` — `rgn_[a-z0-9_]+` added to the **sales** action group; `SHARED` grants
  `rgn_boot / rgn_nodes / rgn_variants / rgn_rates / rgn_health` to the **website** group too
  (Developer can read the registry and rate book, never a ledger).
* `admin/index.html` — `<link rel="stylesheet" href="regional.css?v=2.6.0">` in `<head>`,
  `<script src="admin-regions.js?v=2.6.0" defer></script>` last in the script stack.
* `admin/admin.js` — navigation entry `["regional", "Regional ops", "map-pin", "g:sales"]`
  under the **SALES** heading.

## 2. Node registry (the routing parameter)

```text
LHR Lahore      /lahore/        index 1.00  zone A  8 sub-areas (dha, bahria-town, gulberg,
ISB Islamabad   /islamabad/     index 1.12  zone A     model-town, johar-town, wapda-town,
KHI Karachi     /karachi/       index 1.08  zone A     cantt, lake-city)
RWP Rawalpindi  /rawalpindi/    index 1.05  zone A
FSD Faisalabad  /faisalabad/    index 0.94  zone B
GRW Gujranwala  /gujranwala/    index 0.92  zone B
MUX Multan      /multan/        index 0.93  zone C
PSH Peshawar    /peshawar/      index 0.95  zone C
SKT Sialkot     /sialkot/       index 0.94  zone B
BWP Bahawalpur  /bahawalpur/    index 0.90  zone C
QTA Quetta      /quetta/        index 1.02  zone D
HYD Hyderabad   /hyderabad/     index 0.91  zone D
```

* The index is the fabricator's labour multiplier; `rgn_rate()` multiplies the estimator baseline
  (`/assets/js/estimator-rates.js` → mirrored in `RGN_RATE_FALLBACK`) by it. A row in
  `wx_region_rate_cards` wins over the template for that node only.
* `rgn_node()` rejects any code that is not one of the 12 — routing can never resolve to a
  non-existent directory. Every query in the library carries the parameter.
* Historical rows without a node are routed once by `rgn_guess_node()` (text → code) and backfilled
  in SQL section 10.

## 3. API actions (`POST /api/admin.php`, header `X-WX-ADM`)

| Action | Access | Purpose |
| --- | --- | --- |
| `rgn_boot` | any signed-in | Registry, variants, layouts, presets, stages, table availability, schema version. |
| `rgn_kpis` | sales+ | Window, axis, 4 KPI cards with day/week/month series, funnel, per-node breakdown, alerts, 12 recent leads, pending milestones, ledger tail, totals. |
| `rgn_leads` | sales+ | Search + multi-select (stage, priority, node) + unread + min value, sort, paging, facets. |
| `rgn_projects` / `rgn_project_get` / `rgn_project_save` | sales+ | Register list, single record with milestone + ledger trail and the estimator snapshot, create/update. |
| `rgn_milestones` / `rgn_milestone_save` / `rgn_milestone_approve` | sales+ / Master-Manager | Weighted approval queue; approval can post the invoice to the node ledger and advance the project stage. |
| `rgn_ledger` / `rgn_ledger_save` | sales+ | Node money trail (invoice, receipt, PO, labour) with derived paid/balance/overdue. |
| `rgn_estimate` | sales+ | Board-foot / running-foot specification engine (see §4). No side effects. |
| `rgn_quote` | sales+ | Creates the quotation in `wx_quotes` (sales-lib document store, `region` tag inside the JSON), optionally creates the project and seeds the six weighted milestones. |
| `rgn_rates` / `rgn_rate_save` / `rgn_rate_sync` | sales+ / Master-Manager | Rate card per node × service × finish; sync re-seeds all 252 default rows. |
| `rgn_variants` / `rgn_variant_save` | sales+ / Master-Manager | Per-node species/coating/core overrides. |
| `rgn_reports` | sales+ | 12-month matrix (leads, quotes, won, projects, received, overdue) + node ranking with win rate. |
| `rgn_health` | sales+ | 15-point audit: templates, directories on disk, `wx_leads.node`, regional tables, rate-card coverage, unassigned leads, estimator log, zero-total quotations. |
| `rgn_export` | sales+ | Server-built CSV for leads / projects / milestones / ledger in the current node + date scope. |

## 4. Specification formulas

```text
board feet (metric input)   bf  = (t_mm/25.4) × (w_mm/25.4) × (len_mm/304.8) / 12
board feet (imperial)       bf  = (t_in × w_in × len_ft) / 12
net_bf                      = Σ(panel bf × qty)
waste_bf                    = net_bf × waste_pct / 100          ← waste_pct from the node rate card (11–14 %)
gross_bf                    = net_bf + waste_bf
material                    = Σ(net_bf × species.rate_bf × node_index) + waste cost
coating                     = Σ(surface_sqft × coating.rate_sqft × node_index)     faces: 2 shutters / 1 carcass
workshop labour             = (material + coating) × labour_pct / 100              labour_pct = 22 % × node_index
machine time                = joinery labour × 35 %
site fitting                = (material + coating) × 12 %
running-foot item           = BF skeleton of 25 mm face+sides + waste, + labour, ÷ running feet
transport                   = max(zone minimum, subject value × zone pct)          2.5 / 4.0 / 6.5 / 9.0 %
total                       = Σ line items + GST(node 18 %) − discount
advance                     = total × advance_pct                                  node default 40 %, Quetta 50 %
labour per board foot       = workshop labour / gross_bf                           shown on every quotation
```

The engine returns, per line item, the `basis.formula` string and its inputs, so the estimate can be
audited on screen and in the quotation (`SPEC` / `RGN` specification lines are appended to the
document). `rgn_quote` stores the snapshot on the project row (`wx_region_projects.spec_json`) and
appends one line to `/_private/region-estimates.jsonl`.

## 5. UI map (`#/regional/<tab>`)

| Tab | Canvas |
| --- | --- |
| `dashboard` | Alerts strip, 12 node output cards with utilisation bars, stage funnel, latest routed leads, priority (approval) queue. |
| `pipeline` | Kanban with swim-lanes per transport **zone**, columns = the 6 delivery stages, cards carry contract value, milestone progress and target date. |
| `configs` | Volume-configuration table: search, stage / priority / node multi-select chips, unread filter, paging, CSV. |
| `projects` | Register table + project drawer (spec snapshot, milestone approval, ledger trail). |
| `approvals` | Weighted milestone timeline; approve posts the invoice and can advance the stage. |
| `ledger` | Node money trail with kind/status filters, received · receivable · overdue summary, entry drawer. |
| `estimator` | Advanced form: node, service, finish, layout preset, area, waste/labour/GST/advance overrides, panel rows (timber species, core, coating, faces), millwork runs, hardware kits → live line items, reconciliation and board-foot math → Create quotation. |
| `rates` | Rate-card matrix (7 services × 3 finishes) with inline editing and "Sync from estimator"; per-node species overrides. |
| `reports` | 12-month performance matrix + node ranking with win rate. |
| `health` | 15-point audit with fixes, rate-card sync shortcut. |

Block 1 is the title/filter bar (date-slicer presets, custom range, node multi-select, sort, export,
refresh, primary "New regional quote"), Block 2 the four KPI cards with spark charts, Block 3 the tab canvas.

## 6. Theme contract

`admin/regional.css` styles every element from the token pairs already declared in `admin.css`
(`:root` light, `html.dark` dark), which is this build's equivalent of the Tailwind fallback idiom:

| Token | Light | Dark | Tailwind equivalent |
| --- | --- | --- | --- |
| `--card` | `#ffffff` | `#111318` | `bg-white dark:bg-stone-900` |
| `--bg` | `#f9fafb` | `#050608` | `bg-stone-50 dark:bg-stone-950` |
| `--line` | `#e5e7eb` | `#20242f` | `border-stone-200 dark:border-stone-800` |
| `--txt` / `--txt2` | `#111827` / `#374151` | `#f3f4f6` / `#d1d5db` | `text-stone-900 dark:text-stone-50` |
| `--mut` | `#6b7280` | `#9ca3af` | `text-stone-500 dark:text-stone-400` |
| `--gold` (accent) | `#007595` | `#00b8db` | `bg-cyan-700 dark:bg-cyan-400` |

## 7. Install

1. **Schema** — phpMyAdmin → Import → `_database/woodex-regions.sql` (safe to re-run; `spec_json`
   is added by the same file when the table already exists).
2. **First load** — Admin → Regional ops. `rgn_boot` seeds the registry from `_templates/`,
   the rate book renders from the template until the SQL is imported.
3. **Rate cards** — Regional ops → Rate cards → choose a node → adjust → *Save* (or *Sync from estimator*
   to lay down all 252 default rows).
4. **Estimator** — tune waste %, labour % and species overrides per node; then *Create quotation*
   to push the calculation into the quotation pipeline with the milestone plan attached.
5. **Verify** — Regional ops → Health. Every check lists the exact fix when it fails.

## 8. Validation performed

* `api/regions-lib.php`, `api/admin.php`, `api/roles-lib.php` parse clean under a PHP 7/8 grammar
  (glayzzle php-parser 3.7.0 — no PHP binary is available in the build sandbox, so `php -l` was
  replaced by a full parse).
* `admin/admin-regions.js` and `admin/admin.js` pass `node --check`.
* Contract audit: all 20 `rgn_*` calls made by the UI resolve to a server `case`, and every
  estimator field the UI sends is read by `rgn_calc()`.
* Board-foot math spot-checked: 18 × 600 × 2400 mm → 10.984 bf; 25 × 450 × 720 mm → 3.433 bf;
  default eight-panel set → 113.554 bf net, 127.180 bf gross at 12 % waste.
