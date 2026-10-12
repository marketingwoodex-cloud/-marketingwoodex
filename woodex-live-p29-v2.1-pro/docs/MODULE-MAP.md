# Woodex Admin — module map

Sidebar section → route → view file, with the API actions each screen calls.

| Section | Route | Label | Roles | View file(s) | Actions |
| --- | --- | --- | --- | --- | --- |
| OVERVIEW | `#/dashboard` | Dashboard | — | admin-appr.js, admin-dash.js, admin-p36.js, admin.js | 39 |
| OVERVIEW | `#/approvals` | Approvals | owner,admin,editor | admin-appr.js | 14 |
| SALES | `#/enquiries` | Leads | g:sales | admin-crm.js, admin-sales17.js | 29 |
| SALES | `#/pipeline` | Pipeline | g:sales | admin-crm.js, admin-p19f.js | 14 |
| SALES | `#/bookings` | Bookings | g:sales | admin-booking.js | 5 |
| SALES | `#/clients` | Clients | g:sales | admin-crm.js, admin-reports.js, admin-sales17.js | 31 |
| Quotes & invoices | `#/quotes` | Quotations | g:sales | admin-sales.js | 30 |
| Quotes & invoices | `#/invoices` | Invoices | g:sales | admin-p18.js, admin-sales.js, admin-sales17.js | 48 |
| Quotes & invoices | `#/transactions` | Payments | g:sales | admin-p18.js | 5 |
| Quotes & invoices | `#/templates` | Quote templates | g:sales | admin-sales.js | 30 |
| Quotes & invoices | `#/projects` | Projects | g:sales,g:support_view | admin-sales.js, admin-sales17.js | 48 |
| Quotes & invoices | `#/gantt` | Timeline | g:sales,g:support_view | admin-gantt.js | 1 |
| AUTOMATION | `#/chat` | Inbox | g:conversations | admin-chat.js | 5 |
| AUTOMATION | `#/team-feed` | Team feed | g:conversations | admin-feed.js | 3 |
| WhatsApp | `#/wahub` | Overview & rules | g:broadcast | admin-wahub.js | 4 |
| WhatsApp | `#/wainsights` | Insights | g:broadcast | admin-wains.js | 1 |
| WhatsApp | `#/wauto` | Broadcasts & automations | g:broadcast | admin-p18g.js | 16 |
| WhatsApp | `#/offers` | Discount offers | g:broadcast | admin-offers.js | 8 |
| WhatsApp | `#/settings/connections` | Connect WhatsApp | g:settings | — | 0 |
| WhatsApp | `#/telegram` | Telegram | owner,admin,editor | admin-tg.js | 8 |
| WhatsApp | `#/social` | Social media | owner,admin | admin-social.js | 0 |
| WhatsApp | `#/updates` | Client updates | g:updates | admin-notify.js, admin-updates.js | 3 |
| WhatsApp | `#/aicenter` | AI Assistant | g:ai | admin-aicenter.js, admin-train.js | 4 |
| WhatsApp | `#/train` | Knowledge & Q&A | g:ai | admin-train.js | 0 |
| WhatsApp | `#/aireport` | AI report | g:ai | admin-aia.js, admin-train.js | 4 |
| Pages & builder | `#/pages` | All pages | g:website | admin-pages.js, admin.js | 32 |
| Pages & builder | `#/builder` | Page builder | g:website | admin.js | 19 |
| Pages & builder | `#/library` | Section library | g:website | admin-lib26.js, admin-library.js | 8 |
| Pages & builder | `#/global` | Header & footer | g:website | admin-chrome.js, admin-pages.js | 17 |
| Pages & builder | `#/heroes` | Hero slides | g:website | admin-hero.js | 6 |
| Pages & builder | `#/redirects` | Redirects | g:website | admin-pages.js, admin-redirects.js | 17 |
| Content | `#/blog` | Blog | g:website | admin-content.js, admin-p36.js | 25 |
| Content | `#/portfolio` | Portfolio | g:website | admin-content.js | 19 |
| Content | `#/services` | Service pages | g:website | admin-fields.js | 14 |
| Content | `#/cities` | City pages | g:website | admin-fields.js | 14 |
| Content | `#/pagetpl` | Page templates | g:website | admin-templates.js | 10 |
| Content | `#/forms` | Forms | g:website | admin-p18e.js | 5 |
| Content | `#/estimator` | Estimator | g:website | admin-p18e.js | 5 |
| Content | `#/faqs` | FAQs | g:website | admin-content.js | 19 |
| Content | `#/testimonials` | Testimonials | g:website | admin-content.js | 19 |
| Content | `#/logos` | Client logos | g:website | admin-logos.js | 3 |
| Content | `#/team` | Team | g:website | admin-content.js | 19 |
| Content | `#/media` | Media | g:website | admin-media.js | 24 |
| Content | `#/seo` | SEO | g:website | admin-p36.js, admin-seo.js, admin-seo38.js | 13 |
| Content | `#/seoagent` | SEO agent | g:website | admin-seoagent.js | 5 |
| Content | `#/speed` | Speed | g:website | admin-speed.js | 3 |
| Content | `#/health` | Site health | g:website | admin-media.js | 24 |
| Content | `#/theme` | Theme | g:settings | admin-theme.js | 2 |
| ADMIN & SETTINGS | `#/business` | Business info | g:settings | admin-fields.js | 14 |
| ADMIN & SETTINGS | `#/settings` | Integrations | g:settings | admin-settings.js | 0 |
| ADMIN & SETTINGS | `#/users` | Users & roles | owner,admin | admin.js | 19 |
| ADMIN & SETTINGS | `#/profile` | My profile | — | admin-p18j.js, admin-tg.js, admin.js | 31 |
| ADMIN & SETTINGS | `#/security` | My security | — | admin-security.js | 1 |
| System | `#/backups` | Backups | owner,admin | admin-media.js, admin-system.js | 24 |
| System | `#/database` | Database | owner,admin | admin-p18h.js | 16 |
| System | `#/files` | File manager | g:website | admin-p18h.js | 16 |
| System | `#/maintenance` | Maintenance | g:settings | admin-p18h.js | 16 |
| System | `#/activity` | Activity log | g:settings | admin.js | 19 |
| System | `#/system` | System check | g:settings | admin-system.js | 0 |

## Detail views (not in the sidebar, opened from a list)

| Route | View file(s) |
| --- | --- |
| `#/citydraft` | admin-fields.js |
| `#/connections` | admin-conn.js, admin-settings.js |
| `#/fields` | admin-fields.js |
| `#/inbox` | admin-chat.js |
| `#/integrations` | admin-settings.js |
| `#/invoice` | admin-p18.js, admin-sales.js |
| `#/post` | admin-content.js |
| `#/quote` | admin-sales.js |
| `#/soon` | admin.js |
| `#/study` | admin-content.js |
| `#/template` | admin-sales.js |