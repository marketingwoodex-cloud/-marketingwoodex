WOODEX WEBSITE: RELEASE PACKAGE (P19 + security build)
========================================================
woodex-release/
  site-files/   -> goes INTO public_html (the website itself)
  database/     -> keep on your computer, NEVER upload to public_html
  README.txt    -> this file

UPLOAD (Hostinger hPanel -> File Manager)
1. Open public_html. Take a backup first (Admin -> Settings -> Backups, or zip public_html).
2. Upload  woodex-site-files.zip  (same content as site-files/, already zipped
   with the files at the top level), right-click -> Extract -> into public_html -> tick Overwrite.
   (If you upload this whole release zip instead, move everything from site-files/ up into
    public_html so that index.html sits DIRECTLY in public_html.)
3. Final layout must be:
     public_html/index.html     <- home page (entry page)
     public_html/.htaccess
     public_html/admin/         <- admin dashboard  (https://woodex.com.pk/admin/)
     public_html/api/           <- PHP back-end (admin.php, forms.php, chat.php, whatsapp.php ...)
     public_html/builder/       <- page builder
     public_html/assets/        <- css, js, images, uploads
     public_html/_private/      <- settings + secrets (blocked from the web by its .htaccess)
     public_html/about/, lahore/, interior-design/ ... (website pages)
4. Press Ctrl+F5 on the site.

FIRST TIME ONLY (new server)
- Open https://woodex.com.pk/admin/ and complete Setup: enter the database name, user and password.
  The password is saved to public_html/_private/db.json (web access blocked). It is NOT in this package.
- config.example.php and _private/db.example.json show the format (placeholders only).

IF YOU SEE "Server error (500)"
- Open https://woodex.com.pk/wx-check.php : it shows the PHP version, database connection and the real error.
- Most common fix: hPanel -> Advanced -> PHP Configuration -> PHP 8.2 (the admin needs PHP 8.0+).
- No SQL import is needed: Admin Setup creates all tables. Delete wx-check.php when done (button on the page).

AFTER UPLOAD (checks)
- Admin -> Settings -> System check: everything green.
- Admin -> Live chat -> Train AI -> WhatsApp: paste the Meta App secret (required).
- cPanel cron (every 10 min): https://woodex.com.pk/api/wa-cron.php?key=<key shown in Admin>
- Hidden files: in File Manager turn on "Show hidden files" to see .htaccess.

NEVER put in public_html: database/*.sql, real passwords, this README's database folder.
Feature guide: /admin/features.html   UI kit: /admin/master-components.html
