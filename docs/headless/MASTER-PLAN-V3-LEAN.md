# WOODEX AGENCY PLATFORM — Master Plan v3 "Lean / Free-first"

**Version:** 3.0 · **Date:** 2026-10-02 · **Status:** for approval
**Supersedes for stack & scope:** `MASTER-PLAN-AGENCY-V2.md` and the amendments in `PRD-V3-REVIEW.md`. The API contract, data model, page-document model, RBAC and security
rules in `MASTER-PLAN-HEADLESS.md` (v1) still apply unless this file says otherwise.
**Your instructions applied:** Laravel · free TailAdmin from GitHub · Supabase free · Vercel free · less time/effort · reuse free templates/packages instead of building.

> **UPDATE 2026-10-02 (latest):** see [`MASTER-PLAN-V3.1-EXPANDED.md`](MASTER-PLAN-V3.1-EXPANDED.md) — adds the GitHub→Hostinger pipeline, public/secret API keys and `/delivery` endpoints, widget registry, hardened theme tokens, versioned mega-menus and the starter engine. Roadmap is now ≈ 71 days.

---

## 1. Decisions (final unless you object)

| # | Topic | Decision | Why |
|---|---|---|---|
| L1 | Backend | **Laravel 12** (PHP 8.3) — the TailAdmin Laravel repo already requires exactly this (`php ^8.3`, `laravel/framework ^12.0`) | one codebase for API + admin shell + publisher |
| L2 | Admin UI | **TailAdmin Laravel, free, MIT** (`github.com/TailAdmin/tailadmin-laravel`, updated 15 Sep 2026): Blade + Tailwind v4 + Alpine, ApexCharts, FullCalendar, flatpickr, RTL + language switch, Docker/Sail, `AGENTS.md` | MIT licence file is in the repo, so SaaS use is allowed; no purchase |
| L3 | Database | **Supabase Free Postgres, used as plain Postgres only** (no Supabase Auth/Storage/PostgREST). Laravel connects through the **Session pooler (port 5432)** with `sslmode=require` | Supabase's own Laravel guide says not to use the Transaction pooler (6543) for ORMs; Session pooler is IPv4-proxied on free |
| L4 | Media | **Cloudflare R2** free tier (10 GB, zero egress) | Supabase Free gives only 1 GB file storage |
| L5 | Vercel | **Free Hobby for internal demos/previews/docs only** — *not* for Woodex or any client site | Hobby is "personal, non-commercial use only" |
| L6 | Public sites | Rendered by Laravel (Blade renderer of block JSON) → **pre-rendered HTML**; Woodex keeps writing static files to its docroot; new tenants served by Laravel behind **Cloudflare cache** | zero extra services, keeps P15's PageSpeed |
| L7 | Page builder | **Puck (MIT) as a React island inside Laravel** (Vite already ships with TailAdmin) | no separate Next.js/Vercel app needed |
| L8 | Internal console | **Filament (MIT)** for the *platform super-admin only* (tenants, plans, domains, jobs) | generated from Eloquent models — days saved; customers never see it |
| L9 | Hosting for Laravel | **Existing Hostinger plan if it has SSH + PHP 8.3** (Business or higher); otherwise Hostinger VPS KVM 1–2 | Laravel runs on Hostinger shared with Composer + cron; verify in Phase 0 |
| L10 | PDFs | **dompdf** (pure PHP) for A4 quotes/invoices | no Chromium needed → works on shared hosting. Check dompdf's LGPL licence is acceptable |

### 1.1 Three free-tier facts you must accept (not blockers, but real)
1. **Vercel Hobby is non-commercial** — ([source](https://justinmckelvey.com/blog/is-vercel-free)). Woodex makes money, so it cannot run there. Pro is $20/seat if you ever want it. This plan does not need it.
2. **Supabase Free:** 500 MB DB, 2 projects, **auto-pause after 7 days of low activity**, no daily backups ([source](https://www.itpathsolutions.com/supabase-free-tier-limits)). Commercial use *is* allowed. So: fine for build, staging and a short pilot; **upgrade to Pro ($25) before the first paying client or at 350 MB**. Until then we run our own nightly `pg_dump` → R2 (free).
3. **Free TailAdmin Laravel is a UI shell, not a CMS.** I cloned and inspected it: routes are closures returning views; only 1 dashboard (e-commerce), basic tables, form elements, calendar, profile, charts, UI components, sign-in/sign-up **views with no auth logic, no database, no models**. It saves layout/component work, **not module work** — every CRM/quote/builder screen is still built by us (with its components).

*Fallback if Supabase Free hurts:* the same Laravel code runs on MySQL on Hostinger (only the RLS safety net is lost; app-level tenant scoping remains).

---

## 2. Architecture (lean)

```
Browser ── Cloudflare (DNS, cache, TLS, custom hostnames) ──┬─ Laravel 12 on Hostinger
                                                            │    ├─ /app      TailAdmin Blade shell (agency + site dashboards)
                                                            │    ├─ /builder  Puck React island (Vite)
                                                            │    ├─ /api/v1   REST (Sanctum tokens, OpenAPI via Scramble)
                                                            │    ├─ /console  Filament (platform staff only)
                                                            │    └─ /{site}   published HTML (cached by Cloudflare)
                                                            ├─ Supabase Postgres (Session pooler 5432, RLS) ── nightly pg_dump → R2
                                                            └─ Cloudflare R2 (tenant-prefixed media + backups)
Vercel (free): internal demo/preview only
Cron (hPanel, every minute): php artisan schedule:run  → DB-driven queue (QUEUE_CONNECTION=database)
```
- **Queues on shared hosting:** no Redis, no daemon — use `QUEUE_CONNECTION=database` and drive queue + scheduler from one cron job (documented Hostinger pattern). Move to Redis + Supervisor only if you move to a VPS.
- **Tenancy:** agency → site (v2 §4). `agency_id`/`site_id` on every business table; Eloquent global scope **plus** Postgres RLS policies; `stancl/tenancy` single-database mode for domain→site resolution.
- **RLS rules (from research):** tenant context via `set_config('app.site_id', ?, …)` per request on the **Session pooler only**; `FORCE ROW LEVEL SECURITY`; app role is non-owner/non-superuser; policies fail closed (`NULLIF(current_setting('app.site_id', true),'')`) with `WITH CHECK`; app tables live in a **custom schema not exposed to Supabase's Data API** (Supabase's Laravel quickstart also uses a custom `search_path`). Never point Laravel at port 6543.

---

## 3. What we download and what we use from it ("take the module we need")

### 3.1 Primary downloads (all free)
| Download | Licence | What we take | What we do **not** take |
|---|---|---|---|
| **TailAdmin Laravel** (GitHub) | MIT | `layouts/` (app, sidebar, header, backdrop), `components/ui` (alert, badge, button, modal, avatar), `components/form`, `components/tables`, `components/common/*`, calendar, charts (ApexCharts), profile cards, theme toggle, RTL + `LocaleController`, auth page layouts (we add real logic), Docker/Sail | its e-commerce demo data, example routes (replace closures with controllers) |
| **Puck** | MIT | block canvas, JSON in/out, Permissions API | React-only limit only affects the editor |
| **Filament** | MIT | platform console CRUD | nothing customer-facing |
| **stancl/tenancy** | MIT | domain resolution, tenant-aware queue/cache/filesystem | multi-DB mode (not needed) |
| **laravel/sanctum** | MIT | opaque revocable API tokens | — |
| **spatie/laravel-permission** | MIT | roles & permissions with scopes | — |
| **spatie/laravel-activitylog** | MIT | audit trail | — |
| **dedoc/scramble** | MIT | **auto-generates OpenAPI 3.1 from our routes** — replaces hand-writing `openapi.yaml` (biggest time saver) | — |
| **league/flysystem-aws-s3-v3** | MIT | R2 (S3-compatible) disk | — |
| **barryvdh/laravel-dompdf** | wrapper MIT / dompdf LGPL | A4 PDFs | Chromium/Puppeteer |
| **laravel/cashier-paddle** (later) | MIT | international subscriptions | PSP for PKR — custom PayFast/Safepay adapters |
| **Pest** | MIT | tests (already in the TailAdmin repo) | — |
*Versions and licences to be re-checked at install time (Phase 0); I verified TailAdmin Laravel (LICENSE + composer.json) and Scramble (MIT on Packagist) directly; the others are standard packages I have not re-verified here.*

### 3.2 Your AdminLTE.io list ("14 Best CMS Admin Dashboards & Templates") — how it matches
That list is mostly **CMS products to adopt**, not UI templates; none matches a Laravel + multi-tenant + Puck stack out of the box. Disposition:

| Entry | Stack / licence (per the article) | Decision | Reason |
|---|---|---|---|
| Strapi, Payload, Directus, Keystone, Sanity, Decap, Tina, Ghost, ApostropheCMS | Node/JS (Payload MIT on Next.js; Directus source-available; others MIT/Apache) | **Not used** | different runtime from Laravel; a second CMS would duplicate our page builder + DB. *Payload is the closest free "Next.js + Vercel + Postgres" alternative if you ever abandon Laravel* |
| Wagtail | Python/Django, BSD | Not used | wrong stack. Its **StreamField block model** is the design idea behind our block tree |
| **Statamic** | PHP/Laravel, source-available, free Solo / paid Pro | **Not used** | single-site CMS with its own licence tiers; doesn't give agency→site tenancy; would fight TailAdmin + Puck |
| Craft CMS, October CMS, Umbraco | source-available / proprietary / .NET | **Not used** | licence or stack mismatch (October is proprietary per the article) |
| **From its linked Laravel roundup:** Filament | MIT | **Used (console only)** | see L8 |
| Twill, Backpack, MoonShine, Orchid | Laravel packages | Not used | overlap with Filament/TailAdmin; adds a third admin UI |
| Laravel-AdminLTE, Sneat, Mosaic Lite, AdminTW | free Laravel UI templates | Not used | we standardise on **one** UI kit (TailAdmin) |
**What we *do* take from that article:** its "what a CMS admin has to do" list becomes our **CMS acceptance checklist**: content modelling · editorial workflow (draft/review/schedule/revisions with diff) · media library (focal point/crops) · editing model · roles/permissions + audit · delivery API. Every item is already in v1 §6 / §9; Phase 3's exit gate = all six pass.

---

## 4. Scope cuts (this is where the time is saved)

| Cut from v2 / PRD | Replacement |
|---|---|
| 20-vertical matrix, vertical-pack framework | **Interior & Fit-out only** (= Woodex). Pack framework + Architecture + Solar packs become a *later* phase after pilot |
| React/Vue/Angular/Nuxt renderers, SDK families, 9 connect guides | **API-first + Scramble OpenAPI + Blade renderer.** Any frontend can still connect through `/api/v1` and `/delivery/*`; framework adapters built on demand |
| Puppeteer PDF service | dompdf |
| Per-site Vercel/Next.js projects | Laravel-rendered HTML behind Cloudflare |
| Business modules (inventory, finance ledger, logistics, support, chat) | **CRM + quotes + invoices + bookings-lite only**; others after pilot |
| Reseller billing, marketplace | later; manual billing for agencies at first |
| Multi-region, status page, load testing suite | basic uptime monitor + backups |
| Hand-written OpenAPI, hand-written admin CRUD for platform staff | Scramble + Filament |

---

## 5. Roadmap (lean) — estimates in ideal engineering days, ±30 %

| Phase | Scope | Reuse that makes it short | Exit gate | Days |
|---|---|---|---|---|
| **0 Setup & de-risk** | Clone TailAdmin Laravel; Hostinger probe (PHP 8.3, SSH, Composer, cron, `pdo_pgsql`, outbound to Supabase pooler); Supabase project + **RLS prototype** on session pooler; R2 upload; Puck spike with 10 real blocks; Cloudflare custom-hostname test | TailAdmin repo, Supabase Laravel quickstart | all 5 checks pass/fail documented; **go/no-go on Supabase-vs-MySQL and shared-vs-VPS** | 6 |
| **1 Core** | agency→site tenancy, Sanctum auth + TOTP, roles/permissions, audit, RLS migrations helper + isolation test, `/me` `/navigation` (feeds TailAdmin sidebar), Scramble docs, Filament console | Sanctum, Spatie, stancl, Filament, Scramble | cross-tenant test = 0 leaks; 2 agencies × 2 sites seeded; OpenAPI served | 7 |
| **2 Woodex migration** | MySQL→Postgres ETL command (users, leads, clients, quotes, invoices, projects, settings); JSON blobs → relational; **86 pages → blocks** (unknown HTML → `custom-html` block); media → R2; redirects/sitemap parity | artisan commands, dry-run + reconciliation report | reconciliation 100 %; page visual-diff pass; quote/invoice numbers preserved | 10 |
| **3 Builder + publish + tokens** | pages/versions/blocks, Blade renderer, Puck island, theme tokens → `theme.css`, preview tokens, publisher (docroot for Woodex; Laravel-served + Cloudflare purge for new sites), media library on R2 | Puck, TailAdmin form/modals, Flysystem | edit → publish → live < 3 s; PageSpeed mobile ≥ 90 on 11 key pages; CMS checklist (§3.2) all ✔ | 14 |
| **4 CRM + sales** | leads table/kanban, client timeline, quote editor (A4 live preview), invoices, payments (manual + PayFast/Safepay adapter behind one interface), PDFs, WhatsApp/email notifications ported from P15 | TailAdmin tables/forms/calendar/charts, dompdf | lead → quote → invoice → payment works in UI + API | 10 |
| **5 Agency lite** | white-label (logo/colours/domain), create site from starter, clone site, client roles (editor/approver/viewer) + approval step, custom-domain connect (Cloudflare for SaaS API), bookings-lite calendar | TailAdmin calendar, Cloudflare API | agency creates a client site and publishes to a custom domain with no developer | 8 |
| **6 Go-live** | backups (`pg_dump`→R2) + restore drill, secrets rotation, security headers, monitoring, runbook, cut-over (v2 §12.3–12.4 checklist, reduced) | — | gates G1–G9 (v2 §12.3) green; rollback rehearsed | 6 |
| | **Total** | | | **≈ 61 days** |

For comparison: v2 ≈ 132 d · PRD-review re-baseline ≈ 86–92 d · PRD v3.0 claimed 42 d for far less scope than it described. At the PRD's own ≈ $143/day, 61 days ≈ **$8.7k** (pro-forma, not a quote). With two developers from Phase 3: ≈ 8–9 weeks calendar; one developer ≈ 12–13 weeks → **go-live ≈ January 2027** if Phase 0 starts mid-October.

**Fast path (if you want something live even sooner):** do Phases 0 → 1 → 3 first (≈ 27 d). That gives a multi-site page builder with publish; Woodex migration and CRM follow.

---

## 6. Costs (monthly, USD)

| Item | Now | After first paying client |
|---|---|---|
| TailAdmin Laravel, Puck, Filament, Laravel packages | 0 | 0 |
| Supabase | 0 (Free) | **25** (Pro) |
| Hostinger | existing plan (Business+ for SSH) — or VPS KVM 2 ≈ 9–15 at renewal | same |
| Cloudflare (DNS/cache/TLS) + custom hostnames | 0 (first 100) | 0 → $0.10 each after 100 |
| R2 | 0 (≤ 10 GB) | 0–5 |
| Vercel | 0 (internal only) | 0 |
| **Total** | **≈ $0–15** | **≈ $25–45** |
(Excludes PSP fees, WhatsApp usage, domain renewals.)

---

## 7. Risks specific to the lean stack
| Risk | Mitigation |
|---|---|
| Supabase Free pauses / 500 MB cap / no backups | Phase 0 go/no-go; nightly `pg_dump`→R2; upgrade trigger defined (§1.1); MySQL fallback |
| Shared hosting limits (PHP time/memory, no daemon) | DB queue + cron; small batched jobs; dompdf not Chromium; VPS path ready |
| Free TailAdmin gives shell only → screens still cost effort | estimates assume this; component reuse already included |
| Puck is React-only inside Blade | island pattern; only the editor is React; output is server-rendered HTML |
| Session-pooler connections + RLS context | set context at request start, reset at end; test in CI; never use 6543 |
| Blade-served sites under traffic on shared hosting | Cloudflare cache + purge-on-publish; Woodex stays static files |
| Laravel PHP version on Hostinger (needs 8.3 for TailAdmin) | Phase 0 probe; Hostinger lists PHP up to 8.3 ([source](https://www.campcodes.com/blog/5-best-php-hosting-plans-for-developers-in-2026-tested-compared/)) |
| Scope creep back to 20 verticals | §4 cut list is the contract; additions need a new phase |

---

## 8. What I need from you to start Phase 0
1. **Hostinger plan name** (Premium / Business / Cloud / VPS) and whether SSH is enabled. This decides L9.
2. Create (or approve me to guide you through) a **Supabase project** — region closest to Pakistan/your host; note the **Session pooler** string (keep the password private; don't paste it in chat).
3. A **Cloudflare account** with the Woodex domain, and an **R2 bucket**.
4. Confirm: **Woodex is the only pilot** and **Interior & Fit-out is the only vertical for v1**.
5. Who will build the React/Puck island? (If nobody, I can build it; the spike will tell us the effort.)
6. Still open from before: PayFast/Safepay applications and business-registration status.

### First actions on approval (Phase 0, in this order)
1. `git clone` TailAdmin Laravel into `platform/` in this repo (MIT; keep its LICENSE), run `composer install`, `npm i`, `php artisan serve`, confirm the shell loads.
2. Add `laravel/sanctum`, `spatie/laravel-permission`, `spatie/laravel-activitylog`, `dedoc/scramble`, `stancl/tenancy`, Flysystem S3; wire Supabase **session pooler** (`sslmode=require`, custom schema).
3. Write migration + RLS policy helper + the isolation test (2 agencies × 2 sites).
4. R2 disk + pre-signed upload test.
5. Puck island spike (10 blocks, save/load via API, render with Blade).
6. Hostinger capability probe script; report pass/fail and the go/no-go on L3 and L9.
