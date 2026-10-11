-- =============================================================================
--  v2.7 EXPENSE LOG — migration for an ALREADY INSTALLED database
-- -----------------------------------------------------------------------------
--  Fresh installs get these two tables from `woodex-database.sql` (sections 19
--  and 20) or automatically: api/admin.php migrate() creates them the first time
--  the admin is opened. Run this file by hand only on an existing database that
--  was installed before v2.7 and where the admin has not been opened since.
--
--  Safe to run more than once — every statement is CREATE TABLE IF NOT EXISTS.
--  No existing table, row or column is touched.
-- =============================================================================

-- 1. The cash book: one voucher per row. `amount` is the pre-tax bill, `tax_amt` is GST at
--    `tax_pct` (18 % default), `wht_amt` is the amount withheld at source. What the vendor
--    invoiced is amount + tax_amt; what left the bank is that minus wht_amt.
CREATE TABLE IF NOT EXISTS `wx_expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `spent_on` DATE NOT NULL,
  `category` VARCHAR(40) NOT NULL,               -- board | hardware | polish | glass | transport | wages |
                                                 -- workshop | tools | rent | utilities | phone | marketing |
                                                 -- software | taxes | professional | repairs | travel | misc
  `node` VARCHAR(8) NOT NULL DEFAULT 'LHR',      -- one of the 12 verified offices
  `vendor` VARCHAR(160) NOT NULL DEFAULT '',
  `detail` VARCHAR(255) NOT NULL DEFAULT '',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `tax_pct` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `tax_amt` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `wht_amt` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `paid_by` VARCHAR(16) NOT NULL DEFAULT 'cash', -- cash | bank | cheque | jazzcash | easypaisa | card | credit
  `status` VARCHAR(12) NOT NULL DEFAULT 'paid',  -- paid | pending | credit
  `project` VARCHAR(40) NOT NULL DEFAULT '',
  `receipt` VARCHAR(190) NOT NULL DEFAULT '',    -- media-library path of the scanned bill
  `recurring` TINYINT(1) NOT NULL DEFAULT 0,     -- included when copying a month forward
  `note` VARCHAR(255) NOT NULL DEFAULT '',
  `created_by` VARCHAR(120) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NULL,
  INDEX `idx_exp_date` (`spent_on`),
  INDEX `idx_exp_cat` (`category`),
  INDEX `idx_exp_node` (`node`),
  INDEX `idx_exp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Optional monthly cap per category, drawn as budget-versus-actual bars in the screen.
--    A missing row simply means "no cap set" — nothing is required here.
CREATE TABLE IF NOT EXISTS `wx_expense_budgets` (
  `category` VARCHAR(40) PRIMARY KEY,
  `cap_month` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Suggested caps for a Lahore workshop + showroom, in PKR per month. Optional: delete this
--    block if you would rather set the caps from the screen (Expense log → Budgets).
INSERT INTO `wx_expense_budgets` (`category`, `cap_month`, `updated_at`)
VALUES ('rent', 185000, NOW()), ('utilities', 95000, NOW()), ('wages', 480000, NOW()),
       ('transport', 140000, NOW()), ('marketing', 120000, NOW()), ('software', 25000, NOW())
ON DUPLICATE KEY UPDATE `category` = `category`;

-- Verify:
--   SELECT category, cap_month FROM wx_expense_budgets ORDER BY cap_month DESC;
--   SELECT COUNT(*) FROM wx_expenses;      -- 0 on a fresh migration, that is correct
