<?php
/**
<<<<<<< HEAD
 * Woodex Interior Architecture — Main Entry Point (Hostinger Certified)
 * Production Domain: woodex.com.pk / woodex.pk
 */
declare(strict_types=1);

// Handle direct API routing
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (is_string($uri) && str_starts_with($uri, '/api/')) {
    $apiFile = __DIR__ . $uri;
    if (is_file($apiFile)) {
        require $apiFile;
=======
 * Woodex Architecture & Luxury Interior - Production Web Gateway
 * Domain: woodex.com.pk
 * Hostinger PHP 8.x / MySQL Compatible
 */

// Load Master Configuration if available
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} elseif (file_exists(__DIR__ . '/includes/config.php')) {
    require_once __DIR__ . '/includes/config.php';
}

// Check for Maintenance Mode
if (file_exists(__DIR__ . '/_private/maintenance.flag') || (defined('MAINTENANCE_MODE') && MAINTENANCE_MODE === true)) {
    if (file_exists(__DIR__ . '/coming-soon.html')) {
        include __DIR__ . '/coming-soon.html';
>>>>>>> d21c542 (Fix Hostinger website recognition, flat folder structure, centered luxury login, demo pills, and deploy woodex-live-p23.zip)
        exit;
    }
}

<<<<<<< HEAD
// Serve root index.html
if (file_exists(__DIR__ . '/index.html')) {
    readfile(__DIR__ . '/index.html');
    exit;
}

echo "Woodex Interior Architecture Studio Platform is Live.";
=======
// Check for static index.html or render home
$htmlFile = __DIR__ . '/index.html';
if (file_exists($htmlFile)) {
    // Send standard performance headers
    header('X-Powered-By: Woodex-Engine/2.5');
    header('X-Content-Type-Options: nosniff');
    header('Content-Type: text/html; charset=UTF-8');
    readfile($htmlFile);
    exit;
} else {
    // Fallback if index.html is missing
    echo '<!DOCTYPE html><html><head><title>Woodex Architecture</title></head><body><h1>Woodex Architecture & Luxury Interior</h1><p>Visit <a href="/admin/">Admin Dashboard</a> or upload your pages.</p></body></html>';
    exit;
}
>>>>>>> d21c542 (Fix Hostinger website recognition, flat folder structure, centered luxury login, demo pills, and deploy woodex-live-p23.zip)
