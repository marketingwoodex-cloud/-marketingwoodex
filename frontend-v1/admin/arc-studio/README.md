# WOODEX ADMIN V2.1 + ARC.STUDIO — Preline Block Kit

High-density enterprise UI kit for Woodex Interior. 26 module layouts + 28 block engines, built from
the Preline 972-block system architecture and restyled onto the organic monochrome (stone) palette.

Open `index.html` for the catalogue: searchable rail menu, live module preview, block-mapping table
and source viewer.

## File map

| Path | Purpose |
|---|---|
| `index.html` | Kit catalogue — rail menu, preview frame, source view, foundations (palette, spacing, type) |
| `blocks.html` | Block / component catalogue — copy-ready demos of all 28 engines |
| `shell-reference.html` | Fixed frame shell anatomy (w-64 rail + global top bar + 3-block mount points) |
| `modules/m01…m26-*.html` | 26 production-ready screens, each a standalone document |
| `assets/arc-kit.css` | Compiled Tailwind output (committed — no build step at deploy) |
| `assets/arc-kit.js` | Dependency-free interaction engine (theme, tabs, drawers, kanban, filters, meters) |
| `assets/arc-manifest.js` | Module/block mapping manifest consumed by the catalogue |
| `src/input.css` + `tailwind.config.js` | Tailwind source layer and config |

## Build

The compiled sheet is committed, so nothing has to run on the host. To rebuild after editing markup:

```bash
npx tailwindcss@3.4.17 -c tailwind.config.js -i src/input.css -o assets/arc-kit.css --minify
```

Charts use the repository's local Chart.js build (`../vendor/chart.umd.js`) — no CDN, works offline.

## System rules

1. **No unstyled markup** — every structural element carries explicit Tailwind utilities.
2. **Fixed frame** — every screen is Header/Filter Bar → 4-column KPI row → main action canvas.
   Modules render the stack only; `shell-reference.html` documents the surrounding rail and top bar.
3. **8 px spacing matrix** — `gap-2` 8 px, `p-4` 16 px, `p-6` 24 px, `mb-8`/`gap-8` 32 px. No arbitrary floats.
4. **Organic monochrome palette** — stone/neutral range only. Status is carried by fill weight, edge
   weight and dot treatment, never by hue.

### Tokens

| Role | Light | Dark |
|---|---|---|
| System backdrop | `bg-stone-100` #F5F5F4 | `bg-stone-950` #0C0A09 |
| Component panel | `bg-stone-50` #FAFAF9 | `bg-stone-900` #1C1917 |
| Active accent | `bg-stone-800` #292524 | `bg-stone-200` #E7E5E4 |
| Border edge | `border-stone-200` #E7E5E4 | `border-stone-800` #292524 |
| Primary text | `text-stone-950` #0C0A09 | `text-stone-50` #FAFAF9 |
| Secondary muted | `text-stone-500` #78716C | `text-stone-400` #A8A29E |

Theme mode is class-driven: `.dark` **or** `[data-theme="dark"]` on `<html>` (the existing admin's
theme key `wxaTheme` is reused, so both shells stay in sync).

### Typography

| Use | Utilities |
|---|---|
| Brand identification | `text-xl font-semibold tracking-tight` |
| System header labels | `text-[11px] font-medium uppercase tracking-widest` |
| Body readouts | `text-sm font-normal` |
| Financial KPI readouts | `text-2xl font-bold tracking-tight` |

## Module map

| # | Module | Canvas engine |
|---|---|---|
| 01 | Dashboard Portal | Revenue curve + activity feed |
| 02 | System Approvals Gate | Decision rows + button groups |
| 03 | Unified Team Feed | Chat workspace, 3-panel |
| 04 | Activity & Timelines | Roadmap rails |
| 05 | Site Layout & Zoning | Plot map + registry files |
| 06 | Floor Plan Shells | Layer tree / schematic / spec |
| 07 | 3D Elevation Wireframes | Render matrix + detail drawer |
| 08 | Structural Engineering | Numeric stress grid |
| 09 | Leads & Pipeline | 5-lane drag kanban |
| 10 | Bookings & Calendar | Week grid + agenda rail |
| 11 | Clients & CRM Accounts | Contact directory table |
| 12 | Product Catalog & Stock | Stock ledger + bays |
| 13 | Smart Document Builder | 12-column form + live worksheet |
| 14 | Material & Finish Schedules | Quantified cutting schedule |
| 15 | Financial Accounts & Income | Billing ledger + realisation chart |
| 16 | Purchase Orders | PO register + stepper |
| 17 | Regulatory & Compliance Docs | Authority file cabinet |
| 18 | Inbox & Messaging Hub | Thread list / reader / files |
| 19 | WhatsApp & Telegram | Channel columns + delivery console |
| 20 | AI Architectural Assistant | Prompt dock + cited answers |
| 21 | Knowledge Base Vault | Index + reader |
| 22 | Client Portal Engine | Rendering sign-off + payments |
| 23 | Portal Content & Media | Gallery grid + upload form |
| 24 | System Configurations | Option pickers + switches |
| 25 | Users & Access Roles | Access ledger + permission matrix |
| 26 | Database & System Logs | Transaction ledger + trace drawer |

## Mounting inside the existing admin

`shell-reference.html` documents the contract: the shell supplies the rail, top bar and page padding;
a module file supplies Blocks 1 → 3 and pulls `assets/arc-kit.css` + `assets/arc-kit.js`. Copy the two
asset files next to the admin CSS, adjust the relative paths, and load a module into the content column.
