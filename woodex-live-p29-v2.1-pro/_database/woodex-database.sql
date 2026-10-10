-- ==============================================================================
-- WOODEX INTERIOR DESIGN STUDIO — MASTER MYSQL DATABASE SCHEMA
-- Target Database: u128159657_woodex
-- Character Set: utf8mb4 / Engine: InnoDB
-- Compatible with Hostinger MySQL 5.7+ / 8.0+ / MariaDB 10.3+
--
-- HOW TO USE:
-- Option 1 (1-Click Installer): Open https://woodex.com.pk/wx-install.php in your browser.
-- Option 2 (phpMyAdmin): Open phpMyAdmin -> Select `u128159657_woodex` -> Click `Import` -> Choose this file -> Click `Go`.
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users & Staff Authentication Table
CREATE TABLE IF NOT EXISTS `wx_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `role` VARCHAR(20) NOT NULL DEFAULT 'editor',
  `pass_hash` VARCHAR(255) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `pw_ver` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL,
  `last_login` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Activity & Audit Trail Log
CREATE TABLE IF NOT EXISTS `wx_activity` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_name` VARCHAR(120) NULL,
  `action` VARCHAR(60) NOT NULL,
  `target` VARCHAR(255) NULL,
  `ip` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL,
  INDEX(`created_at`),
  INDEX(`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. System & Company Settings
CREATE TABLE IF NOT EXISTS `wx_settings` (
  `k` VARCHAR(80) PRIMARY KEY,
  `v` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Rate Limiting & Anti-Bruteforce Throttle
CREATE TABLE IF NOT EXISTS `wx_throttle` (
  `ip` VARCHAR(64) PRIMARY KEY,
  `n` INT NOT NULL,
  `t` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. CRM Leads & Enquiries Pipeline
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
  INDEX(`stage`),
  INDEX(`created_at`),
  INDEX(`client_id`),
  INDEX `wx_leads_next` (`next_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Lead Activity Notes & Interactions
CREATE TABLE IF NOT EXISTS `wx_lead_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT NOT NULL,
  `t` DATETIME NOT NULL,
  `user_name` VARCHAR(120) NULL,
  `text` TEXT NOT NULL,
  `sys` TINYINT(1) NOT NULL DEFAULT 0,
  `kind` VARCHAR(20) NULL,
  `outcome` VARCHAR(190) NULL,
  INDEX(`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Clients Database
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Notifications Log
CREATE TABLE IF NOT EXISTS `wx_notify_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `t` DATETIME NOT NULL,
  `event` VARCHAR(12) NOT NULL,
  `ref` VARCHAR(120) NULL,
  `name` VARCHAR(160) NULL,
  `channel` VARCHAR(8) NOT NULL,
  `dest` VARCHAR(190) NOT NULL,
  `result` VARCHAR(255) NOT NULL,
  INDEX(`t`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. WhatsApp Seen Tracking
CREATE TABLE IF NOT EXISTS `wx_wa_seen` (
  `mid` VARCHAR(190) PRIMARY KEY,
  `t` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Starter & Quotation Templates
CREATE TABLE IF NOT EXISTS `wx_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(80) NOT NULL,
  `data` LONGTEXT NOT NULL,
  UNIQUE(`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Quotations Engine
CREATE TABLE IF NOT EXISTS `wx_quotes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no` VARCHAR(30) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `data` LONGTEXT NOT NULL,
  INDEX(`no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Invoices & Advance Payments
CREATE TABLE IF NOT EXISTS `wx_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no` VARCHAR(30) NOT NULL,
  `quote_id` INT NULL,
  `data` LONGTEXT NOT NULL,
  UNIQUE(`quote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Active Projects Management
CREATE TABLE IF NOT EXISTS `wx_projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `data` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Live Visitor & Client Chats
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
  INDEX(`updated_at`),
  INDEX(`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Chat Messages
CREATE TABLE IF NOT EXISTS `wx_chat_msgs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `chat_id` INT NOT NULL,
  `t` DATETIME NOT NULL,
  `who` VARCHAR(8) NOT NULL,
  `name` VARCHAR(120) NULL,
  `text` TEXT NOT NULL,
  `att` TEXT NULL,
  INDEX(`chat_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Site Visit Bookings
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
  INDEX(`d`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. AI Center & Knowledge Events
CREATE TABLE IF NOT EXISTS `wx_ai_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `t` DATETIME NOT NULL,
  `chat_id` INT NOT NULL,
  `kind` VARCHAR(12) NOT NULL,
  `reason` VARCHAR(20) NULL,
  INDEX(`t`),
  INDEX(`chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. AI Unanswered Questions Queue
CREATE TABLE IF NOT EXISTS `wx_ai_unans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `t` DATETIME NOT NULL,
  `last_t` DATETIME NOT NULL,
  `chat_id` INT NULL,
  `q` VARCHAR(500) NOT NULL,
  `qkey` VARCHAR(120) NOT NULL,
  `n` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(10) NOT NULL DEFAULT 'open',
  INDEX(`status`),
  INDEX(`qkey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Telegram Seen Notifications
CREATE TABLE IF NOT EXISTS `wx_tg_seen` (
  `uid` BIGINT PRIMARY KEY,
  `t` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Telegram to Chat Mapping
CREATE TABLE IF NOT EXISTS `wx_tg_map` (
  `msg_id` BIGINT NOT NULL,
  `chat_id` INT NOT NULL,
  `t` DATETIME NOT NULL,
  PRIMARY KEY(`msg_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- INITIAL SEED DATA
-- Default Logins:
-- 1. admin@woodex.pk (Pass: Admin@Woodex2026 or admin / admin)
-- ==============================================================================

INSERT INTO `wx_users` (`id`, `name`, `email`, `role`, `pass_hash`, `active`, `pw_ver`, `created_at`) VALUES
(1, 'Admin Woodex', 'admin@woodex.pk', 'owner', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW()),
(2, 'Master Admin', 'admin', 'owner', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW()),
(3, 'Hamza Malik', 'hamza@woodex.pk', 'admin', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW()),
(4, 'Ayesha Tariq', 'ayesha@woodex.pk', 'editor', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW()),
(5, 'Bilal Sheikh', 'bilal@woodex.pk', 'sales', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW()),
(6, 'Zainab Raza', 'support@woodex.pk', 'support', '$2y$10$.xP9p.h.R3H7AaDj/wW1P.pB25YEM0qx07xus/3GmFkI4QCygXGw2', 1, 1, NOW())
ON DUPLICATE KEY UPDATE `pass_hash`=VALUES(`pass_hash`), `active`=1;

-- Initial Seed CRM Clients
INSERT INTO `wx_clients` (`id`, `name`, `phone`, `email`, `company`, `city`, `address`, `notes`, `created_at`) VALUES
(1, 'Tariq Mahmood', '03001234567', 'tariq@example.com', 'Mahmood Enterprises', 'Lahore', 'House 142, Phase 6, DHA Lahore', 'VIP Residential Client', NOW()),
(2, 'Salman Farooq', '03334567890', 'salman@techhub.io', 'TechHub Pakistan', 'Lahore', 'Plaza 88, Sector C, Bahria Town', 'Commercial Corporate', NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Initial Seed CRM Leads
INSERT INTO `wx_leads` (`id`, `created_at`, `source`, `page`, `name`, `phone`, `email`, `service`, `message`, `stage`, `assigned_to`, `value`, `client_id`, `tags`, `is_read`, `location`, `line`) VALUES
(1, NOW(), 'Website Estimator', '/estimator/', 'Tariq Mahmood', '03001234567', 'tariq@example.com', 'Full Luxury Home Interior (1 Kanal)', 'Prefers Italian modern minimalist kitchen with quartz countertops and fluted glass wardrobes.', 'quote', 5, 5200000, 1, '1 Kanal, Luxury, DHA', 1, 'DHA Phase 6, Lahore', 'Interior'),
(2, NOW(), 'WhatsApp Hub', '/contact/', 'Dr. Ayesha Imran', '03219876543', 'ayesha.imran@clinic.pk', 'Dermatology Clinic Turnkey Fit-out', 'Site inspection completed for reception area acoustic panelling and consultation rooms.', 'visit', 5, 3800000, NULL, 'Clinic, Turnkey, Gulberg', 1, 'Gulberg III, Lahore', 'Commercial'),
(3, NOW(), 'Direct Contact', '/commercial-fit-out/', 'Salman Farooq', '03334567890', 'salman@techhub.io', 'Executive Office Interior & Workstations', 'Contract signed, 30% advance received. Work initiated.', 'won', 3, 8500000, 2, 'Office, Fit-out, Bahria', 1, 'Bahria Town Sector C, Lahore', 'Commercial'),
(4, NOW(), 'Instagram Lead', '/kitchen-design/', 'Omer Hashmi', '03456789012', 'omer.h@gmail.com', 'Kitchen & Wardrobes Renovation', 'Sent material catalog and acrylic shutter samples.', 'contacted', 5, 2200000, NULL, 'Kitchen, Wardrobes, Lake City', 1, 'Lake City, Lahore', 'Furniture'),
(5, NOW(), 'Website Contact Form', '/contact/', 'Fatima Noor', '03123456789', 'fatima.noor@pkresidence.com', '3D Visualization & Architecture Plan', 'Initial enquiry for complete 3D elevations and lighting plan.', 'new', 5, 850000, NULL, '3D, Architecture, Model Town', 0, 'Model Town, Lahore', 'Design')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Initial Company Settings & Dual Bank Configuration
INSERT INTO `wx_settings` (`k`, `v`) VALUES
('company_name', 'Woodex Interior Design Studio'),
('company_phone', '+92 322 4000768'),
('company_email', 'admin@woodex.pk'),
('company_address', 'Lahore, Punjab, Pakistan'),
('bank_1_name', 'Bank Alfalah'),
('bank_1_title', 'Woodex Interior Studio'),
('bank_1_iban', 'PK36ALFH0001001004567890'),
('bank_2_name', 'Meezan Bank'),
('bank_2_title', 'Woodex Interior Studio'),
('bank_2_iban', 'PK44MEZN0002001007890123'),
('telegram_token', '8946347004:AAFqpMe7fZ7EVuLDMKQ_J4_jcCUuqrbPn7A'),
('telegram_username', '@WoodexInteriorBot')
ON DUPLICATE KEY UPDATE `v`=VALUES(`v`);

SET FOREIGN_KEY_CHECKS = 1;
