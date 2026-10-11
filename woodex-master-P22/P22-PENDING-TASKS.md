# P22 Pending Tasks — Complete To-do List

| | |
|---|---|
| **Compiled** | 8 October 2026 |
| **Source of truth** | `woodex-master-P22/TODO-PLAN.md` sections B–E, plus everything the P22 audit turned up |
| **Audit result** | 54 / 54 features confirmed · 24 / 24 runtime flows passed · release package clean |
| **Branch** | `arena/8a776c65-marketingwoodex` |
| **Scope** | **Nothing here is development work.** Every item is an action for the site owner, a live-server check, or a decision. The code is done. |

**How to read this list.** Items are grouped by *when* they happen: **before upload → connect services → decide the open items → after go-live → the new findings**. Within each group they are ordered by priority. Items marked **OWNER** cannot be done for you — they need your password, your card, or your click. Everything else has a specific, testable instruction so you can tell when it is done.

> `TODO-PLAN.md` is unchanged. This file is the working list; that file stays as the historical record.

---

## Summary — what is actually left

| Group | Items | Who | Roughly |
|---|---|---|---|
| **B — Before upload** | 5 | Owner | 15 min |
| **C — Connect services** | 5 groups of credentials | Owner | 1–2 hours |
| **D — Open items** | 6 (2 now done, 4 still open) | Owner decides / next sprint | 1 hour |
| **E — After go-live checks** | 7 checks | Owner | 30 min |
| **N — New from this audit** | 3 | Owner decides | 20 min |
| **Security — do this first** | 1 | Owner | 2 min |

**The single most important item on this whole list is N-0: turn on two-factor login for your Master account.** It is already built, it takes two minutes, and it protects the account that can do everything.

---

## ⚡ SEC-0 — Turn on 2-factor login (do this first)

**Priority: Critical · Owner · ~2 minutes**

The audit found that **two-factor login is already fully built and working** (`sec_2fa_begin`, `sec_get`, `sec_2fa_disable`, `sec_revoke`, `sec_alerts` — all verified live). It is not enabled for any account yet.

**Why it matters:** the Master account can manage users, restore backups, and change the website. It is the one account worth protecting the most, and it is currently protected by a single password.

**Do this:**
1. Sign in to `/admin/` as Master (`master@woodex.pk`).
2. Go to **Security**.
3. Turn on **Two-factor authentication** — scan the QR code with Google Authenticator / Authy / 1Password.
4. **Save the recovery codes somewhere safe** (password manager or printed). Without them, losing your phone means losing access.
5. Sign out and sign back in to confirm it prompts for the 6-digit code.
6. Also review **Active sessions** on the same screen and revoke anything you do not recognise.

**Done when:** a fresh login asks for the 6-digit code, and you have the recovery codes stored.

---

## B — Before upload (owner, ~15 min)

*From `TODO-PLAN.md` §B. Do these in order. Step 1 is the safety net for everything after it.*

### B-1. Back up the current site — **OWNER, do not skip**
**Priority: Critical · Owner**

- Back up the current Hostinger `public_html` folder **and** the database.
- Confirm the backup file actually downloads and opens before continuing. A backup you have never restored is not a backup.

**Done when:** you have a dated backup file locally and have verified it is not zero bytes.

### B-2. Upload and extract the new build — **OWNER**
**Priority: Critical · Owner**

- Upload `woodex-master-P22/woodex-master-P22.1.zip`.
- Extract with **Overwrite** enabled.
- Run `/wx-install.php` and follow it through to completion.
- Verify afterwards: the homepage loads, `/admin/` loads, and you can sign in.

**Verified in the audit, so you can trust the file itself:** 781 entries (623 files + 158 folders), 28,615,935 bytes, SHA-256 `37a62cce014fd845ece25213fa534fe039be64110947e4c9c26c88ba947841d3`, `unzip -t` clean, and **byte-identical to the audited source** (only `router.php` is intentionally excluded because Hostinger generates it).

> Check the SHA-256 of the file you downloaded against the value above before extracting. It takes ten seconds and confirms you have the audited build.

### B-3. Change the admin password and create real staff users — **OWNER**
**Priority: Critical · Owner**

- Change the `admin` password immediately after install.
- Create one user per real person, each with the **right role**:

| Role | Name in the code | Use it for | Key permissions |
|---|---|---|---|
| **Owner** | `owner` | You / Master | Everything, including users, approvals and backup restore |
| **Admin** | `admin` | A manager you fully trust | Everything **except** users and restore; **their changes wait for your approval** |
| **Editor** | `editor` | Developer | Website, SEO, settings |
| **Sales** | `sales` | Sales team | CRM, leads, quotes, inbox |
| **Support** | `support` | Support team | Inbox, project updates |

- Delete the five preview accounts created for testing (`master@`, `manager@`, `developer@`, `sales@`, `support@woodex.pk`) **or** repurpose them as real accounts with new passwords. All five currently use the shared test password `Woodex@2026` — **that password must not survive on the live site.**

**Done when:** every real user has their own login, the shared test password is gone, and each person can see only their own screens.

### B-4. Delete the demo and check scripts — **OWNER**
**Priority: High · Owner**

Delete these two files from `public_html/` after install:
- `wx-demo.php`
- `wx-check.php`

Leaving them on a live server exposes diagnostics to anyone who finds the URL.

**Done when:** visiting `/wx-demo.php` and `/wx-check.php` both return 404.

### B-5. Add the WhatsApp cron job — **OWNER**
**Priority: High · Owner**

In Hostinger → **Advanced → Cron Jobs**, add:

```
*/5 * * * *   php /home/<your-account>/public_html/api/wa-cron.php
```

- Set it to run **every 5 minutes**.
- This is what sends scheduled WhatsApp messages, project updates and follow-ups. Without it, anything scheduled simply waits until someone opens the admin.

**Done when:** the cron appears in Hostinger's list and a test WhatsApp message goes out on schedule.

---

## C — Connect services (owner, ~1–2 hours)

*From `TODO-PLAN.md` §C. Fill in `CREDENTIALS-TEMPLATE.md` first, then enter each one in **Admin → Integrations**. Do them in this order — the first two are what customers actually touch.*

### C-1. WhatsApp Cloud API — **OWNER**
**Priority: Critical · Owner**

You need, from Meta:
1. **Access token**
2. **Phone number ID**
3. **App secret** ← the one most often forgotten
4. **Verify token** (you invent this)

Then in **Admin → WhatsApp**: paste all four, and set the webhook to `/api/whatsapp.php`.

**Done when:** the status shows *Connected*, and you send yourself a real WhatsApp message that arrives in the Inbox. **Test the inbound direction, not just outbound** — most setups fail on the webhook, not the send.

### C-2. Telegram — **OWNER**
**Priority: High · Owner**

1. In Telegram, message **@BotFather** → `/newbot` → copy the bot token.
2. In **Admin → Telegram → Connect**, paste the token. The webhook secret is set automatically.

**Done when:** the status shows connected, and a test message from the website arrives as a DM to your team group.

### C-3. Social accounts — **OWNER**
**Priority: High · Owner**

| Platform | What you need | Notes |
|---|---|---|
| **Facebook Page** | Long-lived Page token | Use a long-lived token, not a short one, or it silently expires in ~60 days |
| **Instagram** | Same Meta app / Page token | Requires an IG Business or Creator account linked to the Page |
| **LinkedIn** | App token | Needed for article cross-posting |
| **Google Business Profile** | Google account + service account | Needed for reviews and posts |

**Done when:** all four show connected, and a test post publishes to at least Facebook and Instagram.

### C-4. AI engine key — **OWNER**
**Priority: High · Owner**

The AI agent, AI articles, AI auto-reply and AI captions all need one key. Pick one:

| Engine | Where to get it | Notes |
|---|---|---|
| **Claude (Anthropic)** | console.anthropic.com | Best quality for English + Urdu writing |
| **OpenAI** | platform.openai.com | |
| **OpenRouter** | openrouter.ai | One key, many models |
| **Local** | Self-hosted | No per-message cost, needs a server |

Enter it in **Admin → AI**, then pick your default engine.

**Done when:** you run an **AI article** and it returns real text, not an error.

### C-5. Turnstile, SMTP and Google — **OWNER**
**Priority: Medium · Owner**

1. **Cloudflare Turnstile** — site key + secret key. This is what protects the contact and lead forms from spam. **A placeholder value here means your forms are effectively unprotected** — it is worth doing properly.
2. **SMTP email** — host, port, user, password, from-address. Needed for notification emails.
3. **Google service account** — JSON key for Analytics and Search Console. Needed for the SEO manager and the speed dashboard to show real data.

**Done when:** the contact form submits, you receive the notification email, and the speed dashboard shows a real PageSpeed number rather than "fetch failed".

---

## D — Open items (next sprint)

*From `TODO-PLAN.md` §D. Two of the six are already done — the audit found them built. The table shows current status, not the original plan.*

| # | Priority | Item | **Current status** |
|---|---|---|---|
| 1 | **Medium** | Add `Content-Security-Policy` header | ❌ **Still open — needs your decision.** See D-1 below. |
| 2 | **Medium** | Optional 2-factor login for Master | ✅ **DONE — built and verified live.** See SEC-0. |
| 3 | **Low** | Cosmetic: send icon size in replied comment | ⚠️ **Cannot reproduce.** See D-3. |
| 4 | **Low** | Submit WhatsApp templates | ⏳ **Owner action** — needs Meta review. See D-4. |
| 5 | **Low** | Google: 404 old URLs → redirects; www → non-www | ✅ **Code side done** (36 rules + www→non-www). Only the Search Console check remains. See D-5. |
| 6 | **Low** | P39 open questions (recommended: **no**) | ⏳ **Owner decision.** See D-6. |

### D-1. Content-Security-Policy header — ❌ OPEN, needs your decision
**Priority: Medium · Owner decision**

**What the audit found:** there is genuinely **no** `Content-Security-Policy` header anywhere in `.htaccess` or any PHP file. This was deferred by you in P21, and it is still deferred. A CSP is the single strongest defence against cross-site scripting — it stops an attacker's script from running even if they find a way to inject one.

**Why it was deferred:** a strict CSP breaks things. On this site the risky parts are the Cloudflare Turnstile widget, the Google Maps iframe, and the four AI engines that phone out to different domains. Done wrong, the contact form, the map, and the AI all stop working.

**Recommendation: do it, but in a test window, not on go-live day.**

A draft that should be close to working (verify against your live services):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.anthropic.com https://api.openai.com https://openrouter.ai https://www.google-analytics.com; frame-src https://www.google.com https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'
```

**How to do it safely:**
1. Add it to `.htaccess` as a `Header always set Content-Security-Policy` line.
2. Immediately open the browser console (F12) on the homepage, the contact page, the chat, and one AI screen.
3. Fix every violation it reports by adding the domain it names.
4. Only then leave it on.

**Do not** ship this on the same day as the upload — you want a quiet window where you can watch the console.

**Done when:** the header is present, and the homepage, contact form, map, chat and AI screens all work with **zero** console CSP violations.

### D-2. Two-factor login — ✅ DONE
**Priority: Medium · Verified**

The audit confirmed `sec_2fa_begin`, `sec_get`, `sec_2fa_disable`, `sec_revoke` and `sec_alerts` all work live, and that two-factor login is available to **every** role, not only Master. Nothing left to build.

**Remaining action is yours:** turn it on. See **SEC-0** above — that is the highest-value item on this list.

### D-3. Cosmetic: send icon size in replied comment — ⚠️ CANNOT REPRODUCE
**Priority: Low · Needs your eyes**

**What the audit found:** every send icon in the codebase — in the Inbox, the comment box, the content editor, the offers screen and the notifications screen — comes from the **single shared `ic("send")` icon helper**, sized by the same CSS classes. There is no separate send icon in the replied-comment path, so there is nothing to resize.

**This means one of two things:** either it was already fixed, or the original report was about a specific browser/zoom state that the code no longer has.

**Action:** open the Inbox, reply to a customer comment, and look at the send button. If it still looks wrong, send a screenshot and the exact browser and zoom level — with the code now unified it should be a one-line CSS fix.

**Done when:** you have looked at it and either confirmed it is fine, or sent a screenshot.

### D-4. Submit WhatsApp templates — ⏳ OWNER ACTION
**Priority: Low · Owner**

The template text is written and shipped at `frontend-v1/_templates/whatsapp-message-templates.md`. WhatsApp will not let you *send* a template until Meta approves it, so the code is finished but the feature is blocked on review.

**Action:**
1. Open `_templates/whatsapp-message-templates.md`.
2. In Meta Business Manager, create each template and paste the text exactly.
3. Submit for review. Approval usually takes 24–48 hours; wording that mentions discounts or promotions is scrutinised more heavily.
4. Once approved, the templates appear automatically in **Admin → WhatsApp → Templates**.

**Done when:** the templates show *Approved* in Meta Business Manager and can be sent from the admin.

### D-5. Google redirects and www → non-www — ✅ CODE DONE
**Priority: Low · Owner check only**

**What the audit found:**
- **36 redirect rules** are in place in `api/redirect-plan.json`, mapping the old WordPress URLs to their new homes.
- **www → non-www** redirect is in `.htaccess` (present in both the standard block and the `WOODEX-ADMIN` managed block).

So the code side of D5 is complete. What remains is confirming Google has picked it up.

**Action (after go-live):**
1. In Search Console, submit the sitemap: `https://woodex.pk/sitemap.xml`.
2. Wait for the first crawl, then check the **Pages** report for "Page with redirect" and "Not found (404)".
3. Expect `/services/` to show as "page with redirect" — that is intentional, not an error.
4. Check that `https://www.woodex.pk` redirects to `https://woodex.pk`.

**Done when:** Search Console reports 0 unexpected 404s and www redirects to non-www.

### D-6. P39 open questions — ⏳ OWNER DECISION
**Priority: Low · Owner**

**What the audit found:** all five P39 phases are implemented — roles and permissions (1), Manager changes waiting for Master approval (2), collapsible sections and per-user pinned screens (3), the Telegram channel (4), and the AI report with unanswered-question capture (5).

The remaining "open questions" are business decisions only you can answer, not code gaps. The recommendation in `TODO-PLAN.md` is **no** — i.e. do not add more P39 work. The audit agrees: everything claimed is built and working, so extra scope would be gold-plating.

**The questions, for your decision:**

| Question | Recommendation |
|---|---|
| Should Sales be able to see *all* leads, or only the ones assigned to them? | Only assigned — protects the sales team's pipeline |
| Should the AI auto-reply answer outside office hours? | Yes, but with a "we'll reply in the morning" note after hours |
| Should project updates send automatically on every stage change? | No — let the team choose, to avoid notification fatigue |
| Should the Urdu auto-translation apply to every message? | Yes for project updates; ask for chat replies |

**Done when:** you have answered these four, or explicitly said "use the recommendations".

---

## E — After go-live checks (~30 min)

*From `TODO-PLAN.md` §E. Do these on the **live** site, in a real browser, signed in as a real user. Each one tests a chain, not a screen.*

| # | Check | How to test it | Expected result |
|---|---|---|---|
| **E-1** | **Homepage** | Load `https://woodex.pk` | Page renders, v26 font and cream palette visible, no console errors, no broken images |
| **E-2** | **Contact form → lead appears** | Submit the contact form with a real phone number | The lead appears in **Admin → CRM → Leads** within a minute, with the right source |
| **E-3** | **Chat reply** | Send a message from the website chat widget | AI auto-replies, then reply yourself from the Inbox and confirm the customer sees it |
| **E-4** | **WhatsApp test** | Send yourself a WhatsApp message | It arrives in the unified Inbox, and your reply reaches the phone |
| **E-5** | **Telegram alert** | Trigger a new lead or chat | The team group gets a DM alert |
| **E-6** | **Quotation PDF** | Create a quote, then print/export it | PDF is A4, numbered from the **WI-** series (Interior/Project) or **WF-** (Furniture), with the right bank account printed |
| **E-7** | **SEO agent scan** | **Admin → SEO Agent → Scan** | Scan completes, lists fixes, and each fix waits for your approval |
| **E-8** | **Speed 90+** | **Admin → Speed** (or PageSpeed Insights) | Score 90 or above on mobile and desktop |

**Also do these once, after E-1 to E-8:**

| # | Check | How |
|---|---|---|
| **E-9** | **Mobile check** | Open the homepage, a blog post, and the contact page on a real phone — not just a narrow browser window |
| **E-10** | **Role check** | Sign in as Sales and as Support. Confirm each sees only their own screens and cannot open the CRM or settings |
| **E-11** | **Approval check** | As Admin, change a page. Confirm it says *waiting for Master*, then approve it as Owner and confirm it goes live |
| **E-12** | **Backup check** | **Admin → Backups → Run backup**, then restore it on a test copy. A backup you have never restored is not a backup |
| **E-13** | **Urdu check** | Send a project update and confirm the Urdu version arrives correctly, right-to-left |

---

## N — New items found by this audit

These are **not** in `TODO-PLAN.md`. The audit surfaced them; none is urgent, and all three are safe to do after go-live.

### N-0. Turn on two-factor login — ✅ Critical, do first
See **SEC-0** at the top of this file. Two-factor login is already built; it just needs switching on. This is the highest-value action on the list and takes two minutes.

### N-1. Remove the six unused legacy font families
**Priority: Low · Safe, after go-live · ~20 min**

**What the audit found:** the v26 design uses **Plus Jakarta Sans**, which is correctly self-hosted and referenced. But six older font families are still shipped in the CSS and font folders:

- Cormorant Garamond
- DM Sans
- Inter
- Manrope
- Playfair Display
- Poppins

They are only loaded by legacy CSS that the v26 design no longer uses. They are dead weight in every page download — and font files are among the largest assets on any page, so this is one of the cheapest speed wins available.

**Action:** after go-live, remove the unused `@font-face` blocks and their woff2 files, then re-run the speed dashboard and the browser sweep to confirm nothing changed visually.

**Why after go-live, not before:** the win is small, and doing it now means re-verifying the whole site again right before launch. Not worth the risk.

**Done when:** the six families are gone, the speed score is the same or better, and no page renders in a fallback font.

### N-2. Decide whether Developer should manage SEO and Social
**Priority: Low · Owner decision**

**What the audit found:** `FEATURES.md` says the Developer role covers "website, SEO, settings". In the code, the Developer (editor) **can** manage the website and settings, but the `seo_*` and `soc_*` actions sit in the `broadcast` permission group, which is **owner and admin only**. So a Developer currently cannot open the SEO manager or the social planner.

The audit confirmed this is *deliberate and consistently enforced* — Developer, Sales and Support are all correctly refused. It is not a bug. But `FEATURES.md` is ambiguous, so it is flagged rather than silently assumed.

**Your options:**

| Option | Effect | Recommended |
|---|---|---|
| **Leave as-is** | Developer builds pages; Owner/Admin handles SEO and social | ✅ Yes — SEO and social publishing are outward-facing and benefit from your sign-off |
| Let Developer manage SEO | Add `seo` actions to the editor group in `api/roles-lib.php` | Only if the Developer will actually do the SEO work |
| Let Developer manage social | Add `soc_*` actions to the editor group | Not recommended — social posts are public and irreversible |

**Done when:** you have picked an option. If you pick "leave as-is", this item is closed with no work.

### N-3. `/services/` shows as a redirect in the sitemap
**Priority: Low · No action needed**

`/services/` is listed in the sitemap and resolves via a redirect rather than a final page. This is intentional and part of the D5 redirect plan, so nothing needs fixing. It is noted here only so you are not surprised when Search Console reports "Page with redirect" until it re-crawls.

**Done when:** you have read this and know to ignore it.

---

## Recommended order

Do these in this sequence. Everything before go-live is safety; everything after is proof.

| Step | Do this | Why in this position |
|---|---|---|
| **1** | **SEC-0 — enable 2-factor on Master** | Highest security value, two minutes, do it before you touch anything else |
| **2** | **B-1 — back up** | Safety net for everything after |
| **3** | **B-2 — upload, extract, install** | The new build |
| **4** | **B-3 — change password, create real users** | Close the shared test password immediately |
| **5** | **B-4 — delete demo scripts** | Two minutes, removes an exposure |
| **6** | **B-5 — add the cron** | Needed before scheduled messages will work |
| **7** | **C-1 … C-5 — connect services** | Do WhatsApp and Telegram first; they are what customers touch |
| **8** | **E-1 … E-13 — after go-live checks** | Prove the whole chain on the live server |
| **9** | **D-1 — CSP header** | In a quiet window, watching the console — not on launch day |
| **10** | **D-4 — submit WhatsApp templates** | Meta review takes 24–48h, so submit early even though it is low priority |
| **11** | **D-6, N-2 — decisions** | Answer the business questions when convenient |
| **12** | **N-1 — remove legacy fonts** | Safe speed win, after everything is stable |
| **13** | **D-3 — send icon** | Only if it still looks wrong when you check it |

**Estimated total owner time:** roughly 2–3 hours, most of it waiting on credentials and Meta review.

---

## Quick reference — the credentials you will need

Gather these before you start section C, so you are not hunting for them mid-setup:

- [ ] Meta App secret
- [ ] WhatsApp access token
- [ ] WhatsApp phone number ID
- [ ] WhatsApp verify token (you invent this)
- [ ] Telegram bot token (from @BotFather)
- [ ] Facebook long-lived Page token
- [ ] LinkedIn app token
- [ ] Google Business Profile access
- [ ] AI API key (Claude / OpenAI / OpenRouter)
- [ ] Cloudflare Turnstile site key + secret key
- [ ] SMTP host, port, username, password, from-address
- [ ] Google service account JSON key (Analytics + Search Console)

---

*Compiled from the P22 feature audit (54/54 features confirmed, 24/24 runtime flows passed, release package clean and byte-identical to source). See `P22-AUDIT-REPORT.md` for the full evidence. `TODO-PLAN.md` is left unchanged.*
