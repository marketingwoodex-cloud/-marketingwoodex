<?php
/**
 * WOODEX CMS — shared library (Hostinger/PHP port of netlify/functions/_auth.mjs,
 * _page-render.mjs + file helpers replacing _github.mjs with direct disk I/O).
 */
declare(strict_types=1);

/* ------------------------------------------------------------------ config */
function wx_config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = dirname(__DIR__, 2) . '/config/config.php';
        $cfg = is_file($file) ? (include $file) : [];
        if (!is_array($cfg)) $cfg = [];
        if (empty($cfg['session_secret'])) {
            // fallback: stable per-install secret derived from DB credentials
            $cfg['session_secret'] = hash('sha256', ($cfg['db']['name'] ?? 'woodex') . '|' . ($cfg['db']['pass'] ?? ''));
        }
    }
    return $cfg;
}

function wx_root(): string { return dirname(__DIR__, 2); }

function wx_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $db = wx_config()['db'] ?? null;
    if (!$db || empty($db['name'])) {
        wx_json(503, ['error' => 'Database is not configured yet. Run /install.php.']);
    }
    try {
        $pdo = new PDO(
            'mysql:host=' . $db['host'] . ';dbname=' . $db['name'] . ';charset=utf8mb4',
            (string)$db['user'],
            (string)$db['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 15,
            ]
        );
    } catch (Throwable $e) {
        wx_json(503, ['error' => 'Database is not configured yet.']);
    }
    return $pdo;
}

/* ------------------------------------------------------------------- json */
function wx_json(int $code, array $data): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function wx_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

function wx_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function wx_method_guard(array $allowed): never
{
    if (!in_array(wx_method(), $allowed, true)) {
        wx_json(405, ['error' => 'Method not allowed.']);
    }
}

/* ------------------------------------------------------------------- auth */
function wx_b64e(string $b): string { return rtrim(strtr(base64_encode($b), '+/', '-_'), '='); }
function wx_b64d(string $s): string
{
    return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4)) ?: '';
}

function wx_issue_session(string $username, string $role): string
{
    $now = time();
    $payload = wx_b64e(json_encode(['u' => $username, 'r' => $role, 'iat' => $now, 'exp' => $now + 12 * 3600]));
    $sig = wx_b64e(hash_hmac('sha256', $payload, wx_config()['session_secret'], true));
    return $payload . '.' . $sig;
}

function wx_bearer(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('apache_request_headers')) {
        $rh = apache_request_headers();
        $h = $rh['Authorization'] ?? $rh['authorization'] ?? '';
    }
    if (preg_match('/^Bearer\s+(\S+)$/i', trim($h), $m)) return $m[1];
    return null;
}

function wx_current_user(): ?array
{
    $tok = wx_bearer();
    if (!$tok || !str_contains($tok, '.')) return null;
    [$p, $s] = explode('.', $tok, 2);
    $raw = wx_b64d($p);
    if ($raw === '' || $s === '') return null;
    $expect = wx_b64e(hash_hmac('sha256', $p, wx_config()['session_secret'], true));
    if (!hash_equals($expect, $s)) return null;
    $d = json_decode($raw, true);
    if (!is_array($d) || empty($d['u']) || empty($d['exp']) || time() > (int)$d['exp']) return null;
    // live check: user must still exist & be active (role resolved from DB)
    try {
        $st = wx_pdo()->prepare('SELECT username, role, active FROM cms_users WHERE username = ?');
        $st->execute([(string)$d['u']]);
        $row = $st->fetch();
        if ($row) {
            if ((int)$row['active'] !== 1) return null;
            return ['username' => $row['username'], 'role' => in_array($row['role'], ['admin', 'editor', 'viewer'], true) ? $row['role'] : 'viewer'];
        }
    } catch (Throwable $e) { /* config not installed */ }
    // fallback: seed admin username from config install
    return ['username' => (string)$d['u'], 'role' => isset($d['r']) ? (string)$d['r'] : 'viewer'];
}

function wx_auth(bool $write = false): array
{
    $tok = wx_bearer();
    $user = wx_current_user();
    if (!$user) {
        wx_json(401, ['error' => $tok ? 'Session expired. Please sign in again.' : 'Authentication required. Please sign in.']);
    }
    if ($write && !in_array($user['role'], ['admin', 'editor'], true)) {
        wx_json(403, ['error' => 'Your role is read-only.']);
    }
    return $user;
}

function wx_uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function wx_audit(string $kind, string $text, ?array $meta = null): void
{
    try {
        $st = wx_pdo()->prepare('INSERT INTO activity (kind, text, meta) VALUES (?, ?, ?)');
        $st->execute([$kind, mb_substr($text, 0, 500), $meta !== null ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null]);
    } catch (Throwable $e) { /* never block the action */ }
}

/* ------------------------------------------------------- file operations */
function wx_rel_ok(string $path): bool
{
    if ($path === '' || str_contains($path, '..') || str_starts_with($path, '/')) return false;
    return (bool)preg_match('#^[A-Za-z0-9._/-]+$#', $path);
}

function wx_read_file(string $rel): ?string
{
    if (!wx_rel_ok($rel)) return null;
    $abs = wx_root() . '/' . $rel;
    if (!is_file($abs)) return null;
    $s = file_get_contents($abs);
    return $s === false ? null : $s;
}

function wx_write_file(string $rel, string $content): void
{
    if (!wx_rel_ok($rel)) throw new RuntimeException('Invalid path.');
    $abs = wx_root() . '/' . $rel;
    $dir = dirname($abs);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Cannot create folder.');
    }
    $tmp = $dir . '/.wx-tmp-' . bin2hex(random_bytes(6));
    if (file_put_contents($tmp, $content) === false) throw new RuntimeException('Write failed.');
    if (!rename($tmp, $abs)) { @unlink($tmp); throw new RuntimeException('Write failed.'); }
}

function wx_read_json(string $rel): mixed
{
    $s = wx_read_file($rel);
    if ($s === null) return null;
    $d = json_decode($s, true);
    return json_last_error() === JSON_ERROR_NONE ? $d : null;
}

function wx_write_json(string $rel, mixed $data): void
{
    wx_write_file($rel, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

/* ------------------------------------------------- page render (port)     */
function wx_clean_slug(?string $s): ?string
{
    if (!is_string($s) || strlen($s) > 130) return null;
    $v = trim($s);
    if ($v === '') return null;
    if ($v[0] !== '/') $v = '/' . $v;
    if ($v !== '/' && !str_ends_with($v, '/')) $v .= '/';
    if (str_contains($v, '..') || str_contains($v, '//')) return null;
    if ($v === '/') return '/';
    if (!preg_match('#^/(?:[A-Za-z0-9][A-Za-z0-9-]*/)+$#', $v)) return null;
    foreach (explode('/', $v) as $seg) {
        if ($seg !== '' && strlen($seg) > 60) return null;
    }
    return $v;
}

function wx_content_dir(string $slug): string
{
    return 'content/pages/' . ($slug === '/' ? 'home' : trim($slug, '/'));
}

function wx_page_path(string $slug): string
{
    return $slug === '/' ? 'index.html' : trim($slug, '/') . '/index.html';
}

function wx_sanitize_block_html(mixed $html): string
{
    $s = is_string($html) ? $html : '';
    if (strlen($s) > 400000) throw new RuntimeException('Block HTML too large (400KB max).');
    if (preg_match('/<\s*\/?\s*(html|head|body)\b/i', $s)) {
        throw new RuntimeException('Block HTML cannot contain document-level tags.');
    }
    return $s;
}

function wx_validate_blocks(mixed $blocks): array
{
    if (!is_array($blocks)) throw new RuntimeException('blocks must be an array.');
    if (count($blocks) > 200) throw new RuntimeException('Too many blocks (200 max).');
    $ids = [];
    $out = [];
    foreach ($blocks as $i => $b) {
        if (!is_array($b)) throw new RuntimeException("Block $i: not an object.");
        $type = isset($b['type']) && is_string($b['type']) && $b['type'] !== '' ? $b['type'] : 'raw';
        $id = isset($b['id']) && is_string($b['id']) && preg_match('/^[a-z0-9_-]{4,40}$/i', $b['id'])
            ? $b['id'] : 'blk' . base_convert((string)microtime(true) . $i, 10, 36);
        if (isset($ids[$id])) throw new RuntimeException("Duplicate block id: $id");
        $ids[$id] = true;
        $base = ['id' => $id, 'type' => $type];
        if (!empty($b['hidden'])) $base['hidden'] = true;
        $base['html'] = wx_sanitize_block_html($b['html'] ?? '');
        if (isset($b['fields']) && $b['fields'] !== null) {
            if (!is_array($b['fields']) || array_is_list($b['fields'])) {
                throw new RuntimeException("Block $i: fields must be an object.");
            }
            $fs = json_encode($b['fields']);
            if ($fs === false || strlen($fs) > 120000) throw new RuntimeException("Block $i: fields too large.");
            $base['fields'] = $b['fields'];
        }
        $out[] = $base;
    }
    return $out;
}

function wx_validate_meta(mixed $meta, string $slug): array
{
    $m = is_array($meta) ? $meta : [];
    $title = trim((string)($m['title'] ?? ''));
    $description = trim((string)($m['description'] ?? ''));
    $canonical = trim((string)($m['canonical'] ?? ''));
    if ($canonical === '') $canonical = 'https://woodex.com.pk' . $slug;
    $title = mb_substr($title, 0, 180);
    $description = mb_substr($description, 0, 400);
    $canonical = mb_substr($canonical, 0, 300);
    if ($title === '') throw new RuntimeException('Meta title is required.');
    if (str_contains($title, '<') || str_contains($title, '>') ||
        str_contains($description, '<') || str_contains($description, '>')) {
        throw new RuntimeException('Meta tags cannot contain < >.');
    }
    return ['title' => $title, 'description' => $description, 'canonical' => $canonical];
}

function wx_render_blocks(array $blocks): string
{
    $out = '';
    foreach ($blocks as $b) {
        if (is_array($b) && empty($b['hidden']) && isset($b['html']) && is_string($b['html'])) {
            $out .= $b['html'];
        }
    }
    return $out;
}

function wx_render_page(string $liveHtml, array $meta, array $blocks): string
{
    if (!preg_match('/<main\b[^>]*>/i', $liveHtml) || !str_contains($liveHtml, '</main>')) {
        throw new RuntimeException('Live page has no <main> element to render into.');
    }
    $inner = wx_render_blocks($blocks);
    $out = preg_replace_callback('/(<main\b[^>]*>).*?(<\/main>)/is',
        fn($m) => $m[1] . $inner . $m[2], $liveHtml, 1);
    $t = (string)($meta['title'] ?? '');
    $d = (string)($meta['description'] ?? '');
    $c = (string)($meta['canonical'] ?? '');
    if ($t !== '') {
        $out = preg_replace('/<title>.*?<\/title>/s', '<title>' . htmlspecialchars($t, ENT_QUOTES) . '</title>', $out, 1);
        $out = preg_replace('/(<meta property="og:title" content=")[^"]*(")/', '$1' . htmlspecialchars($t, ENT_QUOTES) . '$2', $out, 1);
        $out = preg_replace('/(<meta name="twitter:title" content=")[^"]*(")/', '$1' . htmlspecialchars($t, ENT_QUOTES) . '$2', $out, 1);
    }
    if ($d !== '') {
        $out = preg_replace('/(<meta name="description" content=")[^"]*(")/', '$1' . htmlspecialchars($d, ENT_QUOTES) . '$2', $out, 1);
        $out = preg_replace('/(<meta property="og:description" content=")[^"]*(")/', '$1' . htmlspecialchars($d, ENT_QUOTES) . '$2', $out, 1);
        $out = preg_replace('/(<meta name="twitter:description" content=")[^"]*(")/', '$1' . htmlspecialchars($d, ENT_QUOTES) . '$2', $out, 1);
    }
    if ($c !== '') {
        $ce = htmlspecialchars($c, ENT_QUOTES);
        if (preg_match('/<link rel="canonical" href="/', $out)) {
            $out = preg_replace('/(<link rel="canonical" href=")[^"]*(")/', '$1' . $ce . '$2', $out, 1);
        } else {
            $out = str_replace('</head>', '<link rel="canonical" href="' . $ce . '" />' . "\n" . '</head>', $out);
        }
        $out = preg_replace('/(<meta property="og:url" content=")[^"]*(")/', '$1' . $ce . '$2', $out, 1);
    }
    return $out;
}

function wx_save_version(string $path, string $html, string $user): void
{
    try {
        $st = wx_pdo()->prepare('INSERT INTO page_versions (id, page_path, html, created_by, note) VALUES (?, ?, ?, ?, ?)');
        $st->execute([wx_uuid(), $path, $html, $user, 'pre-save snapshot']);
        // keep history bounded per page
        wx_pdo()->exec('DELETE FROM page_versions WHERE id NOT IN (SELECT id FROM (SELECT id FROM page_versions ORDER BY created_at DESC LIMIT 400) t)');
    } catch (Throwable $e) { /* history must never block a save */ }
}

/** Mirror of _github.mjs validPagePath — what the dashboard may write. */
function wx_valid_page_path(string $path): bool
{
    if (!wx_rel_ok($path)) return false;
    $allowedExact = ['sitemap.xml', 'robots.txt',
        'assets/js/estimator-rates.js', 'assets/js/site-config.js',
        'assets/js/theme-config.js', 'assets/js/nav-config.js'];
    if (in_array($path, $allowedExact, true)) return true;
    return (bool)preg_match('#^[A-Za-z0-9._/-]+\.html$#', $path);
}

/* ---------------------------------------------------------- SMTP (Hostinger) */
/**
 * Minimal SMTPS sender (SSL :465, AUTH LOGIN) — no dependencies.
 * Config: config.php → mail.from/host/port/user/pass. Returns true on 250.
 */
function wx_mail(string $to, string $subject, string $htmlBody, string $textBody = ''): bool
{
    $m = wx_config()['mail'] ?? [];
    $host = (string)($m['host'] ?? 'smtp.hostinger.com');
    $port = (int)($m['port'] ?? 465);
    $user = (string)($m['user'] ?? '');
    $pass = (string)($m['pass'] ?? '');
    $from = (string)($m['from'] ?? $user);
    if ($user === '' || $pass === '' || $to === '') return false;

    $fp = @stream_socket_client('ssl://' . $host . ':' . $port, $errno, $errstr, 12);
    if (!$fp) return false;
    stream_set_timeout($fp, 12);
    $read = function () use ($fp): string {
        $out = '';
        while ($line = fgets($fp, 515)) {
            $out .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $out;
    };
    $cmd = function (string $send, string $expect) use ($fp, $read): bool {
        if ($send !== '') fwrite($fp, $send . "\r\n");
        $resp = $read();
        return str_starts_with($resp, $expect);
    };
    $ok = $read();
    if (!str_starts_with($ok, '220')) { fclose($fp); return false; }
    if (!$cmd('EHLO woodex.local', '250')) { fclose($fp); return false; }
    if (!$cmd('AUTH LOGIN', '334')) { fclose($fp); return false; }
    if (!$cmd(base64_encode($user), '334')) { fclose($fp); return false; }
    if (!$cmd(base64_encode($pass), '235')) { fclose($fp); return false; }
    if (!$cmd('MAIL FROM:<' . $from . '>', '250')) { fclose($fp); return false; }
    if (!$cmd('RCPT TO:<' . $to . '>', '250')) { fclose($fp); return false; }
    if (!$cmd('DATA', '354')) { fclose($fp); return false; }
    $mime = "From: Woodex Interior <" . $from . ">\r\n"
          . "To: <" . $to . ">\r\n"
          . "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n"
          . "MIME-Version: 1.0\r\n"
          . "Content-Type: text/html; charset=UTF-8\r\n"
          . "Date: " . date('r') . "\r\n\r\n"
          . $htmlBody . "\r\n.";
    $okData = $cmd($mime, '250');
    $cmd('QUIT', '221');
    fclose($fp);
    return $okData;
}
