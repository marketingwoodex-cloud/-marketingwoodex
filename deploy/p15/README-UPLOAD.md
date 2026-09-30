# Woodex — Phase 15 upload (full site)

**File:** `woodex-live-p15-full.zip` (whole website, public pages + Admin + API)

**Safe on your server:** the zip does **not** contain `_private/` data. Your database login (`db.json`), content,
leads, backups and settings on Hostinger stay as they are.

> ⚠️ The zip **replaces every page file**. If you changed pages in the page builder on the live site after the
> last upload, those page edits will be overwritten. Step 1 makes a backup first.

---

## Step 1 — Backup (2 min)
1. Open `https://woodex.com.pk/admin/` → **Backups** → **Create backup** → **Download**.
   *(If the admin shows “Reconnect the database”, skip to Step 3 first, then come back.)*
2. Optional extra: hPanel → **Files → Backups** → generate a backup.

## Step 2 — Upload (5 min)
1. hPanel → **Websites → Dashboard → File Manager** → open `public_html`.
2. Click **Upload** → choose `woodex-live-p15-full.zip`.
3. Right-click the zip → **Extract** → folder `.` (public_html) → tick **Overwrite existing files** → **Extract**.
4. Delete the zip file from `public_html`.
5. Open the website and press **Ctrl + F5**.

## Step 3 — Fix the database error (only if you see one)
If the admin shows **“Reconnect the database”**:

1. hPanel → **Websites → Dashboard → Databases Management**.
2. **Old database still there?** Use it (best — keeps all leads, quotes, users):
   - Next to the database user click **⋮ → Change password**, set a new password, save it somewhere safe.
3. **Old database gone?** Create a new one: *Create a New MySQL Database and Database User*
   (e.g. name `woodexdb`, user `woodexuser`, strong password) → **Create**.
   A new database is empty: admin leads/quotes history starts fresh (website pages are not affected).
4. Open `https://woodex.com.pk/admin/` → the **Reconnect the database** form appears. Enter:
   - Host: `localhost`
   - Database name: e.g. `u128159657_woodex` (full name, with the `u128159657_` prefix)
   - Database user: e.g. `u128159657_woodex`
   - Database password: the one from step 2 or 3
   - Page-builder password: the password you used at first setup
5. Click **Test & reconnect**. If the database is new/empty it asks for your name, email and a new owner
   password — fill them and click again. Then sign in.

Never share the database password in chat or email.

## Step 4 — Check (5 min)
- [ ] Home page loads, menu opens on phone.
- [ ] Admin → sign in works.
- [ ] Admin → **Speed** → **Test key pages** (add a free Google key in *Settings & APIs → Google PageSpeed* first, otherwise Google may say “quota exceeded”).
- [ ] Send a test enquiry from the Contact page → it appears in **Enquiries & leads**.

## If something goes wrong
Re-upload your backup files (Step 1) the same way, or restore via Admin → Backups.
