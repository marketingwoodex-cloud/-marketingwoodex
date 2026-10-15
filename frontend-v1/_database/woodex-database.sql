-- ============================================================================
-- WOODEX INTERIOR — PRODUCTION DATABASE DEFINITION (V2.1 PRO)
-- Complete 25-table relational schema with full indexing & constraints.
-- Designed for MySQL 8.0+ / MariaDB 10.4+ on Hostinger.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS `wx_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `role` VARCHAR(20) NOT NULL DEFAULT 'editor',
  `pass_hash` VARCHAR(255) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `pw_ver` INT NOT NULL DEFAULT 1,
  `google_sub` VARCHAR(120) NULL,
  `google_email` VARCHAR(190) NULL,
  `created_at` DATETIME NOT NULL,
  `last_login` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Audit Trail & Activity Feed
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

-- 3. Key-Value Settings Bag
CREATE TABLE IF NOT EXISTS `wx_settings` (
  `k` VARCHAR(80) PRIMARY KEY,
  `v` LONGTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Rate Limiting & Throttling
CREATE TABLE IF NOT EXISTS `wx_throttle` (
  `ip` VARCHAR(64) PRIMARY KEY,
  `n` INT NOT NULL,
  `t` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CRM Leads & Enquiries
CREATE TABLE IF NOT EXISTS `wx_leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `created_at` DATETIME NOT NULL,
  `source` VARCHAR(30) NOT NULL DEFAULT 'web',
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

-- 6. Lead Activity Notes
CREATE TABLE IF NOT EXISTS `wx_lead_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT NOT NULL,
  `t` DATETIME NOT NULL,
  `user_name` VARCHAR(120) NULL,
  `text` TEXT NOT NULL,
  `sys` TINYINT(1) NOT NULL DEFAULT 0,
  `kind` VARCHAR(20) NULL,
  `outcome` VARCHAR(190) NULL,
  INDEX `idx_notes_lead` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Client Directory (Client 360)
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

-- 8. Notification & Delivery Log
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

-- 9. WhatsApp Webhook De-duplication
CREATE TABLE IF NOT EXISTS `wx_wa_seen` (
  `mid` VARCHAR(190) PRIMARY KEY,
  `t` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Quotation & Page Templates
CREATE TABLE IF NOT EXISTS `wx_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(80) NOT NULL,
  `data` LONGTEXT NOT NULL,
  UNIQUE KEY `uniq_template_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Quotations
CREATE TABLE IF NOT EXISTS `wx_quotes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no` VARCHAR(30) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `data` LONGTEXT NOT NULL,
  INDEX `idx_quotes_no` (`no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Invoices & Billing
CREATE TABLE IF NOT EXISTS `wx_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no` VARCHAR(30) NOT NULL,
  `quote_id` INT NULL,
  `data` LONGTEXT NOT NULL,
  UNIQUE KEY `uniq_invoice_quote` (`quote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Studio Projects
CREATE TABLE IF NOT EXISTS `wx_projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `data` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Live Chat Sessions
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
  INDEX `idx_chat_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Live Chat Messages
CREATE TABLE IF NOT EXISTS `wx_chat_msgs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `chat_id` INT NOT NULL,
  `t` DATETIME NOT NULL,
  `who` VARCHAR(8) NOT NULL,
  `name` VARCHAR(120) NULL,
  `text` TEXT NOT NULL,
  `att` TEXT NULL,
  INDEX `idx_chat_msgs` (`chat_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Site Visit & Meeting Bookings
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
  INDEX `idx_bookings_date` (`d`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. AI Center Hand-Off Events
CREATE TABLE IF NOT EXISTS `wx_ai_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `t` DATETIME NOT NULL,
  `chat_id` INT NOT NULL,
  `kind` VARCHAR(12) NOT NULL,
  `reason` VARCHAR(20) NULL,
  INDEX `idx_ai_event_t` (`t`),
  INDEX `idx_ai_event_chat` (`chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. AI Unanswered Questions Mining
CREATE TABLE IF NOT EXISTS `wx_ai_unans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `t` DATETIME NOT NULL,
  `last_t` DATETIME NOT NULL,
  `chat_id` INT NULL,
  `q` VARCHAR(500) NOT NULL,
  `qkey` VARCHAR(120) NOT NULL,
  `n` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(10) NOT NULL DEFAULT 'open',
  INDEX `idx_ai_unans_status` (`status`),
  INDEX `idx_ai_unans_qkey` (`qkey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Telegram Seen Update IDs
CREATE TABLE IF NOT EXISTS `wx_tg_seen` (
  `uid` BIGINT PRIMARY KEY,
  `t` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Telegram Message Map
CREATE TABLE IF NOT EXISTS `wx_tg_map` (
  `msg_id` BIGINT NOT NULL,
  `chat_id` INT NOT NULL,
  `t` DATETIME NOT NULL,
  PRIMARY KEY (`msg_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. RBAC User Permissions Overrides
CREATE TABLE IF NOT EXISTS `wx_user_perms` (
  `user_id` INT NOT NULL,
  `perm` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`user_id`, `perm`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. RBAC Allowed Actions Cache
CREATE TABLE IF NOT EXISTS `wx_allowed` (
  `user_id` INT NOT NULL,
  `action` VARCHAR(60) NOT NULL,
  PRIMARY KEY (`user_id`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. RBAC Capabilities Definitions
CREATE TABLE IF NOT EXISTS `wx_caps` (
  `role` VARCHAR(20) NOT NULL,
  `group_name` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`role`, `group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Action to Permission Group Mapping
CREATE TABLE IF NOT EXISTS `wx_action_group` (
  `action` VARCHAR(60) PRIMARY KEY,
  `group_name` VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Role to Group Defaults
CREATE TABLE IF NOT EXISTS `wx_role_groups` (
  `role` VARCHAR(20) NOT NULL,
  `group_name` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`role`, `group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Accounts
INSERT INTO `wx_users` (`name`, `email`, `role`, `pass_hash`, `active`, `pw_ver`, `created_at`)
VALUES 
  ('Master Admin', 'master@woodex.pk', 'owner', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW()),
  ('Woodex Owner', 'admin@woodex.pk', 'owner', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW()),
  ('Studio Manager', 'manager@woodex.pk', 'admin', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW()),
  ('Project Lead', 'developer@woodex.pk', 'editor', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW())
ON DUPLICATE KEY UPDATE `pass_hash` = VALUES(`pass_hash`), `active` = 1;

SET FOREIGN_KEY_CHECKS = 1;
