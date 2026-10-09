<?php
/**
 * Woodex Architecture & Luxury Interior - Master Configuration
 * Hostinger hPanel Database & Domain Settings
 * Domain: woodex.com.pk
 */

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
