-- db/migrations/002_indexes.sql — composite indexes for the queries the screens actually run.
--
-- The analysis report found full table scans and N+1 reads on the busiest screens: the pipeline
-- loads every lead then filters in the browser, the chat inbox sorts unindexed, the invoice list
-- scans. An index is not a rewrite, so this is the cheapest real speed-up available — and every
-- index below exists because a named screen needs it.
--
-- MySQL has no CREATE INDEX IF NOT EXISTS, and re-running a migration must not fail, so each index
-- is guarded through information_schema. db/migrate.php records applied versions in wx_migrations,
-- but a fresh install can still meet an index that a manual fix already added.

/* Pipeline and lead list: WHERE stage = ? ORDER BY id DESC, and the board's GROUP BY stage. */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_leads ADD INDEX wx_leads_stage_created (stage, created_at)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_leads' AND index_name = 'wx_leads_stage_created');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Follow-ups: the dashboard's "stale lead" rule compares COALESCE(last_contact, created_at). */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_leads ADD INDEX wx_leads_contact (last_contact, stage)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_leads' AND index_name = 'wx_leads_contact');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* The enquiries table sorts by newest first and filters unread. */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_leads ADD INDEX wx_leads_read (is_read, created_at)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_leads' AND index_name = 'wx_leads_read');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Inbox: open chats, newest activity first (v2.1 had INDEX(updated_at) only). */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_chats ADD INDEX wx_chats_status_updated (status, updated_at)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_chats' AND index_name = 'wx_chats_status_updated');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Message threads are read newest-first per chat; (chat_id, id) already exists, this is the reverse
   scan the inbox performs when it shows the last line of each chat. */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_chat_msgs ADD INDEX wx_chat_msgs_recent (chat_id, t)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_chat_msgs' AND index_name = 'wx_chat_msgs_recent');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Quote and invoice lookups by number and status. Until migration 003 adds real columns, status is
   the only filterable field, which is exactly why the number search needs its index now. */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD INDEX wx_quotes_no_status (no, status)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND index_name = 'wx_quotes_no_status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD INDEX wx_invoices_no (no)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND index_name = 'wx_invoices_no');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Bookings calendar: day + status (v2.1 had INDEX(d) only). */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_bookings ADD INDEX wx_bookings_day_status (d, status)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_bookings' AND index_name = 'wx_bookings_day_status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Activity screen: newest-first, per user, filtered by action prefix. */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_activity ADD INDEX wx_activity_user_time (user_id, created_at)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_activity' AND index_name = 'wx_activity_user_time');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_activity ADD INDEX wx_activity_action (action, created_at)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_activity' AND index_name = 'wx_activity_action');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Session housekeeping: the request path prunes expired rows for the current user. */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_sessions ADD INDEX wx_sessions_user_expiry (user_id, expires_at)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_sessions' AND index_name = 'wx_sessions_user_expiry');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Clients are searched by name and phone from the client master. */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_clients ADD INDEX wx_clients_name (name)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_clients' AND index_name = 'wx_clients_name');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
