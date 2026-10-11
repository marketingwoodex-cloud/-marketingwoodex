-- =====================================================================
-- WOODEX ARCHITECTURE & LUXURY INTERIOR - COMPLETE PRODUCTION DATABASE
-- Domain: woodex.com.pk
-- Compatible with Hostinger MySQL 5.7+ / 8.0+ & MariaDB 10.3+
-- Includes: All 22+ Tables, Pre-seeded Team Roles, CRM Leads, 
--           Bilingual Templates, Verified Testimonials & Settings.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users & Team Accounts Table
CREATE TABLE IF NOT EXISTS `wx_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `role` VARCHAR(20) NOT NULL DEFAULT 'editor',
  `pass_hash` VARCHAR(255) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `pw_ver` INT NOT NULL DEFAULT 1,
  `totp_on` TINYINT(1) NOT NULL DEFAULT 0,
  `totp_secret` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL,
  `last_login` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Activity & Audit Trail Table
CREATE TABLE IF NOT EXISTS `wx_activity` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_name` VARCHAR(120) NULL,
  `action` VARCHAR(60) NOT NULL,
  `target` VARCHAR(255) NULL,
  `ip` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL,
  INDEX `idx_act_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. System Settings Table
CREATE TABLE IF NOT EXISTS `wx_settings` (
  `k` VARCHAR(80) PRIMARY KEY,
  `v` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Rate Limiting & Throttle Table
CREATE TABLE IF NOT EXISTS `wx_throttle` (
  `ip` VARCHAR(64) PRIMARY KEY,
  `n` INT NOT NULL,
  `t` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CRM Leads Table
CREATE TABLE IF NOT EXISTS `wx_leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `created_at` DATETIME NOT NULL,
  `source` VARCHAR(30) NOT NULL,
  `page` VARCHAR(200) NULL,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(40) NULL,
  `email` VARCHAR(190) NULL,
  `service` VARCHAR(190) NULL,
  `message` TEXT NULL,
  `fields` TEXT NULL,
  `stage` VARCHAR(20) NOT NULL DEFAULT 'new',
  `assigned_to` INT NULL,
  `followup` DATE NULL,
  `value` BIGINT NOT NULL DEFAULT 0,
  `lost_reason` VARCHAR(190) NULL,
  `client_id` INT NULL,
  `tags` VARCHAR(400) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `ip` VARCHAR(64) NULL,
  `company` VARCHAR(120) NULL,
  `designation` VARCHAR(80) NULL,
  `location` VARCHAR(160) NULL,
  `line` VARCHAR(20) NULL,
  `lead_type` VARCHAR(20) NULL,
  `project_type` VARCHAR(60) NULL,
  `budget` VARCHAR(60) NULL,
  `area` VARCHAR(30) NULL,
  `priority` VARCHAR(10) NULL,
  `quote_status` VARCHAR(20) NULL,
  `last_contact` DATETIME NULL,
  `next_at` DATETIME NULL,
  `next_type` VARCHAR(20) NULL,
  INDEX `idx_leads_stage` (`stage`),
  INDEX `idx_leads_created` (`created_at`),
  INDEX `idx_leads_client` (`client_id`),
  INDEX `idx_leads_next` (`next_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Lead Notes Table
CREATE TABLE IF NOT EXISTS `wx_lead_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT NOT NULL,
  `t` DATETIME NOT NULL,
  `user_name` VARCHAR(120) NULL,
  `text` TEXT NOT NULL,
  `sys` TINYINT(1) NOT NULL DEFAULT 0,
  `kind` VARCHAR(20) NULL,
  `outcome` VARCHAR(190) NULL,
  INDEX `idx_ln_lead` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Clients Table
CREATE TABLE IF NOT EXISTS `wx_clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(40) NULL,
  `email` VARCHAR(190) NULL,
  `company` VARCHAR(120) NULL,
  `city` VARCHAR(80) NULL,
  `address` VARCHAR(300) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL,
  `type` VARCHAR(20) NULL,
  `source` VARCHAR(40) NULL,
  `tags` VARCHAR(400) NULL,
  `line` VARCHAR(20) NULL,
  `designation` VARCHAR(80) NULL,
  `updated_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Notifications Log Table
CREATE TABLE IF NOT EXISTS `wx_notify_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `t` DATETIME NOT NULL,
  `event` VARCHAR(12) NOT NULL,
  `ref` VARCHAR(120) NULL,
  `name` VARCHAR(160) NULL,
  `channel` VARCHAR(8) NOT NULL,
  `dest` VARCHAR(190) NOT NULL,
  `result` VARCHAR(255) NOT NULL,
  INDEX `idx_notify_t` (`t`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. WhatsApp Webhook Seen Cache Table
CREATE TABLE IF NOT EXISTS `wx_wa_seen` (
  `mid` VARCHAR(190) PRIMARY KEY,
  `t` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Message Templates Table
CREATE TABLE IF NOT EXISTS `wx_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(80) NOT NULL,
  `data` LONGTEXT NOT NULL,
  UNIQUE(`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Quotations Table
CREATE TABLE IF NOT EXISTS `wx_quotes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no` VARCHAR(30) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `data` LONGTEXT NOT NULL,
  INDEX `idx_quotes_no` (`no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Invoices Table
CREATE TABLE IF NOT EXISTS `wx_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no` VARCHAR(30) NOT NULL,
  `quote_id` INT NULL,
  `data` LONGTEXT NOT NULL,
  UNIQUE(`quote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Projects Table
CREATE TABLE IF NOT EXISTS `wx_projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `data` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Live Chats Table
CREATE TABLE IF NOT EXISTS `wx_chats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `token` CHAR(64) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `name` VARCHAR(120) NULL,
  `phone` VARCHAR(40) NULL,
  `email` VARCHAR(190) NULL,
  `page` VARCHAR(200) NULL,
  `ip` VARCHAR(64) NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'open',
  `mode` VARCHAR(10) NOT NULL DEFAULT 'ai',
  `agent_name` VARCHAR(120) NULL,
  `unread` INT NOT NULL DEFAULT 0,
  `needs` TINYINT NOT NULL DEFAULT 0,
  `last_text` VARCHAR(255) NULL,
  `lead_id` INT NULL,
  `alerted` TINYINT NOT NULL DEFAULT 0,
  `channel` VARCHAR(8) NOT NULL DEFAULT 'web',
  `vtype` DATETIME NULL,
  `atype` DATETIME NULL,
  INDEX `idx_chats_upd` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Chat Messages Table
CREATE TABLE IF NOT EXISTS `wx_chat_msgs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `chat_id` INT NOT NULL,
  `t` DATETIME NOT NULL,
  `who` VARCHAR(8) NOT NULL,
  `name` VARCHAR(120) NULL,
  `text` TEXT NOT NULL,
  `att` TEXT NULL,
  INDEX `idx_cmsgs_chat` (`chat_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Consultations & Site Bookings Table
CREATE TABLE IF NOT EXISTS `wx_bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `created_at` DATETIME NOT NULL,
  `lead_id` INT NULL,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `email` VARCHAR(190) NULL,
  `type` VARCHAR(20) NOT NULL,
  `city` VARCHAR(80) NULL,
  `address` VARCHAR(300) NULL,
  `d` DATE NOT NULL,
  `tm` CHAR(5) NOT NULL,
  `dur` SMALLINT NOT NULL DEFAULT 60,
  `status` VARCHAR(12) NOT NULL DEFAULT 'pending',
  `staff_id` INT NULL,
  `note` VARCHAR(1000) NULL,
  `src` VARCHAR(12) NULL,
  `reminded` TINYINT NOT NULL DEFAULT 0,
  INDEX `idx_bk_date` (`d`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. AI Assistant Logs & Unanswered Table
CREATE TABLE IF NOT EXISTS `wx_ai_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `t` DATETIME NOT NULL,
  `chat_id` INT NOT NULL,
  `kind` VARCHAR(12) NOT NULL,
  `reason` VARCHAR(20) NULL,
  INDEX `idx_aiev_t` (`t`),
  INDEX `idx_aiev_chat` (`chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wx_ai_unans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `t` DATETIME NOT NULL,
  `last_t` DATETIME NOT NULL,
  `chat_id` INT NULL,
  `q` VARCHAR(500) NOT NULL,
  `qkey` VARCHAR(120) NOT NULL,
  `n` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(10) NOT NULL DEFAULT 'open',
  INDEX `idx_aiun_stat` (`status`),
  INDEX `idx_aiun_key` (`qkey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Telegram Bot Webhook Bridge Table
CREATE TABLE IF NOT EXISTS `wx_tg_seen` (
  `uid` BIGINT PRIMARY KEY,
  `t` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wx_tg_map` (
  `msg_id` BIGINT NOT NULL,
  `chat_id` INT NOT NULL,
  `t` DATETIME NOT NULL,
  PRIMARY KEY (`msg_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Expense Log Table (v2.7) — the cash book: one voucher per row, GST and withholding separate
CREATE TABLE IF NOT EXISTS `wx_expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `spent_on` DATE NOT NULL,
  `category` VARCHAR(40) NOT NULL,
  `node` VARCHAR(8) NOT NULL DEFAULT 'LHR',
  `vendor` VARCHAR(160) NOT NULL DEFAULT '',
  `detail` VARCHAR(255) NOT NULL DEFAULT '',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `tax_pct` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `tax_amt` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `wht_amt` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `paid_by` VARCHAR(16) NOT NULL DEFAULT 'cash',
  `status` VARCHAR(12) NOT NULL DEFAULT 'paid',
  `project` VARCHAR(40) NOT NULL DEFAULT '',
  `receipt` VARCHAR(190) NOT NULL DEFAULT '',
  `recurring` TINYINT(1) NOT NULL DEFAULT 0,
  `note` VARCHAR(255) NOT NULL DEFAULT '',
  `created_by` VARCHAR(120) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NULL,
  INDEX `idx_exp_date` (`spent_on`),
  INDEX `idx_exp_cat` (`category`),
  INDEX `idx_exp_node` (`node`),
  INDEX `idx_exp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Expense Budgets Table (v2.7) — one monthly cap per category, for budget-versus-actual
CREATE TABLE IF NOT EXISTS `wx_expense_budgets` (
  `category` VARCHAR(40) PRIMARY KEY,
  `cap_month` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- PRE-SEEDED DATA: TEAM MEMBERS & DEMO ACCESS
-- Seeded rows are LOCKED: pass_hash above is deliberately not a valid bcrypt digest,
-- so no account can be signed into until a real password is set.
-- On a fresh server open /wx-install.php once: it creates the owner account and writes
-- _private/db.json. On an existing server use Admin -> Users -> Reset password,
-- or run /wx-demo.php on a throwaway database to load the demo team accounts.
-- =====================================================================

INSERT INTO `wx_users` (`id`, `name`, `email`, `role`, `pass_hash`, `active`, `pw_ver`, `created_at`) VALUES
(1, 'Master Admin', 'master@woodex.pk', 'owner', '$2y$10$LOCKED.SEED.THIS.HASH.IS.NOT.A.LOGIN.SET.A.PASSWORD.THROUGH.THE.ADMIN.000000', 1, 1, NOW()),
(2, 'Ar. Bilal Ahmed', 'manager@woodex.pk', 'admin', '$2y$10$LOCKED.SEED.THIS.HASH.IS.NOT.A.LOGIN.SET.A.PASSWORD.THROUGH.THE.ADMIN.000000', 1, 1, NOW()),
(3, 'Engr. Hamza Farooq', 'developer@woodex.pk', 'editor', '$2y$10$LOCKED.SEED.THIS.HASH.IS.NOT.A.LOGIN.SET.A.PASSWORD.THROUGH.THE.ADMIN.000000', 1, 1, NOW()),
(4, 'Usman Ali', 'sales@woodex.pk', 'sales', '$2y$10$LOCKED.SEED.THIS.HASH.IS.NOT.A.LOGIN.SET.A.PASSWORD.THROUGH.THE.ADMIN.000000', 1, 1, NOW()),
(5, 'Dr. Sarah Mansoor', 'support@woodex.pk', 'support', '$2y$10$LOCKED.SEED.THIS.HASH.IS.NOT.A.LOGIN.SET.A.PASSWORD.THROUGH.THE.ADMIN.000000', 1, 1, NOW()),
(6, 'Woodex Owner', 'admin@woodex.pk', 'owner', '$2y$10$LOCKED.SEED.THIS.HASH.IS.NOT.A.LOGIN.SET.A.PASSWORD.THROUGH.THE.ADMIN.000000', 1, 1, NOW())
ON DUPLICATE KEY UPDATE `pass_hash`=VALUES(`pass_hash`), `active`=1;

-- =====================================================================
-- PRE-SEEDED DATA: SYSTEM SETTINGS
-- =====================================================================

INSERT INTO `wx_settings` (`k`, `v`) VALUES
('site_title', 'Woodex Architecture & Luxury Interior'),
('site_phone', '+92 300 1234567'),
('site_email', 'info@woodex.com.pk'),
('site_address', 'Phase 6 Commercial, DHA Lahore, Pakistan'),
('ga4_id', 'G-WOODEX2026'),
('gsc_token', 'google0b104c3cfb7a4943.html'),
('theme_accent', '#d4af6a'),
('theme_mode', 'luxury-dark')
ON DUPLICATE KEY UPDATE `v`=VALUES(`v`);

-- =====================================================================
-- PRE-SEEDED DATA: VERIFIED CLIENT REVIEWS & TESTIMONIALS
-- =====================================================================

INSERT INTO `wx_clients` (`id`, `name`, `phone`, `email`, `company`, `city`, `address`, `notes`, `created_at`, `type`, `source`) VALUES
(1, 'Chaudhry Nadeem', '+92 300 8451122', 'nadeem@dha-lahore.pk', 'Nadeem Builders', 'Lahore', 'Sector J, Phase 6, DHA Lahore', '1 Kanal Contemporary Villa Interior & Turnkey Fit-out', NOW(), 'Residential', 'Website'),
(2, 'Malik Tariq Mehmood', '+92 321 4509988', 'tariq.malik@bahria.com.pk', 'Grand Horizon', 'Lahore', 'Sector C, Bahria Town, Lahore', '2 Kanal Luxury Classical Farmhouse Design', NOW(), 'Residential', 'Referral'),
(3, 'Syed Daniyal Shah', '+92 333 7788990', 'daniyal@gulbergventures.com', 'Gulberg FinTech', 'Lahore', 'Main Boulevard, Gulberg III, Lahore', '5,000 sq ft Commercial Corporate Office Fit-out', NOW(), 'Commercial', 'LinkedIn'),
(4, 'Mrs. Ayesha Haroon', '+92 301 6655443', 'ayesha.haroon@lakecity.pk', 'Private Residence', 'Lahore', 'Golf View Sector, Lake City, Lahore', '10 Marla Scandinavian Minimalist Villa Interiors', NOW(), 'Residential', 'Instagram')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- =====================================================================
-- PRE-SEEDED DATA: BILINGUAL NOTIFICATION & CLIENT UPDATE TEMPLATES
-- =====================================================================

INSERT INTO `wx_templates` (`name`, `data`) VALUES
('welcome_en', '{"title":"Welcome to Woodex","subject":"Welcome to Woodex Interior Studio","body":"Dear {name},\\n\\nThank you for choosing Woodex for your {project} project. Our senior design architect will connect with you within 2 business hours.\\n\\nBest regards,\\nWoodex Architecture & Luxury Interior"}'),
('welcome_ur', '{"title":"خوش آمدید (Urdu)","subject":"ووڈیکس انٹیریئر اسٹوڈیو میں خوش آمدید","body":"محترم {name} صاحب،\\n\\nووڈیکس کا انتخاب کرنے کا شکریہ۔ آپ کے {project} پراجیکٹ کے حوالے سے ہمارا سینئر آرکیٹیکٹ جلد آپ سے رابطہ کرے گا۔\\n\\nشکریہ،\\nووڈیکس آرکیٹیکچر"}'),
('milestone_en', '{"title":"Project Stage Milestone","subject":"Project Update: {project} has reached {stage}","body":"Dear {name},\\n\\nWe are pleased to inform you that your project {project} has successfully reached the {stage} stage. You can review the progress drawings on your client portal.\\n\\nWarm regards,\\nWoodex Project Team"}'),
('quote_ready', '{"title":"Quotation Ready","subject":"Your Custom Estimation & Scope for {project}","body":"Dear {name},\\n\\nYour itemized proposal and 3D architectural package for {project} is ready. Please find the attached scope details.\\n\\nSincerely,\\nSales & Estimations Team, Woodex"}')
ON DUPLICATE KEY UPDATE `data`=VALUES(`data`);

SET FOREIGN_KEY_CHECKS = 1;
