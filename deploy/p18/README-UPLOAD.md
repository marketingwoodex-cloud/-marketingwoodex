# Woodex P18: upload steps (Hostinger)

File: `woodex-live-p18-full.zip` (13.5 MB). It contains **no private data**: your leads, quotes, users and settings on the server stay safe.

1. **Back up first:** hPanel → Files → Backups → download today's backup (or, in Woodex Admin: System → Backups → Create backup).
2. Download the zip from GitHub (button **Download raw file**).
3. hPanel → **File Manager** → open `public_html`.
4. Click **Upload** → choose `woodex-live-p18-full.zip` → wait for 100%.
5. Right-click the zip → **Extract** → leave the folder empty (extract into `public_html`) → tick **Overwrite** → Extract.
6. Delete the zip from `public_html`.
7. Open the site and press **Ctrl + F5** (hard refresh). Do the same in `/admin/`.

## Quick check after upload (2 minutes)
- Home, About and Contact pages open; a wrong URL shows the Woodex 404 page.
- `/admin/` → sign in → Dashboard loads; **Inbox** opens and stays open after a browser refresh.
- Quotes: open a quotation → **Download PDF** (file is named by its number, e.g. WI-10100).
- `/builder/` → section cards show small layout previews.
- My account (top-right menu) → change your photo.
- WhatsApp automation: until WhatsApp Cloud API keys are added in Settings, messages are only queued (this is expected).

## What's new in P18
Rent/Advance on quotes and invoices, mega-menu colours plus the header/footer builder, media replace with auto WebP, chat pop-up with alerts, attachments and voice notes, Estimator and Forms tabs, professional AI tone (no prices, 10:00 am – 7:30 pm), 62 builder sections, UI kit and template export, WhatsApp automation, maintenance mode and error pages, file manager and database tools, blog editor, Integrations and API keys, Billing and Transactions pages, My account page, polished chat and builder.

If anything breaks: hPanel → Backups → restore the backup from step 1.
