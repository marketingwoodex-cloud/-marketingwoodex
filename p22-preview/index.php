<?php
/**
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
        exit;
    }
}

// Serve root index.html
if (file_exists(__DIR__ . '/index.html')) {
    readfile(__DIR__ . '/index.html');
    exit;
}

echo "Woodex Interior Architecture Studio Platform is Live.";
