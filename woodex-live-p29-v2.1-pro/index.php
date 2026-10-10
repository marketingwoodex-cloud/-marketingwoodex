<?php
/**
 * Woodex Interior Design Studio — Hostinger Master Entry Point
 * Domain: https://woodex.com.pk
 */

declare(strict_types=1);

// Load configuration if available
if (is_file(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

// Security Headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Check Maintenance Mode
$sysFile = __DIR__ . '/_private/system.json';
if (is_file($sysFile)) {
    $sysData = json_decode((string)file_get_contents($sysFile), true);
    if (!empty($sysData['maint']['on'])) {
        $token = (string)($sysData['maint']['token'] ?? '');
        $cookieToken = (string)($_COOKIE['wx_mt'] ?? '');
        if ($token === '' || $cookieToken !== $token) {
            http_response_code(503);
            $maintPage = ($sysData['maint']['mode'] ?? '') === 'soon' ? 'coming-soon.html' : '503.html';
            if (is_file(__DIR__ . '/' . $maintPage)) {
                readfile(__DIR__ . '/' . $maintPage);
            } else {
                echo '<h1>503 Service Unavailable</h1><p>Woodex Studio is currently undergoing scheduled maintenance. Please check back shortly.</p>';
            }
            exit;
        }
    }
}

// Request Path Routing
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uri = urldecode((string)$uri);

// Normalize path
if ($uri === '' || $uri === '/' || $uri === '/index.php' || $uri === '/index.html') {
    if (is_file(__DIR__ . '/index.html')) {
        header('Content-Type: text/html; charset=utf-8');
        readfile(__DIR__ . '/index.html');
        exit;
    }
}

// Check for direct static pages in folders (e.g. /about/, /1-kanal-house-design/)
$cleanPath = trim($uri, '/');
if ($cleanPath !== '') {
    $targetFile = __DIR__ . '/' . $cleanPath;
    if (is_dir($targetFile) && is_file($targetFile . '/index.html')) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($targetFile . '/index.html');
        exit;
    }
    if (is_file($targetFile)) {
        $ext = strtolower(pathinfo($targetFile, PATHINFO_EXTENSION));
        $mimes = [
            'html'  => 'text/html; charset=utf-8',
            'css'   => 'text/css; charset=utf-8',
            'js'    => 'application/javascript; charset=utf-8',
            'json'  => 'application/json; charset=utf-8',
            'png'   => 'image/png',
            'jpg'   => 'image/jpeg',
            'jpeg'  => 'image/jpeg',
            'webp'  => 'image/webp',
            'svg'   => 'image/svg+xml',
            'woff2' => 'font/woff2',
            'woff'  => 'font/woff',
            'pdf'   => 'application/pdf',
            'xml'   => 'application/xml; charset=utf-8',
            'txt'   => 'text/plain; charset=utf-8',
        ];
        if (isset($mimes[$ext])) {
            header('Content-Type: ' . $mimes[$ext]);
        }
        readfile($targetFile);
        exit;
    }
}

// Fallback to 404
http_response_code(404);
if (is_file(__DIR__ . '/404.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/404.html');
} else {
    echo '<h1>404 Page Not Found</h1>';
}
