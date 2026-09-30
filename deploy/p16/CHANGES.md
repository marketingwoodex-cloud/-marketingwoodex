# Phase 16: what changed (final package)

Base: the Phase 15 full package. Existing modules were improved, not rewritten.

## Step 1–2: fixes for your 13 reported problems
- Test-AI replies are readable; the AI model list loads automatically from your provider; the SSL error in Blog AI is fixed (bundled certificates).
- Bulk cities "Copy from" is filled in; service pages show; FAQ groups are explained on screen.
- Page builder: new page, save, layers and theme work; the 50 v26 templates are in the Sections tab; the section library no longer gets stuck.
- Health check and speed test work; the Header & footer page no longer says "Not signed in".
- Integrations are reorganised; WhatsApp live chat is in the CRM; Google sign-in plus Analytics plus Search Console (free, service account).
- New **Settings → System** check page.

## Step 3: new admin design and features
- **3.1 Sidebar:** navy and gold, 7 groups, a slim icon rail that opens on hover (pin to keep it open), Ctrl+K to jump to any screen.
- **3.2 Dashboard:** live CRM, quotation and invoice data; 7 / 28 / 90-day view; Statistics chart (Overview / Sales / Revenue); monthly target ring; pipeline and follow-ups; content depends on your role.
- **3.3 Login:** split-screen sign-in page.
- **3.4 Lists:** search, 25 per page, row counts and mobile-friendly rows on every list.
- **3.5 Integrations:** card grid with On/Off filters and an API keys table.
- **3.6 Inbox:** search, Website / WhatsApp / Needs-you filters, avatars with a WhatsApp dot, contact panel, quick replies.
- **3.7 Users:** All users · Activity · My profile · My security tabs, team stats, search, role filter, "Activity" per person.
- **3.8 Page builder UI kit:** 40 new blocks in 10 "UI kit" groups (hero, features, pricing, charts, reviews, team, calls to action, content, forms, components). They use plain CSS with no Tailwind, and speed stays 90+.
- **3.8b Redirects v2:** 36 verified rules loaded (old Google links, old website menu, your plan); www goes to non-www; hacked spam gets 410 Gone; 301 / 302 / 410 with Exact or Starts-with matching; a check on every rule; a **404 monitor** with one-click "Redirect this"; CSV import and export.
- **3.9 Audit fixes:** the "Cannot set properties of null" error is fixed on all screens; Inbox initials are fixed.

## Audit result
See `AUDIT-3.9.md`. Every admin screen, API and public page passes. Mobile speed: Home 92 · Contact 95 · Kitchen 98 · Article 94.
