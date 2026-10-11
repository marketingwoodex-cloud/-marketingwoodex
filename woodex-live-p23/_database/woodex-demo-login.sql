-- =============================================================================
--  DEMO LOGIN — one extra account for showing or testing the admin
-- -----------------------------------------------------------------------------
--  ADDITIVE ONLY. This file inserts one new row into `wx_users`. It does not
--  update, delete, rename or re-hash any existing row, and no other table is
--  touched. The six accounts seeded by `woodex-database.sql` keep their dead
--  `LOCKED.SEED` hashes and stay unusable, exactly as before.
--
--        email:     demo@woodex.pk
--        password:  Demo@Woodex2026
--        role:      owner          → every screen opens (see the note below)
--
--  The password is the same one `wx-demo.php` already ships, so there is a
--  single demo password to remember across both ways of creating demo access.
--
--  The hash is bcrypt, cost 10, written in the `$2y$10$` form PHP's
--  password_hash() produces, so `password_verify()` in api/admin.php accepts it.
--  It was verified against two independent bcrypt implementations (glibc crypt
--  via python3 and the bcryptjs reference build via Node): both accept the
--  correct password and reject a wrong one.
--
--  THIS ACCOUNT DOES NOT EXPIRE BY ITSELF
--  api/admin.php disables demo logins after seven days, but only for addresses
--  ending in `@demo.woodex.pk` (demo_expired()). `demo@woodex.pk` is not in that
--  set, so nothing will switch it off for you: run the DELETE at the bottom when
--  you are done, or use the `@demo.woodex.pk` accounts from /wx-demo.php
--  instead, which expire on their own and can be removed with one button.
--
--  Prefer a safer role? Replace 'owner' below with 'admin' (Manager — can do
--  everything except owner-only actions such as rejecting approvals, changing
--  permissions and deleting users) or 'sales'. The role can also be changed
--  afterwards in Admin → Users & roles.
-- =============================================================================

INSERT INTO `wx_users` (`name`, `email`, `role`, `pass_hash`, `active`, `pw_ver`, `created_at`)
VALUES ('Demo Login', 'demo@woodex.pk', 'owner',
        '$2y$10$tQfYp.tAYAkucPyUwKEel.bWS8bG/bcvg1hUcmNDP2KduNaeMFQDK',
        1, 1, NOW())
ON DUPLICATE KEY UPDATE
  `pass_hash` = VALUES(`pass_hash`),   -- re-running re-hashes the same password
  `role`      = 'owner',
  `active`    = 1,
  `pw_ver`    = `pw_ver` + 1;          -- +1 signs out any session that was already open

-- Confirm the row landed the way the login expects (role, active, 60-char bcrypt):
--   SELECT id, name, email, role, active, LENGTH(pass_hash) AS hash_len, created_at
--     FROM wx_users WHERE email = 'demo@woodex.pk';
--   expected: role=owner, active=1, hash_len=60
--
-- If sign-in still says "Wrong email or password":
--   SELECT email, active, LENGTH(pass_hash) FROM wx_users WHERE email = 'demo@woodex.pk';
--   · no row        → the import did not run against the database the site reads
--   · active 0      → set it back to 1 in the same UPDATE
--   · hash_len ≠ 60 → the hash line was edited on the way in; re-import this file
--
-- To check the password without PHP in the loop (Node available):
--   node tools/dev-user.mjs --check '<pass_hash from wx_users>' 'Demo@Woodex2026'

-- -----------------------------------------------------------------------------
--  CLEANUP — uncomment and run when the demo is over
-- -----------------------------------------------------------------------------
-- DELETE FROM `wx_users` WHERE `email` = 'demo@woodex.pk';
