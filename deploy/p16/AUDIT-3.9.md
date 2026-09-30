# P16 3.9 — Go-live audit (30 Sep 2026)

| Area | Check | Result |
|---|---|---|
| PHP | Syntax of all 20 API files | ✅ all pass |
| JS | Syntax of every admin / builder / site script | ✅ |
| Admin | All 35 screens open, own heading, no JS / API errors (2 full runs + all Settings tabs) | ✅ |
| Admin | Race test: switching screens every 40 / 120 / 250 ms | ✅ 0 errors after fix (was 18) |
| API | 88 read actions called as owner | ✅ 54 return data; the other 34 are correct refusals (missing ID, MCP-only names, sandbox without internet). No crashes |
| Flows | Website form → lead; quote approved → invoice with same number WI-10100; MCP without token → 401; builder only via admin sign-in | ✅ |
| Inbox | WhatsApp chat: WA tag, green dot, WhatsApp filter, WhatsApp/Call buttons | ✅ |
| Public | 87 pages: 8,528 internal links/images resolve; title, description, canonical, one H1, image alt on every page | ✅ 0 issues |
| Public | 86 pages at 390px + 1366px: JS errors, sideways scroll, broken images, failed requests | ✅ 0 issues |
| Sitemap | Local sitemap = live sitemap (86 URLs); no redirected URL in the sitemap | ✅ |
| Redirects | 36 rules: 301s land on live pages, spam → 410, /contact/ untouched | ✅ |
| Speed (mobile Lighthouse) | Home 92 · Contact 95 · Kitchen 98 · Article 94; accessibility, best practices and SEO 100 | ✅ all ≥ 90 |

## Fixed during the audit
1. **"Cannot set properties of null (setting 'innerHTML')"**: a late data reply for a screen you had already left (12 screens were affected). Fixed centrally in `admin.js`: stale read-only replies are dropped; saves, sends, deletes and background polls always complete.
2. **Inbox initials**: "Hamza (WhatsApp)" showed "H(". Initials now skip brackets and symbols; Urdu names work; phone-only names show "?".
3. **Preview mirror** (tool only, not shipped): `chat_list` now returns `channel`, matching the live PHP.

## Still needs the live server (cannot be tested in the sandbox)
- Real WhatsApp Cloud API messages, SMTP email, AI provider calls, PageSpeed API, Google service account.
- PHP on Hostinger itself: after upload, open **Settings → System check** and every line should be green.
