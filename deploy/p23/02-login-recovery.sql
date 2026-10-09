-- WOODEX — "I cannot sign in to /admin/" : run these top to bottom in phpMyAdmin
-- (hPanel -> Websites -> Databases -> Management -> phpMyAdmin -> pick the database
--  -> SQL tab). Each statement is safe to run as many times as you like.

-- 1) WHO IS IN THERE? active=0 or a hashed-to-'admin' row are the two usual causes.
--    pass_hash starting $2y$10$.xP9p.h = still the seeded password from the dump.
SELECT id, name, email, role, active, LEFT(pass_hash, 12) AS hash_prefix, pw_ver, last_login
FROM wx_users ORDER BY id;

-- 2) AM I LOCKED OUT? throttle() = 8 failures from one IP in 600 s -> HTTP 429
--    "Too many attempts — wait 10 minutes". This clears it immediately.
DELETE FROM wx_throttle;

-- 3) MAKE SURE THE ACCOUNT IS SWITCHED ON (login needs active=1).
UPDATE wx_users SET active = 1, role = 'owner' WHERE email = 'master@woodex.pk';

-- 4) NO SUCH ROW YET? Then the installer was never completed — that is the normal
--    way a login comes into existence. Open https://woodex.com.pk/wx-install.php ,
--    fill the Owner block once, and PHP creates the row with your password.
--    (If the row already exists, that same form UPDATEs its password rather than
--     failing on the unique email key — so re-running it is also the fix for
--     "I set the password but it still will not accept it".)

-- 5) RESET THE PASSWORD BY SQL (only if you cannot run wx-install.php).
--    Generate the hash on the server first — hPanel -> Code -> PHP CLI terminal:
--        php -r "echo password_hash('YOUR NEW PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
--    then paste the 60 chars between the quotes. pw_ver+1 signs you out everywhere,
--    which is what you want after a reset.
-- UPDATE wx_users SET pass_hash = '<PASTE HASH>', active = 1, pw_ver = pw_ver + 1
--   WHERE email = 'master@woodex.pk';

-- 6) IF THE WHOLE TABLE IS GONE (db.json points at the wrong database):
--    SELECT COUNT(*) FROM information_schema.tables
--      WHERE table_schema = DATABASE() AND table_name LIKE 'wx\_%';   -- must be 20
--    Then fix hPanel -> Databases (name/user/host must all be u128159657_woodex /
--    u128159657_woodex / localhost), or re-run /wx-install.php with the right values.
--    _private/db.json is the file that stores those connection values.

-- 7) AFTER YOU ARE IN: Admin -> My security -> change the password, turn on 2-step,
--    and delete the seeded accounts you do not use:
--    DELETE FROM wx_users WHERE email IN ('manager@woodex.pk','developer@woodex.pk',
--      'sales@woodex.pk','support@woodex.pk','admin@woodex.pk');
