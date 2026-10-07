<?php
/* P36 connectors: "Add connector" gallery (Facebook, Messenger, Instagram, Threads, … or any custom app).
   Saved in /_private/connectors.json (never web-readable). Secrets are write-only: the browser only ever sees the last 4 characters.
   Actions: conn_list, conn_save, conn_delete, conn_test (owner, admin). */
const CONN_FILE = PRIVATE_DIR . '/connectors.json';
function conn_pub(array $c): array { $p = $c; unset($p['secret']); $p['hasSecret'] = !empty($c['secret']); return $p; }
function conn_s($v, int $n): string { return mb_substr(trim(strip_tags((string)$v)), 0, $n); }
function conn_actions(string $action, array $in): bool {
    if (!in_array($action, ['conn_list', 'conn_save', 'conn_delete', 'conn_test'], true)) return false;
    $u = need(['owner', 'admin']);
    $d = jread(CONN_FILE); $items = (array)($d['items'] ?? []);
    $put = function () use (&$items) { jwrite(CONN_FILE, ['items' => array_values($items)]); };
    $find = function ($id) use (&$items) { foreach ($items as $i => $c) if (($c['id'] ?? '') === $id) return $i; return -1; };
    if ($action === 'conn_list') out(['ok' => true, 'items' => array_map('conn_pub', array_values($items))]);
    if ($action === 'conn_delete') { $i = $find((string)($in['id'] ?? '')); if ($i < 0) fail('Connector not found', 404); log_act($u, 'conn.delete', $items[$i]['name']); array_splice($items, $i, 1); $put(); out(['ok' => true, 'items' => array_map('conn_pub', $items)]); }
    if ($action === 'conn_test') {
        $i = $find((string)($in['id'] ?? '')); if ($i < 0) fail('Connector not found', 404);
        $c = &$items[$i]; $url = (string)($c['url'] ?? ''); $msg = 'Saved. No test address, so nothing to check.'; $ok = !empty($c['secret']) || !empty($c['account']);
        if ($url !== '' && preg_match('~^https://~i', $url)) {
            $ctx = stream_context_create(['http' => ['method' => 'GET', 'timeout' => 8, 'ignore_errors' => true, 'header' => "User-Agent: WoodexAdmin\r\n"]]);
            $r = @file_get_contents($url, false, $ctx, 0, 2048); $code = 0;
            foreach ((array)($http_response_header ?? []) as $h) if (preg_match('~^HTTP/\S+\s+(\d+)~', $h, $m)) $code = (int)$m[1];
            $ok = $code >= 200 && $code < 400; $msg = $code ? "Address answered with HTTP $code" : 'Address did not answer';
        }
        $c['status'] = $ok ? 'connected' : 'error'; $c['checked'] = time(); $c['note'] = $msg; unset($c); $put();
        out(['ok' => true, 'pass' => $ok, 'message' => $msg, 'items' => array_map('conn_pub', array_values($items))]);
    }
    // conn_save
    $id = (string)($in['id'] ?? ''); $i = $id !== '' ? $find($id) : -1;
    $name = conn_s($in['name'] ?? '', 60); if ($name === '') fail('Give the connector a name');
    $url = trim((string)($in['url'] ?? '')); if ($url !== '' && !preg_match('~^https?://[^\s<>"]+$~i', $url)) fail('Address must start with https://');
    $c = $i >= 0 ? $items[$i] : ['id' => 'c' . bin2hex(random_bytes(5)), 'added' => time()];
    $c['key'] = preg_replace('~[^a-z0-9_-]~', '', strtolower((string)($in['key'] ?? 'custom'))) ?: 'custom';
    $c['name'] = $name; $c['cat'] = conn_s($in['cat'] ?? 'Custom', 40); $c['account'] = conn_s($in['account'] ?? '', 160);
    $c['url'] = mb_substr($url, 0, 300); $c['notes'] = conn_s($in['notes'] ?? '', 400); $c['on'] = !array_key_exists('on', $in) || !empty($in['on']);
    $sec = trim((string)($in['secret'] ?? ''));
    if ($sec !== '') { $c['secret'] = mb_substr($sec, 0, 2000); $c['hint'] = mb_substr($sec, -4); }
    $c['status'] = (!empty($c['secret']) || $c['account'] !== '') ? 'connected' : 'setup'; $c['updated'] = time();
    if ($i >= 0) $items[$i] = $c; else $items[] = $c;
    $put(); log_act($u, 'conn.save', $name);
    out(['ok' => true, 'item' => conn_pub($c), 'items' => array_map('conn_pub', array_values($items))]);
}
