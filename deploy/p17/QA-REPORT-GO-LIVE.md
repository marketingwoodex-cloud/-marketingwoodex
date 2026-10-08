# Woodex: Deep QA and go-live report

**Date:** 1 Oct 2026 · **Build tested:** `82dc7e9` (zip `deploy/p17/woodex-live-p17-full.zip`, rebuilt after the fixes below)
**Scope:** every admin API action, permissions, the dashboard calculations, every admin screen, the page builder, all landing pages, and the live site woodex.com.pk.

---

## 1. Summary

| Area | Result |
|---|---|
| Code checks: 22 PHP files, all admin, builder and site JS | ✅ 0 errors |
| API security: 238 actions called signed-out | ✅ all refused, except intended public ones (status, login, password reset, Google client ID) |
| Role permissions: owner/admin actions called as a **Sales** user | ✅ all refused (the only allowed `sec_*` actions affect the user's own account, by design) |
| Static check: every PHP action runs a permission check before writing data | ✅ yes (`db_reconnect` is protected by the builder password and only works while the DB is broken) |
| Dashboard numbers vs. raw data (leads, pipeline, funnel, open quotes, sent, unpaid, charts, follow-ups) | ✅ 9 / 9 match |
| Sales system tests (lead tracker, import, quotes, invoices, projects, banks) | ✅ 54 / 54 (p17-s12, s3, s4, s5) |
| Content, templates and AI agent (MCP) tests | ✅ all pass |
| Browser tests (header/footer, sections, booking, FAQ groups, testimonials, media, leak test) | ✅ all pass (incl. new leak test 3/3) |
| Every admin screen (37), plus the older P16 suites (users, lists, inbox, integrations, redirects, UI kit, builder) | ✅ clean after the fixes below |
| Landing pages: 87 pages at mobile (390 px) and desktop (1366 px) | ✅ 0 issues (overflow, broken images, JS errors) |
| Sitemap (87 URLs = 87 pages) / internal links / SEO tags | ✅ checked in the P17 final audit |
| Speed (Lighthouse, mobile) | 90+ target from P15/P16 is kept (no heavy code added to public pages) |
| Logic edge cases (`qa-edge.mjs`): amount in words (lakh/crore, e.g. 4,157,300 = "Forty One Lakh Fifty Seven Thousand Three Hundred"), back-to-back bookings, overlaps, cancelled slot freed, bad time, unique WI/WF numbers, balance = total − paid | ✅ 20 / 20 |
| Already covered by suites: import dedupe (leads + invoices), milestones must total 100%, billed milestone locked, double booking blocked | ✅ |

**Overall: ready to go live**, once the zip is uploaded (see section 4).

---

## 2. Bugs found and fixed in this QA

| # | Severity | Problem | Fix |
|---|---|---|---|
| 1 | **High** | Click handlers **leaked between admin screens**. After opening *Page templates*, pressing **Duplicate** or **Edit** on another screen (for example FAQ groups) could also run template actions, and each revisit added another handler, so actions ran twice. | The router now gives every screen a fresh area, so old handlers can't fire. The inbox, integrations and list helpers now watch the stable parent. A regression test was added (`qa-leak.mjs`). |
| 2 | Medium | Templates and FAQ groups were loaded on the login screen and the empty result was kept after sign-in. Linked FAQs could publish empty until a reload. | Fixed in the final audit (`e6ab179`). |
| 3 | Low | Settings → General could throw an error if a delayed preview update ran after you switched tabs. | Guards added. |

The test scripts are saved in `tools/phplint/` (`qa-api-sweep`, `qa-php-guards`, `qa-dash`, `qa-leak`, `qa-edge`) so this QA can be re-run any time.

---

## 3. Live site check (woodex.com.pk, today)

| Check | Live now | After uploading the p17 zip |
|---|---|---|
| Home page, robots.txt, sitemap (87 URLs) | ✅ working | ✅ |
| Admin login and API (`driver: mysql`, set up) | ✅ working | ✅ |
| `_private/` data folder | ✅ blocked (403) | ✅ |
| Version running | ⚠️ **older build (before Phase 16)**: `admin-dash.js` and `admin-templates.js` return 404 | ✅ Phase 17 |
| `/book-a-visit/` | ❌ 404 | ✅ booking page |
| `www.woodex.com.pk` → `woodex.com.pk` | ❌ no redirect (duplicate content) | ✅ 301 redirect |
| `/portfolio/` (old WordPress URL) | ❌ 404 | ✅ redirects to Projects |
| Hacked spam URLs (e.g. `/gratis-gokkasten…`) | ⚠️ 404 | ✅ 410 "gone" (Google drops them faster) |
| Opening hours on pages | ⚠️ old "Mon–Sat 9:30–6:30" | ✅ Mon–Sat 10:00–7:30 |
| Spam protection (Turnstile) | ⚠️ no key set | Add the key in **Integrations → Spam protection** (honeypot and rate limit already work) |

---

## 4. Go-live steps (in order)

1. Hostinger: **Backups → Generate new backup**.
2. Upload `woodex-live-p17-full.zip` to `public_html`, choose **Extract**, tick **Overwrite**, delete the zip, then press **Ctrl+F5**.
3. Sign in at `/admin/`. Every line in **Settings → System** should be green. The database updates itself.
4. Re-test the 4 red/amber items in section 3 (`/book-a-visit/`, the www redirect, `/portfolio/`, a spam URL).
5. Make one test booking and send one test enquiry, then check both under **Bookings** and **Enquiries & leads**.
6. Optional: add the Turnstile key, connect WhatsApp Cloud API and Google (steps in the Integrations screens), and add the `marketing.woodex@gmail.com` user (see README-UPLOAD).
7. Google Search Console: submit `sitemap.xml` again.

Full step-by-step guide: `README-UPLOAD.md` · List of changes: `CHANGES.md`.

---

## 5. Known limits (not bugs)

- The home page is the slowest page because of the 3-slide hero.
- The WhatsApp, Google and AI features need your own keys before they work live; until then the screens show setup steps.
- Lighthouse and the browser tests ran on a local test copy (Node), not on Hostinger itself. The PHP was checked with a parser and covered by the same tests through the mirror.
