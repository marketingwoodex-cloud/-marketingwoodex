<?php
/**
 * Woodex Architecture & Luxury Interior - Master Configuration
 * Hostinger hPanel database & domain settings.
 * Domain: woodex.com.pk
 *
 * Database credentials are resolved in this order (first match wins):
 *   1. Environment variables  DB_HOST, DB_NAME, DB_USER, DB_PASS
 *   2. _private/db.json       written by the admin Setup screen / wx-install.php (never web-readable)
 *   3. The Hostinger defaults below
 */

if (!defined('WOODEX_CONFIG')) define('WOODEX_CONFIG', true);

// Site identity
if (!defined('APP_NAME'))    define('APP_NAME', 'Woodex Architecture & Luxury Interior');
if (!defined('APP_ENV'))     define('APP_ENV', 'production');
if (!defined('SITE_NAME'))   define('SITE_NAME', 'Woodex Architecture & Luxury Interior');
if (!defined('SITE_DOMAIN')) define('SITE_DOMAIN', 'woodex.com.pk');
if (!defined('SITE_URL'))    define('SITE_URL', 'https://woodex.com.pk');
if (!defined('ADMIN_URL'))   define('ADMIN_URL', 'https://woodex.com.pk/admin/');
if (!defined('ADMIN_EMAIL')) define('ADMIN_EMAIL', 'master@woodex.pk');

// Hostinger MySQL defaults
$db_host = 'localhost';
$db_name = 'u128159657_woodex';
$db_user = 'u128159657_woodex';
$db_pass = '';

// Auto-read from _private/db.json if saved by the installer / admin Setup
$dbJson = __DIR__ . '/_private/db.json';
if (file_exists($dbJson)) {
    $dbData = @json_decode((string)file_get_contents($dbJson), true);
    if (is_array($dbData)) {
        if (!empty($dbData['host'])) $db_host = $dbData['host'];
        if (!empty($dbData['name'])) $db_name = $dbData['name'];
        if (!empty($dbData['user'])) $db_user = $dbData['user'];
        if (isset($dbData['pass']))  $db_pass = $dbData['pass'];
    }
}

// Global system constants (environment variables win)
if (!defined('DB_HOST')) define('DB_HOST', getenv('DB_HOST') ?: $db_host);
if (!defined('DB_NAME')) define('DB_NAME', getenv('DB_NAME') ?: $db_name);
if (!defined('DB_USER')) define('DB_USER', getenv('DB_USER') ?: $db_user);
if (!defined('DB_PASS')) define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : $db_pass);

// Shared PDO connection helper (returns null when the database is unreachable)
if (!function_exists('getWoodexDB')) {
    function getWoodexDB(): ?PDO {
        static $pdo = null;
        if ($pdo === null) {
            try {
                $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
                $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                error_log('Database Connection Error: ' . $e->getMessage());
                return null;
            }
        }
        return $pdo;
    }
}
