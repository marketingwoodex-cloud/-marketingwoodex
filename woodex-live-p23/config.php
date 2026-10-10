<?php
/**
 * Woodex Interior Design Studio — Master Production Configuration
 * Configured for Hostinger LiteSpeed / Apache (PHP 8.0+)
 * Primary Domain: https://woodex.com.pk
 */

// Application Details
define('APP_NAME', 'Woodex Interior Design Studio');
define('APP_ENV', 'production');
define('SITE_URL', 'https://woodex.com.pk');
define('ADMIN_EMAIL', 'admin@woodex.pk');

// Hostinger MySQL Database Credentials
// Set your MySQL details here or through Hostinger hPanel -> Databases
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_DATABASE') ?: 'u128159657_woodex');
define('DB_USER', getenv('DB_USERNAME') ?: 'u128159657_woodex');
// No literal fallback: the live login is written by Admin → Setup into _private/db.json.
// Set DB_PASSWORD in the server environment (or hPanel) for CLI scripts.
define('DB_PASS', getenv('DB_PASSWORD') ?: '');
define('DB_CHARSET', 'utf8mb4');

// Telegram Studio Alerts
// Never hardcode the bot token: Admin → Integrations stores it in _private/ (token_set flag only).
define('TELEGRAM_BOT_TOKEN', getenv('TELEGRAM_BOT_TOKEN') ?: '');
define('TELEGRAM_BOT_USERNAME', '@WoodexInteriorBot');

// Banking Configurations (Dual-Bank Routing)
define('BANK_1_NAME', 'Bank Alfalah');
define('BANK_1_TITLE', 'Woodex Interior Studio');
define('BANK_1_IBAN', 'PK36ALFH0001001004567890');

define('BANK_2_NAME', 'Meezan Bank');
define('BANK_2_TITLE', 'Woodex Interior Studio');
define('BANK_2_IBAN', 'PK44MEZN0002001007890123');

// Timezone
date_default_timezone_set('Asia/Karachi');
