# WOODEX AGENCY PLATFORM — MASTER PLAN (v4.0, single source of truth)

**Date:** 2026-10-02 · **Status:** ready for your approval · **Language:** simple English on purpose
**This file replaces** v1, v2, v3 and v3.1 as the *plan to follow*. Those files stay as **detail annexes** (§16). If two files disagree, **this file wins**.
**Scope of this plan:** backend + headless API + admin shell + builder. **No public-site frontend code** (any frontend connects later).

---

## 1. What we are building (one paragraph)
A **multi-tenant platform** where an **agency** creates many **client sites**. Each site has pages built in a **visual builder** (Puck), a theme (tokens), menus, forms/CRM/quotes/invoices, and its own domain. Everything is exposed through a clean **API** so Blade, Next.js, Nuxt/Vue or Alpine frontends can show the content. **Woodex (Interior & Fit-out)** is the first site and the pilot.

## 2. Final decisions
| # | Topic | Decision | Reason |
|---|---|---|---|
| D1 | Backend | **Laravel 12, PHP 8.3** | your decision; TailAdmin Laravel needs exactly this |
| D2 | Admin UI | **Free TailAdmin Laravel (MIT)** from GitHub; Flowbite/Tailwind v4/Alpine | your decision; licence is in the repo; **it is a UI shell only** (no auth, no DB) |
| D3 | Database | **Supabase Free Postgres** (plain Postgres, Session pooler 5432, RLS) — **only if the Phase-0 probe passes**; otherwise Postgres on a Hostinger VPS | RLS gives a second safety wall between tenants; see §4 |
| D4 | Media + backups | **Cloudflare R2** (10 GB free, no egress fee) | Supabase Free has only 1 GB files and no backups |
| D5 | Hosting | **Hostinger Business** (you have it: SSH + Git + cron + daily backups) for **staging**; VPS when real clients arrive | §4 |
| D6 | Deploy | **GitHub Actions → release folders → symlink** (never Hostinger's own Git button, never `.htaccess`-into-`public_html`) | §4, `bootstrap/` |
| D7 | Repos | **New private repo `woodex-platform`** (Laravel at root). Old repo stays as the live static site | §3 |
| D8 | Builder | **Puck (MIT)** as a React island inside Laravel; output is **server-rendered Blade HTML** | React only inside the editor |
| D9 | Platform staff console | **Filament (MIT)**, staff only | days saved |
| D10 | API docs | **Scramble** → OpenAPI 3.1 from our routes | no hand-written spec |
| D11 | Vercel | free Hobby for **internal demos only** (non-commercial licence) | not for Woodex or clients |
| D12 | Vertical | **Interior & Fit-out only** in v1 | scope control |
| D13 | PDFs | dompdf (pure PHP) | works on shared hosting |
| D14 | Payments | one PSP interface; manual + **PayFast/Safepay** adapter first | Pakistan |

## 3. Repositories, branches, environments (answer to "new repo for staging?")
**Yes — create a fresh repo. Do not mix it with the old one.**
| Why | Detail |
|---|---|
| Safety | the old repo **is** the live site (+ Netlify/Vercel config). A deploy workflow there could overwrite it |
| Clean history/CI | Laravel at repo root, one pipeline, no `platform/` prefix, no 86 static pages in the way |
| Secrets | deploy keys only on the new repo |

| Item | Value |
|---|---|
| New repo | `marketingwoodex-cloud/woodex-platform` (private) |
| Old repo | `-marketingwoodex` → **unchanged**: reference + migration source. Optionally rename later to `woodex-site-legacy` |
| Branches | `main` = production (protected, deploy by **manual run of a tag**) · `develop` = **staging (auto-deploy)** · short `feature/*` branches via PR |
| Staging | `https://staging.woodex.com.pk` → Hostinger Business, folder `~/apps/staging` · own Supabase project · noindex + password |
| Production (later) | `app.woodex.com.pk` (dashboard) + client domains via Cloudflare · own Supabase project (Pro) · `~/apps/production` or VPS |
| Live site | `woodex.com.pk` keeps running untouched until the Phase-6 cut-over |
| Docs | copy `docs/headless/` into the new repo as `docs/` on day 1 |

## 4. Hosting facts and the Phase-0 gate
### 4.1 Your Hostinger Business plan (from public sources, July 2026)
50 websites · 50 GB NVMe · SSH + Git · unlimited cron · daily backups · **60 PHP workers** · **600,000 inodes** ([WPShout](https://wpshout.com/hostinger-review/)). One review lists **2 burstable cores, 1.5 GB RAM, 30 entry processes, 2 MB/s disk I/O** ([thatmy.com](https://thatmy.com/hostinger-resource-limits-explained)). I did not measure these.
**Meaning:** fine for **staging and the Woodex pilot**; **not** for many busy client sites → plan a VPS before onboarding agencies. No queue daemons (use cron).

### 4.2 Probe gate (half a day, you run `bootstrap/probe-hostinger.sh`)
Two things **I could not verify by search** and which can break the stack: **(a)** the PHP `pdo_pgsql` extension on Hostinger, **(b)** outbound connection from Hostinger to the Supabase pooler (port 5432) and its latency.
| Probe result | Decision |
|---|---|
| PHP 8.3 ✔ · `pdo_pgsql` ✔ · Supabase reachable, latency < ~120 ms · symlink ✔ | **Plan as written** (Supabase + Hostinger) |
| `public_html` symlink blocked, rest ✔ | copy `public/` into the subdomain folder and edit `index.php` paths (deploy script does it) |
| `pdo_pgsql` missing or Supabase blocked/slow | **Hostinger VPS KVM 1–2 (~$7–15/mo)** with local Postgres → faster and no Supabase pause. *(v3's "run on Hostinger MySQL" fallback is withdrawn: CI would test Postgres/RLS while staging ran MySQL — two behaviours.)* |
| No SSH | not applicable (you have it) |
**Pick the Hostinger data centre / Supabase region close to each other** (e.g., Singapore); each query pays the network round trip.
**Never** use the Hostinger Git button or the `.htaccess`-in-`public_html` method for production (reasons: v3.1 §2.1).

## 5. Architecture
```
GitHub (develop / tags) ──Actions: test (Postgres+Pest) → build → ssh → release.sh──▶ Hostinger
Browser ── Cloudflare (DNS, TLS, cache, custom hostnames) ──▶ Laravel 12
   /app      TailAdmin shell (agency + site dashboards)       /builder  Puck island (Vite)
   /api/v1   admin API (Sanctum) + /delivery (public keys)     /console  Filament (staff)
   published HTML + theme.css (Cloudflare caches, purge on publish)
Data: Postgres (RLS) · R2 (media, db backups) · cron every minute: schedule:run → DB queue
```
Server layout: `~/apps/<env>/{incoming, releases/<id>, shared/{.env,storage}, current → releases/<id>}` and the web folder → `current/public`.

## 6. Multi-tenancy and security (rules, not options)
- **Agency → Site.** `agency_id` + `site_id` on every business table; Eloquent global scope **plus** Postgres RLS (`FORCE`, non-owner DB role, `set_config('app.site_id')` per request on the **session** pooler, fail-closed, `WITH CHECK`).
- Relations create rows (`$site->pages()->create`), never mass-assigned `site_id`. Raw SQL only in a reviewed `Reporting` namespace.
- **Cross-tenant attack-matrix test** in CI (2 agencies × 2 sites; every endpoint). **0 leaks to merge.**
- Auth: Sanctum opaque tokens + TOTP; roles via spatie/permission (platform / agency / site scopes); audit log on every write.
- Public delivery uses **publishable `pk_` key** (origin-locked, read published only, forms) and server **`sk_` key** (preview tokens). Turnstile + rate limits + idempotency on lead forms; no PII echoed.
- Secrets only in `shared/.env`; per-site encryption for integration secrets; security headers; CSP report-only first.

## 7. Product scope for v1 (Interior & Fit-out)
| In v1 | After pilot |
|---|---|
| Agency→site tenancy, users/roles/audit, white-label basics | other verticals (Architecture, Solar…), vertical-pack framework |
| Builder: pages, versions, review/publish, 12 widgets, theme tokens, mega-menus, starters | React/Vue/Nuxt renderer kits (API already works for them) |
| Media library (R2), SEO tools (meta, sitemap, redirects, JSON-LD) | inventory, finance ledger, logistics, support desk, chat |
| Forms → CRM leads, quotes, invoices, payments (manual + 1 PSP), PDFs, WhatsApp/email alerts (ported from P15) | marketplace, reseller billing, multi-region |
| Bookings-lite calendar, client roles + approval, custom domains | AI hub / MCP |
| Woodex data migration + 86 pages → blocks + 301 parity | |

## 8. API (summary; details v1 §5, v3.1 §3)
- `/api/v1` admin API (Sanctum) with OpenAPI from Scramble; `GET /me`, `GET /me/navigation` (feeds TailAdmin sidebar).
- **Delivery (any frontend):** `GET /delivery/theme` + `theme.css?v=hash` · `GET /delivery/pages/{slug}?include=layout` · `GET /delivery/menus/{location}` · `GET /delivery/widgets` · `GET /delivery/collections/{type}` · `POST /public/forms/{id}`.
- Conventions: `ETag`, `Cache-Control: s-maxage`, CORS allow-list per site, cursor pagination, uniform error object, rate limits.

## 9. Builder system (summary; details v3.1 §4–7)
- **Widget** = `widget.json` (JSON Schema) + Blade view + Puck editor config. Fields generated from the schema; snapshot tests keep editor and output equal. Platform-curated only (tenants cannot upload code). **12 widgets**: hero, rich-text, feature-grid, service-cards, process-steps, portfolio-grid, gallery, testimonials, faq, stats, cta-bar, contact-form (+ promo-banner for menus).
- **Data sources** are named, whitelisted collection queries resolved **server-side at publish** (no free URLs).
- **Theme tokens** `--wx-*`, validated (hex, font allow-list, radius range, WCAG contrast), delivered as hashed `theme.css`, inline critical vars only.
- **Menus** versioned JSON tree (depth ≤ 3, ≤ 100 nodes, links by page UID) with draft/publish, mega-menu columns and promo widget.
- **Starters** (A Minimal Portfolio, B Full Corporate, C Service Booking) applied by `SiteStarterService::apply()` → drafts only, one transaction, media copied, placeholders filled, report returned.
- Page data = Puck `Data` wrapped with `schema_version` (Puck's `zones` is being replaced by slots).

## 10. Data model (key tables; full list v1 §7.2)
`agencies, sites, site_domains, memberships(scope), users, roles/permissions, api_keys(pk/sk), pages, page_versions, widgets_registry, collections/items, media, themes(+versions), menus, menu_versions, starters, starter_applications, forms, form_submissions, leads, clients, quotes, quote_items, invoices, payments, bookings, projects, activity_log, jobs, publish_runs, webhooks`.
Rules: UUID keys, `site_id` + RLS on all, additive migrations, soft delete where legal, PII flagged.

## 11. Roadmap (ideal engineering days, ±30 %, 1 developer)
Start assumption: **Mon 12 Oct 2026**, no holidays. Dates are *not promises*.
| Phase | What you get | Days | Ends (approx) |
|---|---|---|---|
| **0 Setup & de-risk** | new repo, probe, **staging live via pipeline**, TailAdmin running, Supabase+RLS prototype, R2 upload test, Puck 10-block spike, rollback drill | **8** | 21 Oct |
| **1 Core** | agency/site tenancy, auth+TOTP, roles, audit, isolation test, `pk/sk` keys, delivery skeleton (theme/pages/menus/widgets), Scramble docs, Filament console | **9** | 3 Nov |
| **2 Woodex migration** | MySQL→Postgres ETL with reconciliation, 86 pages → blocks, media → R2, redirects/sitemap parity | **10** | 17 Nov |
| **3 Builder** | widget registry + 12 widgets, Puck island, theme tokens, mega-menu builder, starters, publish + Cloudflare purge, media library | **22** | 17 Dec |
| **4 CRM + sales** | leads, client timeline, quotes (A4 preview), invoices, payments, PDFs, notifications | **10** | 31 Dec |
| **5 Agency lite** | white-label, create site from starter, clone, client roles + approval, custom domains, bookings-lite | **6** | ~11 Jan |
| **6 Go-live** | backups + restore drill, secret rotation, monitoring, runbook, **cut-over**, gates G1–G9 | **6** | **~19–25 Jan 2027** |
| | **Total** | **71** | |
**Fast path (Phases 0 → 1 → 3 = 39 days):** multi-site builder with widgets, tokens, menus, starters and the pipeline. *(v3.1 said 33 — that was an arithmetic error; 8 + 9 + 22 = 39.)*
**Pro-forma money:** 71 days × the PRD's ≈ $143/day ≈ **$10.2k** (not a quote). Two developers from Phase 3 → ≈ 10–11 weeks.
**Weekly rhythm:** each phase ends with a demo on staging + your approval.

## 12. Launch gates (all green before cut-over)
G1 Isolation (attack matrix + manual test of 10 risky endpoints) · G2 Data parity (leads/clients/quotes/invoices/projects/users/pages/media = 100 %; number sequences kept) · G3 SEO parity (all 86 URLs 200/301, sitemap diff 0, canonical/hreflang) · G4 Performance (mobile PageSpeed ≥ 90, a11y ≥ 97 on 11 key pages) · G5 Security (secrets rotated, TLS A, headers, rate limits, restore drill, 2FA for owners) · G6 Payments (sandbox + 1 live small payment per PSP, webhook replay, refund) · G7 Ops (uptime alerts, logs, runbooks) · G8 Legal/content (privacy/terms/DPA, PSP agreements) · G9 Rollback (previous release + DB restore + DNS fallback rehearsed).
**Cut-over:** T-14 d freeze + backup + TTL 300 s → T-7 d dual-run → T-1 d final import + smoke tests (incl. Pakistani mobile) → T-0 switch origin, legacy stays as warm standby → T+24 h/7 d review → T+30 d archive legacy. **Rollback trigger:** error rate > 2 % for 10 min or data-integrity issue → point origin back (< 15 min).

## 13. Monthly cost (USD)
| Item | Now (staging/pilot) | After first paying client |
|---|---|---|
| Hostinger Business (already paid) | 0 extra | VPS KVM 2 ≈ 15 when needed |
| Supabase | 0 (Free, 2 projects: staging + prod) | **25** (Pro: backups, no pause) |
| Cloudflare / custom hostnames (first 100) | 0 | 0 |
| R2 (≤ 10 GB) | 0 | 0–5 |
| GitHub (private repo, Actions) | 0 (check minute quota) | 0 |
| TailAdmin, Puck, Filament, Laravel packages | 0 | 0 |
| **Total** | **≈ $0** | **≈ $25–45** |
Not included: PSP fees, WhatsApp usage, domain renewals.

## 14. Main risks
| Risk | Answer |
|---|---|
| `pdo_pgsql` missing / Supabase unreachable or slow from shared hosting | Phase-0 probe; VPS with local Postgres (§4.2) |
| Business plan CPU/RAM/I/O limits (shared) | staging + pilot only; Cloudflare cache; static output for Woodex; VPS before agencies |
| Supabase Free pauses after 7 idle days, 500 MB, no backups | staging only; our nightly dump → R2; Pro before first paying client |
| Cross-tenant data leak | RLS + scopes + attack-matrix CI gate; no raw SQL |
| Editor/output drift (React editor vs Blade) | schema-generated fields + snapshot tests |
| Puck format changes (`zones` → slots) | `schema_version` + loader migration; pin Puck version |
| Rollback restores code, not data | additive-only migrations; pre-migration backup |
| Scope creep to 20 verticals | §7 is the contract; additions = new phase |
| Estimate error (±30 %) | demo gates; fast path first |
| Staging accidentally public/indexed | password + noindex |

## 15. Who does what / next steps
**You (this week):**
1. Create repo `woodex-platform` (private) with branches `develop`, `main` → `bootstrap/README.md` Step 0.
2. Create the deploy SSH key and add the public key in hPanel → Step 1.
3. Run the probe and paste the SUMMARY → Step 2. (Give the Supabase **pooler host name** only — not the password.)
4. Create Supabase **staging** project (region near your Hostinger server), Cloudflare account/domain, R2 bucket. Keep keys private.
5. Tell me **who builds the React/Puck part** (I can) and the **PayFast/Safepay** status.

**Me (Phase 0, after the probe):** install TailAdmin Laravel in the new repo · add `release.sh` + workflow · first green deploy to `staging.woodex.com.pk` · RLS prototype + isolation test · R2 test · Puck spike · rollback drill · go/no-go report.
**How we connect to the new repo:** this chat session is tied to the old repo's branch. Open a **new session on `woodex-platform`** and give it this file; or send me the repo access in a new session. I will not push to any other branch here.

## 16. Document map
| File | Role now |
|---|---|
| **`MASTER-PLAN.md`** (this file) | **the plan** |
| `bootstrap/README.md`, `probe-hostinger.sh`, `release.sh`, `deploy-hostinger.yml` | server + pipeline kit |
| `MASTER-PLAN-V3.1-EXPANDED.md` | detail: API contract, widgets, tokens, menus, starters, deploy review |
| `MASTER-PLAN-V3-LEAN.md` | detail: free-module reuse map (TailAdmin, packages, adminlte list) |
| `MASTER-PLAN-AGENCY-V2.md` | detail: agency model, payments, global readiness |
| `MASTER-PLAN-HEADLESS.md` | detail: API conventions, page model, full DB design, roles, modules |
| `PRD-V3-REVIEW.md` | review of the external PRD |
