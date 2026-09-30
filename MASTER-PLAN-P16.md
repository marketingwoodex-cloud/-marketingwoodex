# Woodex Admin — Master Plan P16 (Advanced features + bug fixing)

**Rules:** baseline = `deploy/p15/woodex-live-p15-full.zip` (live). Improve existing modules — never rewrite/overwrite working code.
Work only in `frontend-v1/`. Every phase: QA on preview → FULL zip in `deploy/p16/` + plain-English upload steps → user review.

---

## Phase 1 — Baseline + foundation (from p15 full zip)
- [x] Confirm `frontend-v1` = p15 full zip + small additions only
- [x] System check screen (PHP, extensions, DB, `_private`, SSL, sign-in, builder token reason)
- [x] Page-builder sign-in fix (no builder-password dependency, admin-token fallback, reason shown)
- [x] SSL fix: bundled `api/cacert.pem` used by every outgoing call (AI, Google, WhatsApp, PageSpeed)
- [x] Clear error toasts instead of silent failures / endless "Loading…"
- [ ] **User:** upload step-1 zip, send System check screenshot (all ✓) — confirms bugs 5, 7, 8, 11, 12, 13 root causes

## Phase 2 — Fix the 13 reported bugs (deep QA per module)
- [x] 1  Test-AI: readable chat bubbles (font, contrast, size, dark/light), copy button
- [x] 2  Bulk create cities: "Copy from" list loads; error + Retry if empty
- [x] 3  Service & site pages list loads (builder API) with search
- [x] 4  FAQ groups: explain purpose on screen + sample groups (Renovation, Pricing, Cities) + where each shows on site
- [x] 5  Page builder: runtime page view, new page create + save, Layers, Theme panel; **50 v26 templates in Sections tab**
- [ ] 6  Dashboard: live CRM, quotation, invoice data (not only website) — done in Phase 3 dashboard
- [x] 7  Section library: loads, v26 templates (50), save own sections
- [x] 8  Blog: AI writer works (SSL fixed); **AI model auto-list from provider API**; empty-state help
- [x] 9  Integrations: reorganised (see Phase 3); WhatsApp change/reconnect number + discount offers to leads
- [x] 10 Google (free): Sign-in with Google + Analytics 4 + Search Console data on dashboard
- [x] 11 Speed test works (PageSpeed via SSL fix; key optional; clear error)
- [x] 12 Health check works (links, SSL, DB, disk, backups)
- [x] 13 Header/footer editor loads + saves (auto-updates all pages)
- [ ] QA script: every admin route, zero JS errors / failed APIs / stuck loaders → full zip

## Phase 3 — Advanced UI/UX + features
**Sidebar (TailAdmin style)** — headings + dropdowns, collapse to icons, Ctrl+K search, dark mode
- MENU: Dashboard
- SALES: Enquiries/Pipeline · Clients · Quotations · Invoices · Projects
- SUPPORT: Inbox (Chat + WhatsApp) · Updates to clients
- WEBSITE: Pages & Builder · Section library · Header/Footer · Blog · Projects gallery · Cities · Services · FAQ · Media
- MARKETING: SEO · Speed · Google (Analytics/Search Console)
- AI: AI Assistant · Training · AI Settings
- SETTINGS: Integrations · API keys · Users (All/Profile/Activity) · Company · Security · System check · Backups

**Smart dashboard** (TailAdmin layout, live data)
- [ ] KPI cards: new leads, pipeline value, quotes sent, invoices paid/unpaid (PKR) + % vs last period
- [ ] Statistics chart tabs: Overview = visitors vs leads · Sales = quotes sent vs won · Revenue = invoiced vs paid; date range
- [ ] Monthly target meter (editable target)
- [ ] Recent enquiries table, pipeline funnel, leads by city, overdue invoices, today's follow-ups
- [ ] Website strip: visitors, speed score, SEO score, open chats

**Integrations (card grid)** — logo, status, Connect / Settings / Disconnect, Test button
- [ ] Google, WhatsApp Cloud API, AI providers, Email (SMTP), Turnstile, PageSpeed, Maps
- [ ] API keys table: masked, enable toggle, Test, Edit, Regenerate (MCP tokens)
- [x] **Local AI endpoint** (9router / OmniRoute): OpenAI-compatible base URL (public tunnel URL) + key; auto model list

**Inbox (Flowbite chat style)** — contacts left · thread middle · lead/CRM panel right; website chat + WhatsApp; AI/team takeover; send quote/offer

**Users** — All users · Profile · Activity feed

- [ ] Full go-live QA → FULL zip `deploy/p16/woodex-live-p16-full.zip`

## Delivery
Full zip per phase. Upload → Extract → Overwrite → Ctrl+F5 → System check.
