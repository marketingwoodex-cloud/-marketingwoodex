# ARC.STUDIO phase 1: data model (step 2)

Status: specification plus the revision-log library (`woodex-live-p29-v2.1-pro/api/arc-lib.php`). Not wired to routes yet.
Runtime: PHP cannot run in this sandbox (Node 22 is below the ≥24.18 needed for the PHP-WASM check). Syntax is checked with `php-parser`. Runtime tests are required before wiring (see "Verification").

## Storage pattern
Same as the existing modules (`api/sales-lib.php`): tables with a JSON `data` column plus indexed key columns, created by a `*_migrate()` function. Prefix `wx_arc_`.

## Entities
| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `wx_arc_drawings` | Drawing or model record: floor plan, elevation, render, structural sheet, site plan | id, project_id, kind, title | `data`: link (URL or path, not uploaded), scale, sheet no., current rev label |
| `wx_arc_revisions` | Append-only revision log for drawings and line-item costs | id, drawing_id, prev_hash, hash, by_user, created_at | Hash chain. Rows are never updated or deleted by code |
| `wx_arc_material_lines` | Material and finish schedule lines | id, project_id, drawing_id, species, qty, unit | `data`: finish, supplier, vendor cost, markup %. Cost fields hidden from architect and contractor roles |
| `wx_arc_po` | Purchase order drafts | id, project_id, status, no | Status: draft → pending approval → approved (manual send only) |
| `wx_arc_field_reports` | Contractor field reports | id, project_id, author_id, report_date | `data`: moisture %, delivery snags, progress %, photo ids (from Media) |
| `wx_arc_signoffs` | Client review notes and digital sign-off | id, drawing_id, kind, by_name, created_at | Stores name and time; no client password |
| `wx_arc_tasks` | Gantt tasks | id, project_id, start, end, phase | Milestones stay in `wx_projects.milestones` (existing) |

Existing, reused, not duplicated: projects (`wx_projects`), clients (`wx_clients`), approvals queue (`_private/approvals.json`), activity log (`log_act`), media (`media-lib.php`), users and roles (`roles-lib.php`).

## Revision log rules (append-only)
1. One insert per change, never update or delete. Correction = new revision that references the old one.
2. `hash = sha256(prev_hash . '|' . canonical_json(payload))`. The first row has `prev_hash = ''`. Chain is per drawing.
3. Insert runs in a transaction with `SELECT ... FOR UPDATE` on the last row of that drawing, so two saves cannot both take the same `prev_hash`.
4. `arc_verify_chain()` recomputes every hash. Any mismatch = tampering or a bad write.
5. Recommended DB grant (owner decision, not applied): the app user gets INSERT and SELECT on `wx_arc_revisions` only.

## Known issue found while mapping (not changed in this step)
`proj_bill` in `api/sales17-lib.php` runs `DELETE FROM wx_invoices` when a full contract invoice is replaced by milestone invoices (only when there are no payments). This removes a finance record without a trail. For ARC, the revision log should record that replacement, and the delete should be changed to a soft-cancel. This needs a decision, so it is listed as a pending item.

## Role visibility (API, not only UI)
| Field | owner, admin | sales | architect | contractor | fabricator |
|---|---|---|---|---|---|
| Drawings and revisions | yes | yes | yes | yes (read) | yes (read) |
| Material qty, species | yes | yes | yes | yes | yes |
| Vendor cost, markup, margin | yes | per setting | no | no | no |
| Field reports | yes | yes | yes | yes (own) | no |
| PO draft | yes | create | no | no | no |

"per setting" = owner decides in Users & Roles. Roles are new (`architect`, `contractor`, `fabricator`) and are added in step 5. Until then nothing new is exposed.

## Approval kinds (step 3)
- `budget_change`: changes to a project's contract value or to a material line's cost.
- `drawing_revision`: a new revision on a drawing that has a sign-off.
Both use the existing approvals queue (`APPR_EXTRA_WRITE` pattern). No new queue.

## Verification plan (before wiring)
1. `php-parser` syntax check on every changed PHP file (done for arc-lib in this step).
2. Runtime (needs PHP ≥8.2 with pdo_mysql, from a suitable runtime or CI): create tables, insert 3 revisions, verify chain, tamper one row, confirm `arc_verify_chain` fails.
3. API permission tests for each role in the table above.
4. Browser checks and the contrast sweep for each new route, both themes.
