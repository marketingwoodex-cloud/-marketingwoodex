# WOODEX — Backend Master Plan

**Version:** 1.0 · **Date:** 2026-09-29 · **Status:** awaiting approval (phase gates)
**Relationship:** extends `MASTER-PLAN.md` (Phases 0–6). Phase 0, 1, 2 are delivered;
this plan governs the **backend/module build-out** that follows, in build order.

---

## 0. Current State (what is live vs planned)

| Module | State |
|---|---|
| Dashboard home (KPIs, analytics, widgets) | ✅ live |
| Page Builder + typed blocks (87 pages converted) | ✅ live |
| Save draft → Publish → GitHub → live | ✅ live (tested end-to-end) |
| Enquiries (CRM list) | ✅ live |
| Reports (range, KPIs, chart, CSV) | ✅ live (fills after Supabase migration) |
| Pages **management** (add/import/status/SEO) | 🔲 B1 |
| Live Chat, Header/Footer/Global Sections, Galleries, Image Optimization, Schema, WhatsApp module, Integrations, Reports automation | 🔲 placeholders (Coming-soon view) |
| Runtime backup import/export | 🔲 B3 |
| AI/provider integrations in Settings | 🔲 B4 |

**Pages vs Visual Builder (today):** both open the same combined editor screen.
**B1 splits them:** *Pages* = management of all 87 pages (list, add, import, status,
SEO, duplicate, delete-with-redirect); *Visual Builder* = the section editor.

---

## Decisions required (approval gate 0)

- **D6 — WhatsApp number.** Site currently uses **+92 322 4000768** (wa.me/923224000768,
  230 occurrences). Requested number was **+92 322 4200768**. Confirm which is correct
  before any global replace (one digit differs: 4000768 vs 4200768).
- **D7 — WhatsApp scope.** Original D2 was “wa.me only”. B2 proposes adding Meta
  Cloud API for **outbound notifications** (new enquiry → WhatsApp alert to admin,
  quotation sent → client ping). wa.me remains the customer-facing click-to-chat.
- **D8 — AI integrations.** B4 connectors: **Claude (Anthropic)**, **Codex/OpenAI**,
  **Hermes** — used for content drafts, meta descriptions, reply suggestions.
  Confirm providers + that API keys are customer-supplied (stored server-side only).

---

## B1 — Page Management System (87 pages) · *priority*

**Goal:** Pages becomes the control room for every page; Visual Builder is the editor.

### Deliverables
1. **Pages list view** (`view-pages`, `cms-pages?action=list` v2)
   - All 87 pages: title, slug, type (service/location/insight/project/…), status
     (Published / Draft-changes-pending), SEO score (title+desc+canonical+OG present),
     sections count, last published (GitHub commit time), open-editor / view-live links.
   - Search box + status filter + type filter; sortable columns.
2. **Add Page wizard** (blueprint §4): Step 1 type → Step 2 template donor →
   Step 3 content (title/slug/hero placeholder) → Step 4 SEO → Step 5 Preview → Publish.
   Backend: `cms-pages?action=create` (exists) extended with `template` presets.
3. **Page import system**
   - `cms-pages?action=import&slug=` — re-split a live page into blocks+meta
     (promotes `tools/blocks-convert.py` logic to a server module `_page-split.mjs`
     shared with the offline tool; identity validation required before overwrite).
   - Import external HTML: paste/upload HTML → validate (main-element required,
     scripts allowed but sandboxed to same-origin assets) → register page.
   - “Re-sync from live” per page (discard local drafts, rebuild from current HTML).
4. **Page actions:** duplicate (new slug + donor copy), archive (hide from sitemap,
   keep file), delete with redirect (exists — surfaced in list UI).
5. **Visual Builder entry:** editor deep-link `?page=/slug/` opens straight into the
   builder; sidebar Visual Builder = “resume last edited”.

### API
`GET list|get` · `POST save|publish|create|import|resync|duplicate|archive|delete`

### Acceptance gate (B1)
- 87 pages listed with correct status/SEO columns; search+filters work.
- Wizard creates a page end-to-end (draft → preview → publish → live URL).
- Import of a live page reproduces it byte-identical (identity check) before any edit.
- Duplicate produces an independent page; delete inserts redirect row.

---

## B2 — WhatsApp API (number per D6/D7)

### Deliverables
1. **Settings → WhatsApp**: number, greeting text, off-hours message, admin notify
   toggle. Single source of truth (blueprint §23) — header, footer, floating button,
   contact page all read it (replace the 230 hardcoded occurrences with
   `assets/js/site-config.js` values, published via `cms-settings`).
2. **wa.me click-to-chat** everywhere (already present; re-pointed from settings).
3. **Cloud API outbound (if D7 approved):** `netlify/functions/whatsapp-send.mjs`
   — server-side Graph API call (token env `WHATSAPP_TOKEN`, phone id env),
   used by: new-enquiry admin alert, quotation-approved notification.
   Template messages only (Meta policy), rate-limit + idempotency key.
4. **Inbound (phase 2 of B2):** webhook endpoint `whatsapp-webhook.mjs` → creates/updates
   enquiry in CRM with source=whatsapp. Verify HMAC (`X-Hub-Signature-256`).

### Acceptance gate (B2)
- Number editable in Settings → updates all site touchpoints after publish.
- Test alert: create enquiry → admin WhatsApp received (or toggle off gracefully).
- Webhook (if enabled) creates a CRM row; invalid signatures rejected.

---

## B3 — Runtime Backup / Import / Export

**Goal:** never depend on manual exports; any point-in-time restore.

### Deliverables
1. **Export** (`cms-backup?action=export&scope=all|cms|content|media`)
   - JSON dump of all CMS tables (Supabase REST), `content/pages/**` (drafts),
     vercel.json redirects, settings row; media **manifest** (URLs+metadata).
   - Streams as single `.json` (or zip when media binary included) download.
2. **Scheduled GitHub backup:** nightly GitHub Action-free design — a `backup` job
   in `cms-backup?action=snapshot` committing `backups/YYYY-MM-DD.json` to a
   `backups` branch (keeps 14 days, oldest pruned).
3. **Import / restore** (`cms-backup?action=import`)
   - Upload JSON → schema validation → **dry-run diff preview** (what would change)
     → confirmed apply; every import writes an audit-trail entry.
4. UI: improve existing **Backups** view — snapshot list, Download, Restore,
   Export-now, Last-backup status on System Health.

### Acceptance gate (B3)
- Export downloads a valid JSON that passes `import --dry-run` with 0 errors.
- Snapshot branch shows dated commits; retention prunes at 14.
- Restore of a dry-run-tested file reproduces CMS rows (tested on a sandbox page).

---

## B4 — Integrations Hub (Settings → Integrations)

**Goal:** one place to connect AI + business services; keys server-side only.

### Deliverables
1. **Integration model** (table `integrations`): provider, name, api_key_enc,
   config jsonb, enabled, updated_by, updated_at. Key write-only from UI
   (never returned; masked `••••1234` display), service-role only on server.
2. **Providers (initial):**
   - **Claude (Anthropic)** — content drafts, FAQ generation, reply suggestions.
   - **Codex (OpenAI)** — same surfaces, alternate provider.
   - **Hermes** — same surfaces.
   - **Resend** (D5) — quotation/invoice email sending (already planned Phase 4).
   - **GitHub / Vercel / Supabase** — status cards (read-only health, §27).
3. **AI endpoints:** `cms-ai?action=generate` {surface: meta|blog-outline|faq|reply}
   → provider-agnostic adapter (`_ai.mjs`) with provider selected from enabled
   integrations; prompt templates stored in settings; output lands in editor
   fields (never auto-published).
4. **Webhooks out:** `integrations` config supports generic webhook URL +
   event list (enquiry.created, quotation.sent, page.published) → HMAC-signed POST.
5. **Connection test button** per provider (real ping, clear error).

### Acceptance gate (B4)
- Save key → test → green; key never visible again in any response.
- One AI surface (meta description) generates into the Pages SEO form end-to-end.
- Webhook fires on enquiry.created with valid signature (verified by test receiver).

---

## B5 — Blueprint modules (build order)

| # | Module | Notes |
|---|---|---|
| B5.1 | **Live Chat** (D2) | Supabase Realtime: visitor widget (site) + admin inbox (dashboard), offline → WhatsApp fallback. New: `chat_channels/messages` tables (add to migration), `cms-chat.mjs`. |
| B5.2 | **Header & Navigation builder** | Controls per blueprint §8; writes header include used by publish pipeline. |
| B5.3 | **Footer editor** | Same pattern; global footer section. |
| B5.4 | **Global Sections** | Reusable CTA/banner sections referenced by pages (block type `global_ref`, resolved at publish). |
| B5.5 | **Galleries + Image Optimization** | Media folders/albums; sharp/AVIF pipeline via `cms-media` extension + nightly optimize job (ties to Phase 0 image work). |
| B5.6 | **Schema manager** | Per-page JSON-LD types (FAQ, Service, LocalBusiness, Article) rendered into `<head>` at publish; validation on save. |
| B5.7 | **Activity** | Activity feed view from audit_trail (§28) with filters. |

Each module = its own approval gate (build → preview → “done ✅” → next).

---

## B6 — Backend hardening (continuous, parallel)

1. **API envelope:** consistent `{ok|error, data}` + machine error codes; retrofit
   new modules first, legacy endpoints on touch.
2. **Rate limiting:** IP+route buckets for public endpoints (enquiry-submit,
   analytics-track, whatsapp-webhook) — in-memory now, Supabase-backed later.
3. **Audit coverage:** every mutation in new modules writes `audit_trail`
   (who, what, diff summary).
4. **Secrets hygiene:** all keys in Vercel env or `integrations` table — never in
   repo; rotation checklist (exposed chat credentials from setup are on it —
   rotate Supabase + Vercel + GitHub PAT after go-live).
5. **CI smoke suite:** script `tools/smoke.mjs` — syntax checks, 86-page render
   identity, block identity, nav/TITLE integrity (the validators used in Phases
   1–2) runnable in one command; wire to a GitHub Action on push.
6. **Health enrichment:** System Health adds CMS API, Media, Publishing, Migrations
   rows (§27) fed by `cms-health` real checks.
7. **Sitemap automation:** regenerated on every publish (add to publish pipeline).

---

## Suggested build order & gates

```
D6/D7/D8 confirm ──► B1 Pages management ──► B3 Backup/Export ──► B4 Integrations
                            │                                        ▲
                            └──► B2 WhatsApp (D7) ───────────────────┤
        B5.1 Live Chat (can run parallel with B1)                    │
        B5.2–B5.7 after B1 (all touch publish pipeline)    B6 continuous
```

- **Gate rule (unchanged):** each B-phase ends with your test on the preview +
  “done ✅” before the next starts. Deployment to Vercel stays the final step
  after your overall approval.

## Go-live linkage (from MASTER-PLAN)

Renames/keeps: media metadata columns, project publishing columns, `cms_users`,
role testing, test publish, settings publish, desktop/mobile dashboard test,
public page tests, **credential rotation**, final acceptance — executed with B3
(backup safety net in place first) immediately before cutover.
