# Woodex: Phase 16 final upload (plain-English steps)

**File:** `woodex-live-p16-full.zip` (13 MB). It replaces all earlier zips.
**Safe for your data:** it contains **no** database, users, leads, quotes or saved settings. Everything you created on the live site stays.

---

## Part 1: Upload (about 5 minutes)

1. **Take a backup first.** In Hostinger go to **Websites → Manage → Files → Backups** and click **Generate new backup**. Wait for it to finish.
2. Open **File Manager** and go into the **public_html** folder.
3. Click **Upload** and choose `woodex-live-p16-full.zip`. Wait for 100%.
4. Right-click the zip, choose **Extract**, leave the folder as `.` (public_html itself) and **tick "Overwrite existing files"**.
5. Delete the zip from public_html after extracting.
6. Open **https://woodex.com.pk** and press **Ctrl + F5** to clear the old cached version.

## Part 2: Check it works (about 5 minutes)

1. Go to **https://woodex.com.pk/admin/** and sign in.
2. Open **Settings → System** (System check). **Every line should be green.** If one is red, the message tells you what to fix.
3. Open **Pages & builder → Redirects**. You should see **36 rules** and **Problems: 0**.
4. Test these in a private/incognito window:
   - `https://www.woodex.com.pk/about/` should change to `https://woodex.com.pk/about/`
   - `https://woodex.com.pk/portfolio/` should open **Projects**
   - `https://woodex.com.pk/contact/` should open **Contact** normally
5. Open **Pages & builder → Page builder**, then the **Sections** tab. The template list should include the **"UI kit · …"** groups.
6. Send yourself a test enquiry from the Contact page. It should appear in **Enquiries & leads**.

## Part 3: Two jobs outside the website (10 minutes, do them once)

### A. Remove the wrong subdomain `interior.woodex.com.pk`
It currently shows another company (in Dubai) on your domain.
1. In Hostinger go to **Domains → woodex.com.pk → DNS / Nameservers → DNS records**.
2. Find the record named **interior** (type A or CNAME).
3. Click **Delete**. It disappears within a few hours.

### B. Clean up Google (Search Console)
1. Open **https://search.google.com/search-console** and choose woodex.com.pk.
2. **Sitemaps:** enter `sitemap.xml` and click **Submit**.
3. **Removals → New request → Temporarily remove URL**, one at a time, for the hacked spam pages:
   - `https://woodex.com.pk/gratis-gokkasten-spelen-netent/`
   - `https://woodex.com.pk/777-nl-casino-nl-2025-review/`
   - `https://woodex.com.pk/Figuren-itm-60842/` (choose "Remove all URLs with this prefix")
   - `https://woodex.com.pk/He&/`
4. The site now tells Google these are **gone for good (410)**, so they drop out permanently within a few weeks.

## Part 4: Edit before you use them
The new page-builder **UI kit** blocks use sample text. Before you publish a page that uses one, change the numbers (200+ projects, 4.9★, 180+ reviews), prices, team names, reviews, the phone number `923000000000` and the map to your real details.

## After go-live: once a week
Open **Redirects → 404 monitor**. It lists addresses visitors tried that don't exist. Click **Redirect this** on the top ones, choose the right page, then **Save & publish**.

---

**If something goes wrong:** restore the backup from Part 1, step 1 (**Backups → Restore**). Your site is back exactly as before in a few minutes.
