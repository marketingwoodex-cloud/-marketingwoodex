<?php
/**
 * Woodex — Master audit (runs ON the live server, against the real database).
 *
 * WHY: the sandbox QA runs against fixtures. This file answers the only question that matters:
 * "does MY server, with MY database, actually work?" — one file, read-only, no dependencies.
 *
 * HOW TO USE
 *   1. Upload this file to the site root (the folder that contains /api and /_private).
 *   2. Open  https://YOUR-SITE/wx-audit.php
 *      The first call creates _private/audit.key and stops — that stops a stranger from
 *      running the audit before you do.
 *   3. Open  _private/audit.key  in File Manager, copy the value, then open
 *      https://YOUR-SITE/wx-audit.php?k=THE-VALUE
 *   4. Send back the page (or add &json=1 for the machine-readable version).
 *   5. Delete wx-audit.php and _private/audit.key when you are done.
 *
 * IT NEVER WRITES TO THE DATABASE, never changes a file except creating its own key, and never
 * prints a credential value — only whether a value is set.
 */
declare(strict_types=1);
if (!function_exists('str_starts_with')) { function str_starts_with($h, $n) { return $n === '' || strncmp($h, $n, strlen($n)) === 0; } }
if (!function_exists('str_contains'))     { function str_contains($h, $n)   { return $n === '' || strpos($h, $n) !== false; } }

const AUDIT_VERSION = '1.0';
$ROOT    = __DIR__;
$PRIVATE = $ROOT . '/_private';
$KEYFILE = $PRIVATE . '/audit.key';

$json = isset($_GET['json']);
$want = (string)($_GET['k'] ?? '');
$key  = is_file($KEYFILE) ? trim((string)@file_get_contents($KEYFILE)) : '';

if ($key === '') {
    @mkdir($PRIVATE, 0755, true);
    $new = bin2hex(random_bytes(16));
    $ok  = @file_put_contents($KEYFILE, $new, LOCK_EX) !== false;
    @chmod($KEYFILE, 0600);
    audit_out($json, 'setup', ['ok' => $ok, 'key_file' => $ok ? '_private/audit.key' : '_private (not writable)']);
    exit;
}
if ($want === '' || !hash_equals($key, $want)) {
    audit_out($json, 'denied', ['reason' => 'Add ?k=<the value inside _private/audit.key>']);
    exit;
}

// ---------------------------------------------------------------------------------------------
$R = ['version' => AUDIT_VERSION, 'at' => gmdate('c'), 'site' => ($_SERVER['HTTP_HOST'] ?? 'cli'), 'php' => PHP_VERSION, 'checks' => [], 'db' => [], 'api' => [], 'files' => [], 'security' => []];
$badd = 0; $warn = 0; $good = 0;
function add(array &$R, string $area, string $name, string $status, string $detail = '', string $fix = '') {
    $R['checks'][] = ['area' => $area, 'name' => $name, 'status' => $status, 'detail' => $detail, 'fix' => $fix];
    global $badd, $warn, $good;
    if ($status === 'BAD') $badd++; elseif ($status === 'WARN') $warn++; else $good++;
}
function mask(string $v): string { return $v === '' ? '(empty)' : '(set, ' . strlen($v) . ' chars)'; }

// --- 1. environment ---------------------------------------------------------------------------
$exts = ['pdo_mysql' => 1, 'curl' => 1, 'json' => 1, 'mbstring' => 0, 'openssl' => 1, 'zip' => 0, 'gd' => 0, 'fileinfo' => 0, 'intl' => 0];
foreach ($exts as $e => $must) {
    $has = extension_loaded($e);
    add($R, 'Environment', "extension: $e", $has ? 'OK' : ($must ? 'BAD' : 'WARN'), $has ? 'loaded' : 'missing',
        $must ? "Ask the host to enable $e — the app needs it." : "Optional; some features degrade without $e.");
}
add($R, 'Environment', 'PHP version', version_compare(PHP_VERSION, '7.4', '>=') ? 'OK' : 'BAD', PHP_VERSION, 'Hostinger: set PHP 7.4+ (8.1+ recommended).');
foreach ([['memory_limit', '128M'], ['max_execution_time', '30'], ['upload_max_filesize', '8M'], ['post_max_size', '8M']] as $l) {
    add($R, 'Environment', 'limit: ' . $l[0], 'INFO', (string)ini_get($l[0]), 'Recommended at least ' . $l[1]);
}
add($R, 'Environment', '_private writable', is_writable($PRIVATE) ? 'OK' : 'BAD', is_writable($PRIVATE) ? 'yes' : 'no', 'Set permissions 755 (or 775) on _private.');
add($R, 'Environment', 'site root writable', is_writable($ROOT) ? 'OK' : 'WARN', is_writable($ROOT) ? 'yes' : 'no', 'Needed to publish .htaccess / sitemap.');

// --- 2. config files --------------------------------------------------------------------------
$need_files = ['db.json', 'config.json', 'system.json', 'connectors.json', 'google.json', 'crm.json', 'content.json',
    'blocks.json', 'chrome.json', 'forms.json', 'est-templates.json', 'booking.json', 'chat.json', 'dash.json',
    'media.json', 'health.json', 'redirects.json', 'redirect-cfg.json', 'pages.json', 'company.json'];
foreach ($need_files as $f) {
    $p = $PRIVATE . '/' . $f; $has = is_file($p);
    $R['files'][$f] = $has ? (int)@filesize($p) : -1;
}
$dbCfg = is_file($PRIVATE . '/db.json') ? json_decode((string)@file_get_contents($PRIVATE . '/db.json'), true) : null;
if (!is_array($dbCfg)) { add($R, 'Config', 'database config', 'BAD', '_private/db.json missing or unreadable', 'Run the setup page / restore db.json from your backup.'); }
else {
    $missing = []; foreach (['host', 'name', 'user', 'pass'] as $k) if (($dbCfg[$k] ?? '') === '') $missing[] = $k;
    add($R, 'Config', 'database config', $missing ? 'BAD' : 'OK', $missing ? 'empty fields: ' . implode(', ', $missing) : 'host/name/user/pass all set', 'Fill the missing keys in _private/db.json.');
    add($R, 'Config', 'db credentials', 'INFO', 'user ' . mask((string)($dbCfg['user'] ?? '')) . ' · pass ' . mask((string)($dbCfg['pass'] ?? '')) . ' · db ' . mask((string)($dbCfg['name'] ?? '')));
}

// --- 3. database ------------------------------------------------------------------------------
$pdo = null; $dbErr = '';
if (is_array($dbCfg) && ($dbCfg['name'] ?? '') !== '') {
    try {
        $dsn = 'mysql:host=' . (($dbCfg['host'] ?? '') ?: 'localhost') . ';dbname=' . $dbCfg['name'] . ';charset=utf8mb4';
        $pdo = new PDO($dsn, (string)$dbCfg['user'], (string)$dbCfg['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 8]);
        add($R, 'Database', 'connection', 'OK', 'connected to ' . (string)$dbCfg['name']);
    } catch (Throwable $e) {
        $dbErr = $e->getMessage();
        add($R, 'Database', 'connection', 'BAD', 'could not connect: ' . preg_replace('~\s+~', ' ', substr($dbErr, 0, 160)), 'Check host/name/user/pass in _private/db.json (Hostinger → Databases).');
    }
}

/** table => expected columns (only the ones the code selects by name) */
$EXPECT = [
    'wx_users' => ['id','name','email','role','pass_hash','active','pw_ver','created_at','last_login'],
    'wx_activity' => ['id','user_id','user_name','action','target','ip','created_at'],
    'wx_settings' => ['k','v'],
    'wx_throttle' => ['ip','n','t'],
    'wx_leads' => ['id','name','email','phone','status','source','created_at'],
    'wx_lead_notes' => ['id','lead_id','user_name','note','created_at'],
    'wx_quotes' => ['id','no','client_id','total','status','created_at'],
    'wx_invoices' => ['id','no','client_id','total','status','due_at','created_at'],
    'wx_clients' => ['id','name','email','phone','created_at'],
    'wx_projects' => ['id','name','client_id','status','created_at'],
    'wx_bookings' => ['id','name','email','slot','status','created_at'],
    'wx_chats' => ['id','chan','peer','name','last_at'],
    'wx_chat_msgs' => ['id','chat_id','dir','body','at'],
    'wx_templates' => ['id','kind','name','body','created_at'],
    'wx_tg_map' => ['chat_id','role'],
    'wx_tg_seen' => ['k','at'],
    'wx_wa_seen' => ['k','at'],
    'wx_notify_log' => ['id','chan','to','ok','at'],
    'wx_ai_events' => ['id','kind','at'],
    'wx_ai_unans' => ['id','q','at'],
    'wx_arc_feed' => [],
    'wx_arc_drawings' => [],
    'wx_arc_revisions' => [],
    'wx_bot_sessions' => [],
    'wx_invoices_archive' => [],
];
if ($pdo) {
    $tables = [];
    foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t) $tables[(string)$t] = 1;
    foreach ($EXPECT as $t => $cols) {
        if (!isset($tables[$t])) {
            add($R, 'Database', "table $t", 'BAD', 'missing', 'The app creates it on first use — open the matching screen once; if it stays missing, the feature cannot save.');
            continue;
        }
        try { $n = (int)$pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn(); } catch (Throwable $e) { $n = -1; }
        $R['db'][$t] = $n;
        $colHave = [];
        foreach ($pdo->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_ASSOC) as $c) $colHave[(string)$c['Field']] = 1;
        $lack = array_values(array_filter($cols, function ($c) use ($colHave) { return !isset($colHave[$c]); }));
        if ($n === 0)      add($R, 'Database', "table $t", 'WARN', 'exists but empty (0 rows)', 'Empty table = the screen shows zeros. Add a row from the UI to confirm writes work.');
        elseif ($lack)     add($R, 'Database', "table $t", 'BAD', $n . ' rows, missing columns: ' . implode(', ', $lack), 'Run the migration (open the screen) or restore the newer schema.');
        else               add($R, 'Database', "table $t", 'OK', $n . ' rows');
    }
    // Feature readiness, expressed in data terms.
    $q1 = function (string $sql) use ($pdo) { try { return (int)$pdo->query($sql)->fetchColumn(); } catch (Throwable $e) { return -1; } };
    $feat = [
        'Leads'            => ['SELECT COUNT(*) FROM wx_leads', 'Leads list'],
        'Pipeline'         => ['SELECT COUNT(*) FROM wx_leads WHERE status NOT IN ("won","lost","")', 'Pipeline board'],
        'Quotations'       => ['SELECT COUNT(*) FROM wx_quotes', 'Quotes & invoices'],
        'Invoices'         => ['SELECT COUNT(*) FROM wx_invoices', 'Quotes & invoices'],
        'Invoice archive'  => ['SELECT COUNT(*) FROM wx_invoices_archive', 'Invoice tracking'],
        'Clients'          => ['SELECT COUNT(*) FROM wx_clients', 'Clients'],
        'Projects'         => ['SELECT COUNT(*) FROM wx_projects', 'Projects'],
        'Bookings'         => ['SELECT COUNT(*) FROM wx_bookings', 'Bookings'],
        'Chats'            => ['SELECT COUNT(*) FROM wx_chats', 'Inbox'],
        'Templates'        => ['SELECT COUNT(*) FROM wx_templates', 'Invoice / quotation templates'],
        'Telegram map'     => ['SELECT COUNT(*) FROM wx_tg_map', 'Telegram routing'],
        'Timeline'         => ['SELECT COUNT(*) FROM wx_activity', 'Timeline / activity'],
        'Team'             => ['SELECT COUNT(*) FROM wx_users', 'Team & roles'],
    ];
    foreach ($feat as $label => $f) {
        $n = $q1($f[0]);
        add($R, 'Feature data', $label, $n > 0 ? 'OK' : ($n === 0 ? 'WARN' : 'BAD'), $n < 0 ? 'query failed' : $n . ' rows', $n === 0 ? 'Screen will look empty: ' . $f[1] . ' has no data yet.' : '');
    }
}

// --- 4. every API endpoint loads (a 401/403 JSON answer is a PASS) ----------------------------
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$base = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$files = glob($ROOT . '/api/*.php') ?: [];
sort($files);
$a = 0; $bad = 0; $noAbort = 0;
if (function_exists('curl_init')) {
    foreach ($files as $f) {
        $name = basename($f);
        if (str_starts_with($name, 'config') || $name === 'r404.php') continue;
        $a++;
        $ch = curl_init($base . '/api/' . $name);
        curl_setopt_array($ch, [
            CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POSTFIELDS => '{"action":"__audit_ping"}',
        ]);
        $body = (string)curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = (string)curl_error($ch);
        curl_close($ch);
        $isJson = $body !== '' && (json_decode($body, true) !== null || str_contains($body, '"ok"'));
        $status = $isJson ? 'OK' : ($code >= 500 ? 'BAD' : ($err ? 'WARN' : 'WARN'));
        $why = $isJson ? "HTTP $code, JSON" : ($err ? "HTTP $code, curl: $err" : "HTTP $code, non-JSON: " . preg_replace('~\s+~', ' ', substr(strip_tags($body), 0, 90)));
        if ($status === 'OK') { /* good */ } else { $bad++; $noAbort++; }
        $R['api'][] = ['file' => $name, 'status' => $status, 'detail' => $why];
    }
    add($R, 'API', 'endpoints reachable', $bad === 0 ? 'OK' : 'BAD', "$a tested, $bad not answering JSON", 'A 500 means a PHP fatal error in that endpoint — send this report.');
} else {
    add($R, 'API', 'cURL on the server', 'WARN', 'curl not available — endpoint test skipped', 'Enable curl to run this part.');
}

// --- 5. security quick checks (read-only, no brute force) --------------------------------------
foreach (['/.env', '/_private/db.json', '/_private/', '/api/config.php', '/wx-install.php'] as $u) {
    $code = 0; $body = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($base . $u);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_NOBODY => false]);
        $body = (string)curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    }
    $leaked = $code === 200 && strlen($body) > 20 && !preg_match('~<(html|!doctype)~i', $body);
    $R['security'][$u] = ['http' => $code, 'bytes' => strlen($body)];
    if (in_array($u, ['/.env', '/_private/db.json', '/api/config.php'], true)) {
        add($R, 'Security', 'exposure: ' . $u, $leaked ? 'BAD' : 'OK', 'HTTP ' . $code . ', ' . strlen($body) . ' bytes', $leaked ? 'This file is readable over the web — block /_private and *.env in .htaccess immediately.' : '');
    } elseif ($u === '/wx-install.php' && $code === 200) {
        add($R, 'Security', 'installer still online', 'WARN', 'HTTP 200', 'Delete wx-install.php now that the site is set up.');
    }
}

// ---------------------------------------------------------------------------------------------
$R['summary'] = ['BAD' => $badd, 'WARN' => $warn, 'OK' => $good, 'verdict' => $badd > 0 ? 'NOT READY' : ($warn > 0 ? 'WORKING, WITH GAPS' : 'ALL CLEAR')];

function audit_out(bool $json, string $mode, array $extra = []) {
    header('Content-Type: ' . ($json ? 'application/json' : 'text/html') . '; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Robots-Tag: noindex, nofollow');
    if ($json) { echo json_encode(['mode' => $mode] + $extra, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES); return; }
    $t = $mode === 'setup' ? 'Woodex audit — one-time key created' : ($mode === 'denied' ? 'Woodex audit — key required' : 'Woodex audit');
    echo "<!doctype html><meta charset=utf-8><title>$t</title><meta name=robots content=noindex>";
    echo "<style>body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:32px;color:#111827;max-width:1100px}"
       . "h1{font-size:20px}h2{font-size:15px;margin:22px 0 8px}table{border-collapse:collapse;width:100%;margin:6px 0 14px}"
       . "td,th{border:1px solid #e5e7eb;padding:6px 9px;text-align:left;vertical-align:top;font-size:13px}"
       . "th{background:#f9fafb;text-transform:uppercase;font-size:11px;letter-spacing:.04em;color:#6b7280}"
       . ".OK{color:#047857;font-weight:600}.WARN{color:#b45309;font-weight:600}.BAD{color:#b91c1c;font-weight:700}.INFO{color:#6b7280}"
       . ".v{font-size:18px;font-weight:700;padding:12px 16px;border-radius:10px;display:inline-block;margin:6px 0 14px}"
       . "code{background:#f3f4f6;padding:1px 5px;border-radius:4px}</style>";
    echo "<h1>$t</h1>";
}
if (!$json) { /* page body below */ }

if (!$json) {
    echo '<p>Woodex master audit · ' . htmlspecialchars((string)$R['site']) . ' · PHP ' . htmlspecialchars((string)$R['php']) . ' · ' . htmlspecialchars((string)$R['at']) . ' UTC</p>';
    $vcls = $R['summary']['BAD'] ? 'BAD' : ($R['summary']['WARN'] ? 'WARN' : 'OK');
    echo '<div class="v ' . $vcls . '">' . htmlspecialchars((string)$R['summary']['verdict']) . ' — ' . $R['summary']['BAD'] . ' broken · ' . $R['summary']['WARN'] . ' warnings · ' . $R['summary']['OK'] . ' passed</div>';
    $areas = [];
    foreach ($R['checks'] as $c) $areas[$c['area']][] = $c;
    foreach ($areas as $area => $rows) {
        echo '<h2>' . htmlspecialchars($area) . '</h2><table><tr><th style="width:26%">Check</th><th style="width:9%">Status</th><th>Detail</th><th>Fix</th></tr>';
        foreach ($rows as $c) {
            echo '<tr><td>' . htmlspecialchars($c['name']) . '</td><td class="' . $c['status'] . '">' . $c['status'] . '</td><td>' . htmlspecialchars($c['detail']) . '</td><td>' . htmlspecialchars($c['fix']) . '</td></tr>';
        }
        echo '</table>';
    }
    if ($R['api']) {
        echo '<h2>API endpoints</h2><table><tr><th>File</th><th>Status</th><th>Result</th></tr>';
        foreach ($R['api'] as $a2) echo '<tr><td>api/' . htmlspecialchars($a2['file']) . '</td><td class="' . $a2['status'] . '">' . $a2['status'] . '</td><td>' . htmlspecialchars($a2['detail']) . '</td></tr>';
        echo '</table>';
    }
    echo '<h2>Send this back</h2><p>Copy everything below, or open <code>?k=' . htmlspecialchars($want) . '&amp;json=1</code> and copy the JSON.</p>';
    echo '<textarea style="width:100%;height:220px;font:12px/1.4 ui-monospace,monospace">' . htmlspecialchars(json_encode($R, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) . '</textarea>';
    echo '<p><b>Then delete <code>wx-audit.php</code></b> and <code>_private/audit.key</code>.</p>';
    exit;
}
echo json_encode($R, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
