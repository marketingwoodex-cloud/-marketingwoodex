-- ============================================================================
-- WOODEX — MySQL/MariaDB install (Hostinger) — H2
-- Complete translation of: supabase/COMPLETE-MIGRATION.sql,
-- supabase/woodex-consolidated-migration-2026-09-27.sql,
-- netlify/quotations-schema.sql, netlify/quotation-templates-schema.sql,
-- netlify/migration-v2-sections-invoices.sql + chat tables (H6).
-- Idempotent: CREATE TABLE IF NOT EXISTS everywhere. No RLS (PHP auth).
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------- users
CREATE TABLE IF NOT EXISTS cms_users (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  username      VARCHAR(64) NOT NULL UNIQUE,
  pass_sha256   VARCHAR(64) NOT NULL,
  role          VARCHAR(16) NOT NULL DEFAULT 'viewer',
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------- enquiries
CREATE TABLE IF NOT EXISTS enquiries (
  id             CHAR(36) NOT NULL PRIMARY KEY,
  name           VARCHAR(160) NOT NULL,
  phone          VARCHAR(40) NOT NULL,
  email          VARCHAR(160) NULL,
  project_type   VARCHAR(120) NULL,
  message        TEXT NULL,
  source         VARCHAR(40) NOT NULL DEFAULT 'website',
  status         VARCHAR(32) NOT NULL DEFAULT 'new',
  pipeline_stage VARCHAR(32) NOT NULL DEFAULT 'new',
  notes          TEXT NULL,
  client_id      CHAR(36) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY enquiries_created_idx (created_at),
  KEY enquiries_pipeline_idx (pipeline_stage),
  KEY enquiries_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------ estimator_leads
CREATE TABLE IF NOT EXISTS estimator_leads (
  id           CHAR(36) NOT NULL PRIMARY KEY,
  name         VARCHAR(160) NOT NULL,
  phone        VARCHAR(40) NOT NULL,
  email        VARCHAR(160) NULL,
  service_type VARCHAR(120) NOT NULL,
  area_sqft    INT NULL,
  selections   JSON NOT NULL,
  estimate_min INT NULL,
  estimate_max INT NULL,
  status       VARCHAR(32) NOT NULL DEFAULT 'new',
  source_page  VARCHAR(200) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY est_created_idx (created_at),
  KEY est_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------ activity / audit / feed
CREATE TABLE IF NOT EXISTS activity (
  id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind       VARCHAR(64) NOT NULL,
  text       VARCHAR(500) NOT NULL,
  meta       JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY activity_kind_idx (kind, created_at),
  KEY activity_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------- analytics
CREATE TABLE IF NOT EXISTS page_views (
  id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  path       VARCHAR(300) NOT NULL,
  vid        VARCHAR(64) NULL,
  viewed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY pv_viewed_idx (viewed_at),
  KEY pv_vid_idx (vid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------- blog_posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id           CHAR(36) NOT NULL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL UNIQUE,
  excerpt      TEXT NULL,
  cover_image  VARCHAR(500) NULL,
  content      JSON NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY blog_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------ projects
CREATE TABLE IF NOT EXISTS projects (
  id             CHAR(36) NOT NULL PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  slug           VARCHAR(255) NOT NULL UNIQUE,
  category       VARCHAR(120) NULL,
  location       VARCHAR(120) NULL,
  description    TEXT NULL,
  images         JSON NOT NULL,
  status         VARCHAR(16) NOT NULL DEFAULT 'draft',
  published      TINYINT(1) NOT NULL DEFAULT 0,
  published_slug VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY projects_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------- team
CREATE TABLE IF NOT EXISTS team (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  role       VARCHAR(120) NULL,
  photo      VARCHAR(500) NULL,
  phone      VARCHAR(40) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------- media
CREATE TABLE IF NOT EXISTS media (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  url        VARCHAR(500) NOT NULL,
  filename   VARCHAR(255) NULL,
  size_bytes BIGINT NULL,
  alt_text   VARCHAR(255) NULL,
  width      INT NULL,
  height     INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY media_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------- site_settings kv
CREATE TABLE IF NOT EXISTS site_settings (
  `key`      VARCHAR(120) NOT NULL PRIMARY KEY,
  `value`    JSON NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------- clients
CREATE TABLE IF NOT EXISTS clients (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  company    VARCHAR(160) NULL,
  phone      VARCHAR(40) NULL,
  email      VARCHAR(160) NULL,
  address    VARCHAR(255) NULL,
  notes      TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------- site_visits
CREATE TABLE IF NOT EXISTS site_visits (
  id          CHAR(36) NOT NULL PRIMARY KEY,
  enquiry_id  CHAR(36) NULL,
  client_name VARCHAR(160) NOT NULL,
  phone       VARCHAR(40) NULL,
  address     VARCHAR(255) NULL,
  visit_date  DATETIME NULL,
  notes       TEXT NULL,
  status      VARCHAR(16) NOT NULL DEFAULT 'scheduled',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------- testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id          CHAR(36) NOT NULL PRIMARY KEY,
  client_name VARCHAR(160) NOT NULL,
  company     VARCHAR(160) NULL,
  photo       VARCHAR(500) NULL,
  rating      INT NOT NULL DEFAULT 5,
  quote       TEXT NOT NULL,
  project     VARCHAR(160) NULL,
  service     VARCHAR(160) NULL,
  location    VARCHAR(160) NULL,
  featured    TINYINT(1) NOT NULL DEFAULT 0,
  published   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------ services
CREATE TABLE IF NOT EXISTS services (
  id             CHAR(36) NOT NULL PRIMARY KEY,
  name           VARCHAR(160) NOT NULL,
  slug           VARCHAR(160) NULL UNIQUE,
  category       VARCHAR(120) NULL,
  hero_title     VARCHAR(255) NULL,
  introduction   TEXT NULL,
  benefits       JSON NOT NULL,
  process        JSON NOT NULL,
  deliverables   JSON NOT NULL,
  gallery        JSON NOT NULL,
  faqs           JSON NOT NULL,
  seo            JSON NOT NULL,
  published      TINYINT(1) NOT NULL DEFAULT 0,
  published_slug VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------- locations
CREATE TABLE IF NOT EXISTS locations (
  id             CHAR(36) NOT NULL PRIMARY KEY,
  name           VARCHAR(160) NOT NULL,
  slug           VARCHAR(160) NULL UNIQUE,
  introduction   TEXT NULL,
  services       JSON NOT NULL,
  faqs           JSON NOT NULL,
  map_url        VARCHAR(500) NULL,
  seo            JSON NOT NULL,
  published      TINYINT(1) NOT NULL DEFAULT 0,
  published_slug VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------ page_versions
CREATE TABLE IF NOT EXISTS page_versions (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  page_path  VARCHAR(300) NOT NULL,
  html       LONGTEXT NOT NULL,
  created_by VARCHAR(64) NULL,
  note       VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY pv_page_idx (page_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------- redirects
CREATE TABLE IF NOT EXISTS redirects (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  from_path  VARCHAR(300) NOT NULL UNIQUE,
  to_path    VARCHAR(300) NOT NULL,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------- menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  label      VARCHAR(120) NOT NULL,
  url        VARCHAR(300) NOT NULL,
  parent_id  CHAR(36) NULL,
  position   INT NOT NULL DEFAULT 0,
  visible    TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------- quotations
CREATE TABLE IF NOT EXISTS quotations (
  id          CHAR(36) NOT NULL PRIMARY KEY,
  ref_no      VARCHAR(40) NOT NULL UNIQUE,
  client_name VARCHAR(160) NOT NULL,
  phone       VARCHAR(40) NULL,
  email       VARCHAR(160) NULL,
  project     VARCHAR(255) NULL,
  site        VARCHAR(255) NULL,
  location    VARCHAR(160) NULL,
  title       VARCHAR(160) NOT NULL DEFAULT 'Interior',
  items       JSON NOT NULL,
  subtotal    DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount    DECIMAL(14,2) NOT NULL DEFAULT 0,
  total       DECIMAL(14,2) NOT NULL DEFAULT 0,
  terms       TEXT NULL,
  status      VARCHAR(16) NOT NULL DEFAULT 'draft',
  notes       TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY quot_status_idx (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------ quotation_templates
CREATE TABLE IF NOT EXISTS quotation_templates (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  name       VARCHAR(160) NOT NULL UNIQUE,
  items      JSON NOT NULL,
  terms      TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id             CHAR(36) NOT NULL PRIMARY KEY,
  inv_no         VARCHAR(40) NOT NULL,
  version        INT NOT NULL DEFAULT 1,
  quotation_id   CHAR(36) NULL,
  client_name    VARCHAR(160) NOT NULL,
  phone          VARCHAR(40) NULL,
  email          VARCHAR(160) NULL,
  project        VARCHAR(255) NULL,
  site           VARCHAR(255) NULL,
  location       VARCHAR(160) NULL,
  title          VARCHAR(160) NOT NULL DEFAULT 'Invoice',
  description    TEXT NOT NULL,
  sections       JSON NOT NULL,
  items          JSON NOT NULL,
  subtotal       DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount       DECIMAL(14,2) NOT NULL DEFAULT 0,
  total          DECIMAL(14,2) NOT NULL DEFAULT 0,
  amount_paid    DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(16) NOT NULL DEFAULT 'unpaid',
  issue_date     DATE NOT NULL,
  due_date       DATE NULL,
  terms          TEXT NULL,
  notes          TEXT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY inv_no_version_uq (inv_no, version),
  KEY inv_status_idx (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------- chat (H6, planned)
CREATE TABLE IF NOT EXISTS chat_channels (
  id           CHAR(36) NOT NULL PRIMARY KEY,
  visitor_id   VARCHAR(64) NOT NULL,
  page         VARCHAR(300) NULL,
  visitor_name VARCHAR(160) NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'open',
  assigned_to  VARCHAR(64) NULL,
  unread_admin TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_msg_at  DATETIME NULL,
  KEY chat_status_idx (status, last_msg_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  channel_id CHAR(36) NOT NULL,
  `from`     VARCHAR(16) NOT NULL,
  body       TEXT NOT NULL,
  agent_name VARCHAR(64) NULL,
  read_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY chat_msg_channel_idx (channel_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------ backups index (H5)
CREATE TABLE IF NOT EXISTS backups (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  filename   VARCHAR(255) NOT NULL,
  size_bytes BIGINT NULL,
  kind       VARCHAR(16) NOT NULL DEFAULT 'full',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Seed: primary admin (username/password set at install time in install.php;
-- this row is overwritten by install.php so the site can never be left
-- without a working login).
INSERT INTO cms_users (id, username, pass_sha256, role, active)
VALUES (UUID(), 'woodexadmin', 'd40d380ce9edc2f566905fe0c5caa3d7f59c40bf61e0076f2015fbdb683af19d', 'admin', 1)
ON DUPLICATE KEY UPDATE pass_sha256 = VALUES(pass_sha256), role = 'admin', active = 1;
