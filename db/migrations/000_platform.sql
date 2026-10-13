-- db/migrations/000_platform.sql — the tables the v2 platform itself needs.
--
-- Why 000 and not part of 001: the plan numbers 001–010 for the schema work it describes (roles,
-- indexes, document columns, foreign keys, settings). This file is a prerequisite of the *platform*
-- rather than of the schema migration programme, and it must run first, so it takes 000. It keeps
-- 001–005 exactly the scope the plan promised.
--
-- Closes three v2.1 findings at once:
--   · the application secret lived in _private/config.json and regenerated itself on an empty read,
--     quietly invalidating every session (High) → wx_secrets with a checksum;
--   · sessions were stateless HMAC tokens with no server-side record, so "sign out this device" and
--     "who is signed in" were impossible → wx_sessions;
--   · login throttling was by IP only, so an attacker with many addresses could hammer one known
--     account → wx_login_attempts, keyed on the account.

/* ---------------------------------------------------------------- sessions
   id is sha256 of the cookie value, not the value itself: a database leak must not yield live
   sessions. pw_ver binds the session to the password it was minted under, so a password change ends
   every existing session without a second table. */
CREATE TABLE IF NOT EXISTS wx_sessions (
  id CHAR(64) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  pw_ver INT NOT NULL DEFAULT 1,
  csrf_hash CHAR(64) NOT NULL,
  ip VARCHAR(64) NULL,
  ua VARCHAR(200) NULL,
  created_at DATETIME NOT NULL,
  seen_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  INDEX wx_sessions_user (user_id, revoked_at),
  INDEX wx_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* --------------------------------------------------------------- secrets
   One row per purpose. The checksum makes silent corruption detectable: v2.1's
   `if (empty($c['secret'])) { $c['secret'] = bin2hex(random_bytes(32)); }` treated a damaged file as
   a fresh install, which logged everyone out and is why sessions appeared to expire at random. */
CREATE TABLE IF NOT EXISTS wx_secrets (
  k VARCHAR(64) NOT NULL PRIMARY KEY,
  v TEXT NOT NULL,
  checksum CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  rotated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ------------------------------------------------------- login attempts
   Keyed by sha256(email) — storing the address would put user data in a table that is written on
   every failed guess. 8 failures inside 15 minutes locks for 15 minutes (plan §6.3). */
CREATE TABLE IF NOT EXISTS wx_login_attempts (
  email_hash CHAR(64) NOT NULL PRIMARY KEY,
  n INT NOT NULL DEFAULT 0,
  first_at DATETIME NOT NULL,
  last_at DATETIME NOT NULL,
  locked_until DATETIME NULL,
  INDEX wx_login_attempts_locked (locked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* --------------------------------------------------- audit completeness
   Plan §6.4 rule 4 wants the request-id on every audited write, and the details of what changed
   ("which fields", "old stage") somewhere queryable. MySQL 8 has no ADD COLUMN IF NOT EXISTS, so the
   guard runs through information_schema and PREPARE. */
SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE wx_activity ADD COLUMN req_id VARCHAR(40) NULL',
    'DO 0'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'wx_activity' AND column_name = 'req_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE wx_activity ADD COLUMN meta_json VARCHAR(2000) NULL',
    'DO 0'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'wx_activity' AND column_name = 'meta_json'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE wx_activity ADD INDEX wx_activity_req (req_id)',
    'DO 0'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'wx_activity' AND index_name = 'wx_activity_req'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
