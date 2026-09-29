<?php
/**
 * Woodex Live Page Builder — backend (Hostinger / any PHP 7.4+ host)
 *
 * Single endpoint: POST /api/builder.php  (JSON body {action, ...} or multipart for uploads)
 * - Password login (hash stored in /_private/config.json, created on first run)
 * - CSRF token on every write
 * - Page load/save with automatic backup (last 30 per page) + restore
 * - Image upload to /assets/uploads/ (jpg/png/webp/gif, verified, max 8 MB)
 * - Theme save -> /assets/theme.css (whitelisted CSS variables only)
 */
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

const ROOT_DIR     = __DIR__ . '/..';
const PRIVATE_DIR  = ROOT_DIR . '/_private';
const CONFIG_FILE  = PRIVATE_DIR . '/config.json';
const BACKUP_DIR   = PRIVATE_DIR . '/backups';
const UPLOAD_DIR   = ROOT_DIR . '/assets/uploads';
const THEME_FILE   = ROOT_DIR . '/assets/theme.css';
const MAX_BACKUPS  = 30;
const MAX_UPLOAD   = 8 * 1024 * 1024;
const MAX_HTML     = 3 * 1024 * 1024;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// ---------- bootstrap private dir ----------
foreach ([PRIVATE_DIR, BACKUP_DIR] as $d) {
    if (!is_dir($d)) @mkdir($d, 0755, true);
}
if (!file_exists(PRIVATE_DIR . '/.htaccess')) {
    @file_put_contents(PRIVATE_DIR . '/.htaccess', "Require all denied\nDeny from all\n");
}

function out(array $data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 400): void { out(['ok' => false, 'error' => $msg], $code); }
function config(): array { clearstatcache(true, CONFIG_FILE); $raw = is_file(CONFIG_FILE) ? @file_get_contents(CONFIG_FILE) : false; return $raw ? (json_decode($raw, true) ?: []) : []; }
function save_config(array $c): void { file_put_contents(CONFIG_FILE, json_encode($c, JSON_PRETTY_PRINT), LOCK_EX); @chmod(CONFIG_FILE, 0600); }
/* Stateless auth: signed token sent in the X-WX-CSRF header (no cookies, so it
   works inside iframes/proxies where third-party cookies are blocked). */
function secret(): string { $c = config(); if (empty($c['secret'])) { $c['secret'] = bin2hex(random_bytes(32)); save_config($c); } return $c['secret']; }
function make_token(): string { $exp = (string)(time() + 12 * 3600); return $exp . '.' . hash_hmac('sha256', 'wx|' . $exp, secret()); }
function logged_in(): bool {
    $t = (string)($_SERVER['HTTP_X_WX_CSRF'] ?? '');
    if (empty(config()['password_hash'])) return false;
    // "exp.hmac" (builder password) or "exp.uid.hmac" (signed in through Woodex Admin)
    if (preg_match('~^(\d{10})\.([a-f0-9]{64})$~', $t, $m)) return (int)$m[1] >= time() && hash_equals(hash_hmac('sha256', 'wx|' . $m[1], secret()), $m[2]);
    if (preg_match('~^(\d{10})\.(\d+)\.([a-f0-9]{64})$~', $t, $m)) return (int)$m[1] >= time() && hash_equals(hash_hmac('sha256', 'wx|' . $m[1] . '|' . $m[2], secret()), $m[3]);
    return false;
}
function token_uid(): ?int { return preg_match('~^\d{10}\.(\d+)\.~', (string)($_SERVER['HTTP_X_WX_CSRF'] ?? ''), $m) ? (int)$m[1] : null; }
/** activity line for Woodex Admin (ingested into MySQL by admin.php) */
function act(string $a, string $target = ''): void {
    @file_put_contents(PRIVATE_DIR . '/activity.jsonl', json_encode(['t' => time(), 'uid' => token_uid(), 'action' => $a, 'target' => $target, 'ip' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64)], JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
}
function require_auth(): void { if (!logged_in()) fail('Not signed in', 401); }
function throttle(bool $failed = false): void {
    $f = PRIVATE_DIR . '/login-attempts.json'; $ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
    $d = is_file($f) ? (json_decode((string)@file_get_contents($f), true) ?: []) : [];
    $d = array_filter($d, fn($v) => $v['t'] > time() - 600);
    if ($failed) { $d[$ip] = ['n' => ($d[$ip]['n'] ?? 0) + 1, 't' => time()]; @file_put_contents($f, json_encode($d), LOCK_EX); return; }
    if (($d[$ip]['n'] ?? 0) >= 8) fail('Too many attempts — wait 10 minutes', 429);
}

/** Resolve a site-relative page path safely. Returns absolute path or fails. */
function page_path(string $rel, bool $mustExist = true): string {
    $rel = ltrim(str_replace('\\', '/', $rel), '/');
    if ($rel === '' || str_ends_with($rel, '/')) $rel .= 'index.html';
    if (!preg_match('~^[a-z0-9][a-z0-9/_\-\.]*\.html$~i', $rel) || str_contains($rel, '..')) fail('Invalid page path');
    if (preg_match('~^(_private|builder|admin|api|assets)/~', $rel)) fail('That file cannot be edited');
    $abs = ROOT_DIR . '/' . $rel;
    if ($mustExist) {
        $real = realpath($abs); $root = realpath(ROOT_DIR);
        if ($real === false || !str_starts_with($real, $root . DIRECTORY_SEPARATOR)) fail('Page not found', 404);
    }
    return $abs;
}
function backup_name(): string { $t = microtime(true); return date('Ymd-His', (int)$t) . '-' . sprintf('%03d', (int)(($t - floor($t)) * 1000)) . '.html'; }
function backup_dir_for(string $rel): string { return BACKUP_DIR . '/' . preg_replace('~[^a-z0-9]+~i', '_', trim($rel, '/')); }

// ---------- A3: section library + global sections ----------
const BLOCK_CATS = ['Hero', 'Services', 'Features', 'Projects', 'Testimonials', 'CTA', 'FAQ', 'Contact', 'Content', 'Footer', 'Custom'];
function clean_block(array $b, ?array $old): array {
    $name = mb_substr(trim((string)($b['name'] ?? ($old['name'] ?? ''))), 0, 60); $html = (string)($b['html'] ?? ($old['html'] ?? ''));
    if ($name === '' || $html === '' || strlen($html) > 200 * 1024) fail('Block needs a name and HTML (max 200 KB)');
    if (preg_match('~<script|\son[a-z]+\s*=|javascript:~i', $html)) fail('Scripts are not allowed in blocks');
    $cat = in_array($b['cat'] ?? '', BLOCK_CATS, true) ? $b['cat'] : ($old['cat'] ?? 'Custom');
    $tags = $b['tags'] ?? ($old['tags'] ?? []); if (!is_array($tags)) $tags = explode(',', (string)$tags);
    $tags = array_slice(array_values(array_filter(array_map(fn($t) => mb_substr(strtolower(trim((string)$t)), 0, 24), $tags))), 0, 12);
    $global = array_key_exists('global', $b) ? !empty($b['global']) : !empty($old['global']);
    if ($global && (preg_match('~^\s*<!--~', $html) || !preg_match('~^\s*<[a-z]~i', $html))) fail('A global section must be a single element (convert it first)');
    $kind = ($b['kind'] ?? ($old['kind'] ?? '')) === 'element' ? 'element' : 'section';
    return ['id' => $old['id'] ?? bin2hex(random_bytes(6)), 'name' => $name, 'kind' => $kind, 'cat' => $cat, 'tags' => $tags, 'global' => $global, 'html' => $html, 't' => $old['t'] ?? (int)(microtime(true) * 1000), 'updated' => (int)(microtime(true) * 1000)];
}
/** outer [start,end) of every element with data-wx-global="id", balanced by tag name */
function global_ranges(string $h, string $id): array {
    $id = preg_replace('~[^a-f0-9]~', '', $id); $out = []; $pos = 0;
    while (preg_match('~<([a-z][a-z0-9-]*)\b[^>]*\bdata-wx-global="' . $id . '"[^>]*>~i', $h, $m, PREG_OFFSET_CAPTURE, $pos)) {
        $start = $m[0][1]; $tag = strtolower($m[1][0]); $i = $start + strlen($m[0][0]); $depth = 1;
        while ($depth && preg_match('~<(/?)' . $tag . '\b[^>]*>~i', $h, $t, PREG_OFFSET_CAPTURE, $i)) { $depth += $t[1][0] === '/' ? -1 : (substr($t[0][0], -2) === '/>' ? 0 : 1); $i = $t[0][1] + strlen($t[0][0]); }
        if ($depth) break; $out[] = [$start, $i]; $pos = $i;
    }
    return $out;
}
function replace_global(string $h, string $id, string $html): string { foreach (array_reverse(global_ranges($h, $id)) as [$a, $b]) $h = substr($h, 0, $a) . $html . substr($h, $b); return $h; }
function block_usage(string $id): array { $u = []; foreach (list_pages() as $p) if (global_ranges((string)file_get_contents(ROOT_DIR . '/' . $p['path']), $id)) $u[] = $p['path']; return $u; }
function detach_global(string $id): void { foreach (block_usage($id) as $rel) { $abs = ROOT_DIR . '/' . $rel; file_put_contents($abs, str_replace(' data-wx-global="' . $id . '"', '', (string)file_get_contents($abs)), LOCK_EX); } }

function list_pages(): array {
    $root = realpath(ROOT_DIR); $pages = [];
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
        if (strtolower($f->getExtension()) !== 'html') continue;
        $rel = str_replace('\\', '/', substr($f->getPathname(), strlen($root) + 1));
        if (preg_match('~^(_private|builder|admin|api|assets)/~', $rel)) continue;
        $head = (string)file_get_contents($f->getPathname(), false, null, 0, 4000);
        preg_match('~<title>(.*?)</title>~is', $head, $m);
        $url = '/' . preg_replace('~index\.html$~', '', $rel);
        $pages[] = ['path' => $rel, 'url' => $url, 'title' => html_entity_decode(trim($m[1] ?? $rel), ENT_QUOTES | ENT_HTML5)];
    }
    usort($pages, fn($a, $b) => $a['url'] === '/' ? -1 : ($b['url'] === '/' ? 1 : strcmp($a['url'], $b['url'])));
    return $pages;
}

// ---------- input ----------
$isMultipart = str_starts_with((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data');
$in = $isMultipart ? $_POST : (json_decode((string)file_get_contents('php://input'), true) ?: []);
$action = (string)($in['action'] ?? $_GET['action'] ?? 'status');
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $action !== 'status') fail('POST required', 405);

switch ($action) {
    case 'status':
        out(['ok' => true, 'loggedIn' => logged_in(), 'needsSetup' => empty(config()['password_hash'])]);

    case 'setup': // first run only: choose the admin password
        if (!empty(config()['password_hash'])) fail('Already set up', 403);
        $pw = (string)($in['password'] ?? '');
        if (strlen($pw) < 8) fail('Password must be at least 8 characters');
        save_config(['password_hash' => password_hash($pw, PASSWORD_DEFAULT), 'secret' => bin2hex(random_bytes(32)), 'created' => date('c')]);
        out(['ok' => true, 'csrf' => make_token()]);

    case 'login':
        throttle();
        $c = config();
        if (empty($c['password_hash']) || !password_verify((string)($in['password'] ?? ''), $c['password_hash'])) {
            throttle(true); usleep(400000); fail('Wrong password', 401);
        }
        out(['ok' => true, 'csrf' => make_token()]);

    case 'logout':
        out(['ok' => true]);

    case 'password':
        require_auth();
        $c = config();
        if (!password_verify((string)($in['current'] ?? ''), $c['password_hash'] ?? '')) fail('Current password is wrong', 401);
        if (strlen((string)($in['next'] ?? '')) < 8) fail('New password must be at least 8 characters');
        $c['password_hash'] = password_hash((string)$in['next'], PASSWORD_DEFAULT); $c['secret'] = bin2hex(random_bytes(32)); save_config($c);
        out(['ok' => true, 'csrf' => make_token()]);

    case 'pages':
        require_auth(); out(['ok' => true, 'pages' => list_pages()]);

    case 'load':
        require_auth();
        $abs = page_path((string)($in['path'] ?? ''));
        out(['ok' => true, 'html' => file_get_contents($abs), 'mtime' => filemtime($abs)]);

    case 'save':
        require_auth();
        $rel = (string)($in['path'] ?? ''); $abs = page_path($rel);
        $html = (string)($in['html'] ?? '');
        if (strlen($html) > MAX_HTML || stripos($html, '<html') === false || stripos($html, '</html>') === false) fail('Invalid page HTML');
        if (preg_match('~<[^>]+\s(contenteditable|data-wx-ed)[\s=>]~i', $html)) fail('Editor markup detected — save aborted to protect the page');
        if (!empty($in['mtime']) && (int)$in['mtime'] < filemtime($abs) && empty($in['force'])) fail('This page was changed elsewhere since you opened it. Reload, or save again to overwrite.', 409);
        $bd = backup_dir_for($rel); if (!is_dir($bd)) mkdir($bd, 0755, true);
        copy($abs, $bd . '/' . backup_name());
        $old = glob($bd . '/*.html'); sort($old);
        while (count($old) > MAX_BACKUPS) @unlink(array_shift($old));
        if (file_put_contents($abs, $html, LOCK_EX) === false) fail('Could not write the file (check permissions)', 500);
        act('save', $rel);
        clearstatcache(); out(['ok' => true, 'mtime' => filemtime($abs)]);

    case 'backups':
        require_auth();
        $rel = (string)($in['path'] ?? ''); page_path($rel);
        $files = glob(backup_dir_for($rel) . '/*.html') ?: []; rsort($files);
        out(['ok' => true, 'backups' => array_map(fn($f) => ['file' => basename($f), 'size' => filesize($f)], $files)]);

    case 'restore':
        require_auth();
        $rel = (string)($in['path'] ?? ''); $abs = page_path($rel);
        $file = basename((string)($in['file'] ?? ''));
        if (!preg_match('~^\d{8}-\d{6}(-\d{3})?\.html$~', $file)) fail('Invalid backup');
        $src = backup_dir_for($rel) . '/' . $file; if (!is_file($src)) fail('Backup not found', 404);
        $content = (string)file_get_contents($src);
        copy($abs, backup_dir_for($rel) . '/' . backup_name());
        act('restore', $rel);
        file_put_contents($abs, $content, LOCK_EX); clearstatcache(); out(['ok' => true, 'mtime' => filemtime($abs)]);

    case 'media':
        require_auth();
        $list = [];
        foreach (array_merge(glob(ROOT_DIR . '/assets/img/*.{webp,jpg,jpeg,png,gif,svg}', GLOB_BRACE) ?: [], glob(UPLOAD_DIR . '/*.{webp,jpg,jpeg,png,gif}', GLOB_BRACE) ?: []) as $f) {
            $list[] = '/' . str_replace('\\', '/', substr(realpath($f), strlen(realpath(ROOT_DIR)) + 1));
        }
        out(['ok' => true, 'media' => array_reverse($list)]);

    case 'media_usage':
    case 'media_delete':
        require_auth();
        $url = (string)($in['url'] ?? ''); $needle = ltrim($url, '/'); $used = [];
        foreach (list_pages() as $pg) if ($needle !== '' && str_contains((string)file_get_contents(ROOT_DIR . '/' . $pg['path']), $needle)) $used[] = $pg['url'];
        if ($action === 'media_usage') out(['ok' => true, 'used' => $used]);
        if (!preg_match('~^/assets/uploads/[a-z0-9-]+\.(jpe?g|png|webp|gif)$~i', $url)) fail('Only uploaded images can be deleted');
        if ($used && empty($in['force'])) out(['ok' => false, 'error' => 'Image is used on: ' . implode(', ', $used), 'used' => $used], 409);
        $abs = UPLOAD_DIR . '/' . basename($url); if (is_file($abs)) @unlink($abs);
        act('media_delete', (string)($in['url'] ?? ''));
        out(['ok' => true]);

    case 'import_url':
        require_auth();
        $u = (string)($in['url'] ?? ''); $p = parse_url($u);
        $host = strtolower($p['host'] ?? '');
        if (($p['scheme'] ?? '') !== 'https' || $host === '' || filter_var($host, FILTER_VALIDATE_IP) || preg_match('~^(localhost|.*\.local|.*\.internal)$~', $host)) fail('Only public https image links are allowed');
        $ip = gethostbyname($host); if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) fail('Only public https image links are allowed');
        $ctx = stream_context_create(['http' => ['timeout' => 20, 'follow_location' => 1, 'max_redirects' => 3, 'user_agent' => 'WoodexBuilder/1.0'], 'ssl' => ['verify_peer' => true]]);
        $data = @file_get_contents($u, false, $ctx, 0, MAX_UPLOAD + 1);
        if ($data === false || $data === '') fail('Could not download that image');
        if (strlen($data) > MAX_UPLOAD) fail('Image is larger than 8 MB');
        $info = @getimagesizefromstring($data);
        $map = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];
        if (!$info || !isset($map[$info[2]])) fail('That link is not a JPG, PNG, WebP or GIF image');
        if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
        $base = substr(trim(preg_replace('~[^a-z0-9]+~', '-', strtolower((string)($in['name'] ?? 'stock'))), '-') ?: 'stock', 0, 40);
        $name = $base . '-' . substr(bin2hex(random_bytes(4)), 0, 6) . '.' . $map[$info[2]];
        file_put_contents(UPLOAD_DIR . '/' . $name, $data, LOCK_EX);
        act('import_url', '/assets/uploads/' . $name);
        out(['ok' => true, 'url' => '/assets/uploads/' . $name, 'width' => $info[0], 'height' => $info[1]]);

    case 'upload':
        require_auth();
        $f = $_FILES['file'] ?? null;
        if (!$f || $f['error'] !== UPLOAD_ERR_OK) fail('Upload failed');
        if ($f['size'] > MAX_UPLOAD) fail('Image is larger than 8 MB');
        $info = @getimagesize($f['tmp_name']);
        $map = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];
        if (!$info || !isset($map[$info[2]])) fail('Only JPG, PNG, WebP or GIF images are allowed');
        if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
        $base = preg_replace('~[^a-z0-9]+~', '-', strtolower(pathinfo((string)$f['name'], PATHINFO_FILENAME))) ?: 'image';
        $name = substr(trim($base, '-'), 0, 40) . '-' . substr(bin2hex(random_bytes(4)), 0, 6) . '.' . $map[$info[2]];
        $dest = UPLOAD_DIR . '/' . $name;
        if (!move_uploaded_file($f['tmp_name'], $dest) && !rename($f['tmp_name'], $dest)) fail('Could not store the image', 500);
        act('upload', '/assets/uploads/' . $name);
        out(['ok' => true, 'url' => '/assets/uploads/' . $name, 'width' => $info[0], 'height' => $info[1]]);

    case 'theme':
        require_auth();
        $vars = (array)($in['vars'] ?? []);
        $allowed = [
            '--wx-navy' => 'color', '--wx-ink' => 'color', '--wx-muted' => 'color', '--wx-paper' => 'color',
            '--wx-surface' => 'color', '--wx-beige' => 'color', '--wx-accent' => 'color',
            '--wx-font' => 'font', '--wx-font-head' => 'font',
            '--wx-h1' => 'len', '--wx-h2' => 'len', '--wx-h3' => 'len', '--wx-c1' => 'color', '--wx-c2' => 'color', '--wx-c3' => 'color', '--wx-c4' => 'color',
            '--wx-section' => 'len', '--wx-container' => 'len', '--wx-btn-radius' => 'len', '--wx-r-lg' => 'len', '--wx-base-size' => 'len',
        ];
        $fonts = ['dm' => '"DM Sans",system-ui,sans-serif', 'system' => 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif', 'serif' => 'Georgia,"Times New Roman",serif', 'mono' => 'ui-monospace,Consolas,monospace'];
        $lines = []; $imports = [];
        foreach ($allowed as $k => $type) {
            if (!isset($vars[$k])) continue; $v = trim((string)$vars[$k]);
            if ($type === 'color' && !preg_match('~^#[0-9a-f]{3,8}$~i', $v)) fail("Invalid colour for $k");
            if ($type === 'len' && !preg_match('~^\d{1,4}(\.\d+)?(px|rem|em|%)$~', $v)) fail("Invalid size for $k");
            if ($type === 'font') {
                if (preg_match('~^g:([A-Za-z0-9 ]{2,40}):([0-9;]{0,40})$~', $v, $g)) { $imports[] = str_replace(' ', '+', trim($g[1])) . ($g[2] !== '' ? ':wght@' . $g[2] : ''); $v = '"' . trim($g[1]) . '",system-ui,sans-serif'; }
                elseif (!isset($fonts[$v])) fail("Invalid font for $k"); else $v = $fonts[$v];
            }
            $lines[] = "  $k:$v;";
        }
        $head = $imports ? '@import url("https://fonts.googleapis.com/css2?' . implode('&', array_map(fn($f) => 'family=' . $f, array_unique($imports))) . '&display=swap");' . "\n" : '';
        $hs = ''; foreach (['h1', 'h2', 'h3'] as $h) if (isset($vars["--wx-$h"])) $hs .= "main $h{font-size:var(--wx-$h)!important}\n";
        $css = $head . "/* Woodex theme — generated by the Live Page Builder on " . date('Y-m-d H:i') . ". Edit via /builder/ → Theme. */\n:root{\n" . implode("\n", $lines) . "\n}\n"
             . ":root{--navy:var(--wx-navy);--navy-2:var(--wx-navy);--ink:var(--wx-ink);--muted:var(--wx-muted)}\n"
             . "html{font-size:var(--wx-base-size,16px)}\nbody,button,input,select,textarea{font-family:var(--wx-font)!important}\nmain h1,main h2,main h3{font-family:var(--wx-font-head,var(--wx-font))}\n";
        if (is_file(THEME_FILE)) copy(THEME_FILE, BACKUP_DIR . '/theme-' . date('Ymd-His') . '.css');
        file_put_contents(THEME_FILE, $css . $hs, LOCK_EX);
        file_put_contents(PRIVATE_DIR . '/theme.json', json_encode(array_intersect_key($vars, $allowed), JSON_PRETTY_PRINT), LOCK_EX);
        act('theme', '');
        out(['ok' => true]);

    case 'page_new':
        require_auth();
        $folder = trim((string)($in['folder'] ?? ''), '/'); $slug = (string)($in['slug'] ?? ''); $html = (string)($in['html'] ?? '');
        if (!preg_match('~^[a-z0-9][a-z0-9-]{0,59}$~', $slug)) fail('Page address: use lowercase letters, numbers and dashes only');
        if ($folder !== '' && (!preg_match('~^[a-z0-9][a-z0-9\-/]{0,79}$~', $folder) || str_contains($folder, '..'))) fail('Invalid folder');
        $rel = ($folder !== '' ? $folder . '/' : '') . $slug . '/index.html';
        if (preg_match('~^(_private|builder|admin|api|assets)/~', $rel)) fail('That folder is reserved');
        if (strlen($html) > MAX_HTML || stripos($html, '<html') === false || stripos($html, '</html>') === false) fail('Invalid page HTML');
        if (preg_match('~<[^>]+\s(contenteditable|data-wx-ed)[\s=>]~i', $html)) fail('Editor markup detected');
        $abs = ROOT_DIR . '/' . $rel; if (file_exists($abs)) fail('A page already exists at that address');
        if (!is_dir(dirname($abs))) mkdir(dirname($abs), 0755, true);
        if (file_put_contents($abs, $html, LOCK_EX) === false) fail('Could not write the file (check permissions)', 500);
        act('page_new', $rel);
        out(['ok' => true, 'path' => $rel]);

    case 'blocks_list':
        require_auth();
        $f = PRIVATE_DIR . '/blocks.json';
        out(['ok' => true, 'blocks' => is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : []]);

    case 'blocks_save':
    case 'blocks_delete':
    case 'blocks_import':
        require_auth();
        $f = PRIVATE_DIR . '/blocks.json'; $list = is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : [];
        if ($action === 'blocks_delete') {
            $id = (string)($in['id'] ?? ''); $used = block_usage($id);
            if ($used && empty($in['force'])) out(['ok' => false, 'error' => 'This global section is used on ' . count($used) . ' page(s)', 'used' => $used], 409);
            if ($used) detach_global($id);
            $list = array_values(array_filter($list, fn($b) => $b['id'] !== $id));
        } elseif ($action === 'blocks_import') {
            $add = array_slice((array)($in['blocks'] ?? []), 0, 200);
            if (count($list) + count($add) > 200) fail('Library full (200 blocks)');
            foreach ($add as $b) { if (is_array($b)) { unset($b['id']); $list[] = clean_block($b, null); } }
        } else {
            $old = null; $idx = -1; $id = (string)($in['id'] ?? '');
            if ($id !== '') { foreach ($list as $k => $b) if ($b['id'] === $id) { $old = $b; $idx = $k; } if (!$old) fail('Block not found', 404); }
            if (!$old && count($list) >= 200) fail('Library full (200 blocks)');
            $b = clean_block($in, $old); if ($old) $list[$idx] = $b; else $list[] = $b;
        }
        file_put_contents($f, json_encode(array_values($list), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
        act('blocks', $action);
        out(['ok' => true, 'blocks' => array_values($list)]);

    case 'blocks_usage':
        require_auth();
        $f = PRIVATE_DIR . '/blocks.json'; $list = is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : []; $u = new stdClass;
        foreach ($list as $b) if (!empty($b['global'])) $u->{$b['id']} = block_usage($b['id']);
        out(['ok' => true, 'usage' => $u]);

    case 'blocks_sync':
        require_auth();
        $f = PRIVATE_DIR . '/blocks.json'; $list = is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : [];
        $b = null; foreach ($list as $x) if ($x['id'] === (string)($in['id'] ?? '')) $b = $x;
        if (!$b || empty($b['global'])) fail('Global section not found', 404);
        $html = preg_replace('~^<([a-z][a-z0-9-]*)~i', '<$1 data-wx-global="' . $b['id'] . '"', trim($b['html']), 1);
        $n = 0;
        foreach (list_pages() as $p) {
            $abs = ROOT_DIR . '/' . $p['path']; $o = (string)file_get_contents($abs); $h = replace_global($o, $b['id'], $html);
            if ($h !== $o) { $bd = backup_dir_for($p['path']); if (!is_dir($bd)) mkdir($bd, 0755, true); copy($abs, $bd . '/' . backup_name()); file_put_contents($abs, $h, LOCK_EX); $n++; }
        }
        act('blocks', 'blocks_sync');
        out(['ok' => true, 'changed' => $n]);

    case 'theme_get':
        require_auth();
        $f = PRIVATE_DIR . '/theme.json';
        out(['ok' => true, 'vars' => is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: new stdClass) : new stdClass]);

    default:
        fail('Unknown action');
}
