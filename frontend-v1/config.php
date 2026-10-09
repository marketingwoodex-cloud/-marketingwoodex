<?php
/**
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
=======
>>>>>>> 7c4e980 (Deploy woodex-live-p23 folder and woodex-live-p23.zip with full Hostinger recognition structure and luxury sign-in)
 * Woodex Architecture & Luxury Interior - Master Configuration
 * Hostinger hPanel Database & Domain Settings
 * Domain: woodex.com.pk
 */

<<<<<<< HEAD
// Environment settings
define('APP_NAME', 'Woodex Architecture & Luxury Interior');
define('APP_ENV', 'production');
define('SITE_URL', 'https://woodex.com.pk');
define('ADMIN_URL', 'https://woodex.com.pk/admin/');

// Hostinger MySQL Database Credentials (auto-read from _private/db.json if available)
$dbJson = __DIR__ . '/_private/db.json';
$dbHost = 'localhost';
$dbName = 'u128159657_woodex';
$dbUser = 'u128159657_woodex';
$dbPass = '';

if (file_exists($dbJson)) {
    $dbData = @json_decode(file_get_contents($dbJson), true);
    if (!empty($dbData['host'])) $dbHost = $dbData['host'];
    if (!empty($dbData['name'])) $dbName = $dbData['name'];
    if (!empty($dbData['user'])) $dbUser = $dbData['user'];
    if (isset($dbData['pass'])) $dbPass = $dbData['pass'];
}

// Global DB constants
define('DB_HOST', getenv('DB_HOST') ?: $dbHost);
define('DB_NAME', getenv('DB_NAME') ?: $dbName);
define('DB_USER', getenv('DB_USER') ?: $dbUser);
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : $dbPass);

// Database PDO Connection Helper
function getWoodexDB() {
=======
// Hostinger Standard PHP Database Variables (for Hostinger scanner recognition)
$db_host = "localhost";
$db_name = "u128159657_woodex";
$db_user = "u128159657_woodex";
$db_pass = "";

// Auto-read from _private/db.json if saved by installer/admin
$dbJson = __DIR__ . '/_private/db.json';
if (file_exists($dbJson)) {
    $dbData = @json_decode((string)file_get_contents($dbJson), true);
    if (!empty($dbData['host'])) $db_host = $dbData['host'];
    if (!empty($dbData['name'])) $db_name = $dbData['name'];
    if (!empty($dbData['user'])) $db_user = $dbData['user'];
    if (isset($dbData['pass']))  $db_pass = $dbData['pass'];
}

// Global System Constants
if (!defined('DB_HOST')) define('DB_HOST', getenv('DB_HOST') ?: $db_host);
if (!defined('DB_NAME')) define('DB_NAME', getenv('DB_NAME') ?: $db_name);
if (!defined('DB_USER')) define('DB_USER', getenv('DB_USER') ?: $db_user);
if (!defined('DB_PASS')) define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : $db_pass);

if (!defined('SITE_URL'))   define('SITE_URL', 'https://woodex.com.pk');
if (!defined('SITE_NAME'))  define('SITE_NAME', 'Woodex Architecture & Luxury Interior');
if (!defined('ADMIN_URL'))  define('ADMIN_URL', 'https://woodex.com.pk/admin/');

// Global PDO Connection Function
function getWoodexDB(): ?PDO {
>>>>>>> 7c4e980 (Deploy woodex-live-p23 folder and woodex-live-p23.zip with full Hostinger recognition structure and luxury sign-in)
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
<<<<<<< HEAD
>>>>>>> d21c542 (Fix Hostinger website recognition, flat folder structure, centered luxury login, demo pills, and deploy woodex-live-p23.zip)
=======
>>>>>>> 7c4e980 (Deploy woodex-live-p23 folder and woodex-live-p23.zip with full Hostinger recognition structure and luxury sign-in)
