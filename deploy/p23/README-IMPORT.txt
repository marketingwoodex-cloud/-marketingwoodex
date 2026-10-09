WOODEX DATABASE BACKUP — keep this file OUTSIDE public_html
=============================================================

What is in this zip
  woodex-database.sql      COMPLETE - 20 tables + starter data. Import this one.
  woodex-v20.sql           SAME 20 tables, no data. This is what /wx-install.php
                           runs by itself, so you do not need to import anything
                           if you use the installer.
  00-verify-import.sql     Run after importing: must answer 20.
  01-security-cleanup.sql  Run after importing: the dump seeds password "admin".
  02-login-recovery.sql    Only if /admin/ will not sign you in — 7 numbered checks
                           (who exists, am I locked out, is active=0, wrong db, ...).

Which file to import
  woodex-database.sql   COMPLETE — 20 tables + starter data (roles, settings,
                        templates, testimonials). Import this one.
  woodex-v20.sql        TABLES ONLY — what /wx-install.php runs by itself.
                        Use it only if you let the installer build the schema.

Hostinger (hPanel) — 6 steps
  1. Websites -> Dashboard -> Databases -> Management -> Create MySQL database
     name: woodex   user: woodex   password: (choose a strong one)
     Hostinger prefixes them, e.g. u128159657_woodex / u128159657_woodex
  2. Open phpMyAdmin for that database (same screen).
  3. Select the database in the left column -> tab "Import".
  4. Choose "woodex-database.sql" -> Go.  (both files are ~14 KB and ~7 KB,
     far below the 256 MB phpMyAdmin limit, so the import is instant)
  5. Check the left column: 20 tables starting with wx_ must be listed
     (wx_users, wx_settings, wx_leads, wx_quotes, wx_invoices, wx_chats ...).
  6. Delete this zip from the server. Never leave a .sql file inside public_html.

READ THIS BEFORE YOU IMPORT (important)
-------------------------------------------------------------
woodex-database.sql ships SIX logins whose password is the single word "admin":
    1  master@woodex.pk      owner       4  sales@woodex.pk      sales
    2  manager@woodex.pk     admin       5  support@woodex.pk    support
    3  developer@woodex.pk   editor      6  admin@woodex.pk      owner
The hash is bcrypt("admin") - verified against the code's own login path
(password_verify in api/admin.php, "login" case) with a real bcrypt library. Importing this file as-is onto a live
domain means anyone can sign in as owner. Pick one:

  A. Best: import, then run https://woodex.com.pk/wx-install.php and create your
     own owner login, then delete those demo rows in Admin -> Team & Roles.
     Use THAT page and not the Setup screen at /admin/ : wx-install.php notices an
     existing email and UPDATEs its password (name, pass_hash, role='owner',
     active=1, pw_ver+1). The in-app setup case deliberately refuses to overwrite a
     login that already exists — it answers "Database connected. Your existing
     accounts are kept" and your typed password is ignored. That is not an error,
     but it does leave password "admin" active on those rows, so pick A/B/C anyway.
  B. Lock them out at once (phpMyAdmin -> SQL tab):
        UPDATE wx_users SET active = 0;
  C. Remove them and let the installer create the only login:
        DELETE FROM wx_users;
  D. Skip the user table entirely: delete the INSERT INTO `wx_users` block from
     the .sql before importing (the INSERT INTO `wx_users` block, lines 276-282
     of woodex-database.sql - 6 value rows, keep the trailing semicolon on line 282).

Never leave wx-install.php on the server: on an empty user table it creates
admin / admin. Delete it right after setup.

Notes
  * Both dumps were checked against the PHP code: same 20 tables, and every column
    api/*.php INSERTs or UPDATEs exists (the 8 extra chat columns are added by the
    app on first run). woodex-database.sql has 2 cosmetic extras on wx_users
    (totp_on, totp_secret) that the code does not use in SQL - 2FA state lives in
    _private/*.json - so the drift is harmless.
  * Neither file contains CREATE DATABASE / USE / DROP TABLE statements, so
    importing into the database you created in step 1 is safe and cannot wipe
    an existing database.
  * Bigger than 256 MB later? Import over SSH instead:
       mysql -u u128159657_woodex -p u128159657_woodex < woodex-database.sql
  * After the import, connect the site: open https://woodex.com.pk/wx-install.php
    and type the database password once (it writes public_html/_private/db.json),
    or use the Setup screen at https://woodex.com.pk/admin/ .
    Do NOT put the password in config.php or .env inside the web root.
  * Login afterwards is the owner email + password you chose in the installer.
    If you used the fallback path on an empty user table it is admin / admin -
    change that immediately in Admin -> My security.
  * "Wrong email or password" after all that? 429 "Too many attempts" is the other
    common cause: throttle() locks an IP after 8 bad tries for 600 s. Run
    02-login-recovery.sql step 2 (DELETE FROM wx_throttle) to clear it now.
