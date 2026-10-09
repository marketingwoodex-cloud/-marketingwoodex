<?php
/**
 * Woodex Architecture & Luxury Interior - Production Web Gateway
 * Domain: woodex.com.pk
 * Hostinger PHP 7.4 / 8.0 / 8.1 / 8.2 / 8.3 + MySQL compatible
 */

declare(strict_types=1);

// Load Master Configuration
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} elseif (file_exists(__DIR__ . '/includes/config.php')) {
    require_once __DIR__ . '/includes/config.php';
}

// Maintenance Mode Check
if (file_exists(__DIR__ . '/_private/maintenance.flag') || (defined('MAINTENANCE_MODE') && MAINTENANCE_MODE === true)) {
    if (file_exists(__DIR__ . '/coming-soon.html')) {
        header('HTTP/1.1 503 Service Temporarily Unavailable');
        header('Status: 503 Service Temporarily Unavailable');
        header('Retry-After: 3600');
        include __DIR__ . '/coming-soon.html';
        exit;
    }
}

// Security & Performance Headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Routing: determine the requested path (index.php only serves HTML pages;
// static files are served directly by the web server / router)
$requestUri = trim((string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');

// Never expose private folders, dotfiles, SQL dumps or PHP libraries
if (preg_match('~(^|/)(\.|_private|_database|_templates|includes)(/|$)|-lib\.php$|\.(sql|env|log|md|bak)$~i', $requestUri)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Forbidden';
    exit;
}

// Homepage
if ($requestUri === '' || $requestUri === 'index.php') {
    $homeHtml = __DIR__ . '/index.html';
    if (file_exists($homeHtml)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($homeHtml);
        exit;
    }
}

// Sub-directory index.html (e.g. /interior-design/ -> interior-design/index.html) or /page.html
if ($requestUri !== '' && strpos($requestUri, '..') === false) {
    $subHtml = __DIR__ . '/' . $requestUri . '/index.html';
    $directHtml = __DIR__ . '/' . $requestUri . '.html';

    if (is_dir(__DIR__ . '/' . $requestUri) && file_exists($subHtml)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($subHtml);
        exit;
    } elseif (is_file($directHtml)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($directHtml);
        exit;
    }
}

// 404 Fallback
if (file_exists(__DIR__ . '/404.html')) {
    http_response_code(404);
    header('Content-Type: text/html; charset=UTF-8');
    readfile(__DIR__ . '/404.html');
    exit;
}

echo '<!DOCTYPE html><html><head><title>Woodex Architecture</title></head><body><h1>Woodex Architecture & Luxury Interior</h1><p>Visit <a href="/admin/">Admin Dashboard</a></p></body></html>';
exit;
