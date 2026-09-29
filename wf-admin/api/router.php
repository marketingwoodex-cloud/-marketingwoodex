<?php
/**
 * WOODEX CMS API router (Hostinger/PHP) — H1 skeleton.
 * Full action implementation lands in H3; until then every call returns a
 * clear install-needed JSON so the admin UI degrades gracefully.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$fn = $_GET['fn'] ?? '';

// H1 health probe — used by /install.php and smoke checks
if ($fn === 'cms-health') {
    http_response_code(200);
    echo json_encode([
        'ok' => true,
        'stack' => 'hostinger-php',
        'phase' => 'H1',
        'database' => 'not-installed',
        'note' => 'Run /install.php once after creating the MySQL database.',
    ]);
    exit;
}

http_response_code(503);
echo json_encode([
    'error' => 'Install needed. Run /install.php once (H2), then the API activates in H3.',
    'fn' => $fn,
]);
