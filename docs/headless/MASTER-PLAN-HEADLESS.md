# WOODEX PLATFORM — Headless Master Plan (multi-tenant · multi-dashboard · page builder · any frontend)

**Version:** 1.0 · **Date:** 2026-10-01 · **Status:** for approval (phase gates in §14)
**Scope:** backend + database + API contract only. **No frontend is built in this plan.**
**Supersedes:** `MASTER-PLAN.md`, `BACKEND-MASTER-PLAN.md`, `WOODEX-ADMIN-V2-MASTER-PLAN.md`, `MASTER-PLAN-P16/P17.md`
as the architecture authority. Their *business decisions* are kept (see §16); their *UI work* is out of scope.
**Baseline analysed:** `deploy/p15/woodex-live-p15-full.zip` (≈3,000 lines PHP, 15 `wx_*` tables, 86 public pages, 20 admin JS files).

> **UPDATE 2026-10-02:** decisions D-1…D-10 in [`MASTER-PLAN-AGENCY-V2.md`](MASTER-PLAN-AGENCY-V2.md) override this document where they conflict (hosting → VPS, framework → Laravel, two-level agency→site tenancy, R2 media, payments approach, Phase 0 spikes first). Everything else here still applies.

> **UPDATE 2026-10-02 (later):** stack and scope are now governed by [`MASTER-PLAN-V3-LEAN.md`](MASTER-PLAN-V3-LEAN.md) (Laravel + free TailAdmin Laravel + Supabase Free + R2; Vercel for internal use only). Where v1/v2 disagree, v3 wins.

---

## 1. Goal in one paragraph

Turn the current Woodex site (a single-site PHP app whose pages are HTML files and whose admin UI is hard-wired to its API) into a
**headless platform**: one PHP + MySQL backend on Hostinger that serves **many businesses (tenants)**, each with **many role-based
dashboards**, a **database-backed page builder**, and a **versioned REST API + OpenAPI contract** so that *any* frontend — TailAdmin
(HTML / React / Next.js / Vue / Angular / Laravel), Flowbite-based public sites, mobile apps, or AI agents (MCP) — connects without
backend changes.

**Definition of "ready to connect with any frontend":** a developer who has only `openapi.yaml`, a tenant slug and an API key can
(1) sign in, (2) render the sidebar from the Navigation API, (3) render any dashboard from the Dashboard API, (4) read/edit/publish pages,
(5) submit forms into the CRM — with zero knowledge of PHP or MySQL.

---

## 2. Analysis of the current system (what we keep, what must change)

### 2.1 What exists (P15)

| Area | Today | Evidence |
|---|---|---|
| Hosting | Hostinger shared (Apache/LiteSpeed), PHP 7.4+, MySQL | `.htaccess`, README-UPLOAD |
| API style | 2 RPC endpoints: `api/admin.php` (≈25 actions), `api/builder.php` (≈25 actions): `POST {action,…}` | `case 'login'`, `case 'save'`… |
| Auth | Cookie session + CSRF token; roles `owner/admin/editor`; optional TOTP; builder has its *own* password | `admin.php`, `security-lib.php` |
| Pages | **HTML files on disk** (86 `index.html`); 30 backups/page in `_private/backups` | `builder.php` |
| Data | 15 tables `wx_*`; quotes / invoices / projects / templates are **one JSON blob per row** | `sales-lib.php` |
| Config & secrets | `_private/*.json` + `wx_settings`; SMTP password, WhatsApp token stored in JSON | `crm-lib.php` |
| Integrations | WhatsApp Cloud API, SMTP, Turnstile, PageSpeed, **MCP server** (`mcp.php`, 12 tools) | `api/` |
| Tenancy | **None.** One site, one DB, one `_private/` | — |
| Deploy | Full-site zip, "Overwrite existing files" in File Manager | README-UPLOAD |

### 2.2 Problems this plan fixes

| # | Problem | Consequence today | Fix in this plan |
|---|---|---|---|
| P-1 | Pages are files; deploy zip **overwrites every page** | README warns live builder edits get lost on upload | DB = source of truth for pages; deploys never touch content (§6, §12) |
| P-2 | Admin UI and API are coupled (cookie+CSRF, RPC actions) | A React/Next/mobile client can't call it cleanly | Stateless REST `/api/v1`, Bearer tokens, CORS allow-list, OpenAPI (§5) |
| P-3 | Single tenant | Second brand = second copy of everything | `tenant_id` everywhere + tenant isolation layer (§4) |
| P-4 | JSON-blob quotes/invoices/projects | No reporting, no filtering, no payments ledger | Normalised tables + JSON only for flexible custom fields (§7) |
| P-5 | Secrets in plain JSON / `wx_settings` | Leak = WhatsApp/SMTP takeover | Per-tenant secrets encrypted with libsodium, key outside web root (§10) |
| P-6 | Roles are 3 fixed strings | Can't have sales / accountant / client portal | Permission-based RBAC, roles per tenant (§8) |
| P-7 | Duplicate/overlapping auth (admin vs builder password) | Confusing, 2 attack surfaces | One identity service; builder uses same tokens |
| P-8 | WhatsApp number hard-coded in 230 places (per old plan) | Wrong number risk | All contact data comes from `tenant_settings` → rendered at publish time |
| P-9 | No queue/cron abstraction | Follow-ups, reminders, reports ad hoc | `jobs` table + one cron entry (§9.7) |
| P-10 | Documentation drift (18 plans) | Nobody knows what is current | This file + `openapi.yaml` become the only authority (§15) |

### 2.3 Keep (do not rewrite)
Image pipeline (WebP + 480/960 `srcset`), `.htaccess` hardening, throttle/lockout logic, TOTP, activity log, backup/restore concept,
WhatsApp/SMTP senders, MCP tool set, quotation numbering (WF-/WI-) and templates, estimator rates/scopes, PageSpeed module.
Each is **wrapped behind the new API**, not discarded.

---

## 3. Target architecture

```
                         ┌──────────────── FRONTENDS (not in this plan) ────────────────┐
                         │ TailAdmin HTML │ React │ Next.js │ Vue │ Angular │ Laravel   │  ← admin dashboards
                         │ Flowbite public sites (static / SSR) │ Mobile │ AI agents    │
                         └───────────────┬──────────────────────────────┬───────────────┘
                                         │ HTTPS · JSON · Bearer        │ published HTML / JSON
┌────────────────────────────────────────▼──────────────┐   ┌───────────▼──────────────┐
│  /api/v1  (single PHP front controller + router)       │   │ Publisher → per-tenant   │
│  middleware: CORS → rate-limit → auth → tenant → RBAC  │   │ docroot / SFTP / Git /   │
│              → validate(OpenAPI) → handler → audit     │   │ webhook-triggered build  │
├────────────────────────────────────────────────────────┤   └──────────────────────────┘
│ Modules (domain services; no HTTP knowledge)           │
│ Identity · Tenancy · RBAC · CMS · PageBuilder · Media  │
│ SEO · Forms · CRM · Sales · Projects · Finance ·       │
│ Products · Logistics · Support · Chat · Messaging ·    │
│ Automation · Analytics · Integrations · AI/MCP · Webhk │
├────────────────────────────────────────────────────────┤
│ Repository layer  (the ONLY code that touches SQL;     │
│ auto-injects `tenant_id = :t` into every query)        │
├────────────────────────────────────────────────────────┤
│ MySQL 8 / MariaDB 10.6 (InnoDB, utf8mb4)  ·  /storage  │
│ (outside public_html: media originals, backups, keys)  │
└────────────────────────────────────────────────────────┘
        cron (hPanel, every minute) → /api/v1/_cron → jobs table (queue)
```

**Stack decision (confirmed):** PHP 8.1+ (7.4 compatibility dropped once Hostinger plan allows; check in Phase 0) + MySQL.
No framework dependency required; allowed micro-libraries via Composer (vendored zip, no shell needed on host): router (FastRoute),
validation (opis/json-schema), JWT-free opaque tokens, PHPMailer, a PDF lib. Reasoning: lowest risk on current hosting; every
module stays upload-able via File Manager.

**Repo layout (new, additive — legacy folders untouched until Phase 11):**
```
platform/
  public/api/v1/index.php        # front controller
  src/{Core,Identity,Tenancy,Rbac,Cms,Builder,Media,Seo,Forms,Crm,Sales,Projects,Finance,
       Products,Logistics,Support,Chat,Messaging,Automation,Analytics,Integrations,Ai,Webhooks}/
  migrations/0001_*.sql …        # forward-only, idempotent, numbered
  openapi/openapi.yaml           # contract source of truth (split per module, bundled in CI)
  schemas/blocks/*.json          # JSON Schema per page-builder block
  sdk/{ts,php}/                  # generated clients
  tests/{unit,contract,isolation,e2e}/
docs/headless/                   # this plan, API guide, frontend connect guides
```

---

## 4. Multi-tenancy (many sites / businesses)

**Model:** *shared database, shared schema, `tenant_id` on every business table* (cheapest on Hostinger; scales to hundreds of small tenants).
A tenant = one business/brand (e.g. Woodex Interior, Woodex Furniture, a future client agency).

| Concern | Design |
|---|---|
| Identification | `X-Tenant: slug` header **or** `/api/v1/t/{slug}/…` **or** resolved from the request `Origin`/`Host` via `tenant_domains` |
| Isolation | Repository layer injects `tenant_id`; no raw SQL outside it; CI **isolation test** creates 2 tenants and asserts every list/get/update/delete endpoint cannot cross over (auto-generated from OpenAPI) |
| Users | One global `users` identity; `memberships(user_id, tenant_id, role_id)` → same person can staff several tenants |
| Platform level | `platform_owner` / `platform_admin` manage tenants, plans, domains, billing; they never see tenant data unless impersonating (audited) |
| Domains | `tenant_domains(domain, tenant_id, kind: site|admin|api, verified_at)`; verification via DNS TXT |
| Storage | `/storage/{tenant_uid}/{media|backups|exports}` outside web root; public media served via `/m/{tenant_uid}/…` or the tenant's own docroot copy |
| Limits & plans | `plans(max_pages, max_users, max_storage_mb, max_api_calls_day, features_json)`; enforced in middleware; usage counters in `tenant_usage` |
| Onboarding | `POST /platform/tenants` → creates tenant, owner membership, default roles, default dashboards, starter pages/blocks/theme, default settings, sample automation rules — one transaction + seed job |
| Offboarding | export (zip: JSON + media) → soft-delete 30 days → purge job |
| Config per tenant | locale(s), currency (default PKR), timezone (default Asia/Karachi), numbering prefixes (WF-/WI-), brand tokens, contact data, integrations, publish target |

---

## 5. API contract (the "connect anything" layer)

### 5.1 Conventions
- **Base:** `https://api.<domain>/api/v1` (or same host `/api/v1`). Versioned; breaking change ⇒ `/v2`. Deprecations announced via `Sunset` header ≥ 6 months.
- **Format:** JSON UTF-8. Resource URLs plural nouns. IDs are public ULIDs (`uid`), never auto-increment ints.
- **Envelope:** success `{ "data": …, "meta": {…} }`; error (RFC 7807-style)
  `{ "error": { "code": "validation_failed", "message": "…", "details": [{ "field":"phone","issue":"required" }], "request_id":"…" } }`.
- **Pagination:** cursor (`?limit=50&cursor=…`) with `meta.next_cursor`; offset allowed on small lists. **Filtering** `?filter[stage]=new&filter[created_from]=…`; **sort** `?sort=-created_at`; **fields** `?fields=uid,name`; **expand** `?expand=client,items`.
- **Concurrency:** `ETag` + `If-Match` on pages, quotes, settings (prevents two editors overwriting — fixes P-1 class bugs).
- **Idempotency:** `Idempotency-Key` header on all POST that create money/leads/messages.
- **Time:** ISO-8601 UTC in API; tenant timezone only in display fields. **Money:** integer minor units + `currency` (PKR has no decimals in practice but keep generic).
- **i18n:** `Accept-Language` / `?locale=ur`; content entities carry `locale` + `translation_group`.
- **CORS:** per-tenant allow-list of origins (`tenant_settings.cors_origins`); preflight cached 1 h.
- **Rate limit:** per token + per IP, headers `X-RateLimit-*`; stricter on `/auth/*` and public form endpoints.
- **Observability:** `X-Request-Id` on every response; structured log (`storage/logs`), audit log for all writes.
- **Contract-first:** `openapi.yaml` is edited **before** code; CI lints it (Spectral), validates responses against it (contract tests), and generates the TS and PHP SDKs.

### 5.2 Authentication & tokens
| Credential | Use | Lifetime | Notes |
|---|---|---|---|
| **Access token** (opaque, hashed in DB) | dashboards, builder | 15 min | `Authorization: Bearer` |
| **Refresh token** (rotating, httpOnly cookie *or* body for native apps) | renew access | 30 d, single-use | reuse ⇒ whole family revoked |
| **API key** `wxk_live_…` (hashed, scoped, per tenant) | server-to-server, public site fetch, form posts | until revoked | scopes e.g. `pages:read`, `forms:write`; optional IP/origin lock |
| **Preview token** | draft page preview URL | 1 h | signed, page-scoped |
| **MCP token** | AI agents | until revoked | same scopes system, read-only default |
| **Public (no auth)** | `POST /public/forms/{id}`, `GET /public/…` published content, chat widget | — | Turnstile/honeypot + rate limit |

Login: `POST /auth/login` (email+password) → optional `totp_required` → `POST /auth/totp` → tokens. Also: password reset, invite accept, session list/revoke, impersonate (platform only, audited). Cookie+CSRF mode kept **only** for the legacy admin during migration.

### 5.3 Self-describing endpoints that make *dashboards* backend-driven
These four are what let every frontend (different frameworks) show identical, role-correct UIs:

| Endpoint | Returns |
|---|---|
| `GET /me` | user, tenant, role, **flattened permissions**, locale, feature flags, plan limits |
| `GET /navigation` | sidebar tree filtered by permission: `{key,label_i18n,icon,route_hint,badge_count,children[]}` |
| `GET /dashboards` · `GET /dashboards/{key}` | dashboard definition: ordered **widgets** with type (`kpi`, `timeseries`, `bar`, `donut`, `heatmap`, `table`, `map`, `list`, `calendar`), title, size hint, data URL, refresh interval |
| `GET /widgets/{key}?range=30d&compare=prev` | the widget's data in a **chart-library-neutral shape** (`series[]`, `categories[]`, `value`, `delta`) — maps 1:1 to ApexCharts (TailAdmin) and Chart.js |
| `GET /schema/{resource}` | field metadata (types, enums, required, labels i18n) so forms/tables can be generated |

### 5.4 Endpoint catalogue (by module)
`R`=read `W`=write. Permission string pattern `resource.action` (see §8). All tenant-scoped unless marked *platform*.

| Module | Endpoints (v1) |
|---|---|
| **Auth/Identity** | `/auth/login` `/auth/refresh` `/auth/logout` `/auth/totp` `/auth/password/forgot|reset` `/auth/invite/accept` · `/me` `/me/sessions` · `/users` `/users/{id}` `/invites` |
| **Platform** *(platform)* | `/platform/tenants` `/platform/tenants/{id}/(suspend|resume|impersonate|export)` `/platform/plans` `/platform/domains` `/platform/health` `/platform/migrations` |
| **Tenant settings** | `/settings` `/settings/{group}` (company, contact, numbering, locales, publish, cors, branding) `/secrets/{key}` (write-only) `/integrations` `/integrations/{key}/test` |
| **RBAC** | `/roles` `/roles/{id}` `/permissions` |
| **API keys** | `/api-keys` (create shows secret once) `/api-keys/{id}/rotate` `/api-keys/{id}/usage` |
| **Pages / Builder** | `/pages` `/pages/{id}` `/pages/{id}/versions` `/pages/{id}/restore` `/pages/{id}/duplicate` `/pages/{id}/publish` `/pages/{id}/schedule` `/pages/{id}/preview-token` `/pages/import` `/pages/bulk` · `/blocks` `/blocks/{type}/schema` `/sections` (global header/footer) `/themes` `/menus` `/templates` `/starters` |
| **Content collections** | `/collections` `/collections/{type}/entries` (blog posts, projects, testimonials, FAQs, team, services, locations) |
| **Media** | `/media` `/media/{id}` `/media/upload` (multipart + resumable) `/media/import-url` `/media/folders` `/media/{id}/renditions` `/media/{id}/usage` |
| **SEO** | `/seo/pages/{id}` `/seo/analyze` `/redirects` `/sitemap` `/robots` `/schema-templates` |
| **Forms** | `/forms` `/forms/{id}` `/forms/{id}/submissions` · public `POST /public/forms/{id}` |
| **CRM** | `/contacts` `/leads` `/leads/{id}/(activities|stage|assign|convert)` `/pipelines` `/tags` `/imports` `/exports` `/duplicates` |
| **Sales** | `/quotes` `/quotes/{id}/(versions|send|accept|pdf)` `/quote-templates` `/invoices` `/invoices/{id}/(send|pdf)` `/payments` `/payment-schedules` · public `GET /public/quotes/{token}` |
| **Bookings** | `/bookings` `/availability` `/calendar?from=&to=` · public `POST /public/bookings` |
| **Projects** | `/projects` `/projects/{id}/(stages|tasks|files|updates|team)` `/tasks` |
| **Products & inventory** | `/products` `/variants` `/categories` `/stock/movements` `/suppliers` `/purchase-orders` |
| **Finance** | `/accounts` `/transactions` `/expenses` `/expense-categories` `/reports/finance/(cashflow|pnl|receivables)` |
| **Logistics** | `/deliveries` `/deliveries/{id}/events` `/vehicles` `/drivers` |
| **Support** | `/tickets` `/tickets/{id}/messages` `/canned-replies` |
| **Chat** | `/chats` `/chats/{id}/messages` `/chats/stream` (SSE) · public chat widget `/public/chat/*` |
| **Messaging / Automation** | `/message-templates` `/messages` `/automation/rules` `/automation/runs` `/whatsapp/webhook` (Meta) |
| **Analytics / Reports** | `/analytics/overview` `/analytics/traffic` `/analytics/funnels` `/reports/*` `/exports` `/pagespeed/(runs|test-key-pages)` |
| **Dashboards** | `/dashboards` `/dashboards/{key}` `/widgets/{key}` `/dashboards/{id}/layout` (user customisation) |
| **Webhooks** | `/webhooks` `/webhooks/{id}/deliveries` `/webhooks/{id}/redeliver` |
| **AI / MCP** | `/ai/providers` `/ai/usage` `/ai/generate` · `/mcp` (JSON-RPC, existing tools + new) |
| **Backups / Audit / System** | `/backups` `/backups/{id}/(download|restore)` `/audit` `/jobs` `/health` |
| **Delivery API (read-only, cacheable)** | `/delivery/pages/{slug}` `/delivery/pages/{slug}.html` `/delivery/collections/{type}` `/delivery/menus/{key}` `/delivery/theme.css` `/delivery/sitemap.xml` — API-key or public, ETag + `Cache-Control` |

### 5.5 Webhooks (outbound)
Events: `page.published`, `page.unpublished`, `lead.created`, `lead.stage_changed`, `quote.sent|accepted|expired`, `invoice.paid|overdue`,
`booking.created`, `project.stage_changed`, `ticket.created`, `form.submitted`, `media.uploaded`, `tenant.created`.
HMAC-SHA256 signature (`X-Woodex-Signature`), retries 1 m/5 m/30 m/6 h/24 h, delivery log, manual redeliver.
A static-site host (Netlify/Vercel/Cloudflare Pages) can rebuild on `page.published`.

---

## 6. Headless Page Builder (database-backed)

### 6.1 Principles
1. **Pages are data, not files.** A page = JSON **block tree** + SEO + settings. HTML is a *render output*, never the source.
2. **Builder UI is just another client.** Any frontend builder (TailAdmin-based, GrapesJS, Puck, existing Woodex builder) talks to the same Pages API.
3. **Typed blocks.** Every block type has a JSON Schema (`schemas/blocks/hero.json`…). The API rejects invalid content; frontends auto-build property panels from `GET /blocks/{type}/schema`.
4. **Draft → Review → Published** with immutable versions, scheduled publish, instant rollback.
5. **Render anywhere:** server-side HTML renderer (default, SEO-fast like P15) **and** raw JSON for SSR/SPA frontends.

### 6.2 Page document model
```jsonc
{
  "uid": "pg_01J…", "tenant": "woodex", "slug": "/kitchen-design/", "locale": "en", "translation_group": "tg_…",
  "type": "service",                       // page | service | city | post | project | landing
  "status": "published",                   // draft | in_review | scheduled | published | archived
  "title": "Kitchen Design Lahore",
  "seo": { "title": "", "description": "", "canonical": "", "robots": "index,follow",
           "og": { "image": "med_…" }, "schema": [ { "@type": "Service", … } ] },
  "layout": { "header": "sec_main_header", "footer": "sec_main_footer", "theme": "thm_default" },
  "blocks": [
    { "id": "b1", "type": "hero", "props": { "heading": "…", "cta": [ … ], "image": "med_…" },
      "style": { "bg": "token:surface", "pad": "lg" }, "visibility": { "device": ["all"] } },
    { "id": "b2", "type": "feature-grid", "props": { … }, "children": [ … ] },
    { "id": "b3", "type": "form", "props": { "form": "frm_contact" } },
    { "id": "b4", "type": "collection-list", "props": { "collection": "projects", "limit": 6 } }
  ],
  "version": 42, "etag": "…", "published_version": 41, "updated_by": "usr_…", "published_at": "…"
}
```
- **Block library** (migrated from `builder/blocks.js`, 87 pages' sections): hero/slider, rich text, feature grid, service cards, process steps, gallery, before/after, testimonials, FAQ (+ FAQ schema), pricing/estimator CTA, stats, team, logos, map/locations, contact form, booking widget, blog/projects lists, CTA bar, video, custom HTML (sanitised, permission-gated).
- **Global sections** (header, footer, announcement bar) are versioned entities referenced by id; one edit updates all pages (replaces P15 "global_replace").
- **Reusable blocks / symbols**; **tokens** (colour/typography/spacing) in `themes`, output as `theme.css` (extends current `theme-apply.js` whitelist idea).
- **Dynamic data:** blocks can bind to collections (`collection-list`), tenant settings (`{{company.phone}}`, `{{company.whatsapp}}`), and forms — fixes P-8.
- **Localisation:** one page per locale linked by `translation_group`; `dir="rtl"` automatic for `ur`; `hreflang` generated.
- **Validation at save:** schema check, link check (internal), alt-text lint, heading-order lint (P15 accessibility rules), image-size lint, max size 3 MB.

### 6.3 Page lifecycle & publishing
```
draft ──save──▶ draft(v+1) ──submit──▶ in_review ──approve──▶ published (v frozen, render cached)
   ▲                                       │ reject                   │ schedule(at)  → job
   └───────────── restore(vN) ◀────────────┴──────────────────────────┘ unpublish → redirect/410
```
**Publisher** (job + sync fast path): renders block tree → HTML (critical-CSS inline, `srcset`, preloads — carries over P15 speed work) → writes to the tenant's **publish target**:

| Target | When | How |
|---|---|---|
| `docroot` | Woodex on same Hostinger account | write `/{tenant_docroot}/{slug}/index.html` atomically (tmp + rename) |
| `sftp` | other host | phpseclib upload |
| `git` | static-host flow | commit to repo via API |
| `webhook` | Netlify/Vercel/Cloudflare | `POST` build hook with changed slugs |
| `none` | pure headless | frontend pulls from Delivery API |

Also regenerates `sitemap.xml`, `robots.txt`, redirects (`.htaccess` fragment or JSON for the edge), `theme.css`, menus JSON. Every publish writes a `publish_runs` row (duration, files, errors) and emits `page.published`.
**Safety:** publish never deletes files it didn't create; `content_hash` per file; dry-run mode; rollback = republish previous version.

### 6.4 Builder-support endpoints
Autosave (`PATCH /pages/{id}` with `If-Match`, debounced) · soft **edit lock / presence** (`/pages/{id}/lock`, 2-min heartbeat) · comments on blocks · diff between versions (`/pages/{id}/versions/{a}/diff/{b}`) · import from URL/HTML (convert HTML → blocks best-effort; unknown HTML → `custom-html` block) · bulk meta/SEO edit · AI assist (`/ai/generate` with block schema → valid block JSON).

### 6.5 Migrating the existing 86 pages
1. Parser reads each `index.html`, maps known section patterns (from `blocks.js` / data attributes) to block types; the remainder → `custom-html` block (lossless fallback).
2. Round-trip test: render(blocks) vs original HTML → visual diff + DOM-text diff; threshold gate before cut-over.
3. Legacy `_private/backups` imported as `page_versions` (history kept).
4. Until cut-over both worlds co-exist: the DB-published HTML is written into a **staging docroot**, compared, then swapped.

---

## 7. Database design

### 7.1 Conventions
InnoDB, `utf8mb4_unicode_ci`; every business table: `id BIGINT UNSIGNED PK`, `uid CHAR(26) UNIQUE` (ULID), `tenant_id BIGINT UNSIGNED NOT NULL` (first column of every composite index),
`created_at/updated_at DATETIME(3)`, `created_by/updated_by`, `deleted_at NULL` (soft delete where business-relevant), `version INT` (optimistic lock) on editable documents.
Foreign keys declared; `ON DELETE RESTRICT` by default. JSON columns only for genuinely free-form data (block props, custom fields). Migrations are **forward-only, numbered, additive** (never drop in the same release); runner stores `schema_migrations` and refuses to run if a previous one failed.

### 7.2 Entity map (≈ 95 tables, grouped)

**A. Platform & identity**
`tenants` · `tenant_domains` · `tenant_settings(tenant_id,k,v_json)` · `tenant_secrets(tenant_id,k,ciphertext,nonce)` · `tenant_usage` · `plans` ·
`users(global)` · `memberships(user,tenant,role)` · `roles` · `role_permissions` · `permissions` · `refresh_tokens` · `access_tokens` · `api_keys` · `totp_secrets` · `invites` · `password_resets` · `login_attempts` · `audit_log` · `jobs` · `job_failures` · `idempotency_keys` · `schema_migrations`

**B. CMS / Page builder**
`pages` · `page_versions(page_id, version, blocks_json, seo_json, author, note)` · `page_locks` · `page_comments` · `blocks_library` · `global_sections` · `global_section_versions` · `themes` · `menus` · `menu_items` · `templates` · `starters` ·
`collections(type, schema_json)` · `collection_entries(collection_id, locale, status, data_json, seo_json)` · `publish_targets` · `publish_runs` · `publish_files` · `redirects` · `sitemaps_cache`

**C. Media**
`media(uid, folder_id, kind, mime, bytes, width, height, alt_i18n, focal_x/y, checksum, storage_path)` · `media_renditions(media_id, w, format, path)` · `media_folders` · `media_usage(media_id, entity_type, entity_id)`

**D. Marketing & SEO**
`seo_settings` · `schema_templates` · `forms` · `form_fields` · `form_submissions` · `campaigns` · `utm_sessions` · `analytics_events` · `analytics_daily(tenant,date,metric,dim,value)` · `pagespeed_runs`

**E. CRM**
`contacts` (client master, dedupe by normalised phone/email) · `contact_identities` · `leads(contact_id, pipeline_id, stage_id, source, business_line, value, assigned_to, followup_at, lost_reason, custom_json)` · `lead_activities(type: note|call|wa|email|visit|stage|system)` · `pipelines` · `pipeline_stages` · `tags` · `taggables` · `import_jobs` · `duplicate_candidates`

**F. Sales**
`quote_templates` · `quotes(contact_id, lead_id, business_line, no, status, currency, totals…)` · `quote_versions` · `quote_sections` · `quote_items(qty, unit, rate, tax…)` · `invoices(quote_id, no, status, due_at)` · `invoice_items` · `payment_schedules` · `payments(method, ref, received_at)` · `number_sequences(tenant,prefix,next)` · `document_pdfs`

**G. Bookings & projects**
`booking_types` · `availability_rules` · `availability_exceptions` · `bookings` · `projects(contact_id, quote_id, stage_id, budget, start, due)` · `project_stages` · `project_tasks` · `project_files` · `project_updates(client_visible)` · `project_members`

**H. Products, inventory, finance, logistics**
`products` · `product_variants` · `product_categories` · `product_media` · `suppliers` · `stock_locations` · `stock_movements` · `purchase_orders` · `purchase_order_items` · `finance_accounts` · `finance_transactions` · `expense_categories` · `expenses` · `deliveries` · `delivery_events` · `vehicles` · `drivers`

**I. Support, chat, messaging, automation**
`tickets` · `ticket_messages` · `canned_replies` · `chats` · `chat_messages` · `message_templates` · `messages(channel: wa|email|sms|inapp, status, provider_id)` · `message_optouts` · `notification_prefs` · `automation_rules(trigger, conditions_json, actions_json)` · `automation_runs`

**J. Dashboards, integrations, AI, webhooks**
`dashboards(key, scope: platform|tenant|role|user)` · `dashboard_widgets(dashboard_id, widget_key, pos, size, config_json)` · `saved_reports` · `integrations` · `integration_credentials(→tenant_secrets)` · `webhook_endpoints` · `webhook_deliveries` · `ai_providers` · `ai_usage` · `mcp_tokens` · `mcp_call_log`

### 7.3 Key table definitions (excerpt)
```sql
CREATE TABLE tenants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, uid CHAR(26) NOT NULL UNIQUE,
  slug VARCHAR(60) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL, plan_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active','suspended','pending','deleted') NOT NULL DEFAULT 'pending',
  default_locale VARCHAR(8) NOT NULL DEFAULT 'en', timezone VARCHAR(40) NOT NULL DEFAULT 'Asia/Karachi',
  currency CHAR(3) NOT NULL DEFAULT 'PKR', created_at DATETIME(3) NOT NULL, deleted_at DATETIME(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, uid CHAR(26) NOT NULL UNIQUE,
  tenant_id BIGINT UNSIGNED NOT NULL, locale VARCHAR(8) NOT NULL, translation_group CHAR(26) NOT NULL,
  slug VARCHAR(190) NOT NULL, type VARCHAR(24) NOT NULL, status VARCHAR(12) NOT NULL DEFAULT 'draft',
  title VARCHAR(200) NOT NULL, draft_version INT NOT NULL DEFAULT 1, published_version INT NULL,
  publish_at DATETIME(3) NULL, published_at DATETIME(3) NULL, version INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL, updated_by BIGINT UNSIGNED NULL, deleted_at DATETIME(3) NULL,
  UNIQUE KEY u_tenant_locale_slug (tenant_id, locale, slug), KEY k_status (tenant_id, status, updated_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE page_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, tenant_id BIGINT UNSIGNED NOT NULL, page_id BIGINT UNSIGNED NOT NULL,
  version INT NOT NULL, blocks_json LONGTEXT NOT NULL, seo_json JSON NULL, layout_json JSON NULL,
  note VARCHAR(240) NULL, created_by BIGINT UNSIGNED NULL, created_at DATETIME(3) NOT NULL,
  UNIQUE KEY u_page_ver (page_id, version), KEY k_tenant (tenant_id, page_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE memberships (
  user_id BIGINT UNSIGNED NOT NULL, tenant_id BIGINT UNSIGNED NOT NULL, role_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active','invited','disabled') NOT NULL DEFAULT 'active', PRIMARY KEY (user_id, tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE quotes (  -- replaces JSON-blob wx_quotes
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, uid CHAR(26) NOT NULL UNIQUE, tenant_id BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NOT NULL, lead_id BIGINT UNSIGNED NULL, business_line VARCHAR(20) NOT NULL,
  no VARCHAR(30) NOT NULL, status VARCHAR(16) NOT NULL, current_version INT NOT NULL DEFAULT 1,
  currency CHAR(3) NOT NULL, subtotal BIGINT NOT NULL, discount BIGINT NOT NULL DEFAULT 0, tax BIGINT NOT NULL DEFAULT 0, total BIGINT NOT NULL,
  valid_until DATE NULL, public_token CHAR(40) NULL UNIQUE, custom_json JSON NULL,
  created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY u_no (tenant_id, no), KEY k_status (tenant_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 7.4 Migration from P15 (additive, reversible, data-safe)
| Step | Action | Safety |
|---|---|---|
| M1 | Snapshot: Admin → Backups + DB dump + `_private/` copy to `/storage/backups/pre-headless/` | restore-tested |
| M2 | Create `tenants[1]="woodex"`; add `tenant_id DEFAULT 1` to legacy `wx_*` tables (nothing renamed) | old admin keeps working |
| M3 | Create new normalised tables beside the old ones | no drops |
| M4 | **Backfill jobs** (idempotent, resumable, dry-run report): `wx_leads/wx_clients → leads/contacts`; JSON `wx_quotes/invoices/projects → normalised`; `wx_users → users+memberships` (hash reused); `_private/config.json` & `wx_settings → tenant_settings/secrets (encrypted)`; HTML pages → `pages/page_versions`; `assets/img` → `media` | row-count + checksum reconciliation report must be 100 % |
| M5 | **Dual-run** (≥ 7 days): legacy admin reads old tables, new API reads new tables; nightly diff job flags drift | feature flag per module |
| M6 | Cut over module by module (Pages last); legacy endpoints become thin adapters over new services | rollback = flip flag |
| M7 | Freeze legacy tables read-only → archive after 30 days | — |

**Number sequences** (WF-/WI-) are copied with their `next` values so no quote/invoice number is ever reused.

---

## 8. Roles, permissions and the multi-dashboard model

### 8.1 Roles (defaults, editable per tenant; permission-based)
| Role | Level | Typical dashboard(s) |
|---|---|---|
| `platform_owner` / `platform_admin` | platform | **Platform Console** (tenants, plans, usage, health, revenue) |
| `tenant_owner` | tenant | **Executive** (all KPIs), Settings, Billing |
| `admin` | tenant | Executive-lite, Users, Integrations |
| `sales` | tenant | **Sales/CRM** (pipeline, follow-ups, quotes), Calendar |
| `content_editor` | tenant | **Content** (pages, drafts, SEO health, media, speed) |
| `seo_manager` | tenant | SEO & Speed |
| `accountant` | tenant | **Finance** (receivables, cashflow, expenses, invoices) |
| `project_manager` | tenant | **Projects/Operations** (stages, tasks, deliveries) |
| `inventory_manager` | tenant | **Products & Stock** |
| `support_agent` | tenant | **Support & Chat** (tickets, live chat, WhatsApp inbox) |
| `client` | tenant (external) | **Client Portal** (own quotes, invoices, project timeline, files, tickets) |
| `api_service` | machine | API-key scopes only |

### 8.2 Permission model
`resource.action[:scope]` — e.g. `pages.read`, `pages.publish`, `leads.read:own`, `leads.read:all`, `invoices.write`, `settings.secrets.write`, `users.invite`.
Roles = bundles of permissions; **row scopes** `own | team | all` enforced in the repository layer (a salesperson sees own leads). Field-level hiding for sensitive fields (e.g. cost price, secrets). Every denied attempt is audited. Permission matrix lives in `docs/headless/PERMISSIONS.md` generated from code so it can't drift.

### 8.3 Dashboard catalogue (backend-defined; frontends render)
| Dashboard key | Widgets (data from `/widgets/{key}`) | Audience |
|---|---|---|
| `platform.console` | tenants active/suspended, MRR (if billed), storage & API usage, failed jobs, error rate, newest tenants | platform |
| `executive` | revenue vs target, leads by source, win-rate, receivables aging, active projects, top pages, site speed score | owner/admin |
| `sales.crm` | pipeline funnel, follow-ups due today, leads by stage/source/city, quote status, conversion heatmap (day×hour), rep leaderboard | sales |
| `sales.quotes` | quotes by status, expiring soon, avg quote value, accept rate | sales |
| `content` | pages by status, drafts awaiting review, scheduled, SEO score distribution, broken links, media usage | content/SEO |
| `seo.speed` | PageSpeed mobile/desktop per key page, trend, top 5 fixes, Core Web Vitals | SEO |
| `finance` | cash in/out, receivables & overdue, expenses by category, P&L month, upcoming payments | accountant |
| `projects` | projects by stage, tasks due, delayed projects, team load, deliveries today | PM |
| `inventory` | stock levels, low stock, movements, PO status, top products | inventory |
| `support` | open tickets, SLA breaches, first-response time, live chats waiting, WhatsApp unread | support |
| `marketing` | traffic, campaigns/UTM, form conversion, WhatsApp click-through, top landing pages | marketing |
| `ai.usage` | requests, tokens, cost per provider/model, MCP calls | admin |
| `client.portal` | my active projects, next payment due, latest updates, open tickets | client |

Users can **clone & customise** a dashboard (`/dashboards/{id}/layout`) — layouts saved per user, defaults per role. New dashboard = new definition row + widget query; no frontend deployment needed.

---

## 9. Modules (existing improved + new)

Status: ✔ exists in P15 (wrap/improve) · ★ new · ✚ new from TailAdmin/Flowbite review.

| # | Module | Status | Highlights (beyond today) |
|---|---|---|---|
| M01 | Core runtime (router, errors, config, logging, migrations) | ★ | front controller, request-id, OpenAPI validation |
| M02 | Tenancy & plans | ★ | §4 |
| M03 | Identity, sessions, TOTP, invites, impersonation | ✔→ | token auth, refresh rotation, device list, lockout kept |
| M04 | RBAC & audit | ✔→ | permission-based, row scopes, audit export |
| M05 | Headless Page Builder & CMS | ✔→ | §6; versions, review, schedule, locale, locks |
| M06 | Content collections (blog, projects, testimonials, services, locations, FAQ, team) | ✔→ | replaces ad-hoc `content-lib`; custom collection types via schema |
| M07 | Media library | ✔→ | folders, focal point, alt i18n, renditions queue, usage graph, SVG sanitise, quota |
| M08 | SEO suite | ✔→ | per-page meta, JSON-LD templates, redirects manager (+ 404 log), sitemap/robots per tenant, hreflang, internal link audit |
| M09 | Forms & lead capture | ✔→ | drag-able form defs, spam (Turnstile/honeypot), file upload, UTM capture, webhook |
| M10 | CRM (contacts, leads, pipelines, tags, import/export, dedupe) | ✔→ | custom pipelines per tenant, activity timeline, SLA timers |
| M11 | Sales (quotes, versions, invoices, payments, PDFs, numbering) | ✔→ | normalised, A5/A4 templates, public quote link, e-accept |
| M12 | Bookings & calendar ✚ | ★ | site-visit/consultation slots, rules, reminders; calendar feed (month/week/**year** view data) |
| M13 | Projects & tasks ✚ | ✔→ | stages, tasks, files, client-visible updates, milestones |
| M14 | Products & inventory ✚ | ★ | catalogue (furniture), variants, stock movements, suppliers, POs, low-stock alerts |
| M15 | Finance & transactions ✚ | ★ | accounts, expenses, payments ledger, cashflow/P&L/receivables reports |
| M16 | Logistics & delivery tracking ✚ | ★ | deliveries, status timeline, drivers/vehicles, public tracking link |
| M17 | Support tickets ✚ | ★ | tickets, SLA, canned replies, email/WhatsApp-to-ticket, client portal |
| M18 | Live chat + WhatsApp inbox | ✔→ | unified inbox, SSE stream, agent assignment, AI-first reply w/ handover |
| M19 | Messaging & automation | ✔→ | templates (WA/email/SMS), rules engine, daily cron, quote-expiry/payment-due/booking reminders, opt-out |
| M20 | Analytics & reports | ✔→ | first-party events, funnels, scheduled report emails, CSV/XLSX/PDF export |
| M21 | Dashboards & navigation service ✚ | ★ | §5.3 / §8.3 |
| M22 | Integrations hub ✚ | ✔→ | catalogue (WhatsApp Cloud, SMTP/SES, Google PageSpeed, Search Console, GA4, Meta Pixel, Turnstile, payment gateways (JazzCash/Easypaisa/Stripe — optional), storage S3/R2), connect/test/disconnect, health badge |
| M23 | API keys & developer console ✚ | ★ | scoped keys, usage, rotate, IP/origin lock, request log, OpenAPI explorer link |
| M24 | AI hub & MCP ✚ | ✔→ | multi-provider (Claude/OpenAI/others) settings, token limits, usage/cost log, tools for pages/leads/quotes/tickets/inventory, **draft-only writes**, human approval queue |
| M25 | Webhooks | ★ | §5.5 |
| M26 | i18n & RTL ✚ | ★ | locales per tenant (en, ur…), translation workflow, `dir`, number/date formats, UI string bundles served at `/i18n/{locale}.json` |
| M27 | Backup, export, restore | ✔→ | full tenant export (DB JSON + media), scheduled, off-site (S3/R2/Drive), restore dry-run |
| M28 | Client portal API ✚ | ★ | scoped endpoints under `/portal/*` for `client` role |
| M29 | Maps & locations data ✚ | ★ | city/area pages data, geocoords, service-area polygons → map widgets |
| M30 | Platform console API | ★ | tenants, plans, domains, health, impersonation |

---

## 10. Security, privacy, reliability

| Area | Requirement |
|---|---|
| Passwords | Argon2id (fallback bcrypt), breach-list check optional, lockout kept, TOTP + recovery codes |
| Tokens | opaque 256-bit, stored SHA-256, refresh rotation with reuse detection |
| Secrets | libsodium `secretbox`; master key in `/storage/.keys` outside docroot (chmod 600) + env fallback; never returned by API (`*_set: true` only — pattern already used in `crm_cfg_pub`) |
| Input | JSON-Schema validation from OpenAPI, prepared statements only, HTML sanitiser (allow-list) for rich text/custom-html, upload sniffing (extension+MIME+image decode) |
| Output | `nosniff`, strict CORS, CSP on rendered pages (report-only first), no stack traces |
| Abuse | rate-limit + throttle tables, Turnstile on public forms, honeypot, body size caps, upload quotas |
| Tenant safety | isolation tests in CI; impersonation audited + banner flag in `/me` |
| Audit | every write: who/what/before→after hash/ip/UA/request-id; immutable (no UPDATE/DELETE grants in app code path) |
| Privacy | PII fields flagged in schema; export & erase contact (GDPR-style) endpoints; consent flags on forms; WhatsApp opt-out honoured |
| Backups | nightly DB dump + weekly media; 14 daily/8 weekly retention; restore drill each release |
| Availability targets | API p95 < 300 ms (reads) on shared hosting; page publish < 3 s per page; error budget tracked in `/platform/health` |
| Compliance with host limits | no long-running processes, no websockets (SSE/polling), cron ≥ 1 min, memory-safe streaming for exports |

---

## 11. Frontend connectivity kit (what makes "any frontend" real)

### 11.1 What the backend ships for frontends
1. `openapi.yaml` (+ hosted `/api/v1/docs` Swagger/Redoc UI, auth-gated per tenant optional).
2. **TypeScript SDK** (`@woodex/sdk`): typed client, token refresh, pagination helpers, error mapping, tenant header; works in browser, Node, Next.js (server + client).
3. **PHP SDK** (for Laravel): same surface, PSR-18 HTTP.
4. **Postman/Bruno collection** auto-generated.
5. **Chart adapter contract** (`widgets` → ApexCharts/Chart.js shapes) and **table adapter contract** (`/schema/{resource}` → columns/filters).
6. **Connect guides** in `docs/headless/connect/`: `tailadmin-html.md`, `tailadmin-react.md`, `tailadmin-nextjs.md`, `tailadmin-vue.md`, `tailadmin-angular.md`, `tailadmin-laravel.md`, `flowbite-public-site.md`, `mobile.md`, `ai-agent-mcp.md`.
7. **Mock server** (Prism from OpenAPI) so frontend teams start before backend modules are finished.

### 11.2 Reference frontends reviewed
| Kit | What it is | Licence / availability | Role in this project |
|---|---|---|---|
| **TailAdmin** (`TailAdmin/*` repos) | Tailwind admin template in HTML, React, Next.js, Vue, Angular, Laravel. Changelog v2.4.0 (13 Sep 2026): i18n, RTL, yearly calendar view, AGENTS.md; v2.3.x: AI dashboard, Sales dashboard, Finance dashboard, 6 layouts, AI Settings, Maps, Radar/Radial charts; v2.2: Logistics dashboard, products/invoices/transactions pages, AI assistant suite, API-key management, integrations, support tickets; v2.0: chat, calendar, Ecommerce/Analytics/Marketing/CRM/Stocks dashboards | Free repos are MIT; **which dashboards are in the free tier vs Pro must be verified per repo at Phase 10 start** (changelog does not say) | **Admin dashboard shells.** Backend is shaped so each TailAdmin screen has an endpoint (table below) |
| **Flowbite** (`themesberg/flowbite`) | MIT Tailwind component library (modals, dropdowns, tables, datepicker, forms, tooltips, etc.) + JS interactions | MIT | **Fills gaps** where free TailAdmin lacks a screen; **public website kit** (marketing pages rendered from blocks); builder property-panel components |

*Decision (free-only):* nothing in the backend depends on Pro. Screens only in Pro are built with Flowbite/Tailwind components against the same endpoints.

### 11.3 TailAdmin screen → backend mapping
| TailAdmin screen (per changelog) | Backend module / endpoints | Dashboard key |
|---|---|---|
| Ecommerce / Sales dashboard | M14, M11, M20 · `/widgets/sales.*` | `sales.quotes`, `executive` |
| CRM dashboard | M10 · `/leads`, `/widgets/crm.*` | `sales.crm` |
| Analytics / Marketing dashboard | M20 · `/analytics/*` | `marketing` |
| Finance dashboard + transactions + cards | M15 · `/transactions`, `/accounts` | `finance` |
| Logistics dashboard + delivery timeline | M16 · `/deliveries` | `projects` |
| Stocks dashboard | M14 · `/stock/*` | `inventory` |
| AI dashboard + AI Settings + AI assistant suite | M24 · `/ai/*` | `ai.usage` |
| Products list / add product | M14 · `/products` | — |
| Invoices (list, single view, modal, create) | M11 · `/invoices` | — |
| Transactions list / detail | M15 · `/transactions` | — |
| API key management (table + add modal) | M23 · `/api-keys` | — |
| Integrations (cards, details, add, settings, delete) | M22 · `/integrations` | — |
| Support tickets (list, reply) | M17 · `/tickets` | `support` |
| Chat | M18 · `/chats` | `support` |
| Calendar (incl. yearly view) | M12 · `/calendar` | — |
| Maps / Vector maps | M29 + analytics geo widgets | `marketing`, `executive` |
| Users/profile/settings/auth pages | M03/M04/M02 · `/auth/*`, `/me`, `/users`, `/settings` | — |
| Multi-language & RTL switch | M26 · `/i18n/{locale}.json`, `/me` locale | — |
| 6 layouts (sidebar variants) | frontend only; `/navigation` is layout-agnostic | — |
| **Builder, Pages, Media, SEO, Redirects, Quotations, Estimator, Bookings, Portal** | *no TailAdmin equivalent* → build with Flowbite/Tailwind against M05–M12, M28 | `content`, `seo.speed` |

---

## 12. Deployment, environments, CI/CD

| Item | Plan |
|---|---|
| Environments | `local` (Docker: PHP+MySQL) · `staging` (separate Hostinger subdomain + DB) · `production` |
| CI (GitHub Actions) | PHP lint + PHPStan L6, PHPUnit, OpenAPI lint (Spectral), contract tests, **tenant-isolation suite**, migration dry-run on empty and on P15-snapshot DB, SDK generation, release zip build |
| Release artefact | `woodex-platform-vX.Y.Z.zip` = `platform/` + vendor + migrations. Contains **no content, no secrets, no `_private/`, no storage** (fixes P-1) |
| Deploy | File Manager upload → extract (overwrite is now safe) → open `/api/v1/_migrate` (token-protected) → runs pending migrations → `/health` green. Optional SFTP/GitHub-Actions deploy later |
| Config | `/storage/.env` (DB creds, key path, CORS defaults) — replaces `_private/db.json`; the **Reconnect-database** flow from P15 is kept as `/api/v1/_setup/db` |
| Rollback | previous zip + migrations are additive so old code still runs; DB restore point taken automatically before each migrate |
| Cron | one hPanel cron `* * * * * curl -s https://…/api/v1/_cron?k=…` (or `php cron.php`) → drains `jobs` |
| Observability | `/health` (db, storage, cron-last-run, queue depth, disk), email alert on failed jobs > N, Sentry-compatible hook optional |
| Docs hosting | `/api/v1/docs` + `docs/headless` in repo |

---

## 13. Quality strategy
- **Contract tests:** every OpenAPI operation exercised; response schema validated.
- **Isolation tests:** auto-generated cross-tenant attack matrix (must be 0 leaks to merge).
- **Permission tests:** matrix role × endpoint from generated `PERMISSIONS.md`.
- **Migration tests:** run on P15 snapshot; reconciliation report diffed; idempotency (run twice = same result).
- **Page render tests:** golden HTML snapshots for each block type; round-trip test for the 86 migrated pages; Lighthouse check on 11 key pages (mobile ≥ 90, a11y ≥ 97 — the P15 bar must not regress).
- **Load smoke:** k6 — 50 rps reads on `/delivery/pages`, 10 rps writes; must stay inside shared-hosting limits.
- **Security:** OWASP ASVS L2 checklist, dependency audit, secret scanning, upload fuzz.
- **Definition of Done (per module):** OpenAPI + SDK regenerated · migrations · permission rows · audit hooks · dashboards/widgets (if any) · tests green · connect-guide snippet · seed data · docs.

---

## 14. Delivery roadmap (phase gates — each ends with a demo + your approval)

Effort in *ideal engineering days*, estimates ±30 %, single developer; parallelisable after Phase 2.

| Phase | Name | Delivers | Gate / acceptance | Est. |
|---|---|---|---|---|
| **0** | Foundation & decisions | repo layout, Docker env, CI, OpenAPI skeleton, conventions, confirm Hostinger PHP version/limits (cron, memory, `sodium`, `intl`, Imagick/GD) | CI green; `/health` live on staging | 3 |
| **1** | Platform core | M01–M04: router, tenancy, identity/tokens, RBAC, audit, API keys, settings+secrets, jobs/cron, migrations runner, `/me` `/navigation` | Two tenants created; login/refresh/TOTP; isolation suite green | 8 |
| **2** | Data migration & legacy adapter | M1–M7 of §7.4 for users, settings, leads/clients, quotes/invoices/projects; legacy admin runs on new data | reconciliation 100 %; dual-run drift 0 for 7 days | 6 |
| **3** | Headless CMS & Page Builder core | M05/M06: pages, versions, blocks+schemas, global sections, themes, menus, collections, preview tokens, HTML→blocks import, **renderer + publisher (docroot)** | 86 pages round-trip pass; publish < 3 s; no content overwritten by deploy | 12 |
| **4** | Media, SEO, redirects, forms | M07–M09 + Delivery API + sitemap/robots + webhooks core | Lighthouse parity on 11 key pages; form → lead flow works from external origin | 7 |
| **5** | CRM, sales, bookings | M10–M12 normalised; numbering preserved; public quote link; PDFs | Create lead → quote → invoice → payment end-to-end via API only | 9 |
| **6** | Dashboards & analytics service | M20/M21 + role dashboards (`executive`, `sales.crm`, `content`, `seo.speed`, `marketing`) + widget library | Each role sees only its dashboards; widgets render in ApexCharts & Chart.js sample | 6 |
| **7** | Ops modules | M13–M17: projects, products/inventory, finance, logistics, support | Dashboards `projects`, `inventory`, `finance`, `support` complete | 12 |
| **8** | Messaging, chat, automation | M18–M19: unified inbox, rules engine, reminders, WA/email templates, SSE | Follow-up, quote-expiry, payment-due, booking reminders fire from cron | 8 |
| **9** | Integrations, AI/MCP, i18n/RTL | M22–M26 | Connect/test every integration; MCP draft-only writes with approval; `ur` locale round-trip | 8 |
| **10** | Frontend kits & SDK | OpenAPI final, TS/PHP SDKs, Postman, mock server, **connect guides ×9**, **proof-of-connection**: thin demo shells for TailAdmin HTML, React, Next.js and a Flowbite public page (demo only, to prove the contract) | Fresh developer connects each in < 1 hour using only the guide | 8 |
| **11** | Platform console, hardening, go-live | M27–M30, tenant onboarding wizard API, backups/restore drill, security review, load test, legacy sunset plan | Pen-test checklist clear; restore drill passed; second tenant (non-Woodex) live | 8 |
| | **Total** | | | **≈ 95 days** (≈ 19 weeks single dev; ≈ 11–12 weeks with 2 devs from Phase 3) |

**Critical path:** 0 → 1 → 2 → 3 → 4 → 10. Phases 5–9 can reorder by business priority (default: sales before ops, as decided in P17-D2).

---

## 15. Documentation deliverables
`docs/headless/`: `MASTER-PLAN-HEADLESS.md` (this) · `ARCHITECTURE.md` · `API-GUIDE.md` (auth, pagination, errors, webhooks) · `DB-SCHEMA.md` (generated from migrations + ERD) · `PERMISSIONS.md` (generated) · `PAGE-BUILDER-SPEC.md` + `schemas/blocks/` · `OPERATIONS.md` (deploy, cron, backup, restore, incident) · `connect/*.md` · `CHANGELOG.md`.
Legacy plans get a one-line banner "Superseded by docs/headless/MASTER-PLAN-HEADLESS.md" when Phase 0 starts.

---

## 16. Decisions log

**Confirmed by you (this session)**
| ID | Decision |
|---|---|
| H1 | Output now = plan document only (no code) |
| H2 | Stack = PHP + MySQL on Hostinger |
| H3 | Multi-tenant (many sites, per-tenant domains, plans, onboarding) |
| H4 | Include **all** extra modules: support, products/inventory, finance/transactions, i18n/RTL (English + Urdu), AI settings, API-key manager, integrations hub, calendar/bookings, logistics, client portal |
| H5 | Frontends to be connectable: **all TailAdmin free versions** (HTML, React, Next.js, Vue, Angular, Laravel) + Flowbite |
| H6 | Free/MIT only; Pro-only screens built with Flowbite |
| H7 | New plan supersedes the old ones as architecture authority |
| H8 | Interface for frontends = REST JSON + API keys/tokens + published JSON/HTML + webhooks (REST-only; GraphQL not planned) |

**Carried over from earlier Woodex plans (kept as defaults)**
Business lines Furniture / Interior / Project with prefixes **WF- / WI-** (editable); WhatsApp number from Settings (+92 322 4200168, confirm); prepared-message-first WhatsApp automation with per-type auto switch; site-visit booking + admin calendar; Claude as default AI provider (others optional); quote/invoice templates applied when supplied; AI writes are **drafts only**; never overwrite live data.

**Defaults I chose (change any before Phase 0)**
| ID | Topic | Default | Alternative |
|---|---|---|---|
| A1 | Tenant resolution | `X-Tenant` header, falling back to domain | path prefix only |
| A2 | Token type | opaque + refresh rotation (revocable, simple on PHP) | JWT |
| A3 | PHP baseline | 8.1+ | 7.4 compat (limits libraries) |
| A4 | Page publish default | `docroot` target for Woodex; `none` for new tenants | all `webhook` |
| A5 | Client portal login | email + magic link/OTP | password |
| A6 | Payments gateways | record payments manually in v1; gateway connectors in Phase 9 as optional | gateway first |
| A7 | Real-time | SSE + polling | WebSocket on a separate service |
| A8 | Search | MySQL FULLTEXT now; Meilisearch connector later | external search day 1 |

---

## 17. Risks & mitigations
| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R1 | Shared-hosting limits (CPU, memory, cron granularity, no long processes) | M | H | Phase 0 capability probe; queue in small batches; render per page not whole site; SSE with timeouts; keep option of cheap VPS for API (code is host-agnostic) |
| R2 | HTML → blocks conversion loses fidelity | M | H | lossless `custom-html` fallback, golden round-trip tests, staging swap, per-page rollback |
| R3 | Tenant data leak | L | Critical | single repository choke-point, CI isolation matrix, audit, code review checklist |
| R4 | Data migration errors (leads/quotes) | M | Critical | additive tables, dry-run, reconciliation report, dual-run, number sequence copy |
| R5 | Scope creep (30 modules) | H | M | phase gates, DoD, module flags per plan; MVP = Phases 0–4 + 6 |
| R6 | TailAdmin free tier lacks screens | M | L | Flowbite fallback; backend independent |
| R7 | SEO regression during cut-over | M | H | identical URLs, redirect map, sitemap parity check, Lighthouse gate, Search Console watch |
| R8 | Secrets exposure in legacy JSON | M | H | Phase 1 secrets vault + rotate WhatsApp/SMTP tokens after migration |
| R9 | Plan drift again | M | M | contract-first OpenAPI, generated docs, banners on legacy plans |
| R10 | Single-developer bus factor | M | M | docs-as-deliverable, CI, SDK tests |

---

## 18. Open items I still need from you (do not block Phase 0)
1. **Domains:** which domain hosts the API (e.g. `api.woodex.com.pk`) and admin (`admin.woodex.com.pk`)? Hostinger needs subdomains created.
2. **Hostinger plan** (Premium/Business/Cloud) and PHP version — decides A3 and R1.
3. **Second tenant:** is there a real next brand to onboard in Phase 11 (name, domain)? It becomes the isolation proof.
4. **Payments:** do you want JazzCash/Easypaisa/Stripe connectors (Phase 9) or manual recording only?
5. **Languages:** Urdu content translated by you/AI/translator? (affects M26 workflow).
6. **Priority order of Phases 5–9** if different from the default.
7. Confirm WhatsApp number (+92 322 4200168).

---

## 19. First 10 working steps once approved (Phase 0 kickoff)
1. Create `platform/` skeleton + `docs/headless/` + Docker compose (PHP 8.2, MySQL 8).
2. Write `openapi.yaml` for `/health`, `/auth/*`, `/me`, `/navigation`, `/pages` (vertical slice).
3. Implement front controller, router, error envelope, request-id, logger.
4. Implement migration runner + `0001_platform.sql` (tenants, users, memberships, roles, permissions, tokens, audit, jobs).
5. Repository base class with automatic `tenant_id` injection + isolation test harness.
6. Capability probe script for Hostinger (PHP version, sodium, GD/Imagick, memory, cron).
7. CI pipeline (lint, PHPUnit, Spectral, contract tests, zip artefact).
8. Seed: tenant `woodex`, owner user from existing `wx_users` (hash reused), default roles/permissions.
9. Prism mock server from the OpenAPI slice so frontend work can begin.
10. Demo gate: login → `/me` → `/navigation` → create + publish one page via API on staging.
