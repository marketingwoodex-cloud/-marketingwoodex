<?php
/**
 * Woodex Interior Platform Configuration (Hostinger Production)
 * Domain: woodex.com.pk
 */
defined('WOODEX_CONFIG') or define('WOODEX_CONFIG', true);

define('SITE_NAME', 'Woodex Interior Design Studio');
define('SITE_DOMAIN', 'woodex.com.pk');
define('SITE_URL', 'https://woodex.com.pk');
define('ADMIN_EMAIL', 'master@woodex.pk');

// Hostinger Database Settings (Default JSON storage active; MySQL compatible)
define('DB_DRIVER', 'json'); // 'json' or 'mysql'
define('DB_HOST', 'localhost');
define('DB_NAME', 'u128159657_woodex');
define('DB_USER', 'u128159657_woodex');
define('DB_PASS', '');

// File directories
define('ROOT_DIR', __DIR__);
define('PRIVATE_DIR', __DIR__ . '/_private');
define('UPLOADS_DIR', __DIR__ . '/assets/uploads');
define('LOGS_DIR', __DIR__ . '/_private/logs');

return [
    'site_name'   => SITE_NAME,
    'domain'      => SITE_DOMAIN,
    'url'         => SITE_URL,
    'admin_email' => ADMIN_EMAIL,
    'db_driver'   => DB_DRIVER,
    'db_host'     => DB_HOST,
    'db_name'     => DB_NAME,
    'db_user'     => DB_USER,
];
