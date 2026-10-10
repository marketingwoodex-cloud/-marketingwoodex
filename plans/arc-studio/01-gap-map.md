# ARC.STUDIO modules on Woodex Admin v2.1: gap map (read-only, step 2)

Status: planning only. No code changed. Decisions from the questions (answered):
- Structure: extend the current admin. Nothing is deleted or renamed in place; overlaps are extended.
- First phase: Projects & field (team feed, timeline, field reports, revision log) and Quotes, materials and POs.
- Blueprints and CAD: metadata and links first (no upload, no AI extraction yet).
- Integrations: CSV import and export first (QuickBooks, AutoCAD, Revit). No live API until approved.

Legend: EXISTS = module present and usable. EXTEND = present, add the ARC fields or views. PARTIAL = related code exists but not the feature. NEW = not in the repo.
Code references are from the pro tree `woodex-live-p29-v2.1-pro/` (checked 2026-10-11).

## Overview and control centre
| Item (your list) | Status | Where it lives now | What to add |
|---|---|---|---|
| Dashboard (finance + project health) | EXTEND | `api/dash-lib.php`, `admin/admin-dash.js` | Project health panel: stage, budget used, next milestone |
| Approvals (budgets + blueprint revisions) | EXTEND | `api/approvals-lib.php`, `admin/admin-appr.js` | New approval kinds: budget and drawing revision |
| Unified Team Feed (architects, contractors, fabricators) | EXTEND | `api/chat-lib.php`, `admin/admin-chat*.js` (Inbox) | Project threads; ARC roles as participants |
| Activity and timelines (Gantt) | PARTIAL + NEW | Activity view exists; projects have stages (`SALES_PSTAGES`, `api/sales-lib.php`) | Gantt view from design to installation (NEW) |

## Architectural plans and schematics
| Site layout and zoning | NEW | none | Project attributes (zone, access, constraints) as fields |
| Floor plan shells | NEW (metadata) | none | Drawing record: name, revision, date, link |
| 3D elevation wireframes | NEW (metadata) | none | Same drawing record, type = elevation/render |
| Structural engineering data | NEW (human-verified) | none | Load fields entered and signed off by a named engineer; AI may flag, never certify |

## Sales, CRM and tracking
| Leads and pipeline | EXISTS | `admin/admin-sales*.js`, `api/sales17-lib.php`, `enquiries`/`pipeline` routes | Stage names for architectural inquiry to signed contract |
| Bookings and calendar | EXISTS | `api/booking-lib.php`, `bookings` route | Site-measurement appointment type |
| Clients and accounts | EXISTS | `api/crm-lib.php`, `clients` route | Linked drawings and billing details |
| Product catalog and stock | PARTIAL | `api/p18e-lib.php` (estimator catalog, no stock) | Stock levels for timber species, finishes, hardware (NEW) |

## Quotes, invoices and specifications
| Smart document builder | EXTEND | `api/sales-lib.php` (quotations, invoices), `quotes` route | Bulk create from material counts |
| Material and finish schedules | NEW | none | Quantities entered by hand, linked to the drawing |
| Vendor and cost estimates (markup) | PARTIAL | Line items exist on quotations | Vendor cost, markup %, margin visible to owner/admin only |
| Purchase orders | NEW | none | Draft PO; approval gate; no auto-send to suppliers |
| Regulatory and compliance docs | PARTIAL | "compliance" appears in 8 files; no document vault | Document vault with expiry dates |

## Automation and agents
| Inbox | EXISTS | `chat` route | (covered in Team Feed) |
| WhatsApp and Telegram notifications | EXISTS | `wahub`, `telegram` routes | Field notifications; sending needs approval per message type |
| AI architectural assistant | EXISTS (AI Assistant) | `aicenter` route | Later: extraction with human confirmation |
| Knowledge and Q&A vault | EXISTS | `train` route ("Knowledge & Q&A") | Categories: wood species, codes, install manuals |

## Field intelligence and logs
| Client review notes (markup, sign-off) | NEW | none | Comments tied to a drawing; digital sign-off record |
| Contractor field reports | NEW | none | Moisture, delivery snags, progress; photos from Media |
| Revision history logs | PARTIAL | Activity route exists | Strict append-only log for drawings and line-item costs |

## Website, CMS and client portal
| Pages and builder | EXISTS | `pages`, `builder`, `library` routes | none |
| Client interactive portal | NEW (gated) | none | Separate login; security review and approval before launch |
| Media and digital assets | EXISTS | `api/media-lib.php`, `media` route | Tags for renders and portfolio |

## Admin, security and system
| Business info and integrations | EXISTS | `business`, `settings` routes | CSV import and export (NEW) |
| Users and roles | EXISTS | `api/roles-lib.php`, `users` route | ARC roles (architect, contractor, fabricator); hide cost and profit fields |
| Backups and database | EXISTS | `backups`, `database` routes | Include drawing and file metadata |

## Counts
- EXISTS: 7. EXTEND: 4. PARTIAL: 5 (includes Activity + Gantt, Catalog, Vendor cost, Compliance, Revision logs). NEW: 11. Gated: 1 (client portal).

## Risks found during the map
1. The projects view (`admin/admin-sales.js`, `projs_list`) is built from invoices. ARC projects need a site, zone and drawing list, so the project record needs new fields rather than a new screen.
2. "Structural" and "compliance" must be human-verified. The assistant must not produce load or certification values.
3. Cost and profit fields must be hidden from the architect and contractor roles. This needs role checks in the API, not only in the UI.
4. The client portal is a new public login surface. It needs its own security review.

## Proposed order for phase 1 (after this map is accepted)
1. Data model: drawings and revisions, material lines, field reports, POs, timeline tasks, ARC roles. Append-only revision log.
2. Approvals: budget and drawing sign-offs.
3. Team Feed: project threads in Inbox.
4. Timeline (Gantt) on projects.
5. Material schedules, vendor cost and markup; PO drafts behind approval.
6. Field reports with photos.
7. CSV import and export.
8. Tests at each step: API permission tests for each role, browser checks, and the contrast sweep on every new route in both themes.

Not in phase 1: client portal, AI extraction, live QuickBooks/AutoCAD/Revit APIs.
