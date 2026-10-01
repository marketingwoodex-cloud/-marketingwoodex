# Woodex: Phase 17 final upload (plain-English steps)

**File:** `woodex-live-p17-full.zip` (13 MB). It **replaces** the p16 zip, so you don't need to upload p16 first.
**Safe for your data:** the zip has **no** database, users, leads, quotes, invoices or saved settings. Everything already on the live site stays.
**Database:** nothing to do. New tables and columns (projects, bookings, invoice tracking, lead fields) are added **automatically** the first time you open them.

---

## Part 1: Upload (about 5 minutes)

1. **Back up first.** In Hostinger go to **Websites → Manage → Files → Backups** and click **Generate new backup**. Wait for it to finish.
2. Open **File Manager** and go into **public_html**.
3. Click **Upload** and choose `woodex-live-p17-full.zip`. Wait for 100%.
4. Right-click the zip and choose **Extract**. Leave the folder as `.` and **tick "Overwrite existing files"**.
5. Delete the zip from public_html.
6. Open **https://woodex.com.pk/admin/** and press **Ctrl + F5**.

## Part 2: Check it works (about 10 minutes)

1. **Settings → System:** every line should be green.
2. **Enquiries & leads:** the new tracker columns (company, designation, line, assigned to, quotation, action, meeting) and the monthly counters should show.
3. **Settings → Company:** check the banks (Alfalah for WI, Meezan for WF), JazzCash / Easypaisa, and the signatories (Imtiaz Ahmad, Nabeel Afzal). Fix anything that's wrong.
4. **Quotes & invoices → New quotation:** pick a type (Fit-out / Renovation / Interior / Proposal / Furniture) and check the live preview on the right. Print one as a test. It should fit A4 with the signature block.
5. **Invoice tracker:** the monthly totals bar should show.
6. **Bookings:** open the settings and check the hours (Mon–Sat, 10:00–7:30). Then open **https://woodex.com.pk/book-a-visit/** in a private window and make a test booking. It should appear under Bookings and as a lead.
7. **Content → Page templates:** click **Create starter templates**.
8. **Content → Testimonials → Pages & heading:** choose a design and the pages, then press **Update website**.
9. Send a test enquiry from the Contact page.

## Part 3: Import your old sheets (optional)

**Enquiries & leads → Import:** choose your lead sheet (CSV or Excel saved as CSV). You'll see a **preview before anything is saved**, and duplicate rows are skipped automatically. Do the same for the invoice tracker.

## Part 4: First sign-in for marketing.woodex@gmail.com

1. Sign in as the owner. Go to **Users → All users → Add user**, enter `marketing.woodex@gmail.com`, pick a role (for example **Admin** or **Sales**) and type any temporary password.
2. On the login page, the marketing person clicks **Forgot password**, enters that email and sets their own password from the email link. The temporary password then stops working.

No password is stored in the files.

---

**If something looks wrong:** restore the backup from step 1 (**Backups → Restore files**), then send me a screenshot.
