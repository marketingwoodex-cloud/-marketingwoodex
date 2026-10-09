-- WOODEX — DO THIS RIGHT AFTER IMPORTING woodex-database.sql
-- The dump ships 3 logins that all use the password "admin" (bcrypt hash
-- $2y$10$.xP9p.h.R3H7AaDj/... = "admin"). On a live domain that is an owner
-- account anyone can guess. Choose ONE block below and run it.

-- OPTION A (recommended): remove the seeded logins, then create your own at
-- https://woodex.com.pk/wx-install.php (it writes _private/db.json + your login)
DELETE FROM wx_users;

-- OPTION B: keep the rows (their CRM history links stay valid) but switch them off
-- UPDATE wx_users SET active = 0;

-- OPTION C: keep only the owner and force a password you choose now.
-- Replace  PutYourNewPasswordHere  with a real password first:
-- DELETE FROM wx_users WHERE email <> 'master@woodex.pk';
-- UPDATE wx_users SET pass_hash = '<paste a PHP password_hash() output here>', active = 1, pw_ver = pw_ver + 1
--  WHERE email = 'master@woodex.pk';
-- (Generate the hash: Admin -> My security -> Change password, or php -r "echo password_hash('...', PASSWORD_DEFAULT);")

-- Also clear the two demo helpers once setup is done (they ask for the DB password,
-- but they should not stay on a live site): delete wx-install.php and wx-demo.php.
