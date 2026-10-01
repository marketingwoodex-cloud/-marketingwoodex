# Review of PRD v3.0-FINAL ("OmniEngine OS") and recommended amendments

**Date:** 2026-10-02 · **Reviewer:** Arena agent · **Inputs:** PRD v3.0-FINAL (pasted in chat), `MASTER-PLAN-HEADLESS.md` (v1), `MASTER-PLAN-AGENCY-V2.md` (v2), web research (sources inline).

## 0. Verdict
**Approve the vision and Phase 0. Do not sign the $6,000 / 42-day plan as "complete agency-grade engine".**
The PRD adds three good ideas (Postgres RLS, vertical packs, a single commercial narrative) but the scope, schedule and budget do not match each other, several line items are invalid, and the stack is still undecided.

## 1. What to adopt from the PRD
| PRD idea | Why it is good | Condition |
|---|---|---|
| **Postgres Row-Level Security** as a second isolation layer | database-level safety net behind app-level scoping; cross-tenant leaks fail even if app code is wrong | follow the RLS rules in §3 |
| **Vertical packs** (20-industry matrix) | turns "build 20 products" into "configure 20 packs" — strong sales story | build as **data-driven packs**, not 20 coded modules (§4) |
| Puck JSON engine, theme tokens, R2, Cloudflare for SaaS, PSP router | match v2 | unchanged |
| CI failure on cross-tenant leak | matches v1/v2 attack-matrix test | keep |

## 2. Problems found

### 2.1 Scope vs time vs budget (critical)
| Item | PRD | Reality check |
|---|---|---|
| Phase 2: token engine + **20 vertical block libraries** + custom-domain routing | 15 days | < 1 day per vertical even if tokens and domains took zero time |
| Phase 1: relational migration + API + auth/RBAC + `/me /navigation /dashboards /widgets` | 12 days | v2 estimates ≈ 10 d platform core + ≈ 10 d Woodex migration/parity |
| Phase 3: WhatsApp + PDF + 2 PSP routes | 10 days | PSP merchant onboarding alone is typically days to weeks (v2 F5) |
| Total | **42 days, $6,000** (≈ $143/day: P0 $120, P1 $150, P2 ≈ $147, P3 $140) | v2's estimate for the **agency core only** is ≈ 132 days; the PRD also promises 20 vertical back-offices |
| Not in any phase | — | Woodex data + 86-page migration and SEO parity, agency→site hierarchy, publishing pipeline, approvals, Urdu/RTL, backups/restore, audit, observability, security testing, go-live runbook |
| Dates | Q4 2026 – Q1 2027 | feasible only for a trimmed MVP (§5) |
At the PRD's own day rate, v2's 132 days ≈ **$18–19k** before verticals. That is a pro-forma, not a quote — the point is the gap is ~3×, not a few percent.

### 2.2 Regulated and high-liability verticals
Healthcare (patient records, prescriptions, telehealth), Legal (trust accounting, case vault), Travel (passport vault), Education (certificates, fees), HR (candidate data) hold **sensitive personal or fiduciary data**. They need compliance review, stricter encryption/retention, audit and often legal sign-off. **Exclude from v1**; revisit after the platform is stable. (Legal and privacy-law requirements for Pakistan and target markets were *not* assessed here — counsel review needed.)

### 2.3 Stack is undecided and spans four vendors
PRD diagram: Vercel + Hostinger VPS + Supabase + Cloudflare. Unanswered: **where does the API run** (Supabase PostgREST/Edge Functions, or Node on the VPS)? Puppeteer PDFs need Node + Chromium on a server with enough RAM. Four vendors = four bills, four failure domains, four sets of credentials. Also the cost table says "VPS 2 (4 vCPU, 8 GB)" — Hostinger's KVM 2 is 2 vCPU / 8 GB ([bearhost](https://bearhost.com/blogs/hostinger-pricing)); 4 vCPU is KVM 4.

### 2.4 Invalid or incomplete line items
| Line | Issue | Source |
|---|---|---|
| **Vercel Hobby $0** | Hobby is **personal, non-commercial only**; client work/revenue needs **Pro $20 per developer seat** | [justinmckelvey.com](https://justinmckelvey.com/blog/is-vercel-free) · [livemy.app](https://livemy.app/blog/vercel-pricing) |
| **Supabase Free $0** | free projects **pause after 7 days of inactivity**, 500 MB DB — dev/staging only; production = Pro $25/org + usage (real bills $35–200) | [itpathsolutions](https://www.itpathsolutions.com/supabase-free-tier-limits) · [cloudzero](https://www.cloudzero.com/blog/supabase-pricing/) |
| **TailAdmin Pro** (no cost line, no licence check) | Starter and Business licences are **not valid for a SaaS end product**; SaaS with redistribution requires **Extended** (listed at $299, was $599) | [tailadmin.com/license](https://tailadmin.com/license) · [tailadmin.com/pricing](https://tailadmin.com/pricing) |
| **Vireo** (no cost line, no licence check) | exists as a premium 8-framework template (185+ pages, RTL) — I could **not find its licence terms** on the page I fetched | [vireo.jawad.work](https://vireo.jawad.work/) |
| Cloudflare for SaaS "100 free" | correct; then $0.10/hostname/month | [Cloudflare](https://blog.cloudflare.com/waf-for-saas/) |
| R2 free tier | correct (10 GB, zero egress); write ops $4.50/M beyond free | [mecanik.dev](https://mecanik.dev/en/posts/cloudflare-r2-pricing-explained-real-costs-vs-s3-and-backblaze/) |
| §7 last bullet | text is **cut off** ("Submit merchant registration documents for local …") | — |
Using two admin kits (TailAdmin Pro **and** Vireo) also means two design systems; choose one primary (and check its licence covers multi-tenant/white-label redistribution).

### 2.5 Internal contradictions
- "Zero front-end code duplication" but two client frontends (**Next.js** and **static HTML/Alpine**) = **two renderers** to build and keep in sync.
- "Zero HTML blobs, pages render dynamically on client frontends" vs the P15 result of **mobile PageSpeed 91–97**: client-side rendering would regress SEO and speed. Requirement should be: **published pages are pre-rendered HTML (SSG/SSR or build-time publisher); JSON is the source, not the delivery format.**
- Single `tenant_id` — but the stated customer is an **agency with many client workspaces** (agency → site). Needs `agency_id` + `site_id`, and RLS policies that let agency staff span their sites.

## 3. RLS rules to write into the PRD (from research)
1. Set tenant context with **`set_config('app.site_id', $1, true)` / `SET LOCAL` inside the request transaction** — never plain `SET`. With a transaction-mode pooler (PgBouncer, **Supabase Supavisor transaction mode**) session-level settings can leak to another client = cross-tenant read ([mydba.dev](https://mydba.dev/blog/postgres-row-level-security-guide), [chat2db](https://chat2db.ai/resources/blog/postgres-session-settings-and-set-config)).
2. `ALTER TABLE … ENABLE` **and `FORCE`** ROW LEVEL SECURITY; app connects as a **non-owner, non-superuser** role, or policies are silently bypassed ([rivestack](https://rivestack.io/blog/postgresql-row-level-security)).
3. Policy: `USING (site_id = NULLIF(current_setting('app.site_id', true), '')::uuid) WITH CHECK (…same…)` so "no tenant" returns **zero rows** (fail closed). The PRD snippet omits `missing_ok`, `WITH CHECK`, and `FORCE`.
4. Index `(site_id, …)` on every table; run migrations/cron under an explicit admin role, not by disabling RLS.
5. RLS protects a trusted app tier; it is **not** a defence against an attacker with raw SQL on the app role — keep the app-level scoping and SQL-injection controls too.
6. Agency scope: second GUC `app.agency_id` + policy `site_id IN (SELECT id FROM sites WHERE agency_id = …)` for agency staff roles.

## 4. Vertical packs: how to deliver 20 without building 20 products
A **pack** = versioned JSON/SQL seed bundle: block set + page templates + theme tokens + custom fields + pipeline stages + document templates (quote/invoice/job card) + automation rules + dashboard layout + sample content.
- Framework once (≈ 8–10 d est.): pack schema, installer (idempotent, diff-and-apply), pack versioning, per-site custom-field engine, document-template engine.
- Each additional pack = mostly **content/config** (≈ 2–4 d est. each) — *if* the framework exists. Work that needs real code (POS, KDS, LMS, ATS) is **separate modules, not packs**.
- Classify the 20:

| Class | Verticals (PRD #) | v1? |
|---|---|---|
| **A. Quote → project → invoice** (reuses Woodex engine) | 1 Interior, 2 Architecture/Construction, 16 Solar, 14 Event planning, 5 Advertising | **Yes — start with 1, 2, 16** |
| **B. Booking + catalogue** | 11 Hospitality (menu/booking only), 17 Beauty, 18 Gym (booking/dues only), 8 Rental | v2 after bookings module |
| **C. Needs new engines** | 6 E-commerce/POS, 4 Printing job queue, 13 Logistics, 3 Real estate listings, 7 SaaS billing | later, each its own module |
| **D. Regulated / sensitive data** | 10 Healthcare, 12 Legal, 9 Education, 15 HR, 19 Travel, 20 NGO (donor tax receipts) | **not v1** — compliance first |

## 5. Recommended re-baseline (replaces PRD §5–§6)
**Product = Foundation MVP + 3 packs**, delivered on v2's phase structure with the PRD's good ideas merged:

| Phase | Scope | Est. days |
|---|---|---|
| 0 | Spikes: **RLS + pooler**, Puck round-trip (10 real blocks), R2 pre-signed upload + renditions, custom hostname flow, PSP sandbox, API runtime decision; PSP applications filed | 10–12 |
| 1 | Platform core (agency→site tenancy, auth/RBAC, RLS, audit, API keys, OpenAPI, `/me /navigation /dashboards /widgets`) | 10 |
| 2 | Woodex migration & parity (MySQL→Postgres, JSON blobs→relational, 86 pages→blocks, SEO parity) | 10–12 |
| 3 | Builder + publisher (pre-rendered HTML) + theme tokens + custom domains + agency white-label | 18 |
| 4 | Agency workflow (approvals, snapshots, templates) + **vertical-pack framework** + packs 1, 2, 16 | 18 |
| 5 | Billing: PKR (PayFast/Safepay) + manual, PDFs (Puppeteer queue), WhatsApp webhooks | 12 |
| 6 | Hardening + go-live (isolation tests, backups/restore drill, load, runbooks) | 8 |
| | **Total** | **≈ 86–92 days** (est., ±30 %) |
Later (own budgets): intl billing (Paddle/LS), packs 4–15 (class A/B first), new engines (class C), regulated verticals (class D) after compliance review.
**Calendar:** ≈ 4.5 months for one dev, ≈ 3 months with two from Phase 3 → release **Q1 2027** (not Q4 2026). Budget is a commercial matter; at the PRD's own ≈ $143/day this is ≈ $12–13k — pro-forma only.

## 6. Decisions needed (sign-off table)
| # | Decision | My recommendation |
|---|---|---|
| 1 | API runtime + DB | Pick **one** runtime. If the builder/admin developers are React/TypeScript: **TypeScript API (NestJS/Fastify) + PostgreSQL + RLS** (one language for schemas, SDK, renderers, Puppeteer). If the maintainer is PHP-only: Laravel + MySQL (v2) and keep app-level scoping. *(This revises v2 D-2, which favoured Laravel; the PRD's all-TypeScript front end and RLS tilt it, and P15 logic is being rewritten anyway.)* Decide in Phase 0 by who will own the code |
| 2 | Postgres hosting | Supabase **as managed Postgres only**, **Pro** plan (not Free) — or self-host on the VPS and pay for backups/ops yourself. Do **not** let browsers call PostgREST directly for agency/site hierarchy |
| 3 | Frontends | Admin/builder = Next.js on VPS or Cloudflare; **client sites = pre-rendered output on R2/CDN** (one publisher), not per-site Vercel projects. If Vercel is used: **Pro seats**, not Hobby |
| 4 | Admin UI kit | **One** kit. Buy **TailAdmin Extended** only if you need its Pro screens; verify Vireo licence terms in writing first; otherwise Flowbite/free TailAdmin (MIT) |
| 5 | Verticals in v1 | Packs 1 Interior, 2 Architecture/Construction, 16 Solar; no class D |
| 6 | Phase 0 | Approve **Phase 0 only**, widened to 10–12 days; re-quote Phases 1–6 after spike results |
| 7 | PSP | File PayFast + Safepay merchant applications now (needs business-registration documents) |

## 7. Corrected infrastructure cost (indicative, USD/month)
| Component | Range | Note |
|---|---|---|
| VPS KVM 2 (budget at renewal) | 9–15 | 2 vCPU / 8 GB |
| Managed Postgres (Supabase Pro) | 25–75 | $25 base + compute/egress; or $0 extra if self-hosted on VPS |
| Vercel Pro (only if used) | 20 per dev seat | Hobby is non-commercial |
| Cloudflare + SaaS hostnames | 0 (≤ 100), then $0.10 each | |
| R2 | 0–5 | |
| One-time: TailAdmin Extended | $299 (if needed) | licence check |
| **Total** | **≈ $35–115** (self-hosted DB, no Vercel: ≈ $10–25) | excludes PSP fees, WhatsApp usage, domains |
