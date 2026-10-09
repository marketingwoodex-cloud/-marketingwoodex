<?php
/**
<<<<<<< HEAD
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
=======
 * Woodex Architecture & Luxury Interior - Production Web Engine Gateway
 * Domain: woodex.com.pk
 * Hostinger PHP 7.4 / 8.0 / 8.1 / 8.2 / 8.3 + MySQL Compatible
 */

declare(strict_types=1);

// Load Master Configuration
>>>>>>> 7c4e980 (Deploy woodex-live-p23 folder and woodex-live-p23.zip with full Hostinger recognition structure and luxury sign-in)
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} elseif (file_exists(__DIR__ . '/includes/config.php')) {
    require_once __DIR__ . '/includes/config.php';
}

<<<<<<< HEAD
// Check for Maintenance Mode
if (file_exists(__DIR__ . '/_private/maintenance.flag') || (defined('MAINTENANCE_MODE') && MAINTENANCE_MODE === true)) {
    if (file_exists(__DIR__ . '/coming-soon.html')) {
        include __DIR__ . '/coming-soon.html';
>>>>>>> d21c542 (Fix Hostinger website recognition, flat folder structure, centered luxury login, demo pills, and deploy woodex-live-p23.zip)
=======
// Maintenance Mode Check
if (file_exists(__DIR__ . '/_private/maintenance.flag') || (defined('MAINTENANCE_MODE') && MAINTENANCE_MODE === true)) {
    if (file_exists(__DIR__ . '/coming-soon.html')) {
        header('HTTP/1.1 503 Service Temporarily Unavailable');
        header('Status: 503 Service Temporarily Unavailable');
        header('Retry-After: 3600');
        include __DIR__ . '/coming-soon.html';
>>>>>>> 7c4e980 (Deploy woodex-live-p23 folder and woodex-live-p23.zip with full Hostinger recognition structure and luxury sign-in)
        exit;
    }
}

<<<<<<< HEAD
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
=======
// Security & Performance Headers
header('X-Powered-By: Woodex-Engine/2.5');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Routing: Determine requested path
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$requestUri = trim((string)$requestUri, '/');

// Serve Homepage if root requested
if ($requestUri === '' || $requestUri === 'index.php') {
    $homeHtml = __DIR__ . '/index.html';
    if (file_exists($homeHtml)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($homeHtml);
        exit;
    }
}

// Check for subdirectory index.html (e.g. /interior-design/ -> interior-design/index.html)
if ($requestUri !== '') {
    $subHtml = __DIR__ . '/' . $requestUri . '/index.html';
    $directHtml = __DIR__ . '/' . $requestUri . '.html';
    $directFile = __DIR__ . '/' . $requestUri;

    if (is_dir(__DIR__ . '/' . $requestUri) && file_exists($subHtml)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($subHtml);
        exit;
    } elseif (file_exists($directHtml)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($directHtml);
        exit;
    } elseif (file_exists($directFile) && !is_dir($directFile)) {
        // Static file requested
        $ext = pathinfo($directFile, PATHINFO_EXTENSION);
        $mimes = [
            'css' => 'text/css', 'js' => 'application/javascript', 'json' => 'application/json',
            'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp', 'svg' => 'image/svg+xml', 'ico' => 'image/x-icon',
            'woff2' => 'font/woff2', 'xml' => 'application/xml', 'txt' => 'text/plain'
        ];
        if (isset($mimes[$ext])) header('Content-Type: ' . $mimes[$ext]);
        readfile($directFile);
        exit;
    }
}

// 404 Fallback
if (file_exists(__DIR__ . '/404.html')) {
    header('HTTP/1.1 404 Not Found');
    header('Content-Type: text/html; charset=UTF-8');
    readfile(__DIR__ . '/404.html');
    exit;
}

echo '<!DOCTYPE html><html><head><title>Woodex Architecture</title></head><body><h1>Woodex Architecture & Luxury Interior</h1><p>Visit <a href="/admin/">Admin Dashboard</a></p></body></html>';
exit;
>>>>>>> 7c4e980 (Deploy woodex-live-p23 folder and woodex-live-p23.zip with full Hostinger recognition structure and luxury sign-in)
