<?php
/**
 * Woodex AI Agent connector — Model Context Protocol server (Streamable HTTP, JSON responses).
 *
 * URL:   https://woodex.com.pk/api/mcp.php
 * Auth:  Authorization: Bearer wxmcp_…   (create tokens in Admin → Settings → AI Agent)
 * Scope: read leads, quotes, clients, pages, stats, monthly report, WhatsApp stats;
 *        safe drafts only (quotation draft, blog draft, lead note). Nothing is deleted, sent or published.
 * Every tool runs through the normal Admin permission checks as the user who created the token.
 */
declare(strict_types=1);
define('WX_LIB_ONLY', true);
require __DIR__ . '/admin.php';

const MCP_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version');
header('Access-Control-Expose-Headers: Mcp-Session-Id');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') { http_response_code(405); header('Allow: POST'); echo json_encode(['error' => 'This is the Woodex MCP endpoint. Connect with an MCP client using POST.']); exit; }

function rpc_out($id, ?array $result, ?array $err = null, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['jsonrpc' => '2.0', 'id' => $id] + ($err ? ['error' => $err] : ['result' => $result]), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit;
}
function mcp_text($data, bool $isErr = false): array { return ['content' => [['type' => 'text', 'text' => is_string($data) ? $data : json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)]], 'isError' => $isErr]; }

// ---------- auth
$hdr = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
if ($hdr === '' && function_exists('getallheaders')) foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $hdr = (string)$v;
$raw = preg_match('~^Bearer\s+(\S+)$~i', trim($hdr), $m) ? $m[1] : (string)($_GET['key'] ?? ''); // ?key= only for clients that cannot send headers
$body = json_decode((string)file_get_contents('php://input'), true);
$rid = is_array($body) ? ($body['id'] ?? null) : null;
$tok = null; $M = mcp_load();
if ($raw !== '') { $h = hash('sha256', $raw); foreach ($M['tokens'] as $i => $t) if (hash_equals($t['hash'], $h)) { $tok = $i; break; } }
if ($tok === null) { header('WWW-Authenticate: Bearer realm="woodex-mcp"'); rpc_out($rid, null, ['code' => -32001, 'message' => 'Missing or invalid token. Create one in Woodex Admin → Settings → AI Agent.'], 401); }
$T = $M['tokens'][$tok];
$user = q('SELECT * FROM wx_users WHERE id=? AND active=1', [(int)$T['user_id']])->fetch();
if (!$user) rpc_out($rid, null, ['code' => -32001, 'message' => 'The Admin user of this token is inactive'], 401);
$GLOBALS['WX_AS'] = $user;

if (!is_array($body) || ($body['jsonrpc'] ?? '') !== '2.0' || !isset($body['method'])) {
    if (is_array($body) && array_is_list($body)) rpc_out(null, null, ['code' => -32600, 'message' => 'Batch requests are not supported'], 400);
    rpc_out($rid, null, ['code' => -32700, 'message' => 'Invalid JSON-RPC request'], 400);
}
$rpc = (string)$body['method']; $params = is_array($body['params'] ?? null) ? $body['params'] : [];
if (!array_key_exists('id', $body)) { http_response_code(202); exit; } // notifications (e.g. notifications/initialized)

// ---------- tools
$S = fn(string $d, array $props = [], array $req = []) => ['type' => 'object', 'description' => $d, 'properties' => (object)$props, 'required' => $req];
$str = fn(string $d) => ['type' => 'string', 'description' => $d];
$int = fn(string $d) => ['type' => 'integer', 'description' => $d];
$TOOLS = [
    'list_leads' => ['Lists website enquiries (leads) newest first. Filter by stage or a search word.', $S('', ['stage' => $str('new, contacted, visit, quote, won or lost'), 'search' => $str('Matches name, phone, email, service or message'), 'limit' => $int('Max rows (default 25, max 200)')]), true],
    'get_lead' => ['Full details of one lead including its notes/history.', $S('', ['id' => $int('Lead id')], ['id']), true],
    'add_lead_note' => ['Adds a note to a lead (marked as written by the AI agent). Does not change the stage.', $S('', ['id' => $int('Lead id'), 'text' => $str('Note text')], ['id', 'text']), false],
    'list_quotes' => ['Lists quotations (number, client, status, total).', $S('', ['status' => $str('draft, sent, approved, invoiced, rejected, superseded'), 'search' => $str('Matches number, client or project'), 'limit' => $int('Max rows (default 25)')]), true],
    'get_quote' => ['Full quotation with sections, items and totals.', $S('', ['id' => $int('Quotation id')], ['id']), true],
    'create_quote_draft' => ['Creates a NEW quotation as a draft for the team to review. It is never sent to the client. Units: sft, rft, sqmt, nos, each, set, point, job, lumpsum.', $S('', [
        'client' => ['type' => 'object', 'properties' => ['name' => $str('Client name'), 'phone' => $str('Phone'), 'email' => $str('Email'), 'address' => $str('Address')], 'required' => ['name']],
        'project' => $str('Project title'), 'site' => $str('Site address'), 'kind' => $str('residential, commercial, renovation, fitout or other'),
        'sections' => ['type' => 'array', 'items' => ['type' => 'object', 'properties' => ['name' => $str('Section name, e.g. Kitchen'), 'items' => ['type' => 'array', 'items' => ['type' => 'object', 'properties' => ['desc' => $str('Description'), 'qty' => ['type' => 'number'], 'unit' => $str('Unit'), 'rate' => ['type' => 'number', 'description' => 'Rate in PKR']], 'required' => ['desc']]]]]],
        'notes' => $str('Internal/client notes'), 'lead_id' => $int('Link to this lead (optional)')], ['client']), false],
    'list_clients' => ['Lists clients with contact details.', $S('', ['search' => $str('Matches name, phone or email'), 'limit' => $int('Max rows (default 50)')]), true],
    'list_pages' => ['Lists all website pages with title, description, URL and SEO status.', $S(''), true],
    'site_stats' => ['Dashboard numbers: pages, leads this month, unread leads, quotation and sales totals.', $S(''), true],
    'monthly_report' => ['Report for one month: leads by source and stage, won/lost, quotations and their value.', $S('', ['month' => $str('YYYY-MM (default: current month)')]), true],
    'whatsapp_stats' => ['WhatsApp button clicks (today, 7 and 30 days), top pages and services, WhatsApp leads.', $S(''), true],
    'create_blog_draft' => ['Creates an Insights blog post as a DRAFT (not published). Body in simple markdown: "## Heading", "- list item", blank line between paragraphs.', $S('', ['title' => $str('Post title'), 'slug' => $str('Page address (optional, lowercase-with-dashes)'), 'excerpt' => $str('1–2 sentence summary'), 'body' => $str('Article body in simple markdown')], ['title', 'body']), false],
];

function mcp_log_call(string $tool, bool $ok, string $note = ''): void {
    global $T; $fp = fopen(MCP_FILE . '.lock', 'c'); flock($fp, LOCK_EX); $m = mcp_load();
    foreach ($m['tokens'] as &$t) if ($t['id'] === $T['id']) { $t['last_used'] = now(); $t['uses'] = (int)($t['uses'] ?? 0) + 1; }
    unset($t); $m['log'][] = ['t' => now(), 'token' => $T['name'], 'tool' => $tool, 'ok' => $ok, 'note' => substr($note, 0, 160), 'ip' => ip()];
    $m['log'] = array_slice($m['log'], -500); jwrite(MCP_FILE, $m); flock($fp, LOCK_UN); fclose($fp);
}
function lim($v, int $d, int $max = 200): int { $n = (int)($v ?? 0); return $n > 0 ? min($n, $max) : $d; }
function has_word(array $row, string $q, array $keys): bool { if ($q === '') return true; $q = mb_strtolower($q); foreach ($keys as $k) if (str_contains(mb_strtolower((string)(is_array($row[$k] ?? null) ? json_encode($row[$k]) : ($row[$k] ?? ''))), $q)) return true; return false; }

/** Runs $fn as the token user. Admin code ends with out()/fail() (exit), so the JSON is captured at shutdown and wrapped as a JSON-RPC tool result. */
function run_tool(callable $fn, string $tool, callable $post): void {
    global $rid;
    ob_start();
    register_shutdown_function(function () use ($rid, $tool, $post) {
        $raw = (string)ob_get_clean(); $r = json_decode($raw, true);
        header('Content-Type: application/json; charset=utf-8'); http_response_code(200);
        if (!is_array($r)) { mcp_log_call($tool, false, 'server error'); echo json_encode(['jsonrpc' => '2.0', 'id' => $rid, 'result' => mcp_text('Server error while running ' . $tool, true)]); return; }
        if (empty($r['ok'])) { mcp_log_call($tool, false, (string)($r['error'] ?? '')); echo json_encode(['jsonrpc' => '2.0', 'id' => $rid, 'result' => mcp_text((string)($r['error'] ?? 'Failed'), true)]); return; }
        $data = $post($r); mcp_log_call($tool, !is_string($data));
        echo json_encode(['jsonrpc' => '2.0', 'id' => $rid, 'result' => mcp_text($data, is_string($data))], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    });
    try { $fn(); } catch (Throwable $e) { error_log('mcp: ' . $e->getMessage()); out(['ok' => false, 'error' => 'Server error']); }
    out(['ok' => false, 'error' => 'No result']);
}
function run_action(string $action, array $in, string $tool, callable $post): void {
    run_tool(function () use ($action, $in) { $in['action'] = $action; if (!crm_actions($action, $in) && !sales_actions($action, $in) && !content_actions($action, $in) && !p8_actions($action, $in)) out(['ok' => false, 'error' => 'Unknown action']); }, $tool, $post);
}
$pass = function ($r) { unset($r['ok']); return $r; };
function md_blocks(string $md): array {
    $b = []; $list = null;
    foreach (preg_split('~\R{2,}~', trim(str_replace("\r", '', $md))) as $chunk) {
        $lines = array_values(array_filter(array_map('trim', explode("\n", $chunk)), 'strlen'));
        foreach ($lines as $i => $ln) {
            if (preg_match('~^#{1,4}\s+(.+)$~', $ln, $m)) { $b[] = ['t' => 'h', 'text' => clip($m[1], 200)]; unset($lines[$i]); }
            elseif (preg_match('~^[-*•]\s+(.+)$~', $ln, $m) || preg_match('~^\d+[.)]\s+(.+)$~', $ln, $m)) { $last = end($b); if ($last && $last['t'] === 'list') $b[count($b) - 1]['items'][] = clip($m[1], 600); else $b[] = ['t' => 'list', 'items' => [clip($m[1], 600)]]; unset($lines[$i]); }
            elseif (preg_match('~^>\s*(.+)$~', $ln, $m)) { $b[] = ['t' => 'quote', 'text' => clip($m[1], 600)]; unset($lines[$i]); }
            else { $last = end($b); if ($last && $last['t'] === 'p' && ($lines[$i - 1] ?? null) !== null) $b[count($b) - 1]['text'] .= ' ' . $ln; else $b[] = ['t' => 'p', 'text' => clip($ln, 3000)]; }
        }
    }
    return array_slice($b, 0, 120);
}

switch ($rpc) {
    case 'initialize':
        $want = (string)($params['protocolVersion'] ?? ''); $ver = in_array($want, MCP_VERSIONS, true) ? $want : MCP_VERSIONS[0];
        mcp_log_call('initialize', true, (string)($params['clientInfo']['name'] ?? ''));
        rpc_out($rid, ['protocolVersion' => $ver, 'capabilities' => ['tools' => ['listChanged' => false]], 'serverInfo' => ['name' => 'woodex-admin', 'title' => 'Woodex Interior Admin', 'version' => '1.0.0'],
            'instructions' => 'Woodex Interior (Lahore) admin data. Currency is PKR. You can read leads, quotations, clients, pages and reports, and create drafts (quotation, blog post) or lead notes. Drafts are reviewed by the team before anything is sent or published. Signed in as ' . $user['name'] . ' (' . $user['role'] . ').']);
    case 'ping': rpc_out($rid, (object)[]);
    case 'tools/list':
        $list = []; foreach ($TOOLS as $n => [$d, $schema, $ro]) $list[] = ['name' => $n, 'description' => $d, 'inputSchema' => $schema, 'annotations' => ['readOnlyHint' => $ro, 'destructiveHint' => false, 'idempotentHint' => $ro, 'openWorldHint' => false]];
        rpc_out($rid, ['tools' => $list]);
    case 'resources/list': rpc_out($rid, ['resources' => []]);
    case 'prompts/list': rpc_out($rid, ['prompts' => []]);
    case 'tools/call': break;
    default: rpc_out($rid, null, ['code' => -32601, 'message' => 'Method not found: ' . $rpc]);
}

$tool = (string)($params['name'] ?? ''); $a = is_array($params['arguments'] ?? null) ? $params['arguments'] : [];
if (!isset($TOOLS[$tool])) rpc_out($rid, null, ['code' => -32602, 'message' => 'Unknown tool: ' . $tool]);
$leadRow = fn($l) => array_intersect_key($l, array_flip(['id', 'created_at', 'name', 'phone', 'email', 'service', 'message', 'stage', 'source', 'page', 'value', 'followup', 'assigned_name', 'tags', 'lost_reason']));

try {
switch ($tool) {
    case 'list_leads':
        run_action('leads_list', [], $tool, function ($r) use ($a, $leadRow) {
            $st = (string)($a['stage'] ?? ''); $q = trim((string)($a['search'] ?? ''));
            $rows = array_filter($r['leads'], fn($l) => ($st === '' || $l['stage'] === $st) && has_word($l, $q, ['name', 'phone', 'email', 'service', 'message']));
            $rows = array_slice(array_values($rows), 0, lim($a['limit'] ?? 0, 25));
            return ['count' => count($rows), 'stages' => $r['stages'], 'leads' => array_map(fn($l) => $leadRow($l) + ['notes' => count($l['notes'] ?? [])], $rows)];
        });
    case 'get_lead':
        run_action('leads_list', [], $tool, function ($r) use ($a, $leadRow) {
            foreach ($r['leads'] as $l) if ((int)$l['id'] === (int)($a['id'] ?? 0)) return $leadRow($l) + ['notes' => $l['notes'] ?? []];
            return 'Lead not found';
        });
    case 'add_lead_note':
        $txt = trim((string)($a['text'] ?? '')); if ($txt === '') rpc_out($rid, mcp_text('Write a note first', true));
        run_action('lead_note', ['id' => (int)($a['id'] ?? 0), 'text' => '[AI agent · ' . $T['name'] . '] ' . $txt], $tool, fn($r) => ['ok' => true, 'lead' => $r['lead']['id'] ?? null, 'message' => 'Note added']);
    case 'list_quotes':
        run_action('quotes_list', [], $tool, function ($r) use ($a) {
            $st = (string)($a['status'] ?? ''); $q = trim((string)($a['search'] ?? ''));
            $rows = array_filter($r['quotes'], fn($x) => ($st === '' || $x['status'] === $st) && has_word($x, $q, ['no', 'client', 'project']));
            $rows = array_slice(array_values($rows), 0, lim($a['limit'] ?? 0, 25));
            return ['count' => count($rows), 'quotes' => array_map(fn($x) => array_intersect_key($x, array_flip(['id', 'no', 'label', 'version', 'option', 'status', 'client', 'project', 'site', 'kind', 'date', 'total', 'subtotal', 'created_by', 'created_at', 'sent_at', 'approved_at', 'lead_id'])), $rows)];
        });
    case 'get_quote':
        run_action('quote_get', ['id' => (int)($a['id'] ?? 0)], $tool, function ($r) { $x = $r['quote']; unset($x['history']); return ['quote' => $x, 'versions' => $r['family'], 'invoice' => $r['invoice'] ? ['no' => $r['invoice']['no'] ?? '', 'status' => $r['invoice']['status'] ?? ''] : null]; });
    case 'create_quote_draft':
        $in = array_intersect_key($a, array_flip(['client', 'project', 'site', 'kind', 'sections', 'notes', 'lead_id'])); // never an id: always a brand-new draft
        $in['notes'] = trim(((string)($in['notes'] ?? '')) . "\n(Draft prepared by AI agent: " . $T['name'] . ')');
        run_action('quote_save', $in, $tool, fn($r) => ['ok' => true, 'id' => $r['quote']['id'], 'no' => $r['quote']['no'], 'status' => $r['quote']['status'], 'total' => $r['quote']['total'] ?? null, 'message' => 'Draft saved. Open Admin → Quotations to review and send it.']);
    case 'list_clients':
        run_action('clients_list', [], $tool, function ($r) use ($a) {
            $q = trim((string)($a['search'] ?? '')); $rows = array_values(array_filter($r['clients'] ?? [], fn($c) => has_word($c, $q, ['name', 'phone', 'email', 'company'])));
            return ['count' => min(count($rows), lim($a['limit'] ?? 0, 50)), 'clients' => array_slice($rows, 0, lim($a['limit'] ?? 0, 50))];
        });
    case 'list_pages':
        run_tool(function () { need(['owner', 'admin', 'editor']); $meta = jread(PAGES_META); $list = []; foreach (all_pages() as $rel) $list[] = page_info($rel, $meta); out(['ok' => true, 'count' => count($list), 'pages' => $list]); }, $tool, $pass);
    case 'site_stats':
        run_tool(function () use ($user) { need(); crm_migrate();
        $s = site_stats() + ['leadsMonth' => (int)q("SELECT COUNT(*) FROM wx_leads WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')")->fetchColumn(), 'leadsUnread' => (int)q('SELECT COUNT(*) FROM wx_leads WHERE is_read=0')->fetchColumn()];
        if (in_array($user['role'], ['owner', 'admin', 'sales'], true)) $s += sales_stats();
        out(['ok' => true] + $s); }, $tool, $pass);
    case 'monthly_report':
        run_tool(function () use ($a) { need(['owner', 'admin', 'sales']); crm_migrate(); sales_migrate();
        $mo = preg_match('~^\d{4}-\d{2}$~', (string)($a['month'] ?? '')) ? $a['month'] : date('Y-m');
        $from = $mo . '-01 00:00:00'; $to = date('Y-m-d H:i:s', strtotime($from . ' +1 month'));
        $by = fn(string $col) => array_column(q("SELECT $col k, COUNT(*) n FROM wx_leads WHERE created_at >= ? AND created_at < ? GROUP BY $col ORDER BY n DESC", [$from, $to])->fetchAll(), 'n', 'k');
        $qs = array_filter(doc_all('wx_quotes'), fn($x) => substr((string)($x['created_at'] ?? ''), 0, 7) === $mo);
        $qv = fn(array $xs) => array_sum(array_map(fn($x) => (float)($x['total'] ?? 0), $xs));
        $appr = array_filter(doc_all('wx_quotes'), fn($x) => substr((string)($x['approved_at'] ?? ''), 0, 7) === $mo);
        $rep = ['month' => $mo, 'leads' => array_sum($by('stage')), 'leadsBySource' => $by('source'), 'leadsByStage' => $by('stage'),
            'quotationsCreated' => count($qs), 'quotationsValue' => $qv($qs), 'quotationsApproved' => count($appr), 'approvedValue' => $qv($appr), 'currency' => 'PKR'];
        out(['ok' => true] + $rep); }, $tool, $pass);
    case 'whatsapp_stats':
        run_action('wa_stats', [], $tool, $pass);
    case 'create_blog_draft':
        $title = trim((string)($a['title'] ?? '')); $body = (string)($a['body'] ?? '');
        if ($title === '' || trim($body) === '') rpc_out($rid, mcp_text('Title and body are required', true));
        $slug = strtolower(trim((string)($a['slug'] ?? ''))) ?: trim(preg_replace('~[^a-z0-9]+~', '-', strtolower($title)), '-');
        $slug = substr(preg_replace('~[^a-z0-9-]~', '', $slug), 0, 60) ?: 'post-' . date('Ymd-His');
        foreach (cms_load()['items'] as $x) if ($x['type'] === 'post' && $x['slug'] === $slug) $slug = substr($slug, 0, 50) . '-' . substr(bin2hex(random_bytes(3)), 0, 5);
        run_action('cms_save', ['type' => 'post', 'title' => $title, 'slug' => $slug, 'status' => 'draft', 'data' => ['excerpt' => clip($a['excerpt'] ?? '', 300), 'blocks' => md_blocks($body), 'aiAgent' => $T['name']], 'seo' => ['description' => clip($a['excerpt'] ?? '', 160)]], $tool,
            fn($r) => ['ok' => true, 'id' => $r['item']['id'] ?? null, 'slug' => $slug, 'status' => 'draft', 'message' => 'Draft saved. Open Admin → Insights to add a hero image, review and publish.']);
}
} catch (Throwable $e) { error_log('mcp: ' . $e->getMessage()); mcp_log_call($tool, false, 'exception'); rpc_out($rid, mcp_text('Server error', true)); }
