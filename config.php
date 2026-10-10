<?php
/**
 * Woodex Architecture & Luxury Interior - Master Configuration
 * Hostinger hPanel Database & Domain Settings
 * Domain: woodex.com.pk
 */

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
