# Woodex → Hostinger Deploy Guide (package v2)

**Who this is for:** you (no coding needed). Follow in order. Every exact value you must type is in `code font`.
**Golden rule:** Parts 1–2 run on the *temporary* address first. **Part 3 (DNS) only after I give the written GO.**

---

## What's in the package

**File:** `dist/wf-admin-v2.zip` — upload it once, it contains everything:

| Inside the zip | What it is |
|---|---|
| `index.html` + page folders | the whole website (87 pages, blog, projects, cities) |
| `admin/` | your dashboard — page builder, quotations, invoices, CRM, live chat |
| `api/` | the engine (33 functions: login, save, publish, chat, email…) |
| `install.php` | one-time setup wizard — **run once, then it deletes itself** |
| `sql/install.sql` | creates all 24 database tables |
| `cron/backup.php` | nightly backup — triggered by one cron line |
| `content/` | your page-builder drafts (auto-saved data) |
| `.htaccess` | HTTPS, clean URLs, old-site redirects, security |
| `config/`, `backups/`, `sql/` | protected folders (not reachable from the web) |

**You need:** your Hostinger panel login, and about 20 minutes.

---

# PART 1 — Upload & Install (temporary address first)

### Step 1 — Create the database
1. hPanel → **Websites → Manage → Databases → Management**.
2. Click **Create Database** (MySQL).
3. Type a name, e.g. `woodex` — hPanel adds a prefix like `u123456_`, that's normal.
4. Type a password (save it somewhere safe).
5. Click **Create**. **Copy the full database name, full username, and password** — you'll paste them in Step 4. (Full = including the `u123456_` part.)

### Step 2 — Check PHP version
1. hPanel → **Websites → Manage → Advanced → PHP Configuration**.
2. Pick **PHP 8.2** (or 8.3) → **Save**.
3. Make sure extension **pdo_mysql** is ticked (it is by default).

### Step 3 — Upload the website
1. hPanel → **Websites → Manage → File Manager**.
2. Open the **`public_html`** folder.
3. Click **Upload → Upload files** → choose `wf-admin-v2.zip`.
4. Back in `public_html`, select the zip → **Extract** → confirm.
5. You must now see `index.html`, `install.php`, `.htaccess` **directly inside `public_html`**.
   - ❌ Wrong: `public_html/wf-admin-v2/index.html` (a folder in between) → open that folder, Select All → Cut → Paste into `public_html`.
   - ✅ Right: `public_html/index.html`.
6. Delete the zip (saves space).

### Step 4 — Run the installer
1. In hPanel → **Websites → Manage**, find the **temporary URL** (also called *Website Details → Temporary URL*, e.g. `xyz789.hstgr.cloud`).
2. Open `https://TEMP-URL/install.php` in your browser.
3. Fill the form **exactly**:

| Field | What to type |
|---|---|
| Database host | `localhost` |
| Database name | *paste the full name from Step 1* |
| Database user | *paste the full user from Step 1* |
| Database password | *the password from Step 1* |
| Admin username | `woodexadmin` |
| Admin password | `Wx-0c41a9-c481e4` (and repeat it) |
| Outgoing email (optional) | leave blank for now — mailbox comes in Step 6 |
| ☑ Delete install.php automatically | leave ticked |

4. Click **Install**. You should see: **✓ Installation complete**.
5. **On that success screen, copy the backup command it shows you** (looks like `curl -s "https://…/cron/backup.php?key=…"`) — you'll paste it in Step 5.

### Step 5 — Nightly backups
1. hPanel → **Websites → Manage → Advanced → Cron Jobs** (or search "Cron" in the hPanel search bar).
2. Add a job: schedule **Daily at 03:00**.
3. In *Command*, paste the backup command you copied from Step 4. → **Save**.
4. Click **Run now** once to test it.
5. Check: File Manager → `backups/` should now contain `backup-….zip`. ✅

### Step 6 — Mailbox (for quotation & invoice emails)
1. hPanel → **Websites → Manage → Emails → Create mailbox**.
2. Suggested: `info@woodex.com.pk` + a password you save. → **Create**.
3. Because you left SMTP blank at install: File Manager → `public_html/config/config.php` → right-click → **Edit** (plain text). Find `'mail'` and fill two lines:
```php
'user' => 'info@woodex.com.pk',   // your full mailbox
'pass' => 'the-mailbox-password',
```
4. Save. (If you'd rather type these into the installer instead, you can skip this edit — same result.)

### Step 7 — SSL (padlock icon)
1. hPanel → **Websites → Manage → Security → SSL**.
2. Select the domain → **Install** (free Let's Encrypt, auto-renews).
3. Done — the site already forces HTTPS.

**Part 1 complete:** `https://TEMP-URL/` shows the website and `https://TEMP-URL/admin/` signs in.

---

# PART 2 — Staging checklist (tick every box BEFORE DNS)

Test everything on the **temporary URL**. Tick only what you actually saw.

- [ ] **Homepage** loads — hero, services, footer, images all look right
- [ ] **3 inner pages** open (e.g. `/about/`, `/services/interior-design/`, `/contact/`) — no "404", no broken layout
- [ ] **Contact form** on `/contact/` — submit a test message → appears in dashboard → **Enquiries**
- [ ] **Dashboard login** — `https://TEMP-URL/admin/` with `woodexadmin` / `Wx-0c41a9-c481e4` → Dashboard shows (all zeros are normal)
- [ ] **Page builder** — open any page in the builder, change one word, **Publish** → refresh the live page → your word is there **instantly**
- [ ] **Chat bubble** — homepage shows the blue 💬 button (bottom-right) → type "test" → in dashboard **Live Chat** the conversation appears → **reply** → back on the page your reply shows within 5 seconds
- [ ] **Quotation** — create a quick quotation → open its preview → click **Email** → button turns **Sent ✓** (needs Step 6 mailbox)
- [ ] **Backup** — the cron test from Step 5 produced a zip in `backups/` (you can also see it in dashboard → **Backups**)
- [ ] **Sitemap** — `https://TEMP-URL/sitemap.xml` opens and lists pages
- [ ] **404 page** — open a nonsense address like `/sdfg/` → the styled "page not found" appears
- [ ] **Mobile view** — check homepage + one inner page on your phone
- [ ] **Login security** — type a wrong password twice at `/admin/` → error appears (after 5 tries it pauses briefly — that's the protection working)

**Every box ticked → Part 3 is unlocked (with my GO). If something fails, tell me which box.**

---

# PART 3 — DNS cutover 🔒 *(STOP — start only after my written GO)*

This is the moment `woodex.com.pk` switches from the old site to this one.

### Step 1 — Find your Hostinger IP
hPanel → **Websites → Manage → Details** → copy the **IP address** (looks like `185.1XX.XX.XX`).

### Step 2 — Point the domain
**If the domain is managed in Hostinger** (Domains → your domain → DNS):
1. Add record **A**: Name/Host = `@` (or `@`/blank), Points to = *your IP*, TTL = auto → Save.
2. Add record **CNAME**: Name = `www`, Points to = `woodex.com.pk` → Save.
3. Remove any *old* A/CNAME records for `@` or `www` pointing elsewhere.

**If the DNS lives somewhere else** (old host or another registrar): same two records there — `@` → your Hostinger IP (A), `www` → `woodex.com.pk` (CNAME). Easier alternative: switch the domain's **Name Servers** to Hostinger's (hPanel shows them under the domain once added).

### Step 3 — Wait & watch propagation
1. Open `https://whatsmydns.net/#A/woodex.com.pk` — click Search — green ticks worldwide = propagated (usually 5–60 min, up to 24 h).
2. Meanwhile the temporary URL keeps working — you lose nothing while waiting.

### Step 4 — Verify the live site
1. Open `https://woodex.com.pk/` → must be the **new** site (title: *Woodex Interior | Design, Fit-Out & Architecture Lahore*), padlock visible.
2. Re-run **five boxes** of Part 2 on the real domain: homepage, one inner page, contact form, admin login, chat bubble.
3. Check an old-site URL redirects instead of 404: e.g. `https://woodex.com.pk/services/` should land on the new services page (old links are 301-mapped automatically).

### Step 5 — Google cleanup (same day)
1. [Google Search Console](https://search.google.com/search-console) → property `woodex.com.pk` → **Sitemaps** → submit `sitemap.xml`.
2. URL Inspection → `woodex.com.pk` → **Request indexing**.
3. The old site had junk/spam URLs indexed — after cutover they return our 404 page; in GSC use URL Inspection → *Remove* (temporary removal) on a few of them if they still appear.

### Step 6 — Email final check
Send yourself a quotation email to the real domain address (`info@woodex.com.pk`) — arrives in inbox (check Spam once).

---

# PART 4 — After go-live (routine)

| When | What |
|---|---|
| Nightly 03:00 | automatic backup runs (keep: last 14 days) |
| Weekly (1 min) | dashboard → **Backups** → confirm a fresh row exists |
| When editing site | dashboard → publish is instant — no FTP, no re-upload |
| Never | don't share `/config/`, `backups/`, `sql/` URLs — they're blocked by design |

**If you ever need a restore:** File Manager → upload the zip into `backups/` → tell me → we restore together.

---

## Troubleshooting (most likely → fix)

| Symptom | Fix |
|---|---|
| *Database is not configured yet* (503) | open `/install.php` — you skipped Step 4 |
| *already installed* on install.php | correct — it finished; sign in at `/admin/` |
| Installer: *Access denied* on database | wrong name/user/password — re-copy **full** prefixed name from hPanel (Step 1) |
| Installer: *Could not write config* | `config/` folder not writable → File Manager → folder → Permissions → 755 |
| Dashboard page is blank | hard refresh `Ctrl+Shift+R`; still blank → PHP version (Step 2) |
| Email button says *Could not send* | mailbox not created yet (Step 6) or `config/config.php` `mail.user/pass` empty |
| No zip after cron | command must start with `curl` and the `key=` must match the success screen; domain in URL must be the live one after cutover |
| Chat bubble missing | hard refresh; confirm `assets/js/wx-chat.js` exists (Step 3 extract worked) |
| Old site still shows after DNS | propagation not finished — re-check whatsmydns; also clear your own cache/VPN |

---
*Package built from branch `arena/01a0e87c-marketingwoodex` — H1–H6 complete (redirects, database, 33-function API, auth headers, backup cron, live chat + email). Deployment itself requires my explicit GO.*
