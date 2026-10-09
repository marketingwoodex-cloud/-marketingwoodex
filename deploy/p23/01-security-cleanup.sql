-- WOODEX — DO THIS RIGHT AFTER IMPORTING woodex-database.sql
--
-- The dump ships SIX logins that all share one bcrypt hash
-- ($2y$10$.xP9p.h.R3H7AaDj/... = the word  admin ). On a live domain that is an
-- owner account anyone can guess. `00-verify-import.sql` can count rows, so run
-- this file BEFORE you try to sign in for the first time.
--
--   id 1 master@woodex.pk     owner     id 2 manager@woodex.pk    admin
--   id 3 developer@woodex.pk  editor    id 4 sales@woodex.pk      sales
--   id 5 support@woodex.pk    support   id 6 admin@woodex.pk      owner   <- published
--
-- (woodex-v20.sql additionally seeds one row whose "email" is the bare string
--  admin — not an address, so it can never sign in through the form.)
--
-- Choose ONE block below and run it.

-- OPTION A (recommended): remove the seeded logins, then create your own at
-- https://woodex.com.pk/wx-install.php (it writes _private/db.json + your login,
-- and it hashes the password in PHP — you never paste a hash).
DELETE FROM wx_users;

-- OPTION B: keep the rows (their CRM history links stay valid) but switch them off.
-- NOTE: login checks active=1, so this also locks YOU out until you turn one back on
-- with Option C.
-- UPDATE wx_users SET active = 0;

-- OPTION C: keep only the owner and give it a password you chose now.
-- Easiest correct route: skip this file, run /wx-install.php with your email — it
-- UPDATEs an existing email (name, pass_hash, role='owner', active=1, pw_ver+1)
-- instead of failing on the unique key. Only paste a hash here if you must:
--   php -r "echo password_hash('YOUR NEW PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
-- DELETE FROM wx_users WHERE email <> 'master@woodex.pk';
-- UPDATE wx_users SET pass_hash = '<PASTE A 60-CHAR $2y$ HASH>', active = 1,
--        role = 'owner', pw_ver = pw_ver + 1
--   WHERE email = 'master@woodex.pk';

-- Whichever option you pick, delete the two setup helpers when you are done (they
-- ask for the DB password, so they must not stay on a live site):
--   public_html/wx-install.php   and   public_html/wx-demo.php
