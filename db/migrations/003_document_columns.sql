-- db/migrations/003_document_columns.sql — make money queryable.
--
-- wx_quotes, wx_invoices and wx_projects store the entire business document as LONGTEXT JSON:
-- client, line items, subtotal, tax, total, dates. The database therefore cannot answer "what did we
-- quote in August", cannot enforce that a total is a number, and cannot be audited by SQL. The plan's
-- rule is that the JSON stays as `payload` for compatibility while real columns take over, and that
-- nothing drops a column in the same release that stops writing to it.
--
-- These columns are nullable and additive; the backfill is a separate, re-runnable script
-- (db/backfill_documents.php) because a data migration inside schema DDL is how releases stall.
--
-- NOTE ON MONEY: totals are stored as BIGINT paisa (1/100 rupee), matching the validation layer
-- (wx_v_money). A DECIMAL column would be defensible; an integer is exact, sorts correctly and
-- cannot be misread as rupees by a client that forgets the scale.

/* ------------------------------------------------------------------ quotes */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD COLUMN client_id INT NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'client_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD COLUMN project VARCHAR(190) NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'project');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD COLUMN subtotal BIGINT NOT NULL DEFAULT 0', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'subtotal');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD COLUMN tax BIGINT NOT NULL DEFAULT 0', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'tax');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD COLUMN total BIGINT NOT NULL DEFAULT 0', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'total');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD COLUMN currency CHAR(3) NOT NULL DEFAULT ''PKR''', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'currency');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD COLUMN issued_at DATETIME NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'issued_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD COLUMN valid_until DATE NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'valid_until');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD COLUMN pdf_sha256 CHAR(64) NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'pdf_sha256');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* ---------------------------------------------------------------- invoices */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN client_id INT NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'client_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN project VARCHAR(190) NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'project');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN subtotal BIGINT NOT NULL DEFAULT 0', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'subtotal');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN tax BIGINT NOT NULL DEFAULT 0', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'tax');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN total BIGINT NOT NULL DEFAULT 0', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'total');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN paid BIGINT NOT NULL DEFAULT 0', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'paid');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN currency CHAR(3) NOT NULL DEFAULT ''PKR''', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'currency');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN issued_at DATETIME NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'issued_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN due_at DATE NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'due_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD COLUMN pdf_sha256 CHAR(64) NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'pdf_sha256');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* ---------------------------------------------------------------- projects */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_projects ADD COLUMN client_id INT NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_projects' AND column_name = 'client_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_projects ADD COLUMN name VARCHAR(190) NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_projects' AND column_name = 'name');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_projects ADD COLUMN stage VARCHAR(20) NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_projects' AND column_name = 'stage');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_projects ADD COLUMN value BIGINT NOT NULL DEFAULT 0', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_projects' AND column_name = 'value');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_projects ADD COLUMN started_at DATE NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_projects' AND column_name = 'started_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_projects ADD COLUMN due_at DATE NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_projects' AND column_name = 'due_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Rename `data` to `payload` only where that has not happened yet: the plan keeps the JSON for
   compatibility, and a rename is the honest name for it once real columns exist. */
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'payload') = 0
    AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND column_name = 'data') > 0,
    'ALTER TABLE wx_quotes CHANGE COLUMN `data` `payload` LONGTEXT NOT NULL', 'DO 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'payload') = 0
    AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND column_name = 'data') > 0,
    'ALTER TABLE wx_invoices CHANGE COLUMN `data` `payload` LONGTEXT NOT NULL', 'DO 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_projects' AND column_name = 'payload') = 0
    AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wx_projects' AND column_name = 'data') > 0,
    'ALTER TABLE wx_projects CHANGE COLUMN `data` `payload` LONGTEXT NOT NULL', 'DO 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Indexes on the new columns, so the reports they exist for are actually fast. */
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_quotes ADD INDEX wx_quotes_issued (issued_at, status)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_quotes' AND index_name = 'wx_quotes_issued');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD INDEX wx_invoices_issued (issued_at, due_at)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND index_name = 'wx_invoices_issued');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE wx_invoices ADD INDEX wx_invoices_client (client_id)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'wx_invoices' AND index_name = 'wx_invoices_client');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
