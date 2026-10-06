WOODEX P20: ONE ZIP FOR HOSTINGER + DEMO LOGINS
================================================
File: woodex-p20-upload.zip (website files at the top level, ready for public_html)
Not included (on purpose): your database, _private/db.json (real password), any .sql dump.
Your existing database and data are kept.

UPLOAD (5 minutes)
1. hPanel -> Advanced -> PHP Configuration -> PHP 8.2 -> Save   (works on 7.4 too, 8.2 is faster)
2. hPanel -> File Manager -> open public_html (you should see index.html, api/, admin/)
   Optional backup: select all -> Compress -> download.
3. Upload woodex-p20-upload.zip -> right-click -> Extract -> leave folder EMPTY (current folder) -> tick Overwrite.
4. Delete woodex-p20-upload.zip, and delete public_html/woodex-release/ if it exists.
5. Check: open https://woodex.com.pk/wx-check.php -> all green.

DEMO LOGINS (for testing)
6. Open https://woodex.com.pk/wx-demo.php
7. Enter your DATABASE password (hPanel -> Databases -> MySQL) -> "Create / reset demo logins".
8. Sign in at https://woodex.com.pk/admin/  (press Ctrl+F5 first)

   Role    Email                    Password
   Owner   owner@demo.woodex.pk     Demo@Woodex2026
   Admin   admin@demo.woodex.pk     Demo@Woodex2026
   Sales   sales@demo.woodex.pk     Demo@Woodex2026
   Editor  editor@demo.woodex.pk    Demo@Woodex2026

   Demo logins stop working automatically after 7 days (re-run step 7 to extend).

AFTER TESTING (important)
- wx-demo.php -> "Remove demo accounts"
- File Manager: delete wx-demo.php and wx-check.php
- Sign in with your real Owner account -> My security -> change password, turn on 2FA.
- Change your database password (hPanel -> Databases) and update public_html/_private/db.json "pass".
- Paste the Meta App secret: Admin -> Live chat -> Train AI -> WhatsApp (needed for WhatsApp).

What's new in P20: P19 + security fixes, PHP 8 crash fix (login 500), PHP 7.4 compatibility,
server check page, demo logins with auto-expiry, feature guide (/admin/features.html).
