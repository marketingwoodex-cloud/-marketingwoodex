<?php
/**
 * WOODEX CMS API router (H3) — port of netlify/functions/* to one PHP entry.
 * .htaccess rewrites /.netlify/functions/<fn> → /api/router.php?fn=<fn>
 * Response shapes mirror the Node functions so admin JS works unchanged.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

$fn = (string)($_GET['fn'] ?? '');
$body = wx_body();

/* ========================================================= public (no auth) */
if ($fn === 'enquiry-submit') {
    wx_method_guard(['POST']);
    if (!empty($body['_hp'])) wx_json(200, ['ok' => true]); // honeypot
    $name = trim((string)($body['name'] ?? ''));
    $phone = preg_replace('/[^0-9+]/', '', (string)($body['phone'] ?? ''));
    if (mb_strlen($name) < 2) wx_json(400, ['error' => 'Name is required.']);
    if (strlen($phone) < 7) wx_json(400, ['error' => 'A valid phone number is required.']);
    $st = wx_pdo()->prepare('INSERT INTO enquiries (id, name, phone, email, project_type, message, source, status, pipeline_stage)
        VALUES (?, ?, ?, ?, ?, ?, ?, "new", "new")');
    $st->execute([
        wx_uuid(), mb_substr($name, 0, 160), mb_substr($phone, 0, 40),
        mb_substr(trim((string)($body['email'] ?? '')), 0, 160),
        mb_substr(trim((string)($body['project_type'] ?? $body['type'] ?? '')), 0, 120),
        mb_substr(trim((string)($body['message'] ?? '')), 0, 5000),
        mb_substr(trim((string)($body['source'] ?? 'website')), 0, 40),
    ]);
    wx_audit('enquiry', 'New enquiry from ' . $name);
    wx_json(200, ['ok' => true]);
}

if ($fn === 'estimator-submit') {
    wx_method_guard(['POST']);
    if (!empty($body['_hp'])) wx_json(200, ['ok' => true]);
    $name = trim((string)($body['name'] ?? ''));
    $phone = preg_replace('/[^0-9+]/', '', (string)($body['phone'] ?? ''));
    $service = trim((string)($body['service_type'] ?? $body['service'] ?? ''));
    if (mb_strlen($name) < 2 || strlen($phone) < 7 || $service === '') {
        wx_json(400, ['error' => 'Name, phone and service are required.']);
    }
    $sel = $body['selections'] ?? [];
    $st = wx_pdo()->prepare('INSERT INTO estimator_leads (id, name, phone, email, service_type, area_sqft, selections, estimate_min, estimate_max, status, source_page)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "new", ?)');
    $st->execute([
        wx_uuid(), mb_substr($name, 0, 160), mb_substr($phone, 0, 40),
        mb_substr(trim((string)($body['email'] ?? '')), 0, 160),
        mb_substr($service, 0, 120),
        isset($body['area_sqft']) && $body['area_sqft'] !== '' ? (int)$body['area_sqft'] : null,
        json_encode(is_array($sel) ? $sel : [], JSON_UNESCAPED_UNICODE),
        isset($body['estimate_min']) ? (int)$body['estimate_min'] : null,
        isset($body['estimate_max']) ? (int)$body['estimate_max'] : null,
        mb_substr(trim((string)($body['source_page'] ?? '')), 0, 200),
    ]);
    wx_audit('estimator', 'Estimator lead from ' . $name);
    wx_json(200, ['ok' => true]);
}

if ($fn === 'analytics-track') {
    wx_method_guard(['POST']);
    $path = mb_substr((string)($body['path'] ?? '/'), 0, 300);
    if ($path === '' || $path[0] !== '/') $path = '/' . $path;
    $vid = preg_replace('/[^A-Za-z0-9_-]/', '', (string)($body['vid'] ?? ''));
    $st = wx_pdo()->prepare('INSERT INTO page_views (id, path, vid) VALUES (?, ?, ?)');
    $st->execute([wx_uuid(), $path, $vid !== '' ? mb_substr($vid, 0, 64) : null]);
    wx_json(200, ['ok' => true]);
}

/* --------------------------------------------------------------- cms-auth
   (runs BEFORE the global auth gate — signing in has no token yet) */
if ($fn === 'cms-auth') {
    wx_method_guard(['POST']);
    $username = trim((string)($body['username'] ?? ''));
    $password = (string)($body['password'] ?? '');
    if ($username === '' || $password === '') wx_json(400, ['error' => 'Invalid request.']);
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $ip = trim(explode(',', (string)$ip)[0]);
    // brute-force window (shared store = activity table, like Node)
    try {
        $since = date('Y-m-d H:i:s', time() - 600);
        $st = wx_pdo()->prepare("SELECT COUNT(*) FROM activity WHERE kind='login_fail' AND text=? AND created_at>=?");
        $st->execute([$ip, $since]);
        if ((int)$st->fetchColumn() >= 25) {
            wx_json(429, ['error' => 'Too many attempts. Please wait a few minutes.']);
        }
    } catch (Throwable $e) { /* rate-limit best effort */ }
    $st = wx_pdo()->prepare('SELECT username, pass_sha256, role, active FROM cms_users WHERE username = ?');
    $st->execute([$username]);
    $row = $st->fetch();
    $hash = hash('sha256', $password);
    $ok = $row && (int)$row['active'] === 1 && hash_equals((string)$row['pass_sha256'], $hash);
    if (!$ok) {
        wx_audit('login_fail', $ip);
        if ($username !== '') wx_audit('login_fail_user', $username);
        wx_json(401, ['error' => 'Incorrect username or password.']);
    }
    $role = in_array($row['role'], ['admin', 'editor', 'viewer'], true) ? $row['role'] : 'viewer';
    wx_json(200, ['session' => wx_issue_session($row['username'], $role), 'username' => $row['username'], 'role' => $role]);
}

/* ---------------------------------------------------------------- cms-chat
   Visitor side is public (visitor_id ownership checked); agent side authed. */
if ($fn === 'cms-chat') {
    $pdo = wx_pdo();
    $action = (string)($body['action'] ?? $_GET['action'] ?? '');
    $isAgent = ($action === 'threads' || $action === 'thread' || $action === 'reply');

    if ($action === 'open' && wx_method() === 'POST') {
        $vid = preg_replace('/[^A-Za-z0-9_-]/', '', (string)($body['visitor_id'] ?? ''));
        if (strlen($vid) < 6) wx_json(400, ['error' => 'Invalid visitor.']);
        $page = mb_substr((string)($body['page'] ?? '/'), 0, 300);
        $name = mb_substr(trim((string)($body['name'] ?? '')), 0, 160);
        $st = $pdo->prepare("SELECT * FROM chat_channels WHERE visitor_id=? AND status='open' ORDER BY created_at DESC LIMIT 1");
        $st->execute([$vid]);
        $ch = $st->fetch();
        if (!$ch) {
            $id = wx_uuid();
            $st = $pdo->prepare('INSERT INTO chat_channels (id, visitor_id, page, visitor_name, status, last_msg_at) VALUES (?, ?, ?, ?, "open", NOW())');
            $st->execute([$id, $vid, $page, $name !== '' ? $name : null]);
            $st = $pdo->prepare('SELECT * FROM chat_channels WHERE id=?');
            $st->execute([$id]);
            $ch = $st->fetch();
            wx_audit('chat', 'New chat channel' . ($name !== '' ? ' from ' . $name : ''));
        }
        wx_json(200, ['channel' => $ch]);
    }

    if ($action === 'message' && wx_method() === 'POST') {
        $cid = (string)($body['channel_id'] ?? '');
        $vid = preg_replace('/[^A-Za-z0-9_-]/', '', (string)($body['visitor_id'] ?? ''));
        $text = trim((string)($body['body'] ?? ''));
        if ($text === '' || strlen($text) > 4000) wx_json(400, ['error' => 'Message required.']);
        $st = $pdo->prepare('SELECT id FROM chat_channels WHERE id=? AND visitor_id=?');
        $st->execute([$cid, $vid]);
        if (!$st->fetch()) wx_json(403, ['error' => 'Not your channel.']);
        $st = $pdo->prepare('INSERT INTO chat_messages (id, channel_id, `from`, body, created_at) VALUES (?, ?, "visitor", ?, NOW())');
        $st->execute([wx_uuid(), $cid, mb_substr($text, 0, 4000)]);
        $pdo->prepare('UPDATE chat_channels SET unread_admin=1, last_msg_at=NOW() WHERE id=?')->execute([$cid]);
        wx_json(200, ['ok' => true]);
    }

    if ($action === 'poll' && wx_method() === 'GET') {
        $cid = (string)($_GET['channel_id'] ?? '');
        $vid = preg_replace('/[^A-Za-z0-9_-]/', '', (string)($_GET['visitor_id'] ?? ''));
        $since = (int)($_GET['since'] ?? 0);
        $st = $pdo->prepare('SELECT id FROM chat_channels WHERE id=? AND visitor_id=?');
        $st->execute([$cid, $vid]);
        if (!$st->fetch()) wx_json(403, ['error' => 'Not your channel.']);
        $st = $pdo->prepare('SELECT id, `from`, body, agent_name, created_at FROM chat_messages WHERE channel_id=? AND LENGTH(REPLACE(id, "-", "")) >= 0 ORDER BY created_at ASC, id ASC LIMIT 200');
        $st->execute([$cid]);
        $msgs = $st->fetchAll();
        // client-side cursor: filter by numeric-less id ordering is fragile — return all + since as timestamp cursor
        wx_json(200, ['messages' => $msgs]);
    }

    if ($isAgent) {
        $au = wx_auth(false);
        if ($action === 'threads') {
            $chs = $pdo->query('SELECT * FROM chat_channels ORDER BY COALESCE(last_msg_at, created_at) DESC LIMIT 100')->fetchAll();
            foreach ($chs as &$ch) {
                $st = $pdo->prepare('SELECT body, created_at FROM chat_messages WHERE channel_id=? ORDER BY created_at DESC LIMIT 1');
                $st->execute([$ch['id']]);
                $ch['last'] = $st->fetch() ?: null;
                $st = $pdo->prepare('SELECT COUNT(*) FROM chat_messages WHERE channel_id=? AND `from`="visitor"');
                $st->execute([$ch['id']]);
                $ch['msg_count'] = (int)$st->fetchColumn();
            }
            unset($ch);
            $unread = (int)$pdo->query('SELECT COUNT(*) FROM chat_channels WHERE unread_admin=1')->fetchColumn();
            wx_json(200, ['channels' => $chs, 'unread' => $unread]);
        }
        if ($action === 'thread') {
            $cid = (string)($_GET['id'] ?? $body['id'] ?? '');
            $st = $pdo->prepare('SELECT * FROM chat_channels WHERE id=?');
            $st->execute([$cid]);
            $ch = $st->fetch();
            if (!$ch) wx_json(404, ['error' => 'Channel not found.']);
            $st = $pdo->prepare('SELECT * FROM chat_messages WHERE channel_id=? ORDER BY created_at ASC, id ASC LIMIT 500');
            $st->execute([$cid]);
            $msgs = $st->fetchAll();
            $pdo->prepare('UPDATE chat_channels SET unread_admin=0 WHERE id=?')->execute([$cid]);
            wx_json(200, ['channel' => $ch, 'messages' => $msgs]);
        }
        if ($action === 'reply' && wx_method() === 'POST') {
            wx_need_write($au);
            $cid = (string)($body['id'] ?? '');
            $text = trim((string)($body['body'] ?? ''));
            if ($text === '' || strlen($text) > 4000) wx_json(400, ['error' => 'Message required.']);
            $st = $pdo->prepare('SELECT id FROM chat_channels WHERE id=?');
            $st->execute([$cid]);
            if (!$st->fetch()) wx_json(404, ['error' => 'Channel not found.']);
            $st = $pdo->prepare('INSERT INTO chat_messages (id, channel_id, `from`, body, agent_name, created_at) VALUES (?, ?, "agent", ?, ?, NOW())');
            $st->execute([wx_uuid(), $cid, mb_substr($text, 0, 4000), $au['username']]);
            $pdo->prepare('UPDATE chat_channels SET unread_admin=0, last_msg_at=NOW(), assigned_to=? WHERE id=?')->execute([$au['username'], $cid]);
            wx_audit('chat', 'Agent reply on channel ' . substr($cid, 0, 8), ['agent' => $au['username']]);
            wx_json(200, ['ok' => true]);
        }
        wx_json(400, ['error' => 'Unknown chat action.']);
    }
    wx_json(400, ['error' => 'Unknown chat action.']);
}

/* ============================================================ auth required */
$user = wx_auth(false);
function wx_need_write(array $u): void
{
    if (!in_array($u['role'], ['admin', 'editor'], true)) wx_json(403, ['error' => 'Your role is read-only.']);
}

/* ---------------------------------------------------------------- users (admin) */
if ($fn === 'cms-users') {
    if (wx_method() === 'GET') {
        $rows = wx_pdo()->query('SELECT id, username, role, active, created_at FROM cms_users ORDER BY username')->fetchAll();
        wx_json(200, ['users' => $rows]);
    }
    wx_need_write($user);
    if ($user['role'] !== 'admin') wx_json(403, ['error' => 'Admin access required.']);
    wx_method_guard(['POST', 'PATCH', 'DELETE']);
    if (wx_method() === 'DELETE') {
        $id = (string)($body['id'] ?? $_GET['id'] ?? '');
        if ($id === '') wx_json(400, ['error' => 'Invalid id.']);
        $me = wx_pdo()->prepare('SELECT username FROM cms_users WHERE id=?');
        $me->execute([$id]);
        $un = (string)($me->fetchColumn() ?: '');
        if ($un !== '' && $un === $user['username']) wx_json(400, ['error' => 'You cannot delete your own account.']);
        $st = wx_pdo()->prepare('DELETE FROM cms_users WHERE id=?');
        $st->execute([$id]);
        wx_audit('user', 'Deleted user ' . $un);
        wx_json(200, ['ok' => true]);
    }
    $id = (string)($body['id'] ?? '');
    $username = trim((string)($body['username'] ?? ''));
    $role = in_array($body['role'] ?? '', ['admin', 'editor', 'viewer'], true) ? $body['role'] : 'viewer';
    if ($id !== '') {
        if (isset($body['active'])) {
            $st = wx_pdo()->prepare('UPDATE cms_users SET role=?, active=? WHERE id=?');
            $st->execute([$role, !empty($body['active']) ? 1 : 0, $id]);
        } else {
            $st = wx_pdo()->prepare('UPDATE cms_users SET role=? WHERE id=?');
            $st->execute([$role, $id]);
        }
        if (!empty($body['password'])) {
            $st = wx_pdo()->prepare('UPDATE cms_users SET pass_sha256=? WHERE id=?');
            $st->execute([hash('sha256', (string)$body['password']), $id]);
        }
        $st = wx_pdo()->prepare('SELECT id, username, role, active FROM cms_users WHERE id=?');
        $st->execute([$id]);
        wx_audit('user', 'Updated user ' . $username);
        wx_json(200, ['user' => $st->fetch()]);
    }
    if (!preg_match('/^[A-Za-z0-9_.-]{3,64}$/', $username)) wx_json(400, ['error' => 'Invalid username.']);
    $pw = (string)($body['password'] ?? '');
    if (strlen($pw) < 8) wx_json(400, ['error' => 'Password must be at least 8 characters.']);
    try {
        $st = wx_pdo()->prepare('INSERT INTO cms_users (id, username, pass_sha256, role, active) VALUES (?, ?, ?, ?, 1)');
        $st->execute([wx_uuid(), $username, hash('sha256', $pw), $role]);
    } catch (PDOException $e) {
        wx_json(400, ['error' => 'That username already exists.']);
    }
    wx_audit('user', 'Created user ' . $username);
    $st = wx_pdo()->prepare('SELECT id, username, role, active FROM cms_users WHERE username=?');
    $st->execute([$username]);
    wx_json(200, ['user' => $st->fetch() ?: ['username' => $username, 'role' => $role, 'active' => true]]);
}

/* ------------------------------------------------------------ generic CRUD */
$JSON_COLS = [
    'estimator_leads' => ['selections'],
    'activity' => ['meta'],
    'blog_posts' => ['content'],
    'projects' => ['images'],
    'services' => ['benefits', 'process', 'deliverables', 'gallery', 'faqs', 'seo'],
    'locations' => ['services', 'faqs', 'seo'],
    'site_settings' => ['value'],
    'quotations' => ['items'],
    'quotation_templates' => ['items'],
    'invoices' => ['sections', 'items'],
    'chat_messages' => [],
];

$RES = [
    'cms-enquiries' => ['table' => 'enquiries', 'list' => 'enquiries', 'one' => 'enquiry',
        'order' => 'created_at DESC', 'paged' => true, 'filters' => ['status' => 'status', 'pipeline_stage' => 'pipeline_stage'],
        'search' => ['name', 'phone', 'email', 'message']],
    'cms-estimator-leads' => ['table' => 'estimator_leads', 'list' => 'leads', 'one' => 'lead',
        'order' => 'created_at DESC', 'paged' => true, 'filters' => ['status' => 'status'], 'search' => ['name', 'phone', 'email']],
    'cms-clients' => ['table' => 'clients', 'list' => 'clients', 'one' => 'client',
        'order' => 'created_at DESC', 'filters' => [], 'search' => ['name', 'company', 'phone', 'email']],
    'cms-site-visits' => ['table' => 'site_visits', 'list' => 'visits', 'one' => 'visit',
        'order' => 'created_at DESC', 'filters' => ['status' => 'status'], 'search' => ['client_name', 'phone', 'address']],
    'cms-testimonials' => ['table' => 'testimonials', 'list' => 'testimonials', 'one' => 'testimonial',
        'order' => 'created_at DESC', 'filters' => ['featured' => 'featured', 'published' => 'published'], 'search' => ['client_name', 'quote']],
    'cms-services' => ['table' => 'services', 'list' => 'services', 'one' => 'service',
        'order' => 'created_at DESC', 'filters' => ['published' => 'published'], 'search' => ['name', 'slug']],
    'cms-locations' => ['table' => 'locations', 'list' => 'locations', 'one' => 'location',
        'order' => 'created_at DESC', 'filters' => ['published' => 'published'], 'search' => ['name', 'slug']],
    'cms-team' => ['table' => 'team', 'list' => 'team', 'one' => 'member',
        'order' => 'created_at DESC', 'filters' => [], 'search' => ['name', 'role']],
    'cms-media' => ['table' => 'media', 'list' => 'media', 'one' => 'media',
        'order' => 'created_at DESC', 'filters' => [], 'search' => ['filename', 'alt_text', 'url']],
    'cms-menu-items' => ['table' => 'menu_items', 'list' => 'items', 'one' => 'item',
        'order' => 'position ASC, created_at ASC', 'filters' => ['visible' => 'visible'], 'search' => ['label', 'url']],
    'cms-redirects' => ['table' => 'redirects', 'list' => 'redirects', 'one' => 'redirect',
        'order' => 'created_at DESC', 'filters' => ['active' => 'active'], 'search' => ['from_path', 'to_path']],
    'cms-blog-posts' => ['table' => 'blog_posts', 'list' => 'posts', 'one' => 'post',
        'order' => 'created_at DESC', 'filters' => ['status' => 'status'], 'search' => ['title', 'slug']],
    'cms-projects' => ['table' => 'projects', 'list' => 'projects', 'one' => 'project',
        'order' => 'created_at DESC', 'filters' => ['status' => 'status', 'category' => 'category'], 'search' => ['title', 'slug', 'location']],
    'cms-quotation-templates' => ['table' => 'quotation_templates', 'list' => 'templates', 'one' => 'template',
        'order' => 'created_at DESC', 'filters' => [], 'search' => ['name']],
    'cms-quotations' => ['table' => 'quotations', 'list' => 'quotations', 'one' => 'quotation',
        'order' => 'created_at DESC', 'filters' => ['status' => 'status'], 'search' => ['client_name', 'ref_no', 'project']],
    'cms-invoices' => ['table' => 'invoices', 'list' => 'invoices', 'one' => 'invoice',
        'order' => 'created_at DESC', 'filters' => ['payment_status' => 'payment_status'], 'search' => ['client_name', 'inv_no', 'project']],
];

if (isset($RES[$fn])) {
    $cfg = $RES[$fn];
    $table = $cfg['table'];
    $cols = $JSON_COLS[$table] ?? [];
    $decode = function (array $r) use ($cols, $table): array {
        foreach ($cols as $c) {
            if (isset($r[$c]) && is_string($r[$c]) && $r[$c] !== '') {
                $d = json_decode($r[$c], true);
                if ($table === 'quotation_templates' || ($table === 'quotations' && $c === 'items')) {
                    // sections synthesis happens below for quote-family
                }
                $r[$c] = json_last_error() === JSON_ERROR_NONE && $d !== null ? $d : $r[$c];
            }
        }
        // sections fallback for quotation family (shape() parity)
        if (in_array($table, ['quotations', 'invoices', 'quotation_templates'], true)) {
            $items = is_array($r['items'] ?? null) ? $r['items'] : [];
            $sections = [];
            if (!empty($r['sections']) && is_array($r['sections'])) {
                $sections = $r['sections'];
            } elseif (!empty($items)) {
                $sections = [['name' => 'General', 'items' => $items]];
            }
            $r['sections'] = $sections;
        }
        if ($table === 'quotation_templates') {
            // admin expects items too
        }
        return $r;
    };

    if (wx_method() === 'GET') {
        $where = ['1=1'];
        $args = [];
        foreach ($cfg['filters'] as $qk => $col) {
            $v = $_GET[$qk] ?? null;
            if ($v !== null && $v !== '') {
                if (in_array($col, ['published', 'featured', 'visible', 'active'], true)) {
                    $where[] = "$col=?";
                    $args[] = (int)$v ? 1 : 0;
                } else {
                    $where[] = "$col=?";
                    $args[] = (string)$v;
                }
            }
        }
        $q = trim((string)($_GET['q'] ?? ''));
        if ($q !== '' && !empty($cfg['search'])) {
            $or = [];
            foreach ($cfg['search'] as $sc) {
                $or[] = "$sc LIKE ?";
                $args[] = '%' . $q . '%';
            }
            $where[] = '(' . implode(' OR ', $or) . ')';
        }
        $sql = 'SELECT * FROM ' . $table . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY ' . $cfg['order'];
        $limit = null; $offset = null;
        if (!empty($cfg['paged'])) {
            $limit = min(500, max(1, (int)($_GET['limit'] ?? 100)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));
            $sql .= ' LIMIT ' . $limit . ' OFFSET ' . $offset;
        }
        $st = wx_pdo()->prepare($sql);
        $st->execute($args);
        $rows = array_map($decode, $st->fetchAll());
        $resp = [$cfg['list'] => $rows];
        if (!empty($cfg['paged'])) {
            $cst = wx_pdo()->prepare('SELECT COUNT(*) FROM ' . $table . ' WHERE ' . implode(' AND ', $where));
            $cst->execute($args);
            $resp['total'] = (int)$cst->fetchColumn();
            $resp['limit'] = $limit;
            $resp['offset'] = $offset;
        }
        wx_json(200, $resp);
    }

    wx_need_write($user);
    wx_method_guard(['POST', 'PATCH', 'DELETE']);

    if (wx_method() === 'DELETE') {
        $id = (string)($body['id'] ?? $_GET['id'] ?? '');
        if (!preg_match('/^[A-Za-z0-9-]{6,40}$/', $id)) wx_json(400, ['error' => 'Invalid id.']);
        $st = wx_pdo()->prepare('DELETE FROM ' . $table . ' WHERE id=?');
        $st->execute([$id]);
        wx_audit('delete', "Deleted row in $table");
        wx_json(200, ['ok' => true]);
    }

    // POST/PATCH = create or update
    $id = (string)($body['id'] ?? '');
    $stmtCols = [];
    $args = [];
    // column discovery: use information_schema (live, no drift)
    $colRows = wx_pdo()->query('SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ' . wx_pdo()->quote($table))->fetchAll(PDO::FETCH_COLUMN);
    $payload = $body;
    unset($payload['action'], $payload['id']);
    $useCols = [];
    foreach ($colRows as $c) {
        if ($c === 'id' || $c === 'created_at' || $c === 'updated_at') continue;
        if (array_key_exists($c, $payload)) {
            $useCols[] = $c;
            $v = $payload[$c];
            $args[] = (is_array($v) || is_object($v)) ? json_encode($v, JSON_UNESCAPED_UNICODE)
                : (is_bool($v) ? (int)$v : $v);
        }
    }
    if ($id !== '') {
        if (!$useCols) wx_json(400, ['error' => 'Nothing to update.']);
        $set = implode(', ', array_map(fn($c) => "$c=?", $useCols));
        $st = wx_pdo()->prepare('UPDATE ' . $table . " SET $set WHERE id=?");
        $st->execute(array_merge($args, [$id]));
    } else {
        // quotation/invoice auto numbering (parity with nextRef/nextInvNo)
        if ($table === 'quotations' && !isset($payload['ref_no'])) {
            $yy = date('y');
            $st = wx_pdo()->query('SELECT ref_no FROM quotations ORDER BY created_at DESC LIMIT 1000');
            $seq = 1;
            foreach ($st->fetchAll() as $r) {
                if (preg_match('#^WI/Q-(\d{4})/' . $yy . '$#', (string)$r['ref_no'], $m)) {
                    $seq = max($seq, (int)$m[1] + 1);
                }
            }
            $payload['ref_no'] = sprintf('WI/Q-%04d/%s', $seq, $yy);
            if (!in_array('ref_no', $useCols, true)) { $useCols[] = 'ref_no'; $args[] = $payload['ref_no']; }
        }
        if ($table === 'invoices' && !isset($payload['inv_no'])) {
            $yy = date('y');
            $st = wx_pdo()->query('SELECT inv_no FROM invoices ORDER BY created_at DESC LIMIT 1000');
            $seq = 1;
            foreach ($st->fetchAll() as $r) {
                if (preg_match('#^WI/INV-(\d{4})/' . $yy . '$#', (string)$r['inv_no'], $m)) {
                    $seq = max($seq, (int)$m[1] + 1);
                }
            }
            $payload['inv_no'] = sprintf('WI/INV-%04d/%s', $seq, $yy);
            if (!in_array('inv_no', $useCols, true)) { $useCols[] = 'inv_no'; $args[] = $payload['inv_no']; }
        }
        if (!isset($payload['issue_date']) && $table === 'invoices') {
            $useCols[] = 'issue_date'; $args[] = date('Y-m-d');
        }
        if ($table === 'services' || $table === 'locations') {
            foreach (['benefits', 'process', 'deliverables', 'gallery', 'faqs', 'seo'] as $jc) {
                if (in_array($jc, $colRows, true) && !isset($payload[$jc])) {
                    $useCols[] = $jc;
                    $args[] = ($jc === 'faqs' || $jc === 'benefits' || $jc === 'process' || $jc === 'deliverables' || $jc === 'gallery') ? '[]' : '{}';
                }
            }
        }
        if (!$useCols) wx_json(400, ['error' => 'Invalid request.']);
        $cs = implode(', ', $useCols);
        $ph = implode(', ', array_fill(0, count($useCols), '?'));
        try {
            $st = wx_pdo()->prepare('INSERT INTO ' . $table . " (id, $cs) VALUES (UUID(), $ph)");
            $st->execute($args);
        } catch (PDOException $e) {
            wx_json(400, ['error' => 'Could not save: ' . $e->getMessage()]);
        }
        $id = wx_pdo()->lastInsertId();
        if (!$id) {
            // UUID() insert — re-select by ref/slug if present
            $sel = null;
            if (isset($payload['ref_no'])) $sel = ['ref_no', $payload['ref_no']];
            elseif (isset($payload['inv_no'])) $sel = ['inv_no', $payload['inv_no']];
            elseif (isset($payload['slug'])) $sel = ['slug', $payload['slug']];
            elseif (isset($payload['username'])) $sel = ['username', $payload['username']];
            if ($sel) {
                $st = wx_pdo()->prepare('SELECT id FROM ' . $table . ' WHERE ' . $sel[0] . '=?');
                $st->execute([$sel[1]]);
                $id = (string)$st->fetchColumn();
            }
        }
    }
    $st = wx_pdo()->prepare('SELECT * FROM ' . $table . ' WHERE id=?');
    $st->execute([$id]);
    $row = $st->fetch();
    if ($row) $row = $decode($row);
    // singular response key per resource
    $key = $cfg['one'];
    if ($table === 'site_visits') $key = 'visit';
    if ($table === 'quotations') {
        wx_json(200, ['ok' => true, 'ref_no' => $row['ref_no'] ?? null, 'quotation' => $row]);
    }
    if ($table === 'invoices') {
        wx_json(200, ['ok' => true, 'inv_no' => $row['inv_no'] ?? null, 'invoice' => $row]);
    }
    wx_json(200, [$key => $row]);
}

/* ---------------------------------------------------------------- settings */
if ($fn === 'cms-settings') {
    if (wx_method() === 'GET') {
        $st = wx_pdo()->query("SELECT `key`, `value` FROM site_settings WHERE `key` IN ('site','contact','social','rates')");
        $settings = ['site' => [], 'contact' => [], 'social' => [], 'rates' => []];
        foreach ($st->fetchAll() as $r) {
            $d = json_decode((string)$r['value'], true);
            $settings[$r['key']] = is_array($d) ? $d : [];
        }
        wx_json(200, ['settings' => $settings]);
    }
    wx_need_write($user);
    wx_method_guard(['POST']);
    $key = (string)($body['key'] ?? '');
    if (!in_array($key, ['site', 'contact', 'social', 'rates'], true)) wx_json(400, ['error' => 'Invalid settings key.']);
    $st = wx_pdo()->prepare('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)');
    $st->execute([$key, json_encode($body['value'] ?? new stdClass(), JSON_UNESCAPED_UNICODE)]);
    wx_audit('settings', 'Saved settings: ' . $key);
    wx_json(200, ['ok' => true, 'key' => $key]);
}

/* ------------------------------------------------------ page files (cms-pages) */
if ($fn === 'cms-pages') {
    $REG = 'content/pages/index.json';
    $cleanSlug = 'wx_clean_slug';
    if (wx_method() === 'GET') {
        $action = (string)($_GET['action'] ?? 'list');
        if ($action === 'list') {
            $reg = wx_read_json($REG);
            $pages = (is_array($reg) && isset($reg['pages']) && is_array($reg['pages'])) ? $reg['pages'] : [];
            wx_json(200, ['pages' => $pages, 'count' => count($pages)]);
        }
        if ($action === 'get') {
            $slug = wx_clean_slug((string)($_GET['slug'] ?? ''));
            if ($slug === null) wx_json(400, ['error' => 'Invalid slug.']);
            $dir = wx_content_dir($slug);
            $blocks = wx_read_json("$dir/blocks.json");
            $meta = wx_read_json("$dir/meta.json");
            if ($blocks === null || $meta === null) wx_json(404, ['error' => "No drafts for $slug (not converted yet)."]);
            wx_json(200, ['slug' => $slug, 'meta' => $meta, 'blocks' => $blocks]);
        }
        wx_json(400, ['error' => 'Unknown action.']);
    }
    wx_need_write($user);
    wx_method_guard(['POST']);
    $action = (string)($body['action'] ?? '');
    $slug = wx_clean_slug((string)($body['slug'] ?? ''));
    if ($slug === null) wx_json(400, ['error' => 'Invalid slug.']);
    $dir = wx_content_dir($slug);

    if ($action === 'save') {
        try {
            $blocks = wx_validate_blocks($body['blocks'] ?? null);
            $meta = wx_validate_meta($body['meta'] ?? null, $slug);
            wx_write_json("$dir/blocks.json", $blocks);
            wx_write_json("$dir/meta.json", $meta);
            $reg = wx_read_json($REG);
            if (is_array($reg) && isset($reg['pages']) && is_array($reg['pages'])) {
                foreach ($reg['pages'] as &$p) {
                    if (($p['slug'] ?? '') === $slug) { $p['title'] = $meta['title']; break; }
                }
                unset($p);
                usort($reg['pages'], fn($a, $b) => strcmp($a['slug'] ?? '', $b['slug'] ?? ''));
                wx_write_json($REG, $reg);
            }
            wx_json(200, ['ok' => true, 'draftOnly' => true]);
        } catch (Throwable $e) {
            wx_json(400, ['error' => $e->getMessage()]);
        }
    }
    if ($action === 'publish') {
        try {
            $blocks = wx_read_json("$dir/blocks.json");
            $meta = wx_read_json("$dir/meta.json");
            if ($blocks === null || $meta === null) throw new RuntimeException("No drafts for $slug (not converted yet).");
            wx_validate_blocks($blocks);
            wx_validate_meta($meta, $slug);
            $path = wx_page_path($slug);
            $live = wx_read_file($path);
            if ($live === null) wx_json(404, ['error' => 'Live page not found.']);
            $out = wx_render_page($live, $meta, $blocks);
            wx_save_version($path, $live, $user['username']);
            wx_write_file($path, $out);
            wx_audit('publish', 'Published ' . $slug, ['user' => $user['username']]);
            wx_json(200, ['ok' => true, 'sha' => substr(hash('sha256', $out), 0, 40)]);
        } catch (Throwable $e) {
            wx_json(400, ['error' => $e->getMessage()]);
        }
    }
    if ($action === 'create') {
        $donor = wx_clean_slug((string)($body['donor'] ?? '/'));
        $title = trim((string)($body['title'] ?? ''));
        if ($title === '') wx_json(400, ['error' => 'Title is required.']);
        if (wx_read_json("$dir/blocks.json") !== null) wx_json(400, ['error' => 'That page already exists.']);
        $dB = $donor ? wx_read_json(wx_content_dir($donor) . '/blocks.json') : null;
        $dM = $donor ? wx_read_json(wx_content_dir($donor) . '/meta.json') : null;
        $blocks = is_array($dB) ? $dB : [];
        $meta = is_array($dM) ? $dM : [];
        $meta['title'] = mb_substr($title, 0, 180);
        $meta['description'] = mb_substr(trim((string)($body['description'] ?? '')), 0, 400);
        $meta['canonical'] = 'https://woodex.com.pk' . $slug;
        try { $meta = wx_validate_meta($meta, $slug); } catch (Throwable $e) { wx_json(400, ['error' => $e->getMessage()]); }
        wx_write_json("$dir/blocks.json", $blocks);
        wx_write_json("$dir/meta.json", $meta);
        $reg = wx_read_json($REG);
        if (!is_array($reg)) $reg = ['generated' => 'hostinger', 'pages' => []];
        if (!isset($reg['pages']) || !is_array($reg['pages'])) $reg['pages'] = [];
        $reg['pages'][] = ['slug' => $slug, 'title' => $meta['title']];
        usort($reg['pages'], fn($a, $b) => strcmp($a['slug'] ?? '', $b['slug'] ?? ''));
        wx_write_json($REG, $reg);
        wx_audit('page', 'Created page ' . $slug);
        wx_json(200, ['ok' => true, 'slug' => $slug]);
    }
    if ($action === 'delete') {
        $redirectTo = wx_clean_slug((string)($body['redirect_to'] ?? ''));
        $deleted = 0;
        $path = wx_page_path($slug);
        if (wx_read_file($path) !== null) {
            @unlink(wx_root() . '/' . $path);
            $deleted++;
        }
        foreach (["$dir/blocks.json", "$dir/meta.json"] as $f) {
            if (wx_read_file($f) !== null) { @unlink(wx_root() . '/' . $f); $deleted++; }
        }
        @rmdir(wx_root() . '/' . $dir);
        $reg = wx_read_json($REG);
        if (is_array($reg) && isset($reg['pages']) && is_array($reg['pages'])) {
            $reg['pages'] = array_values(array_filter($reg['pages'], fn($p) => ($p['slug'] ?? '') !== $slug));
            wx_write_json($REG, $reg);
        }
        if ($redirectTo !== null) {
            $st = wx_pdo()->prepare('INSERT INTO redirects (id, from_path, to_path) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE to_path=VALUES(to_path), active=1');
            $st->execute([wx_uuid(), $slug, $redirectTo]);
        }
        wx_audit('page', 'Deleted page ' . $slug);
        wx_json(200, ['ok' => true, 'deleted' => $deleted]);
    }
    wx_json(400, ['error' => 'Unknown action.']);
}

/* ------------------------------------------------------- cms-save (publish) */
if ($fn === 'cms-save') {
    wx_need_write($user);
    wx_method_guard(['POST']);
    $path = (string)($body['path'] ?? '');
    $html = $body['html'] ?? '';
    $message = trim((string)($body['message'] ?? ''));
    if (!wx_valid_page_path($path)) wx_json(400, ['error' => 'Invalid page path.']);
    $isJsConfig = in_array($path, ['assets/js/estimator-rates.js', 'assets/js/site-config.js', 'assets/js/theme-config.js', 'assets/js/nav-config.js'], true);
    $isSeo = in_array($path, ['sitemap.xml', 'robots.txt'], true);
    if (!is_string($html) || (!$isSeo && strlen($html) < 100) || strlen($html) > 2000000) {
        wx_json(400, ['error' => 'Invalid page content.']);
    }
    if (!$isJsConfig && !$isSeo && !preg_match('/^[\s\S]*<html[\s>][\s\S]*<\/html>\s*$/', $html)) {
        wx_json(400, ['error' => 'Content does not look like a full page.']);
    }
    if ($isJsConfig && !preg_match('/window\.(WX_RATES|WOODEX_CONFIG|WX_THEME|WX_NAV)\s*=/', $html)) {
        wx_json(400, ['error' => 'Config file does not look valid.']);
    }
    try {
        $prev = wx_read_file($path);
        if ($prev !== null && $prev !== '') wx_save_version($path, $prev, $user['username']);
        wx_write_file($path, $html);
        wx_audit('publish', 'Saved ' . $path, ['user' => $user['username'], 'message' => $message]);
        wx_json(200, ['ok' => true, 'commit' => null]); // direct write — no GitHub step
    } catch (Throwable $e) {
        wx_json(502, ['error' => 'Could not save the file: ' . $e->getMessage()]);
    }
}

/* ------------------------------------------------------------ cms-delete (files) */
if ($fn === 'cms-delete') {
    wx_need_write($user);
    wx_method_guard(['POST']);
    $path = (string)($body['path'] ?? '');
    if (!wx_valid_page_path($path) || !str_ends_with($path, '.html')) wx_json(400, ['error' => 'Invalid page path.']);
    $deleted = 0;
    if (wx_read_file($path) !== null) { @unlink(wx_root() . '/' . $path); $deleted++; }
    wx_json(200, ['ok' => true, 'deleted' => $deleted]);
}

/* ----------------------------------------------------------------- versions */
if ($fn === 'cms-versions') {
    if (wx_method() === 'GET') {
        $path = (string)($_GET['path'] ?? $_GET['page_path'] ?? '');
        $st = wx_pdo()->prepare('SELECT id, page_path, created_by, note, created_at, LENGTH(html) AS size FROM page_versions WHERE page_path=? ORDER BY created_at DESC LIMIT 50');
        $st->execute([$path]);
        wx_json(200, ['versions' => $st->fetchAll()]);
    }
    wx_need_write($user);
    wx_method_guard(['POST']);
    $id = (string)($body['id'] ?? '');
    $st = wx_pdo()->prepare('SELECT page_path, html FROM page_versions WHERE id=?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) wx_json(404, ['error' => 'Version not found.']);
    wx_write_file((string)$row['page_path'], (string)$row['html']);
    wx_audit('version', 'Restored ' . $row['page_path']);
    wx_json(200, ['ok' => true, 'path' => $row['page_path']]);
}

/* ------------------------------------------------------------------- stats */
if ($fn === 'cms-stats') {
    wx_method_guard(['GET']);
    $days = min(365, max(1, (int)($_GET['days'] ?? 30)));
    $from = new DateTimeImmutable('-' . $days . ' days midnight');
    $to = new DateTimeImmutable('tomorrow');
    $pdo = wx_pdo();
    $enq = $pdo->query("SELECT status, created_at FROM enquiries WHERE created_at >= '" . $from->format('Y-m-d H:i:s') . "'")->fetchAll();
    $enqAll = $pdo->query('SELECT COUNT(*) c, SUM(status="new") n FROM enquiries')->fetch();
    $leads = $pdo->query("SELECT created_at FROM estimator_leads WHERE created_at >= '" . $from->format('Y-m-d H:i:s') . "'")->fetchAll();
    $posts = $pdo->query('SELECT status FROM blog_posts')->fetchAll();
    $projects = $pdo->query('SELECT COUNT(*) c FROM projects')->fetch();
    $views = $pdo->query("SELECT path, vid, viewed_at FROM page_views WHERE viewed_at >= '" . $from->format('Y-m-d H:i:s') . "'")->fetchAll();
    $quotes = $pdo->query("SELECT total, status FROM quotations WHERE created_at >= '" . $from->format('Y-m-d H:i:s') . "'")->fetchAll();
    $visits = $pdo->query("SELECT COUNT(*) c FROM site_visits WHERE visit_date >= '" . $from->format('Y-m-d H:i:s') . "'")->fetch();

    $labels = []; $sViews = []; $sVisitors = []; $sLeads = []; $sConv = [];
    $byDayV = []; $byDayU = []; $byDayL = []; $byDayC = [];
    $uids = [];
    foreach ($views as $v) {
        $d = substr((string)$v['viewed_at'], 0, 10);
        $byDayV[$d] = ($byDayV[$d] ?? 0) + 1;
        if (!empty($v['vid'])) { $uids[$d][$v['vid']] = true; }
    }
    foreach ($leads as $l) { $d = substr((string)$l['created_at'], 0, 10); $byDayL[$d] = ($byDayL[$d] ?? 0) + 1; }
    foreach ($enq as $e) { $d = substr((string)$e['created_at'], 0, 10); $byDayC[$d] = ($byDayC[$d] ?? 0) + 1; }
    $cur = $from;
    while ($cur < $to) {
        $d = $cur->format('Y-m-d');
        $labels[] = $d;
        $sViews[] = $byDayV[$d] ?? 0;
        $sVisitors[] = isset($uids[$d]) ? count($uids[$d]) : 0;
        $sLeads[] = $byDayL[$d] ?? 0;
        $sConv[] = $byDayC[$d] ?? 0;
        $cur = $cur->modify('+1 day');
    }
    $byStatus = [];
    foreach ($enq as $e) { $byStatus[$e['status']] = ($byStatus[$e['status']] ?? 0) + 1; }
    $qVal = 0; $qActive = 0;
    foreach ($quotes as $q) { $qVal += (float)$q['total']; if (!in_array($q['status'], ['rejected', 'expired'], true)) $qActive++; }
    $weekAgo = date('Y-m-d H:i:s', time() - 7 * 86400);
    $st = $pdo->query("SELECT COUNT(*) FROM enquiries WHERE created_at >= '$weekAgo'");
    $newWeek = (int)$st->fetchColumn();
    $st = $pdo->query('SELECT COUNT(*) FROM estimator_leads');
    $leadsTotal = (int)$st->fetchColumn();
    $postsPub = 0; foreach ($posts as $p) { if ($p['status'] === 'published') $postsPub++; }
    $st = $pdo->query("SELECT COUNT(*) FROM enquiries WHERE status='new'");
    $recent = $pdo->query('SELECT name, phone, project_type, status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 5')->fetchAll();

    wx_json(200, [
        'days' => $days,
        'stats' => [
            'enquiries_total' => (int)($enqAll['c'] ?? 0),
            'enquiries_new' => (int)($enqAll['n'] ?? 0),
            'enquiries_new_week' => $newWeek,
            'enquiries_by_status' => $byStatus,
            'estimator_leads' => $leadsTotal,
            'blog_posts' => count($posts),
            'blog_published' => $postsPub,
            'projects' => (int)($projects['c'] ?? 0),
            'leads_total' => $leadsTotal,
            'leads_prev' => $leadsTotal,
            'leads_delta_pct' => 0,
            'quotation_value_pkr' => (int)round($qVal),
            'quotes_active' => $qActive,
            'visits_week' => (int)($visits['c'] ?? 0),
            'views_total' => array_sum($sViews),
            'unique_visitors' => count($uids ? array_merge(...array_values($uids)) : []),
            'views_per_visitor' => null,
            'active_chats' => 0,
        ],
        'series' => ['labels' => $labels, 'views' => $sViews, 'visitors' => $sVisitors, 'leads' => $sLeads, 'conversions' => $sConv],
        'recent_enquiries' => $recent,
    ]);
}

/* --------------------------------------------------------------- analytics */
if ($fn === 'cms-analytics') {
    wx_method_guard(['GET']);
    $total = (int)wx_pdo()->query('SELECT COUNT(*) FROM page_views')->fetchColumn();
    $today = (int)wx_pdo()->query("SELECT COUNT(*) FROM page_views WHERE viewed_at >= '" . date('Y-m-d') . "'")->fetchColumn();
    $byDay = wx_pdo()->query("SELECT DATE(viewed_at) d, COUNT(*) n FROM page_views WHERE viewed_at >= '" . date('Y-m-d H:i:s', strtotime('-30 days')) . "' GROUP BY DATE(viewed_at) ORDER BY d")->fetchAll();
    $top = wx_pdo()->query('SELECT path, COUNT(*) n FROM page_views GROUP BY path ORDER BY n DESC LIMIT 10')->fetchAll();
    wx_json(200, ['total' => $total, 'today' => $today, 'byDay' => $byDay, 'topPages' => $top]);
}

/* ---------------------------------------------------------------- backups */
if ($fn === 'cms-backups') {
    if ($user['role'] !== 'admin') {
        if (wx_method() !== 'GET') wx_json(403, ['error' => 'Admin access required.']);
    }
    if (wx_method() === 'GET') {
        $tables = ['exported_at' => date('c')];
        $list = wx_pdo()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        foreach ($list as $t) {
            $tables[$t] = wx_pdo()->query('SELECT * FROM `' . str_replace('`', '', $t) . '`')->fetchAll();
        }
        wx_json(200, ['exported_at' => date('c'), 'tables' => $tables]);
    }
    wx_method_guard(['POST']);
    if ($user['role'] !== 'admin') wx_json(403, ['error' => 'Admin access required.']);
    // snapshot: zip of content/ + key page folders (file-level safety net)
    $name = 'backup-' . date('Ymd-His') . '.zip';
    $dest = wx_root() . '/backups/' . $name;
    if (!is_dir(wx_root() . '/backups')) mkdir(wx_root() . '/backups', 0755, true);
    if (class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($dest, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            wx_json(500, ['error' => 'Could not create backup archive.']);
        }
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(wx_root() . '/content', FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if ($f->isFile()) $zip->addFile($f->getPathname(), 'content/' . substr($f->getPathname(), strlen(wx_root() . '/content/') + 1));
        }
        $zip->addFile(wx_root() . '/index.html', 'index.html');
        $zip->close();
        $sz = (int)@filesize($dest);
        $st = wx_pdo()->prepare('INSERT INTO backups (id, filename, size_bytes, kind) VALUES (?, ?, ?, "file")');
        $st->execute([wx_uuid(), $name, $sz]);
        wx_audit('backup', 'Created snapshot ' . $name);
        wx_json(200, ['ok' => true, 'url' => '/backups/' . $name]);
    }
    wx_json(500, ['error' => 'Zip extension not available on this host.']);
}

/* ------------------------------------------------------------------ health */
if ($fn === 'cms-health') {
    wx_method_guard(['GET']);
    $dbOk = false;
    try { wx_pdo()->query('SELECT 1'); $dbOk = true; } catch (Throwable $e) {}
    wx_json(200, [
        'supabase' => 'n/a (hostinger-php)',
        'github' => $dbOk ? 'ok' : 'down',
        'github_push' => true,
        'github_note' => 'direct file publishing (instant)',
        'time' => date('c'),
    ]);
}

/* ------------------------------------------------------------------ upload */
if ($fn === 'cms-upload') {
    wx_need_write($user);
    wx_method_guard(['POST']);
    if (empty($_FILES['file'])) wx_json(400, ['error' => 'No file uploaded.']);
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) wx_json(400, ['error' => 'Upload failed (code ' . $f['error'] . ').']);
    if ($f['size'] > 12 * 1024 * 1024) wx_json(400, ['error' => 'File too large (12MB max).']);
    $ext = strtolower(pathinfo((string)$f['name'], PATHINFO_EXTENSION));
    $allow = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf', 'mp4', 'webm'];
    if (!in_array($ext, $allow, true)) wx_json(400, ['error' => 'File type not allowed.']);
    $sub = 'assets/uploads/' . date('Y/m');
    if (!is_dir(wx_root() . '/' . $sub)) mkdir(wx_root() . '/' . $sub, 0755, true);
    $name = bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], wx_root() . '/' . $sub . '/' . $name)) {
        wx_json(500, ['error' => 'Could not save the uploaded file.']);
    }
    $url = '/' . $sub . '/' . $name;
    try {
        $st = wx_pdo()->prepare('INSERT INTO media (id, url, filename, size_bytes) VALUES (?, ?, ?, ?)');
        $st->execute([wx_uuid(), $url, (string)$f['name'], (int)$f['size']]);
    } catch (Throwable $e) { /* media table optional */ }
    wx_json(200, ['ok' => true, 'url' => $url]);
}

/* ------------------------------------------------- cms-mail (quotations/invoices) */
if ($fn === 'cms-mail') {
    wx_method_guard(['POST']);
    $au = wx_auth(true);
    $action = (string)($body['action'] ?? '');
    $id = (string)($body['id'] ?? '');
    if (!preg_match('/^[A-Za-z0-9-]{6,40}$/', $id)) wx_json(400, ['error' => 'Invalid id.']);
    if ($action === 'send-quotation') {
        $st = wx_pdo()->prepare('SELECT * FROM quotations WHERE id=?');
        $st->execute([$id]);
        $q = $st->fetch();
        if (!$q) wx_json(404, ['error' => 'Quotation not found.']);
        $to = trim((string)($body['to'] ?? '')) ?: (string)($q['email'] ?? '');
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) wx_json(400, ['error' => 'A valid recipient email is required (set it on the quotation).']);
        $items = json_decode((string)($q['items'] ?? '[]'), true) ?: [];
        $rows = '';
        foreach ($items as $it) {
            $rows .= '<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">' . htmlspecialchars((string)($it['desc'] ?? $it['name'] ?? '')) .
                '</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">' . htmlspecialchars((string)($it['amount'] ?? '')) . '</td></tr>';
        }
        $html = '<div style="font-family:Arial,sans-serif;color:#1a2233;max-width:640px">'
              . '<h2 style="color:#0a0f1e">Woodex Interior — Quotation ' . htmlspecialchars((string)$q['ref_no']) . '</h2>'
              . '<p>Dear ' . htmlspecialchars((string)$q['client_name']) . ',</p>'
              . '<p>Thank you for your interest. Your quotation <b>' . htmlspecialchars((string)$q['title']) . '</b>'
              . ($q['project'] ? ' for <b>' . htmlspecialchars((string)$q['project']) . '</b>' : '') . ' is ready.</p>'
              . '<table style="border-collapse:collapse;width:100%">' . $rows . '</table>'
              . '<p style="text-align:right;font-size:16px"><b>Total: PKR ' . number_format((float)$q['total'], 0) . '</b></p>'
              . '<p style="color:#5b6478;font-size:13px">Valid until 14 days from issue · Woodex Interior, Lahore</p></div>';
        $okMail = wx_mail($to, 'Quotation ' . $q['ref_no'] . ' — Woodex Interior', $html);
        if (!$okMail) wx_json(502, ['error' => 'Could not send email — check the mailbox settings in config (hPanel → Emails).']);
        $pdo = wx_pdo();
        $pdo->prepare("UPDATE quotations SET status = CASE WHEN status='draft' THEN 'sent' ELSE status END, updated_at=NOW() WHERE id=?")->execute([$id]);
        wx_audit('mail', 'Emailed quotation ' . $q['ref_no'] . ' to ' . $to, ['agent' => $au['username']]);
        wx_json(200, ['ok' => true, 'to' => $to]);
    }
    if ($action === 'send-invoice') {
        $st = wx_pdo()->prepare('SELECT * FROM invoices WHERE id=?');
        $st->execute([$id]);
        $q = $st->fetch();
        if (!$q) wx_json(404, ['error' => 'Invoice not found.']);
        $to = trim((string)($body['to'] ?? '')) ?: (string)($q['email'] ?? '');
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) wx_json(400, ['error' => 'A valid recipient email is required (set it on the invoice).']);
        $html = '<div style="font-family:Arial,sans-serif;color:#1a2233;max-width:640px">'
              . '<h2 style="color:#0a0f1e">Woodex Interior — Invoice ' . htmlspecialchars((string)$q['inv_no']) . '</h2>'
              . '<p>Dear ' . htmlspecialchars((string)$q['client_name']) . ',</p>'
              . '<p>Please find invoice <b>' . htmlspecialchars((string)$q['inv_no']) . '</b>'
              . ($q['project'] ? ' for <b>' . htmlspecialchars((string)$q['project']) . '</b>' : '') . '.</p>'
              . '<p style="font-size:18px"><b>Total: PKR ' . number_format((float)$q['total'], 0) . '</b>'
              . ((float)$q['amount_paid'] > 0 ? ' · Paid: PKR ' . number_format((float)$q['amount_paid'], 0) : '') . '</p>'
              . '<p style="color:#5b6478;font-size:13px">Due: ' . htmlspecialchars((string)($q['due_date'] ?? '—')) . ' · Woodex Interior, Lahore</p></div>';
        $okMail = wx_mail($to, 'Invoice ' . $q['inv_no'] . ' — Woodex Interior', $html);
        if (!$okMail) wx_json(502, ['error' => 'Could not send email — check the mailbox settings in config (hPanel → Emails).']);
        $pdo = wx_pdo();
        $pdo->prepare("UPDATE invoices SET payment_status = CASE WHEN payment_status='draft' THEN 'sent' ELSE payment_status END, updated_at=NOW() WHERE id=?")->execute([$id]);
        wx_audit('mail', 'Emailed invoice ' . $q['inv_no'] . ' to ' . $to, ['agent' => $au['username']]);
        wx_json(200, ['ok' => true, 'to' => $to]);
    }
    wx_json(400, ['error' => 'Unknown mail action.']);
}

wx_json(400, ['error' => 'Unknown function.']);
