# Woodex: Phase 17 master plan (for review before building)

Base: `deploy/p16/woodex-live-p16-full.zip`. Rule kept from P16: **improve existing modules, don't rewrite them; never overwrite live data.**

## Decisions (you skipped the questions, so these are the recommended defaults; change any)
| # | Question | Default |
|---|---|---|
| D1 | Login `marketing.woodex@gmail.com` | Auto-created **only if that email doesn't exist**, stored hashed, **must change password on first sign-in**. Never overwrites users. |
| D2 | Build order | **Sales system first** (S), then Content (C) |
| D3 | Quotation / invoice design | Build the builder system now; apply **your** templates when you send them |
| D4 | Booking | **Website booking + admin calendar** (site visit / consultation slots) |
| D5 | WhatsApp automation | **One-click prepared messages** by default; a per-type switch to make any type automatic once Cloud API templates are approved |
| D6 | Delivery | Plan → build in parts → you review each → **one final tested zip** |

---

## Architecture: one master data model (the "single source of truth")
Every sales screen reads and writes the same records, so nothing gets out of sync.

```
Contact/Client (master) ──< Enquiry/Lead ──< Activity (calls, WA, notes, follow-ups, visits)
        │                        │
        │                        └──> Booking (site visit / consultation)
        ├──< Quotation (versions) ──> Invoice ──< Payment (schedule + received)
        ├──< Project (stages, photos, client updates) 
        └──< Messages (WhatsApp / email log, offers, reminders)
```
- **Client master** = one record per person/company (dedupe by phone/email). New vs returning is calculated automatically.
- **Timeline** on every client: all leads, quotes, invoices, payments, projects, messages and bookings in date order.
- **Automation engine** (rules + daily cron): "when X happens / is due → prepare message or task". Handles follow-ups, quote expiry, payment due/overdue, project stage updates, booking reminders.
- **Sync rule:** a change in one place updates the others. For example, quote approved → lead stage "Won" → client type "Active" → project created → invoice draft.
- Built on the existing tables (`wx_leads`, `wx_clients`, `wx_quotes`, `wx_invoices`, `wx_projects`), with safe migrations (only add columns or tables; no data loss).

---

## Part S: Sales system (built first)

**S1 Master client database**
- Fields: client type (individual / company / developer / architect), source, city, tags, lifetime value, balance due, first and last project.
- New / returning / active / past status worked out automatically.
- Merge duplicates. Import / export CSV (existing old clients).
- **Client 360 page:** summary cards + timeline + tabs (Leads · Quotes · Invoices · Payments · Projects · Messages · Files).

**S2 Enquiries & leads**
- New fields: **lead type** (new / returning / referral), **project type** (kitchen, office, full home, renovation…), budget range, area (sq ft), city, timeline, priority.
- **Follow-up system:** next follow-up date and time, type (call / WhatsApp / visit), outcome, notes. Edit and reschedule. A "Today / Overdue / Upcoming" list.
- Activity log per lead. One-click "Convert to client + quote".

**S3 Booking system**
- Website form: pick a service, date and free slot → creates a lead + booking and sends WhatsApp/email confirmation.
- Admin calendar (day / week / month), working hours, blocked days, staff assignment, reminders the day before.

**S4 Pipeline**
- Board with drag-and-drop stages (New → Contacted → Site visit → Quote sent → Negotiation → Won / Lost).
- Value per column, probability-weighted forecast, stuck-deal warning (no activity for X days), lost reason.

**S5 Quotations**
- Quotation builder: **sidebar live preview**, sections on/off (cover, scope, BOQ items, payment terms, timeline, terms, signature), item library, options A/B.
- **Template import / export (JSON)**, versioning.
- *Visual redesign waits for your templates (D3).*

**S6 Invoices**
- **New invoice** directly (not only from a quote).
- Payment schedule (advance / stages / final), partial payments, receipts, credit notes, overdue tracking.
- Same number as the quote (WI-10100 rule kept).

**S7 Projects + Client updates**
- Projects linked to the client and the quote. Stages, budget vs paid, photos.
- **Client updates** pull the client's phone and email from the master record. Key-step messages (EN + UR) as before, plus a payment-due step.

**S8 WhatsApp offers + automation**
- Offers target segments (new leads, past clients, quote-not-approved, by city or project type).
- Automation rules list with on/off switches (one-click vs automatic, D5).
- Daily "To send" queue.

**S9 Sales dashboard**
- Funnel (enquiry → lead → quote → won), revenue invoiced vs collected, receivables ageing, follow-ups due, bookings today, top sources, win rate.

**S10 Inbox**
- Link each chat to its client.
- Contact panel shows client history and open quotes / invoices. "Create booking" and "Create quote" from a chat.

## Part C: Content system (after S)

**C1 Section library import**
- Import HTML / JSON / zip.
- **Pick sections from any HTML page** (paste a URL or HTML → click the sections to keep → convert to Woodex blocks).
- Category + tags; preview before saving.

**C2 New-section designer**
- Create a section in the builder from library parts.
- Category and tags below the HTML.
- It appears in the Sections tab immediately (no reload).

**C3 Header & footer builder**
- Colour options (background, text, accent, sticky / transparent).
- Layout presets, logo size, menu / CTA / phone blocks.
- Import / export; updates all pages (rule kept).

**C4–C6 Article, portfolio and city templates**
- One template system for all three:
  - Customise sections (add / remove / reorder).
  - Several templates per type.
  - Import / export.
  - Apply a template to new **and existing** pages (with preview + backup).
  - The AI agent (MCP) can create and update new and old items.
- **C6 also fixes the City pages list showing no pages** (root cause first: the builder connection / page-type detection).

**C7 FAQ groups**
- Reuse one group on many pages ("used on" list).
- Duplicate a group to change it for one page.
- Sync edits to every page that uses it.

**C8 Testimonials**
- A testimonials manager (name, project, city, rating, photo, text).
- **5 testimonial block designs** that pull from it.

**C9 Media library** (TailAdmin "images" reference)
- Grid / list views, folders, drag-drop upload, multi-select bulk actions.
- Filters (type, size, unused), image details panel (alt, size, usage), crop / resize, copy URL.

## Order and review points
S1+S2 → review → S3+S4 → review → S5+S6 (+ your templates) → review → S7–S10 → review → C1–C3 → review → C4–C7 → review → C8–C9 → full audit (like 3.9) → **final zip** `deploy/p17/woodex-live-p17-full.zip` + README + CHANGES.

## What I need from you
1. **Your quotation and invoice templates** (PDF / images / Word) for S5 and S6.
2. Your **project types** list and **lead sources** if different from: kitchen, wardrobe, full home, office, retail, restaurant, clinic, renovation, architecture, 3D.
3. Booking: working days and hours, visit length, and which areas you visit.
4. Old clients file (Excel / CSV) if you want them imported.
