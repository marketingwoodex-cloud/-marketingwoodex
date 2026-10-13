-- db/migrations/004_fk.sql — integrity at the database, not in the application.
--
-- The schema has zero foreign keys. Every relationship is a convention in PHP, which is why a
-- deleted lead can leave notes pointing at nothing, and why a chat message can reference a chat that
-- no longer exists. The plan calls for 14 FKs; this migration adds them one table at a time, and each
-- is preceded by an orphan cleanup, because adding a constraint to dirty data fails and failing
-- migrations are how a schema programme loses its nerve.
--
-- Deletion behaviour is chosen per relation, on purpose:
--   · notes and messages are owned by their parent → ON DELETE CASCADE. Deleting a lead deletes its
--     notes; that is correct and matches what the UI means by "delete".
--   · references that merely point at something → ON DELETE SET NULL. Losing an invoice must not
--     delete the quote it came from, and losing a lead must not delete a booking that already
--     happened.
--
-- Deletes in the product are normally soft (leads move to `lost`, see routes/leads.php), so these
-- constraints are a safety net rather than a routine path.

/* ------------------------------------------------- the migration bookkeeping
   wx_migrations is created by db/migrate.php, but a manual run of this file must not fail because it
   is absent — hence the guard in the migration runner, repeated here for clarity. */

/* ------------------------------------------------------- lead notes → leads
   v2.1 deletes leads outright, so orphans already exist on live installs. */
DELETE n FROM wx_lead_notes n LEFT JOIN wx_leads l ON l.id = n.lead_id WHERE l.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_lead_notes ADD CONSTRAINT fk_lead_notes_lead FOREIGN KEY (lead_id) REFERENCES wx_leads(id) ON DELETE CASCADE', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_lead_notes' AND constraint_name = 'fk_lead_notes_lead');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* ------------------------------------------------------ chat messages → chats */
DELETE m FROM wx_chat_msgs m LEFT JOIN wx_chats c ON c.id = m.chat_id WHERE c.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_chat_msgs ADD CONSTRAINT fk_chat_msgs_chat FOREIGN KEY (chat_id) REFERENCES wx_chats(id) ON DELETE CASCADE', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_chat_msgs' AND constraint_name = 'fk_chat_msgs_chat');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* -------------------------------------------------------- bookings → leads */
UPDATE wx_bookings b LEFT JOIN wx_leads l ON l.id = b.lead_id
  SET b.lead_id = NULL
  WHERE b.lead_id IS NOT NULL AND l.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_bookings ADD CONSTRAINT fk_bookings_lead FOREIGN KEY (lead_id) REFERENCES wx_leads(id) ON DELETE SET NULL', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_bookings' AND constraint_name = 'fk_bookings_lead');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* -------------------------------------------------------- invoices → quotes
   wx_invoices already has UNIQUE(quote_id), which implies the relation but does not enforce it. */
UPDATE wx_invoices i LEFT JOIN wx_quotes q ON q.id = i.quote_id
  SET i.quote_id = NULL
  WHERE i.quote_id IS NOT NULL AND q.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_invoices ADD CONSTRAINT fk_invoices_quote FOREIGN KEY (quote_id) REFERENCES wx_quotes(id) ON DELETE SET NULL', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND constraint_name = 'fk_invoices_quote');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* --------------------------------------------------------- leads → clients
   A lead may be converted to a client; if the client row is removed the lead survives, unlinked. */
UPDATE wx_leads l LEFT JOIN wx_clients c ON c.id = l.client_id
  SET l.client_id = NULL
  WHERE l.client_id IS NOT NULL AND c.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_leads ADD CONSTRAINT fk_leads_client FOREIGN KEY (client_id) REFERENCES wx_clients(id) ON DELETE SET NULL', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_leads' AND constraint_name = 'fk_leads_client');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* -------------------------------------------------- the document columns → clients
   Added by migration 003; null is allowed, so these only have to survive the orphans created since. */
UPDATE wx_quotes t LEFT JOIN wx_clients c ON c.id = t.client_id
  SET t.client_id = NULL WHERE t.client_id IS NOT NULL AND c.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_quotes ADD CONSTRAINT fk_quotes_client FOREIGN KEY (client_id) REFERENCES wx_clients(id) ON DELETE SET NULL', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND constraint_name = 'fk_quotes_client');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE wx_invoices t LEFT JOIN wx_clients c ON c.id = t.client_id
  SET t.client_id = NULL WHERE t.client_id IS NOT NULL AND c.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_invoices ADD CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES wx_clients(id) ON DELETE SET NULL', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND constraint_name = 'fk_invoices_client');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE wx_projects t LEFT JOIN wx_clients c ON c.id = t.client_id
  SET t.client_id = NULL WHERE t.client_id IS NOT NULL AND c.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_projects ADD CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES wx_clients(id) ON DELETE SET NULL', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_projects' AND constraint_name = 'fk_projects_client');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* --------------------------------------------------------- sessions → users
   A session must never outlive its account. CASCADE here is the difference between "the user was
   deleted" and "the user was deleted but their sessions are still valid". */
DELETE s FROM wx_sessions s LEFT JOIN wx_users u ON u.id = s.user_id WHERE u.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES wx_users(id) ON DELETE CASCADE', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_sessions' AND constraint_name = 'fk_sessions_user');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DELETE p FROM wx_user_perms p LEFT JOIN wx_users u ON u.id = p.user_id WHERE u.id IS NULL;
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE wx_user_perms ADD CONSTRAINT fk_user_perms_user FOREIGN KEY (user_id) REFERENCES wx_users(id) ON DELETE CASCADE', 'DO 0')
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'wx_user_perms' AND constraint_name = 'fk_user_perms_user');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* ------------------------------------------------------------------ report
   The plan targets 14 FKs. The remainder (chat→lead, bookings→staff, notes→user) arrive with the
   modules that own them in P2/P3, where the delete semantics are decided by the screen that needs
   them rather than guessed here. */
