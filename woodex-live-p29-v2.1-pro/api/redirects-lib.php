<?php
/**
 * P16 3.8b — Redirects manager v2 (extends the A2 redirects; old {from,to} rows keep working as exact 301s).
 * Rule: {from, to, type: 301|302|410, match: exact|prefix, src, on}
 * Config (_private/redirect-cfg.json): {www: bool, spam: bool, seeded: bool}
 * 404 monitor: api/r404.php logs missed URLs into _private/r404.json
 */
declare(strict_types=1);

const RD_CFG  = PRIVATE_DIR . '/redirect-cfg.json';
const RD_404  = PRIVATE_DIR . '/r404.json';
const RD_PLAN = __DIR__ . '/redirect-plan.json';

function rd_cfg(): array { return jread(RD_CFG) + ['www' => true, 'spam' => true, 'seeded' => false]; }

function rd_one(array $r): array {
    $type = (int)($r['type'] ?? 301); if (!in_array($type, [301, 302, 410], true)) $type = 301;
    $match = ($r['match'] ?? 'exact') === 'prefix' ? 'prefix' : 'exact';
    $from = '/' . trim((string)($r['from'] ?? ''), '/') . '/';
    $to = $type === 410 ? '' : trim((string)($r['to'] ?? ''));
    return ['from' => $from, 'to' => $to, 'type' => $type, 'match' => $match, 'src' => substr(trim((string)($r['src'] ?? '')), 0, 60), 'on' => !isset($r['on']) || (bool)$r['on']];
}

/** Validates the whole list; fails with a readable message. */
function rd_clean(array $rows): array {
    $list = []; $seen = [];
    foreach ($rows as $r) {
        if (!is_array($r) || trim((string)($r['from'] ?? ''), '/ ') === '') continue;
        $x = rd_one($r);
        if (!preg_match('~^/[a-z0-9/_\-.&]*$~i', $x['from'])) fail('Old address "' . $x['from'] . '" is not valid (letters, numbers, - _ . / & only)');
        if (preg_match('~^/(admin|api|assets|builder|_private)/~i', $x['from'])) fail('"' . $x['from'] . '" is a system folder and cannot be redirected');
        if ($x['from'] === '/') fail('The home page cannot be redirected');
        if ($x['type'] !== 410) {
            if ($x['to'] === '') fail('Choose a new address for ' . $x['from']);
            if (!preg_match('~^(https?://[^\s"<>]+|/[a-z0-9/_\-.#?=&]*)$~i', $x['to'])) fail('New address "' . $x['to'] . '" is not valid');
            if (rtrim($x['to'], '/') === rtrim($x['from'], '/')) fail('A redirect cannot point to itself (' . $x['from'] . ')');
        }
        $k = strtolower($x['from'] . '|' . $x['match']); if (isset($seen[$k])) continue; $seen[$k] = 1;
        $list[] = $x;
    }
    return $list;
}

/** Fingerprint of the shipped plan, so a plan update reaches installs that were seeded earlier. */
function rd_plan_hash(): string { return substr(hash('sha256', is_file(RD_PLAN) ? (string)@file_get_contents(RD_PLAN) : ''), 0, 16); }

/** Rows of the shipped plan, minus the ones the operator deleted on purpose. */
function rd_plan_rows(array $cfg): array {
    $skip = array_map('strtolower', array_values(array_filter((array)($cfg['skip'] ?? []), 'is_string')));
    $out = [];
    foreach (jread(RD_PLAN) as $r) {
        if (!is_array($r)) continue;
        if (in_array(strtolower('/' . trim((string)($r['from'] ?? ''), '/') . '/'), $skip, true)) continue;
        $out[] = $r;
    }
    return $out;
}

/**
 * Current rules. The verified plan is merged on a fresh install AND again whenever the shipped
 * plan file changes — before this, an install that had been seeded once kept an empty/short list
 * forever even though api/redirect-plan.json held the complete list ("the redirects exist but the
 * screen does not show them"). Deletions are remembered in cfg.skip so they are never resurrected.
 */
function rd_list(): array {
    $cur = array_map('rd_one', jread(REDIRECTS)); $cfg = rd_cfg();
    $hash = rd_plan_hash();
    if (empty($cfg['seeded']) || ($cfg['planHash'] ?? '') !== $hash) {
        $m = rd_merge($cur, rd_plan_rows($cfg));
        $cur = $m['list'];
        $cfg['seeded'] = true; $cfg['planHash'] = $hash;
        jwrite(REDIRECTS, $cur); jwrite(RD_CFG, $cfg);
        if ($m['added'] > 0 && function_exists('publish_rules')) publish_rules();
    }
    return $cur;
}
function rd_merge(array $cur, array $add): array {
    $have = []; foreach ($cur as $r) $have[strtolower($r['from'])] = 1; $n = 0;
    foreach ($add as $r) { $x = rd_one($r); if (isset($have[strtolower($x['from'])])) continue; $cur[] = $x; $have[strtolower($x['from'])] = 1; $n++; }
    return ['list' => $cur, 'added' => $n];
}

/** .htaccess lines for the managed block (called from publish_rules). */
function rd_lines(): array {
    $cfg = rd_cfg(); $L = [];
    if ($cfg['www']) { $L[] = '# one official address: no www'; $L[] = 'RewriteCond %{HTTP_HOST} ^www\.(.+)$ [NC]'; $L[] = 'RewriteRule ^ https://%1%{REQUEST_URI} [R=301,L]'; }
    if ($cfg['spam']) {
        $L[] = '# hacked-spam cleanup: tell Google these are gone for good';
        $L[] = 'RewriteCond %{REQUEST_URI} (casino|gokkasten|gokautomat|blackjack|roulette|free-spins|itm-[0-9]{4,}) [NC]';
        $L[] = 'RewriteRule ^ - [G,L]';
        $L[] = 'RewriteCond %{QUERY_STRING} (^|&)(p|page_id|attachment_id|cat)=[0-9]+ [NC]';
        $L[] = 'RewriteRule ^$ /? [R=301,L]';
    }
    foreach (array_map('rd_one', jread(REDIRECTS)) as $r) {
        if (!$r['on']) continue;
        $p = '^' . preg_quote(trim($r['from'], '/'), '') . ($r['match'] === 'prefix' ? '(/.*)?$' : '/?$');
        $L[] = $r['type'] === 410 ? 'RewriteRule ' . $p . ' - [G,L]' : 'RewriteRule ' . $p . ' ' . $r['to'] . ' [R=' . $r['type'] . ',L]';
    }
    return $L;
}

/** Checks: target exists, loops, chains, redirect hides a live page. */
function rd_test(array $list): array {
    $res = []; $from = [];
    foreach ($list as $r) if ($r['on']) $from[strtolower($r['from'])] = $r;
    foreach ($list as $i => $r) {
        $st = 'ok'; $msg = $r['type'] === 410 ? 'Gone (410)' : 'Target page exists';
        $live = is_file(ROOT_DIR . rtrim($r['from'], '/') . '/index.html') || is_file(ROOT_DIR . rtrim($r['from'], '/'));
        if (!$r['on']) { $st = 'off'; $msg = 'Switched off'; }
        elseif ($live) { $st = 'warn'; $msg = 'A live page exists at this address; the redirect hides it'; }
        elseif ($r['type'] !== 410 && $r['to'][0] === '/') {
            $path = preg_replace('~[?#].*$~', '', $r['to']);
            $ok = $path === '/' || is_file(ROOT_DIR . rtrim($path, '/') . '/index.html') || is_file(ROOT_DIR . $path);
            $next = $from[strtolower('/' . trim($path, '/') . '/')] ?? null;
            if ($next) { $st = 'warn'; $msg = 'Chain: ' . $r['to'] . ' redirects again to ' . ($next['to'] ?: '410') . '. Point it straight to the final page'; }
            elseif (!$ok) { $st = 'bad'; $msg = 'Target page not found (' . $path . ')'; }
        } elseif ($r['type'] !== 410) $msg = 'External link (not checked)';
        $res[] = ['i' => $i, 'status' => $st, 'msg' => $msg];
    }
    return $res;
}

function rd_404_list(): array {
    $d = jread(RD_404); $rows = [];
    foreach ($d as $p => $v) $rows[] = ['path' => (string)$p, 'n' => (int)($v['n'] ?? 0), 'last' => (string)($v['last'] ?? ''), 'ref' => (string)($v['ref'] ?? '')];
    usort($rows, fn($a, $b) => $b['n'] <=> $a['n']);
    return array_slice($rows, 0, 200);
}

/** Called by api/r404.php (public). */
function rd_404_log(string $path, string $ref): void {
    $path = '/' . trim(substr(preg_replace('~[?#].*$~', '', $path), 0, 200), '/') . '/';
    if ($path === '//' || preg_match('~^/(admin|api|assets|builder|_private)/~i', $path) || preg_match('~\.(js|css|map|png|jpe?g|webp|gif|svg|ico|woff2?)/$~i', $path)) return;
    // per-IP limit: 30 logs / 10 min
    $ipf = PRIVATE_DIR . '/r404-ip.json'; $ips = jread($ipf); $now = time(); $k = substr(hash('sha256', ip()), 0, 16);
    foreach ($ips as $h => $v) if ($now - (int)$v[0] > 600) unset($ips[$h]);
    $v = $ips[$k] ?? [$now, 0]; if ($v[1] >= 30) return; $ips[$k] = [$v[0], $v[1] + 1]; jwrite($ipf, $ips);
    $d = jread(RD_404);
    if (!isset($d[$path]) && count($d) >= 300) { uasort($d, fn($a, $b) => ($a['n'] ?? 0) <=> ($b['n'] ?? 0)); array_shift($d); }
    $e = $d[$path] ?? ['n' => 0]; $e['n'] = (int)$e['n'] + 1; $e['last'] = date('c');
    $ref = substr(preg_replace('~[\s"<>]~', '', $ref), 0, 200); if ($ref && !preg_match('~^https?://(www\.)?' . preg_quote((string)($_SERVER['HTTP_HOST'] ?? '-'), '~') . '~i', $ref)) $e['ref'] = $ref;
    $d[$path] = $e; jwrite(RD_404, $d);
}

function redirects_actions(string $action, array $in): bool {
    switch ($action) {
        case 'redirects':
            need(['owner', 'admin']); $l = rd_list(); $c = rd_cfg();
            out(['ok' => true, 'redirects' => $l, 'cfg' => ['www' => $c['www'], 'spam' => $c['spam']], 'planCount' => count(jread(RD_PLAN)), 'test' => rd_test($l), 'missed' => count(jread(RD_404))]);
        case 'redirects_save':
            $u = need(['owner', 'admin']); $list = rd_clean((array)($in['redirects'] ?? []));
            if (isset($in['cfg']) && is_array($in['cfg'])) { $c = rd_cfg(); $c['www'] = (bool)($in['cfg']['www'] ?? $c['www']); $c['spam'] = (bool)($in['cfg']['spam'] ?? $c['spam']); $c['seeded'] = true; jwrite(RD_CFG, $c); }
            /* Remember what the operator removed from the shipped plan, so the next plan merge does
               not put it back; and clear the skip mark when they add it again themselves. */
            $c2 = rd_cfg(); $have = []; foreach ($list as $r) $have[strtolower($r['from'])] = 1;
            $skip = []; foreach (rd_plan_rows(['skip' => []]) as $r) {
                $k = strtolower(rd_one($r)['from']);
                if (!isset($have[$k])) { $skip[] = $k; }
            }
            $c2['skip'] = array_values(array_unique($skip)); $c2['planHash'] = rd_plan_hash(); jwrite(RD_CFG, $c2);
            jwrite(REDIRECTS, $list); publish_rules(); log_act($u, 'redirects.save', count($list) . ' redirects');
            out(['ok' => true, 'redirects' => $list, 'test' => rd_test($list)]);
        case 'redirects_plan':
            $u = need(['owner', 'admin']); $m = rd_merge(array_map('rd_one', jread(REDIRECTS)), jread(RD_PLAN));
            jwrite(REDIRECTS, $m['list']); publish_rules(); log_act($u, 'redirects.save', 'loaded plan (+' . $m['added'] . ')');
            out(['ok' => true, 'redirects' => $m['list'], 'added' => $m['added'], 'test' => rd_test($m['list'])]);
        case 'r404_list':
            need(['owner', 'admin']); out(['ok' => true, 'rows' => rd_404_list()]);
        case 'r404_clear':
            $u = need(['owner', 'admin']); $p = (string)($in['path'] ?? '');
            if ($p === '') jwrite(RD_404, []); else { $d = jread(RD_404); unset($d[$p]); jwrite(RD_404, $d); }
            out(['ok' => true, 'rows' => rd_404_list()]);
    }
    return false;
}
