-- ============================================================================
-- WOODEX REGIONAL OPERATIONS — schema (MySQL 5.7 / 8, Hostinger u128159657_woodex)
-- Safe to run twice: CREATE TABLE IF NOT EXISTS + information_schema-guarded ALTER.
-- Feeds: /admin REGIONAL OPERATIONS module, /api/regions.php, regional estimator,
--        node ledger.  Run: phpMyAdmin -> Import -> this file.
-- ============================================================================
SET NAMES utf8mb4;
SET time_zone = '+05:00';

CREATE TABLE IF NOT EXISTS `wx_region_nodes` (
  `code`           VARCHAR(8)   NOT NULL,
  `city`           VARCHAR(80)  NOT NULL,
  `label`          VARCHAR(120) NOT NULL,
  `dir`            VARCHAR(120) NOT NULL,
  `labour_index`   DECIMAL(5,3) NOT NULL DEFAULT 1.000,
  `waste_pct`      DECIMAL(5,2) NOT NULL DEFAULT 12.00,
  `zone`           CHAR(1)      NOT NULL DEFAULT 'A',
  `lead_time_days` SMALLINT     NOT NULL DEFAULT 14,
  `tax_pct`        DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  `advance_pct`    DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  `currency`       VARCHAR(6)   NOT NULL DEFAULT 'PKR',
  `areas`          TEXT         NULL,
  `active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `sort`           SMALLINT     NOT NULL DEFAULT 100,
  `updated_at`     DATETIME     NULL,
  PRIMARY KEY (`code`),
  KEY `wx_rgn_nodes_active` (`active`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wx_region_rate_cards` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `node`        VARCHAR(8)   NOT NULL,
  `service_key` VARCHAR(40)  NOT NULL,
  `finish_key`  VARCHAR(20)  NOT NULL,
  `unit`        VARCHAR(12)  NOT NULL DEFAULT 'sqft',
  `base_rate`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `labour_pct`  DECIMAL(5,2) NOT NULL DEFAULT 22.00,
  `waste_pct`   DECIMAL(5,2) NOT NULL DEFAULT 12.00,
  `active`      TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at`  DATETIME     NULL,
  UNIQUE KEY `wx_rgn_rate_uq` (`node`, `service_key`, `finish_key`),
  KEY `wx_rgn_rate_node` (`node`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wx_region_projects` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `code`            VARCHAR(24)  NOT NULL,
  `node`            VARCHAR(8)   NOT NULL,
  `area`            VARCHAR(16)  NULL,
  `title`           VARCHAR(190) NOT NULL,
  `client_id`       INT          NULL,
  `lead_id`         INT          NULL,
  `quote_id`        INT          NULL,
  `layout_code`     VARCHAR(12)  NULL,
  `category_code`   VARCHAR(12)  NULL,
  `service_key`     VARCHAR(40)  NULL,
  `finish_key`      VARCHAR(20)  NULL,
  `marla`           DECIMAL(6,2) NULL,
  `covered_sqft`    INT          NOT NULL DEFAULT 0,
  `run_length_lm`   DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `stage`           VARCHAR(20)  NOT NULL DEFAULT 'survey',
  `status`          VARCHAR(20)  NOT NULL DEFAULT 'open',
  `contract_value`  BIGINT       NOT NULL DEFAULT 0,
  `advance_pct`     DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  `manager_id`      INT          NULL,
  `start_date`      DATE         NULL,
  `target_date`     DATE         NULL,
  `handover_date`   DATE         NULL,
  `notes`           TEXT         NULL,
  `spec_json`       MEDIUMTEXT   NULL COMMENT 'estimator snapshot: board feet, waste, labour/bf, node index',
  `created_at`      DATETIME     NOT NULL,
  `updated_at`      DATETIME     NULL,
  UNIQUE KEY `wx_rgn_proj_code` (`code`),
  KEY `wx_rgn_proj_node` (`node`, `stage`),
  KEY `wx_rgn_proj_status` (`status`),
  KEY `wx_rgn_proj_client` (`client_id`),
  KEY `wx_rgn_proj_target` (`target_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wx_region_milestones` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `project_id`  INT          NOT NULL,
  `node`        VARCHAR(8)   NOT NULL,
  `seq`         SMALLINT     NOT NULL DEFAULT 10,
  `name`        VARCHAR(160) NOT NULL,
  `kind`        VARCHAR(20)  NOT NULL DEFAULT 'progress',
  `weight_pct`  DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  `amount`      BIGINT       NOT NULL DEFAULT 0,
  `due_date`    DATE         NULL,
  `done_at`     DATETIME     NULL,
  `status`      VARCHAR(16)  NOT NULL DEFAULT 'pending',
  `approved_by` VARCHAR(120) NULL,
  `note`        VARCHAR(500) NULL,
  KEY `wx_rgn_ms_project` (`project_id`, `seq`),
  KEY `wx_rgn_ms_status` (`status`, `due_date`),
  KEY `wx_rgn_ms_node` (`node`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wx_region_ledger` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `node`        VARCHAR(8)   NOT NULL,
  `project_id`  INT          NULL,
  `kind`        VARCHAR(16)  NOT NULL,
  `ref`         VARCHAR(40)  NULL,
  `party`       VARCHAR(160) NULL,
  `amount`      BIGINT       NOT NULL DEFAULT 0,
  `status`      VARCHAR(16)  NOT NULL DEFAULT 'due',
  `t`           DATETIME     NOT NULL,
  `due_date`    DATE         NULL,
  `note`        VARCHAR(300) NULL,
  `user_name`   VARCHAR(120) NULL,
  KEY `wx_rgn_led_node` (`node`, `kind`),
  KEY `wx_rgn_led_t` (`t`),
  KEY `wx_rgn_led_status` (`status`, `due_date`),
  KEY `wx_rgn_led_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wx_region_variants` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `node`           VARCHAR(8)  NOT NULL,
  `species_code`   VARCHAR(40) NOT NULL,
  `coating_code`   VARCHAR(40) NULL,
  `core_code`      VARCHAR(30) NULL,
  `rate_bf`        DECIMAL(12,2) NULL,
  `coat_rate_sqft` DECIMAL(10,2) NULL,
  `labour_pct`     DECIMAL(5,2) NULL,
  `waste_pct`      DECIMAL(5,2) NULL,
  `active`         TINYINT(1)  NOT NULL DEFAULT 1,
  `updated_at`     DATETIME    NULL,
  UNIQUE KEY `wx_rgn_var_uq` (`node`, `species_code`, `coating_code`, `core_code`),
  KEY `wx_rgn_var_node` (`node`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Routing parameter on the existing lead table (idempotent).
SET @has_node := (SELECT COUNT(*) FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wx_leads' AND COLUMN_NAME = 'node');
SET @sql := IF(@has_node = 0,
  'ALTER TABLE `wx_leads` ADD COLUMN `node` VARCHAR(8) NULL, ADD INDEX `wx_leads_node` (`node`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_area := (SELECT COUNT(*) FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wx_leads' AND COLUMN_NAME = 'area_code');
SET @sql := IF(@has_area = 0,
  'ALTER TABLE `wx_leads` ADD COLUMN `area_code` VARCHAR(16) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Seeds — 12 municipal operation nodes.
INSERT INTO `wx_region_nodes`
  (`code`,`city`,`label`,`dir`,`labour_index`,`waste_pct`,`zone`,`lead_time_days`,`tax_pct`,`advance_pct`,`currency`,`areas`,`active`,`sort`,`updated_at`)
VALUES
  ('LHR','Lahore','Lahore Operation Node','/lahore/',1.000,12.00,'A',14,18.00,40.00,'PKR','DHA|Bahria Town Lahore|Gulberg|Model Town|Johar Town|Wapda Town|Lahore Cantt|Lake City',1,10,NOW()),
  ('ISB','Islamabad','Islamabad Operation Node','/islamabad/',1.120,12.00,'A',16,18.00,40.00,'PKR','Sectors F-6 to F-11|DHA Phase II|Bahria Town',1,20,NOW()),
  ('KHI','Karachi','Karachi Operation Node','/karachi/',1.080,13.00,'A',18,18.00,40.00,'PKR','DHA Karachi|Clifton|PECHS',1,30,NOW()),
  ('RWP','Rawalpindi','Rawalpindi Operation Node','/rawalpindi/',1.050,12.00,'A',14,18.00,40.00,'PKR','Bahria Town Phase 8|Adiala Road',1,40,NOW()),
  ('FSD','Faisalabad','Faisalabad Operation Node','/faisalabad/',0.940,11.00,'B',12,18.00,40.00,'PKR','Peoples Colony|Eden Valley',1,50,NOW()),
  ('GRW','Gujranwala','Gujranwala Operation Node','/gujranwala/',0.920,11.00,'B',12,18.00,40.00,'PKR','Satellite Town',1,60,NOW()),
  ('MUX','Multan','Multan Operation Node','/multan/',0.930,12.00,'C',17,18.00,40.00,'PKR','Cantt & Cavalry Ground|Buch Villas',1,70,NOW()),
  ('PSH','Peshawar','Peshawar Operation Node','/peshawar/',0.950,12.00,'C',18,18.00,40.00,'PKR','Hayatabad',1,80,NOW()),
  ('SKT','Sialkot','Sialkot Operation Node','/sialkot/',0.940,11.00,'B',13,18.00,40.00,'PKR','Cantt Sialkot',1,90,NOW()),
  ('BWP','Bahawalpur','Bahawalpur Operation Node','/bahawalpur/',0.900,13.00,'C',19,18.00,40.00,'PKR','Model Town A',1,100,NOW()),
  ('QTA','Quetta','Quetta Operation Node','/quetta/',1.020,14.00,'D',22,18.00,50.00,'PKR','Jinnah Town',1,110,NOW()),
  ('HYD','Hyderabad','Hyderabad Operation Node','/hyderabad/',0.910,13.00,'D',20,18.00,40.00,'PKR','Latifabad',1,120,NOW())
ON DUPLICATE KEY UPDATE
  `city`=VALUES(`city`), `label`=VALUES(`label`), `dir`=VALUES(`dir`),
  `labour_index`=VALUES(`labour_index`), `waste_pct`=VALUES(`waste_pct`), `zone`=VALUES(`zone`),
  `lead_time_days`=VALUES(`lead_time_days`), `areas`=VALUES(`areas`), `sort`=VALUES(`sort`),
  `updated_at`=VALUES(`updated_at`);

-- Seeds — rate cards: every node x 7 services x 3 finishes = 252 rows.
INSERT INTO `wx_region_rate_cards`
  (`node`,`service_key`,`finish_key`,`unit`,`base_rate`,`labour_pct`,`waste_pct`,`active`,`updated_at`)
SELECT n.`code`, s.`sk`, s.`fk`, s.`unit`, s.`base`, n.`labour_index` * 22, n.`waste_pct`, 1, NOW()
FROM `wx_region_nodes` n
JOIN (
  SELECT 'interior-design'     AS `sk`, 'essential' AS `fk`, 'sqft'  AS `unit`,  150 AS `base` UNION ALL
  SELECT 'interior-design',              'standard',           'sqft',  250 UNION ALL
  SELECT 'interior-design',              'premium',            'sqft',  400 UNION ALL
  SELECT 'fit-out',                      'essential',          'sqft', 2800 UNION ALL
  SELECT 'fit-out',                      'standard',           'sqft', 4200 UNION ALL
  SELECT 'fit-out',                      'premium',            'sqft', 6500 UNION ALL
  SELECT 'renovation',                   'essential',          'sqft', 1200 UNION ALL
  SELECT 'renovation',                   'standard',           'sqft', 2000 UNION ALL
  SELECT 'renovation',                   'premium',            'sqft', 3200 UNION ALL
  SELECT 'architecture',                 'essential',          'sqft',  200 UNION ALL
  SELECT 'architecture',                 'standard',           'sqft',  350 UNION ALL
  SELECT 'architecture',                 'premium',            'sqft',  550 UNION ALL
  SELECT '3d-visualization',             'essential',         'views',15000 UNION ALL
  SELECT '3d-visualization',             'standard',          'views',25000 UNION ALL
  SELECT '3d-visualization',             'premium',           'views',45000 UNION ALL
  SELECT 'furniture',                    'essential',          'sqft', 1500 UNION ALL
  SELECT 'furniture',                    'standard',           'sqft', 2500 UNION ALL
  SELECT 'furniture',                    'premium',            'sqft', 4000 UNION ALL
  SELECT 'turnkey-design-build',         'essential',          'sqft', 3600 UNION ALL
  SELECT 'turnkey-design-build',         'standard',           'sqft', 5400 UNION ALL
  SELECT 'turnkey-design-build',         'premium',            'sqft', 7800
) s
WHERE n.`active` = 1
ON DUPLICATE KEY UPDATE `unit`=VALUES(`unit`), `updated_at`=VALUES(`updated_at`);

-- Backfill the routing parameter for existing leads (city text -> node code).
UPDATE `wx_leads` SET `node` = CASE
  WHEN `node` IS NOT NULL AND `node` <> ''                            THEN `node`
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%lahore%'      THEN 'LHR'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%dha%'         THEN 'LHR'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%gulberg%'     THEN 'LHR'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%bahria%'      THEN 'LHR'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%islamabad%'   THEN 'ISB'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%karachi%'     THEN 'KHI'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%rawalpindi%'  THEN 'RWP'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%faisalabad%'  THEN 'FSD'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%gujranwala%'  THEN 'GRW'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%multan%'      THEN 'MUX'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%peshawar%'    THEN 'PSH'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%sialkot%'     THEN 'SKT'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%bahawalpur%'  THEN 'BWP'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%quetta%'      THEN 'QTA'
  WHEN LOWER(CONCAT_WS(' ', `location`, `page`, `service`)) LIKE '%hyderabad%'   THEN 'HYD'
  ELSE 'LHR'
END
WHERE `node` IS NULL OR `node` = '';
