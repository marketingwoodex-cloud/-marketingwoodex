# WOODEX AGENCY PLATFORM — Master Plan v2 (Agency Edition)

**Version:** 2.0 · **Date:** 2026-10-02 · **Status:** for approval
**Relationship to v1:** `MASTER-PLAN-HEADLESS.md` (v1.0, 2026-10-01) stays valid for the API contract, data model, page-document model,
security and module list. **This document overrides v1 wherever the two disagree** (see §3 "Decisions changed").
**Out of scope here (by instruction):** the admin-dashboard design/plan. Dashboards are only treated as *one more client* of the API.
**New scope:** run this as an **agency product** — many agencies, each with many client sites, any frontend framework, global reach, go-live.

---

## 1. Director's verdict on the external review

The review you pasted is mostly right on direction. Scored against v1 and against what I researched:

| Review point | Verdict | Action |
|---|---|---|
| Move pages from disk to JSON block tree | ✔ already v1 §6 | keep |
| REST `/api/v1`, bearer auth, OpenAPI, ETag, webhooks | ✔ already v1 §5 | keep |
| `tenant_id` strictly scoped in every query | ✔ already v1 §4 (repository choke-point + CI isolation test) | keep; implement via framework tenancy package (§4.3) |
| Normalise quotes/invoices | ✔ already v1 §7 | keep |
| **Offload media to S3-compatible storage, tenant-prefixed** | ✔ **real gap** (v1 kept media on local disk, S3/R2 only as optional integration) | **adopt** — Cloudflare R2 primary (§6) |
| **Visual theme tokens (`--primary`, font, radius) per client** | ◐ v1 had `themes` but thin | **adopt** full token system (§7) |
| **White-label: subdomains, custom domains, branding** | ✔ **real gap** (v1 had domains for tenants only, no agency layer, no TLS plan) | **adopt** (§4, §5) |
| **VPS instead of shared PHP hosting** | ✔ **correct** — queues, PDF generation, custom-domain routing, workers can't live on shared hosting | **adopt** (§3, D-1) |
| Node.js or Laravel instead of plain PHP | ◐ direction right, I pick **Laravel** (reasons §3, D-2) | adopt, needs your OK |
| PostgreSQL / MySQL 8 | ◐ either works | **keep MySQL 8** (P15 data is MySQL; no feature we need is Postgres-only) |
| "JWT / Bearer" | ◐ | **keep opaque revocable tokens** (Laravel Sanctum-style), not stateless JWT: instant revocation matters for an agency (staff leave, client handover) |
| Unified payment-gateway interface: JazzCash/Easypaisa + Stripe/Paddle | ◐ right idea, **Stripe is not available to Pakistan-registered businesses** (§8) | adopt interface; swap Stripe → Paddle/Lemon Squeezy/Whop or a foreign entity |
| Domains `api.` / `app.` + custom CNAMEs | ✔ | adopt (§5) |
| Commit and start Phase 1 | ✔ | Phase 0 first (§11), not straight to Phase 1 |

What the review **missed** (added in this plan): the **agency → client two-level hierarchy**, reseller billing, template/starter marketplace,
client approval workflow, multi-framework **renderers** (not just APIs), custom-domain TLS automation, cost model, and a real go-live runbook.

---

## 2. Research findings that changed the plan (sources, checked 2026-10-02)

| # | Finding | Source | Consequence |
|---|---|---|---|
| F1 | **Cloudflare for SaaS**: 100 custom hostnames free, then **$0.10/hostname/month**, automatic TLS issue + renewal; customers point a CNAME at your fallback host | [Cloudflare blog](https://blog.cloudflare.com/waf-for-saas/) · [Cloudflare use-cases](https://developers.cloudflare.com/use-cases/saas/) | White-label custom domains for clients are **cheap and automated** — no certbot scripts on the VPS |
| F2 | **Cloudflare R2**: $0.015/GB-month, **$0 egress**, free tier 10 GB + 1 M writes + 10 M reads per month, S3-compatible API | [Raff comparison](https://rafftechnologies.com/learn/compare/raff-object-storage-vs-cloudflare-r2) · [mecanik.dev](https://mecanik.dev/en/posts/cloudflare-r2-pricing-explained-real-costs-vs-s3-and-backblaze/) | Images cost almost nothing to serve; heavy image sites (interior portfolios) are exactly R2's sweet spot. Watch write-op cost ($4.50/M) when generating renditions |
| F3 | **Hostinger VPS** KVM 1–8 (1–8 vCPU, 4–32 GB RAM, 50–400 GB NVMe); entry price quoted **~$5–6.5/mo** intro, **renewal up to ~2–3×**; KVM 2 (2 vCPU/8 GB) ≈ **$7–9 intro, ~$15 renewal**; Docker-ready, root access | [bearhost](https://bearhost.com/blogs/hostinger-pricing) · [bestusavps](https://bestusavps.com/reviews/hostinger-vps/) · [hostinger.com](https://www.hostinger.com/vps/ubuntu-hosting) | Sources disagree on price → budget at **renewal** price, not intro. KVM 2 is the starting size |
| F4 | **Stripe does not onboard Pakistan-registered businesses** (needs a US/UK entity); Paddle supports Pakistan with Payoneer/wire payouts, 5 % + $0.50; Lemon Squeezy 5 % + $0.50 (+1.5 % international), PayPal payout n/a in PK; Whop now pays out to PK banks | [jawadhassan.dev](https://jawadhassan.dev/blog/paddle-vs-lemonsqueezy-pakistan) · [TechJuice](https://www.techjuice.pk/did-pakistan-finally-get-a-stripe-alternative/) | International billing of agency subscribers = **Paddle / Lemon Squeezy (merchant of record)**, not Stripe (unless you open a foreign entity). Confirm eligibility at sign-up — rules change |
| F5 | **Pakistani gateways**: PayFast (cards, wallets, Raast P2M; ~2.5–3 %, T+1/T+2, 3–7 days onboarding), Safepay (cards/wallets, REST + Node SDK, ~2.9 %), JazzCash & Easypaisa (wallets, 2–3 %, direct integration is slow); aggregators like Simpaisa offer one API for JazzCash + Easypaisa + cards + IBFT | [buzzinteractive](https://www.buzzinteractive.co/blog/payment-gateways-in-pakistan) · [clicks.com.pk](https://blog.clicks.com.pk/top-10-payment-gateways-pakistan/) · [Simpaisa](https://www.simpaisa.com/blogs/how-to-add-easypaisa-payments-to-your-website-2026-complete-guide/) | Build a **PSP adapter interface**; first adapters: **PayFast** and **Safepay**, wallets via aggregator or direct later. Fees/settlement are third-party claims — confirm in contract |
| F6 | **Page-builder engines**: **Puck** (MIT, React-only, JSON out, no hosted backend, no CMS), **GrapesJS** (BSD-3, framework-agnostic, HTML/CSS + JSON project data, heavy setup), **Craft.js** (MIT, React, build-your-own UI), **Builder.io** (proprietary SaaS) | [DEV: top 5 React builders](https://dev.to/fede_bonel_tozzi/top-5-page-builders-for-react-190g) · [gjs.market verdict](https://gjs.market/blogs/grapesjs-vs-webflow-vs-builderio-vs-puck-which-visual-builde) · [GrapesJS vs Craft.js](https://gjs.market/grapesjs-vs-craftjs) | The editor canvas is a *client*. Use **Puck** for v1 (JSON in = JSON out = our block tree); keep **GrapesJS** as the fallback if free-form HTML editing is required (§9) |
| F7 | **stancl/tenancy** (Laravel): single-DB (`tenant_id` scoping via model traits) **and** multi-DB modes, domain→tenant resolution, tenant-aware queues/cache/filesystem, stable since 2019 (v3) | [tenancyforlaravel.com](https://tenancyforlaravel.com/) · [docs](https://tenancyforlaravel.com/docs/v3/introduction/) | Gives us tenancy plumbing we would otherwise hand-write; single-DB mode matches v1. Multi-DB mode available for a "premium isolated" plan |
| F8 | TailAdmin v2.4.0 (13 Sep 2026): i18n, RTL, yearly calendar, `AGENTS.md`; v2.3.x AI/Sales/Finance dashboards; free-vs-Pro split not stated | [TailAdmin changelog](https://tailadmin.com/docs/update-logs/html) | Unchanged from v1; admin UI is out of scope here |

*Not verified by search (so treat as assumptions):* current Laravel/PHP major versions to pin at kickoff; Puck production-readiness for 80+ block types (needs a 1-week spike, §11); R2 write-operation volume for our rendition pipeline.

---

## 3. Decisions changed (v1 → v2)

| ID | v1 said | **v2 says** | Why | Needs your OK |
|---|---|---|---|---|
| **D-1 Hosting** | Hostinger shared (PHP, hPanel cron) | **VPS** (Hostinger KVM 2 to start; portable Docker compose) behind **Cloudflare**; shared hosting kept only for the legacy Woodex site until cut-over | queues, workers, PDF rendering, custom domains, SSE, cron every minute | ✅ |
| **D-2 Framework** | plain PHP + micro-libs | **Laravel** (current stable at kickoff) on PHP 8.3+, MySQL 8, **Redis** (queue/cache/rate-limit), Supervisor-managed queue workers, scheduler | queues + scheduler + policies + migrations + tokens + testing built in; same language as existing P15 code so logic ports; stancl/tenancy (F7) | ✅ |
| **D-3 Media** | local `/storage`, S3 optional | **R2 (S3-compatible) primary**, keys `tenants/{agency}/{site}/media/…`, originals + renditions, signed upload URLs, local disk only for dev | F2; removes disk-size and deploy coupling | auto |
| **D-4 Tenancy depth** | one level (tenant) | **Two levels: Agency (org) → Site (workspace)**, plus end-customer *clients* inside a site (CRM contacts). Single-DB by default; **multi-DB opt-in** for enterprise sites | agency use-case, resale, white-label | ✅ |
| **D-5 Domains/TLS** | DNS TXT verification | **Cloudflare for SaaS custom hostnames** (auto TLS), `*.sites.<brand>` subdomain wildcard for previews/default | F1 | auto |
| **D-6 Payments** | manual record; connectors optional | **PSP adapter interface** from Phase 5: PayFast + Safepay (PKR), Paddle/Lemon Squeezy (international subscriptions); wallets via aggregator | F4, F5 | ✅ (which gateways to apply for — onboarding takes days–weeks) |
| **D-7 Auth tokens** | opaque + refresh | unchanged (opaque, revocable); reviewer's "JWT" **declined** | instant revocation | — |
| **D-8 DB engine** | MySQL | unchanged (MySQL 8) | P15 data is MySQL; no Postgres-only need | — |
| **D-9 Builder editor** | any | **Puck-based editor shell** (React, MIT) for v1, JSON schema owned by backend; GrapesJS fallback | F6 | auto |
| **D-10 Build order** | Phase 1 = platform core | **Phase 0 = infra + spikes first** (§11) | de-risk hosting, builder engine, PSP before 90 days of work | — |

Everything not listed (RBAC model, page document model, API conventions, webhook signing, security baseline, data migration steps,
module catalogue M01–M30) **carries over from v1 unchanged** — read them there.

---

## 4. Agency model (the layer v1 lacked)

### 4.1 Hierarchy
```
Platform (you, super-admin)
 └─ Agency  (org: brand, billing account, team, white-label settings, plan)
     ├─ Agency team (owner, manager, designer, developer, support, billing)
     └─ Site / Workspace  (one client website or business — this is v1's "tenant")
         ├─ Site users (client owner, editor, approver, viewer)   ← external client logins
         ├─ Domains, theme tokens, pages, collections, media, forms
         └─ Business data (CRM, quotes, invoices, projects …)      ← v1 modules M10–M17, per site, optional
```
A person can belong to several agencies and sites (`memberships` gets a `scope_type: platform|agency|site`).
Permissions inherit downward (agency manager ⇒ every site in that agency) and can be narrowed per site.

### 4.2 Agency capabilities
| Capability | Description | Phase |
|---|---|---|
| **White-label** | agency logo, colours, name, login-page text, email sender/domain, “powered by” toggle, custom app domain (`app.agencybrand.com`) | 3 |
| **Client workspaces** | create site from **starter/template**, clone site, transfer site to another agency, archive | 3 |
| **Client access modes** | (a) full editor, (b) *content-only* (can edit text/images, cannot change structure/theme), (c) *approver* (comment + approve), (d) view-only | 3 |
| **Approval workflow** | draft → agency review → client approval → publish; comments pinned to blocks; audit trail of who approved what/when | 4 |
| **Template & starter library** | agency-private templates + platform-wide marketplace (free/paid later); a template = theme tokens + page set + blocks + sample content + automation rules; versioned, updatable with *diff-and-apply* so existing sites are not clobbered | 4 |
| **Bulk operations** | update a global section / token / plugin across N sites, with dry-run and per-site rollback | 5 |
| **Agency dashboard data** | all sites health, uptime, PageSpeed, form leads, overdue invoices, pending approvals (API only here) | 5 |
| **Billing & reselling** | agency plans (platform → agency) + optional *site subscriptions* (agency → client) with usage limits (pages, storage, seats, domains, AI credits) | 5–6 |
| **Support tooling** | impersonate client (audited, banner), site snapshots before risky changes, “restore to snapshot” | 4 |
| **Reports for clients** | monthly auto-generated white-label PDF/email: traffic, speed, leads, changes made | 6 |

### 4.3 Tenancy implementation rules (Laravel)
1. Use **stancl/tenancy in single-database mode** (model traits scope queries by `site_id`; also queues, cache keys, filesystem prefix are tenant-aware) [F7].
2. Add `agency_id` and `site_id` to every business table; **global scope + a CI "cross-tenant attack matrix" test** generated from the OpenAPI file (0 leaks to merge).
3. Raw SQL/`DB::table()` forbidden outside a reviewed `Reporting` namespace (static-analysis rule).
4. Per-site encryption of integration secrets (app key + per-site data key).
5. Rate limits, quotas and storage counters keyed by `site_id` and rolled up to `agency_id`.

---

## 5. Domain & routing architecture

| Hostname | Purpose | Notes |
|---|---|---|
| `api.<brand>.com` | public API (`/api/v1`) | Cloudflare proxied, WAF + rate limit |
| `app.<brand>.com` | default dashboards (any admin frontend) | agency can bring `app.agency.com` (white-label) |
| `*.sites.<brand>.com` | default site hostnames + preview (`client-draft.sites.<brand>.com`) | wildcard DNS + cert |
| `cdn.<brand>.com` → R2 | media delivery | custom domain on R2 bucket |
| client custom domain (`www.client.com`) | live site | **Cloudflare for SaaS custom hostname**; client adds CNAME to `cname.<brand>.com`; TLS auto-issued/renewed; origin routes by `Host` → `domains` table |

**Request path:** Browser → Cloudflare (TLS, cache, WAF) → VPS Nginx → Laravel (tenant resolved from `Host` or `X-Site` header) → MySQL/Redis/R2.
**Published sites** are served as **static HTML + assets from R2/CDN** whenever possible (fast, resilient even if the API is down); dynamic bits
(forms, chat, booking, search) call `api.<brand>.com` with a site-scoped public key.

---

## 6. Storage & assets (revised v1 §7 "Media")
- Bucket layout: `tenants/{agency_uid}/{site_uid}/media/{yyyy}/{mm}/{ulid}.{ext}`; renditions `…/_r/{ulid}-{w}.{webp|avif}`; exports/backups in a **separate private bucket**.
- Upload: client asks `POST /media/uploads` → API returns **pre-signed PUT** (size/mime constrained) → browser uploads direct to R2 → `POST /media/{id}/complete` → queue job validates (decode image, strip EXIF, SVG sanitise, virus-scan hook) and creates 480/960/1600 WebP (+AVIF optional) renditions (keeps the P15 `srcset` approach).
- Cost guard: rendition jobs are **batched/idempotent** (R2 charges per write op [F2]); plan quotas per plan tier; lifecycle rule deletes orphaned uploads after 24 h.
- Delivery: immutable URLs (`Cache-Control: public, max-age=31536000, immutable`), served from the R2 custom domain; signed URLs only for private files (client contracts, invoices).
- Migration: existing `assets/img/*` (≈30 images × 3 sizes + `_orig`) import to the Woodex site prefix; URL redirects kept.

---

## 7. Visual theme tokens (global rebrand without code)

**Token model** (stored per site in `themes`, versioned, with agency/platform defaults inherited):
```jsonc
{
  "color":   { "primary": "#8B5E3C", "primary-contrast": "#fff", "accent": "#…", "surface": "#…", "text": "#…", "muted": "#…", "success":"#…", "danger":"#…" },
  "font":    { "heading": {"family":"Plus Jakarta Sans","weights":[600,700]}, "body": {"family":"DM Sans","weights":[400,500]}, "scale": 1.2 },
  "radius":  { "sm": 4, "md": 8, "lg": 16, "pill": 999 },
  "space":   { "unit": 4, "section-y": { "sm": 40, "md": 72, "lg": 112 } },
  "shadow":  { "card": "0 6px 24px rgba(0,0,0,.08)" },
  "button":  { "style": "solid|outline|pill", "weight": 600 },
  "dark":    { "enabled": false, "overrides": { … } },
  "rtl":     { "font-ur": "Noto Nastaliq Urdu" }
}
```
- **Output:** compiled to one `theme.css` of CSS custom properties (`--wx-color-primary`…), content-hashed and published to the CDN; blocks only reference tokens (`token:primary`), never raw hex (a lint rule flags raw colours).
- **Guardrails:** WCAG contrast check on save (fails if text/background < AA — P15 accessibility bar), font whitelist (self-hosted woff2 subsets; no third-party font calls — P15 speed bar), preview before publish, one-click revert.
- **Inheritance:** Platform default → Agency theme (brand kit) → Site theme → Page/section override (permission-gated).
- **API:** `GET/PUT /themes/{id}`, `POST /themes/{id}/preview`, `GET /delivery/theme.css`, `GET /delivery/tokens.json` (for React/Vue/Angular/Flowbite/Tailwind consumers → generates a Tailwind preset from the same tokens).

---

## 8. Payments & billing (unified PSP interface)

```
interface PaymentProvider {
  createCheckout(Money, Customer, returnUrls, metadata): CheckoutSession   // hosted page or in-page
  getPayment(id): Payment
  refund(paymentId, Money?): Refund
  verifyWebhook(headers, rawBody): Event            // signature check
  capabilities(): { currencies[], methods[], recurring: bool, payouts: 'local'|'mor' }
}
```
| Use | Adapter (v2 order) | Notes |
|---|---|---|
| Client pays agency/business in PKR (quote → invoice → payment) | **PayFast**, **Safepay**; wallets (**JazzCash/Easypaisa**) via aggregator or direct | gateway onboarding takes ~3–7 days or longer, needs NTN/business docs [F5] — **start applications in Phase 0** |
| Agency subscribes to *the platform* internationally | **Paddle** or **Lemon Squeezy** (merchant of record, handles tax), Whop as alternative | Stripe only if you open a US/UK entity [F4] |
| Manual / bank transfer | `ManualProvider` (record + proof upload + approve) | always available, default for v1 |

Rules: all provider events land in `payment_events` (raw + normalised, idempotent by provider event id); invoices are only marked paid by a verified webhook or a staff approval (audited); **never store card data** (hosted checkout only); reconciliation job daily; refunds via API only; multi-currency per site (default PKR), FX rates table for reporting only.

---

## 9. Multi-framework strategy ("any frontend", delivered)

An API alone is not enough for agencies; sites must **render** in whatever stack the agency or client prefers.

| Layer | Deliverable | Frameworks |
|---|---|---|
| Contract | `openapi.yaml`, Postman/Bruno, Prism mock | all |
| SDKs | TypeScript (browser/Node/Next server+client), PHP (Laravel) | TS, PHP; Python later |
| **Renderers** (page JSON → UI) | `@woodex/render-core` (framework-free: block registry, token → CSS, SEO head, i18n/RTL) + adapters | **Server-HTML (Blade/PHP & Node)** first, **React/Next.js** second, **Vue/Nuxt** third, **Angular** fourth, **Astro** optional |
| Editor | **Puck-based visual editor** (React) embedded in any dashboard shell via iframe/route; saves our block JSON via Pages API | editor is React; **output renders anywhere** (Puck being React-only affects only the editor [F6]) |
| Fallback editor | **GrapesJS** adapter (HTML/CSS ↔ blocks via custom-html + project JSON) if a client needs free-form layout | framework-agnostic |
| Public-site kits | Flowbite/Tailwind starter sites reading `/delivery/*` + tokens | HTML, Next.js, Nuxt |
| Dashboard kits | TailAdmin variants (see v1 §11) — **not planned here** | — |
| Agents | MCP server (draft-only writes) | any MCP client |

**Block-contract guarantee:** every block type ships with (1) JSON Schema, (2) a reference HTML renderer, (3) a visual snapshot test, (4) WCAG lint rules, (5) a Puck component config **generated from the schema**. A new block is "done" only when all five exist, so React/Vue/Angular adapters can't drift.

**Why Puck first, and the spike that decides it (Phase 0):** Puck gives JSON in/out, MIT licence, no vendor backend, permissions API [F6]. Risks: React-only, smaller block ecosystem, no built-in CMS/analytics. **Spike (5 days):** render 10 real Woodex block types (hero, feature grid, gallery, FAQ, form, collection-list…) from schema → Puck config, edit, save, round-trip through the API, publish to static HTML. **Pass criteria:** ≥ 9/10 blocks lossless; undo/redo; responsive preview; < 150 ms editor interaction on a 40-block page. Fail → GrapesJS spike (same criteria).

---

## 10. Global-level readiness (not just Pakistan)

| Area | Requirement |
|---|---|
| **Languages** | `locale` on pages/collections; UI string bundles; RTL (`dir`, logical CSS props, Urdu Nastaliq/Arabic font tokens); `hreflang` generation; machine-translation *assist* with human approval, never auto-publish |
| **Currency & tax** | per-site currency; money as integer minor units; tax rules table (rate, inclusive/exclusive, registration number); invoice numbering per site/business line (WF-/WI- preserved) |
| **Time & numerals** | per-site timezone; locale-aware dates/numbers; Urdu/Eastern-Arabic numeral option |
| **Regions & performance** | Cloudflare CDN worldwide; R2 global; API on one VPS region at first (choose nearest to users — e.g. Europe/Singapore for PK latency, test), read-replica/second region only when metrics demand |
| **Privacy & compliance** | consent capture on forms, data export/erase endpoints per contact, retention settings, DPA template for agencies, audit log; cookie-banner block; log scrubbing. *Pakistani and international privacy-law specifics to be reviewed by counsel before launch — not assessed here* |
| **SEO at scale** | per-site sitemap/robots, canonical + hreflang, schema.org templates (LocalBusiness, Service, FAQ, Article), redirect manager with bulk CSV, 404 log, internal-link audit, Core Web Vitals budget per site (mobile ≥ 90 as in P15) |
| **Accessibility** | WCAG 2.2 AA lint in the editor (alt text, headings, contrast, focus order) — carries P15's 97–100 a11y score forward |
| **Reliability** | status page, uptime checks per site, daily backups to R2 (separate bucket + separate credentials), restore drill, RPO ≤ 24 h / RTO ≤ 4 h initially |

---

## 11. Revised roadmap (replaces v1 §14)

Estimates in ideal engineering days (±30 %). **MVP = Phases 0–4** (a working multi-site headless CMS + builder + publish, Woodex migrated).

| Phase | Name | Key deliverables | Exit gate | Days |
|---|---|---|---|---|
| **0** | **Foundations & spikes** | Hostinger VPS provisioned (Docker compose: Nginx, PHP-FPM, MySQL 8, Redis, Supervisor), Cloudflare zone + R2 bucket + SaaS fallback origin, repo + CI, staging env; **spikes:** Puck builder (5 d), Cloudflare custom-hostname flow (1 d), PSP sandbox (PayFast/Safepay, 2 d), R2 upload + rendition job (1 d), Laravel+stancl isolation prototype (2 d); **start PSP merchant applications** | all five spikes reported with pass/fail; staging reachable via `api.` and `*.sites.` hostnames with TLS | 12 |
| **1** | **Platform core** | Laravel app, tenancy (agency → site), identity & opaque tokens + refresh, TOTP, RBAC with inheritance, audit, settings + encrypted secrets, API-key scopes, OpenAPI skeleton, `/me`, `/navigation` | cross-tenant attack matrix = 0 leaks; 2 agencies × 2 sites seeded | 10 |
| **2** | **Migration & parity for Woodex** | import P15 users/settings/leads/clients/quotes/invoices/projects; reconciliation report; 86 pages → blocks (lossless fallback); media → R2; redirects/sitemap parity | reconciliation 100 %; page round-trip visual diff pass; 7-day dual-run drift 0 | 10 |
| **3** | **Headless CMS + builder + white-label** | pages/versions/blocks/global sections/menus/collections, **theme tokens**, renderer-core + server-HTML renderer, publisher (static → R2/CDN), preview tokens, Puck editor shell, agency branding, site creation from starter, custom domain connect | create a new client site from a starter, edit, publish to a custom domain in < 30 min with no developer | 18 |
| **4** | **Agency workflow** | approvals + comments, client access modes, snapshots/restore, template library (diff-and-apply), impersonation, bulk-publish | an agency clones a template to 3 sites; client approves; rollback tested | 10 |
| **5** | **Commerce & billing** | PSP interface + PayFast + Safepay + manual, quotes→invoices→payments (normalised), numbering, PDFs (queue), webhooks, reconciliation; agency plans + usage limits | PKR payment end-to-end in sandbox then live small-value test | 12 |
| **6** | **Agency growth** | reseller subscriptions (Paddle/LS), client reports (white-label), site health monitoring, AI assist (draft-only) + MCP | agency receives monthly auto-reports; subscription lifecycle tested | 10 |
| **7** | **Business modules** (v1 M10–M19: CRM, bookings, projects, products, finance, logistics, support, chat, automation) | per site, feature-flagged by plan | per-module DoD from v1 §13 | 30 |
| **8** | **Renderers & kits** | React/Next adapter → Vue/Nuxt → Angular; Flowbite public starter; TS + PHP SDKs; mock server; connect guides | fresh dev connects each stack < 1 h using guide only | 12 |
| **9** | **Hardening & go-live** | load test, pen-test checklist, backup/restore drill, status page, runbooks, legacy sunset | go-live checklist (§12) 100 % green | 8 |
| | **Total** | | | **≈ 132 days** (≈ 26 weeks one dev; ≈ 15–16 weeks with two from Phase 3) |

*Increase vs v1 (95 days) is deliberate:* it now includes the agency layer, white-label domains, R2 pipeline, renderer adapters and PSP integrations that v1 deferred or omitted.

**Critical path:** 0 → 1 → 2 → 3 → 4 → 9. Phases 5–8 reorder by revenue priority (default: 5 first).

---

## 12. Go-live plan

### 12.1 Infrastructure (day-1 topology)
```
Cloudflare (DNS, CDN, WAF, SaaS custom hostnames, R2)
   │
Hostinger VPS KVM 2 (2 vCPU / 8 GB / 100 GB NVMe) — Ubuntu LTS
   ├─ nginx  → php-fpm (Laravel, opcache)
   ├─ mysql 8 (data on NVMe, binlog on)         ├─ redis (queue+cache)
   ├─ supervisor: queue workers ×2, scheduler, SSE/chat worker
   ├─ restic/mysqldump → R2 *backup* bucket (separate keys), nightly + weekly
   └─ ufw + fail2ban, SSH keys only, unattended-upgrades, Netdata/Uptime monitoring
Staging = second small VPS or same box with separate stack/DB (decide in Phase 0 based on cost)
```
**Scale-up path (no re-architecture):** KVM 4 → split MySQL to its own VPS → second app node behind Cloudflare LB → managed MySQL if desired. Docker compose is host-portable (Hetzner/DigitalOcean).

### 12.2 Monthly cost model (starting, USD — indicative)
| Item | Estimate | Basis |
|---|---|---|
| VPS KVM 2 (budget at **renewal**) | ~$9–15 | F3 (sources disagree; intro is lower) |
| Staging VPS (optional KVM 1) | ~$6–12 | F3 |
| Cloudflare (Free/Pro plan) + SaaS hostnames | $0 for ≤ 100 client domains, then $0.10 each | F1 |
| R2 storage (≤ 10 GB free; then $0.015/GB) | ~$0–5 | F2 |
| Email (SES/SMTP), WhatsApp Cloud API | usage-based | existing integrations |
| PSP fees | 2–3 % per PKR txn; Paddle/LS 5 % + $0.50 per intl subscription | F4, F5 |
| **Infra total at launch** | **≈ $15–35 / month** | excludes domain renewals, PSP fees, WhatsApp usage |

### 12.3 Launch readiness gates (all must be ✅ before cut-over)
| # | Gate | Evidence |
|---|---|---|
| G1 | **Isolation** | attack-matrix test green on production-like DB; manual pen-test of 10 high-risk endpoints |
| G2 | **Data parity** | reconciliation report: leads, clients, quotes, invoices, projects, users, pages, media = 100 %; quote/invoice number sequences verified |
| G3 | **SEO parity** | all 86 URLs resolve 200 or 301 as before; sitemap diff = 0 unexpected; canonical/hreflang present; Search Console property verified |
| G4 | **Performance** | mobile PageSpeed ≥ 90 and a11y ≥ 97 on the 11 key pages (P15 baseline: mobile 91–97, a11y 97–100) |
| G5 | **Security** | secrets rotated (WhatsApp, SMTP, DB), TLS A grade, security headers, rate limits, backup restore drill passed, 2FA enforced for owners |
| G6 | **Payments** | sandbox + one live small-value transaction per enabled PSP; webhook replay & idempotency tested; refund tested |
| G7 | **Ops** | uptime monitor + alerting (email/WhatsApp) live; log retention; runbooks (deploy, rollback, restore, incident, rotate keys); status page |
| G8 | **Legal/content** | privacy policy & terms for platform; DPA template; PSP merchant agreements signed |
| G9 | **Rollback** | previous release + DB restore point + DNS fallback to legacy site proven in a rehearsal |

### 12.4 Cut-over runbook (Woodex pilot, then first agency)
1. T-14 d: freeze legacy page-builder edits except via ticket; final full backup; lower DNS TTL to 300 s.
2. T-7 d: dual-run starts (legacy live, new stack mirrors). Nightly drift report.
3. T-1 d: content freeze; final delta import; run G1–G9 checklist; smoke tests from 3 networks (incl. Pakistani mobile).
4. T-0: switch DNS/Cloudflare origin to the new stack; keep legacy untouched as warm standby (read-only).
5. T+0–2 h: monitor errors, form → lead flow, WhatsApp alerts, checkout; test enquiry sent by owner.
6. T+24 h / T+7 d: PageSpeed + Search Console coverage review; fix regressions.
7. T+30 d: legacy archived (not deleted) after sign-off.
**Rollback trigger:** error rate > 2 % for 10 min, or any data-integrity incident → point origin back to legacy (< 15 min), investigate on staging.

### 12.5 Pilot sequence
1. **Woodex** (own business) — proves migration + parity. 2. **One friendly agency client** (new site from a starter, custom domain) — proves white-label + onboarding. 3. **Open to 3–5 agencies** — watch support load and quotas. 4. Public marketplace/billing only after 3 months of stable operation.

---

## 13. Risks added by v2
| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| V1 | Puck can't handle our block set or responsive editing | M | H | Phase-0 spike with hard pass criteria; GrapesJS fallback; block contract is engine-independent |
| V2 | Moving PHP → Laravel slows the first phases | M | M | port logic module-by-module; keep P15 running until parity; time-box Phase 1 |
| V3 | PSP onboarding delays (documents, approvals) | H | M | start in Phase 0; manual-payment provider always available; abstraction hides the choice |
| V4 | VPS single point of failure | M | H | nightly off-box backups, tested restore, Cloudflare caching of published sites (sites stay up if API is down), documented scale-up path |
| V5 | Hostinger VPS renewal price jump | H | L | budget at renewal; Docker portability to Hetzner/DO |
| V6 | R2 write-op cost spikes (renditions) | L | L | batch & dedupe renditions, quotas, lifecycle rules |
| V7 | Custom-domain misconfiguration by clients | H | L | guided DNS checker UI/API, status states (`pending_dns`, `pending_tls`, `active`, `failed`) with plain-language hints |
| V8 | Agency tenant data leakage through impersonation or bulk ops | L | Critical | audited impersonation w/ banner, bulk ops require dry-run + per-site permission check, attack-matrix covers bulk endpoints |
| V9 | Scope explosion (marketplace, billing, 30 modules) | H | M | MVP = Phases 0–4; later phases feature-flagged by plan tier |

---

## 14. What I recommend you do next ("after receiving this review")

1. **Approve the 5 decisions that change v1** (D-1 VPS, D-2 Laravel, D-4 agency→site tenancy, D-6 payments approach, D-10 Phase 0 first).
2. **Commit both plan files to the working branch** (this doc + v1) and add a one-line "superseded by" banner to the old P15–P17 plans.
3. **This week (Phase 0, no code risk):** order the VPS + Cloudflare/R2 account; open **PayFast and Safepay merchant applications** (longest lead time); decide the brand domain for `api.`/`app.`/`sites.`.
4. **Run the five spikes** (Puck, custom hostnames, PSP sandbox, R2 pipeline, tenancy isolation) and review pass/fail before committing to Phase 1.
5. **Do not** start Phase 1 until spike results are in — the Puck and tenancy outcomes can change the build order.

### Still need from you
1. Brand/domain for the platform (the agency product name and root domain).
2. Is Woodex the **only** pilot, or is there a first agency partner lined up?
3. Business registration status for PSP onboarding (NTN / registered company / sole proprietor) — it decides which gateways are realistic.
4. Budget ceiling per month for infra at launch (the model above is ≈ $15–35).
5. Who is the builder-UI developer (React)? The Puck decision assumes a React-capable developer.
