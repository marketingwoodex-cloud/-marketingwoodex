# Feature and User Journey Map

Journey status uses: **Verified (RUNTIME)** · **Static only** · **Blocked** · **Not run**.

| Journey | Entry point | Path through code | Status | Known breaks / risks |
|---|---|---|---|---|
| Owner sign-in | `/admin/` → `admin/index.html` → `admin.js` login (`:235`) | `api/admin.php` login (`:364`) `password_verify` on `wx_users` | Static only; **Blocked live** | Pre-filled and fallback literal (SEC-001); published credential (SEC-002); throttle exists |
| Dashboard load (owner) | `#/dashboard` | `admin-appr.js:130` → `admin-p36.js` → `admin-dash.js:15` → `api("dash_data")` | **Verified (RUNTIME, jsdom)** after OV-03 fix | Stuck "Loading" before fix; error card now shown; browser not run |
| Dashboard load (editor/support) | `#/dashboard` | `admin-dash.js:17` → `classic` = `admin.js:495` → `api("dashboard")` | Verified (RUNTIME) for OV-01 base path (via owner chain) | Role-specific test not run |
| Integrations review | `#/settings/integrations` | `admin-settings.js:121` (`renderIntegrationsTab`) | Static; wording fixed | Hard-coded status (AD-05); tile click dead (AD-08) |
| Integrations deep link | `#/integrations` | Not in NAV → `route()` fallback to dashboard (`admin.js:461`) | Verified (RUNTIME, prior) | AD-04 open |
| Approvals queue | `#/approvals` | `admin-appr.js:21` overwritten by `admin-security.js:203` | Identity check RUNTIME; queue render **Not run** | AD-10 (hypothesis on effect) |
| Enquiry handoff (sales) | `#/enquiries` | `admin-sales17.js:33` vs `admin-crm.js:101` | Static | SA-02 two owners; SA-01 polling |
| Lead capture (public) | `/estimator/index.html` → form | Form posts to server (not traced end to end) | Partly verified | Inputs now labelled (A11Y-001); submit path **Not run** |
| CRM poll | `admin-crm.js:23` 60 s + hashchange | — | Static | Overlapping fetch (SA-01) |
| Chat (live) | `admin-chat2.js:137` | `setInterval(load, 3000)` | Static | Out-of-order repaint (AU-04) |
| WhatsApp campaign | `p18g-lib.php:236–313`, `wahub-lib.php:121–188` | `wag_save` unlocked; cron `wag_tick` locked | Static | Lost opt-outs (AU-01); silent busy (AU-02) |
| Telegram notifications | `admin-tg.js`; `config.php` constant | Token in client JS and config | Static | Published token (SEC-003, AD-27) |
| Page builder save | `builder.php:237–251` (save, `filemtime` check `:244`); `:266–275` (restore, no check) | Save checks modification time before writing; check and write are not atomic; restore has no check | Static | Lost update (WC-01); token from shared secret (WC-03) |
| Page builder login | `admin.js` `bapi0` (29–30); `builder.php:60–81` | Builder token HMAC | Static | Logout on empty read (AD-21) |
| Settings save | `admin-settings.js` Save | No persistence call | Static | Button now says "Not saved" (AD-06 partial) |
| Public downloads | `/downloads.html` | Static page | Static | Publishes sign-in hint (SEC-002) |
| Static site (content pages) | `lahore/`, `karachi/`, service folders | Static HTML | Static (site audit) | Metadata gaps (SEO-02); payload (PERF-01) |

## Not mapped in this pass
Checkout/payments (none found in P29 code), invoices and approvals workflows beyond the queue, Google reporting (`google-data-lib.php`), multi-tab concurrency, and the non-P29 Netlify/Supabase flows.
