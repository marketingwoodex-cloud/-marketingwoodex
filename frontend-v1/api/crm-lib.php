<?php
/**
 * Woodex Admin v2 — Phase A4 shared CRM code (leads, clients, alerts).
 * Included by api/admin.php (team actions) and api/forms.php (public site forms).
 * Needs from the includer: q(), now(), ip(), jread(), jwrite(), fail(), out(), PRIVATE_DIR.
 */
declare(strict_types=1);
if (!defined('PRIVATE_DIR')) { http_response_code(404); exit; }

const CRM_FILE   = PRIVATE_DIR . '/crm.json';
const CRM_STAGES = ['new', 'contacted', 'visit', 'quote', 'won', 'lost'];
const CRM_SOURCES = ['contact' => 'Contact form', 'estimator' => 'Cost estimator', 'brief' => '3D brief', 'fitout-hub' => 'Fit-out quote', 'office-fitout' => 'Office fit-out quote', 'whatsapp' => 'WhatsApp widget', 'chat' => 'Live chat', 'manual' => 'Added by team', 'import' => 'CSV import'];
const CRM_SECRETS = ['smtpPass', 'waToken', 'tsSecret'];

function crm_migrate(): void {
    static $done = false; if ($done) return; $done = true;
    q("CREATE TABLE IF NOT EXISTS wx_leads (id INT AUTO_INCREMENT PRIMARY KEY, created_at DATETIME NOT NULL, source VARCHAR(30) NOT NULL, page VARCHAR(200) NULL,
        name VARCHAR(120) NOT NULL, phone VARCHAR(40) NULL, email VARCHAR(190) NULL, service VARCHAR(190) NULL, message TEXT NULL, fields TEXT NULL,
        stage VARCHAR(20) NOT NULL DEFAULT 'new', assigned_to INT NULL, followup DATE NULL, value BIGINT NOT NULL DEFAULT 0, lost_reason VARCHAR(190) NULL,
        client_id INT NULL, tags VARCHAR(400) NULL, is_read TINYINT(1) NOT NULL DEFAULT 0, ip VARCHAR(64) NULL,
        INDEX(stage), INDEX(created_at), INDEX(client_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    q("CREATE TABLE IF NOT EXISTS wx_lead_notes (id INT AUTO_INCREMENT PRIMARY KEY, lead_id INT NOT NULL, t DATETIME NOT NULL, user_name VARCHAR(120) NULL,
        text TEXT NOT NULL, sys TINYINT(1) NOT NULL DEFAULT 0, INDEX(lead_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    q("CREATE TABLE IF NOT EXISTS wx_clients (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, phone VARCHAR(40) NULL, email VARCHAR(190) NULL,
        company VARCHAR(120) NULL, city VARCHAR(80) NULL, address VARCHAR(300) NULL, notes TEXT NULL, created_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
function clip($v, int $n = 500): string { return mb_substr(trim((string)($v ?? '')), 0, $n); }
function crm_cfg(): array {
    return array_merge(['emailOn' => false, 'emailTo' => '', 'smtpHost' => '', 'smtpPort' => 465, 'smtpUser' => '', 'smtpPass' => '', 'smtpFrom' => '',
        'waOn' => false, 'waToken' => '', 'waPhoneId' => '', 'waTo' => '', 'waTemplate' => '', 'waLang' => 'en', 'tsSite' => '', 'tsSecret' => ''], jread(CRM_FILE));
}
function crm_cfg_pub(array $c): array { foreach (CRM_SECRETS as $k) { $c[$k . 'Set'] = $c[$k] !== ''; $c[$k] = ''; } return $c; }

function lead_text(array $l): string {
    $f = ''; foreach (($l['fields'] ?? []) as $k => $v) if ($v !== '') $f .= "\n$k: $v";
    return "New enquiry #{$l['id']} — " . (CRM_SOURCES[$l['source']] ?? $l['source']) . "\nName: {$l['name']}\nPhone: {$l['phone']}"
        . ($l['email'] ? "\nEmail: {$l['email']}" : '') . ($l['service'] ? "\nService: {$l['service']}" : '') . ($l['message'] ? "\nMessage: {$l['message']}" : '')
        . $f . "\nPage: " . ($l['page'] ?: '-');
}

/** Minimal SMTP client (SSL on 465 or STARTTLS on 587) — Hostinger mailboxes. Returns '' on success or an error. */
/** $att: [['name' => 'x.pdf', 'type' => 'application/pdf', 'data' => <binary>], ...] (optional) */
function smtp_send(array $c, array $to, string $subject, string $text, array $att = []): string {
    $host = $c['smtpHost']; $port = (int)$c['smtpPort'] ?: 465; if (!$host || !$c['smtpUser']) return 'SMTP host and user are required';
    $fp = @stream_socket_client(($port === 465 ? 'ssl://' : 'tcp://') . $host . ':' . $port, $en, $es, 10);
    if (!$fp) return "Could not connect to $host:$port ($es)";
    stream_set_timeout($fp, 10);
    $read = function () use ($fp) { $d = ''; while (($l = fgets($fp, 515)) !== false) { $d .= $l; if (isset($l[3]) && $l[3] === ' ') break; } return $d; };
    $cmd = function (string $s, string $ok) use ($fp, $read) { if ($s !== '') fwrite($fp, $s . "\r\n"); $r = $read(); if (strpos($r, $ok) !== 0) throw new RuntimeException(trim($r) ?: 'no reply'); return $r; };
    try {
        $cmd('', '220'); $cmd('EHLO woodex.com.pk', '250');
        if ($port !== 465) { $cmd('STARTTLS', '220'); if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('TLS failed'); $cmd('EHLO woodex.com.pk', '250'); }
        $cmd('AUTH LOGIN', '334'); $cmd(base64_encode($c['smtpUser']), '334'); $cmd(base64_encode($c['smtpPass']), '235');
        preg_match('~<?([^<>\s]+@[^<>\s]+)>?\s*$~', $c['smtpFrom'] ?: $c['smtpUser'], $m); $from = $m[1] ?? $c['smtpUser'];
        $cmd('MAIL FROM:<' . $from . '>', '250');
        foreach ($to as $t) $cmd('RCPT TO:<' . $t . '>', '25');
        $cmd('DATA', '354');
        $hdr = 'From: ' . ($c['smtpFrom'] ?: $from) . "\r\nTo: " . implode(', ', $to) . "\r\nSubject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\nDate: " . date('r') .
            "\r\nMIME-Version: 1.0\r\n";
        if ($att) {
            $bd = 'wx' . bin2hex(random_bytes(12)); $msg = $hdr . "Content-Type: multipart/mixed; boundary=\"$bd\"\r\n\r\n--$bd\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text));
            foreach ($att as $a) { $n = preg_replace('~[^\w.\- ]~', '', (string)$a['name']) ?: 'file'; $msg .= "--$bd\r\nContent-Type: " . ($a['type'] ?? 'application/octet-stream') . "; name=\"$n\"\r\nContent-Disposition: attachment; filename=\"$n\"\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode((string)$a['data'])); }
            $msg .= "--$bd--\r\n";
            $cmd(preg_replace('~^\.~m', '..', $msg) . "\r\n.", '250');
        } else $cmd($hdr . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "\r\n.", '250');
        $cmd('QUIT', '221');
    } catch (Throwable $e) { fclose($fp); return 'SMTP: ' . $e->getMessage(); }
    fclose($fp); return '';
}
function wa_send(array $c, string $to, array $l, string $text): string {
    $to = preg_replace('~\D~', '', $to);
    $body = $c['waTemplate'] !== ''
        ? ['messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'template', 'template' => ['name' => $c['waTemplate'], 'language' => ['code' => $c['waLang'] ?: 'en'],
            'components' => [['type' => 'body', 'parameters' => [['type' => 'text', 'text' => '#' . $l['id'] . ' ' . $l['name']], ['type' => 'text', 'text' => $l['phone']], ['type' => 'text', 'text' => (CRM_SOURCES[$l['source']] ?? $l['source']) . ($l['service'] ? ' · ' . $l['service'] : '')]]]]]]
        : ['messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'text', 'text' => ['body' => mb_substr($text, 0, 4000)]];
    $ch = curl_init('https://graph.facebook.com/v21.0/' . rawurlencode($c['waPhoneId']) . '/messages');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $c['waToken'], 'Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode($body)]);
    $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($r === false) return 'failed: ' . $err;
    if ($code >= 300) { $j = json_decode((string)$r, true); return 'failed: ' . ($j['error']['message'] ?? "HTTP $code"); }
    return 'sent';
}
function send_alerts(array $l, string $only = ''): array {
    $c = crm_cfg(); $res = []; $text = lead_text($l);
    if (($only ? $only === 'email' : $c['emailOn']) && $c['emailTo']) {
        $to = array_values(array_filter(preg_split('~[\s,]+~', $c['emailTo'])));
        $e = smtp_send($c, $to, 'New enquiry #' . $l['id'] . ': ' . $l['name'], $text); $res['email'] = $e === '' ? 'sent' : 'failed: ' . $e;
    }
    if (($only ? $only === 'whatsapp' : $c['waOn']) && $c['waToken'] && $c['waPhoneId'] && $c['waTo']) {
        foreach (array_filter(preg_split('~[\s,]+~', $c['waTo'])) as $to) $res['whatsapp'] = wa_send($c, $to, $l, $text);
    }
    return $res;
}
function lead_row(array $r, ?array $notes = null): array {
    $r['id'] = (int)$r['id']; $r['value'] = (int)$r['value']; $r['assigned_to'] = $r['assigned_to'] !== null ? (int)$r['assigned_to'] : null;
    $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null; $r['read'] = (bool)$r['is_read']; unset($r['is_read'], $r['ip']);
    $r['fields'] = json_decode((string)$r['fields'], true) ?: []; $r['tags'] = $r['tags'] ? explode(',', $r['tags']) : []; $r['followup'] = (string)($r['followup'] ?? '');
    foreach (['page', 'phone', 'email', 'service', 'message', 'lost_reason'] as $k) $r[$k] = (string)($r[$k] ?? '');
    $r['notes'] = $notes ?? array_map(fn($n) => ['t' => $n['t'], 'user' => $n['user_name'], 'text' => $n['text'], 'sys' => (bool)$n['sys']], q('SELECT * FROM wx_lead_notes WHERE lead_id=? ORDER BY id', [$r['id']])->fetchAll());
    return $r;
}
function lead_get(int $id): array {
    $r = q('SELECT l.*, u.name assigned_name FROM wx_leads l LEFT JOIN wx_users u ON u.id=l.assigned_to WHERE l.id=?', [$id])->fetch();
    if (!$r) fail('Enquiry not found', 404); $r['assigned_name'] = (string)($r['assigned_name'] ?? ''); return lead_row($r);
}
function lead_note_add(int $id, string $user, string $text, bool $sys = false): void { q('INSERT INTO wx_lead_notes (lead_id,t,user_name,text,sys) VALUES (?,?,?,?,?)', [$id, now(), $user, $text, $sys ? 1 : 0]); }

/** Team-side actions (called from admin.php). Returns false if the action is not a CRM action. */
function crm_actions(string $action, array $in): bool {
    if (!preg_match('~^(leads?_|clients?_|crm_)~', $action)) return false;
    crm_migrate(); $SALES = ['owner', 'admin', 'sales'];
    switch ($action) {
        case 'leads_list':
            need($SALES);
            $notes = []; foreach (q('SELECT * FROM wx_lead_notes ORDER BY id')->fetchAll() as $n) $notes[(int)$n['lead_id']][] = ['t' => $n['t'], 'user' => $n['user_name'], 'text' => $n['text'], 'sys' => (bool)$n['sys']];
            $rows = q('SELECT l.*, u.name assigned_name FROM wx_leads l LEFT JOIN wx_users u ON u.id=l.assigned_to ORDER BY l.id DESC LIMIT 5000')->fetchAll();
            $leads = array_map(function ($r) use ($notes) { $r['assigned_name'] = (string)($r['assigned_name'] ?? ''); return lead_row($r, $notes[(int)$r['id']] ?? []); }, $rows);
            $team = array_map(fn($u) => ['id' => (int)$u['id'], 'name' => $u['name']], q("SELECT id,name FROM wx_users WHERE active=1 AND role IN ('owner','admin','sales') ORDER BY name")->fetchAll());
            out(['ok' => true, 'leads' => $leads, 'stages' => CRM_STAGES, 'sources' => CRM_SOURCES, 'team' => $team]);
        case 'leads_count':
            need(); out(['ok' => true, 'unread' => (int)q('SELECT COUNT(*) FROM wx_leads WHERE is_read=0')->fetchColumn()]);
        case 'lead_save':
            $u = need($SALES); $id = (int)($in['id'] ?? 0);
            if (!$id) { $name = clip($in['name'] ?? '', 120); if ($name === '') fail('Name is required'); q("INSERT INTO wx_leads (created_at,source,name,stage,is_read) VALUES (?,'manual',?,'new',1)", [now(), $name]); $id = (int)db()->lastInsertId(); }
            $l = lead_get($id); $set = []; $p = [];
            foreach (['name' => 120, 'phone' => 40, 'email' => 190, 'service' => 190, 'message' => 4000, 'lost_reason' => 190] as $k => $n) if (array_key_exists($k, $in)) { $set[] = "$k=?"; $p[] = clip($in[$k], $n); }
            if (array_key_exists('stage', $in)) { if (!in_array($in['stage'], CRM_STAGES, true)) fail('Unknown stage'); $set[] = 'stage=?'; $p[] = $in['stage']; }
            if (array_key_exists('assigned_to', $in)) { $a = (int)$in['assigned_to'] ?: null; if ($a && !q('SELECT 1 FROM wx_users WHERE id=?', [$a])->fetchColumn()) fail('Unknown team member'); $set[] = 'assigned_to=?'; $p[] = $a; }
            if (array_key_exists('followup', $in)) { $f = clip($in['followup'], 10); if ($f !== '' && !preg_match('~^\d{4}-\d{2}-\d{2}$~', $f)) fail('Follow-up must be a date'); $set[] = 'followup=?'; $p[] = $f ?: null; }
            if (array_key_exists('value', $in)) { $set[] = 'value=?'; $p[] = max(0, (int)round((float)$in['value'])); }
            if (array_key_exists('tags', $in)) { $t = is_array($in['tags']) ? $in['tags'] : explode(',', (string)$in['tags']); $t = array_slice(array_values(array_filter(array_map(fn($x) => mb_strtolower(clip($x, 30)), $t))), 0, 10); $set[] = 'tags=?'; $p[] = implode(',', $t); }
            if (array_key_exists('read', $in)) { $set[] = 'is_read=?'; $p[] = !empty($in['read']) ? 1 : 0; }
            if ($set) { $p[] = $id; q('UPDATE wx_leads SET ' . implode(',', $set) . ' WHERE id=?', $p); }
            if (isset($in['stage']) && $in['stage'] !== $l['stage']) lead_note_add($id, $u['name'], "Stage: {$l['stage']} → {$in['stage']}", true);
            if (!(count($in) === 3 && isset($in['read']))) log_act($u, !empty($in['id']) ? 'lead.update' : 'lead.create', '#' . $id . ' ' . $l['name'] . (isset($in['stage']) && $in['stage'] !== $l['stage'] ? ' → ' . $in['stage'] : ''));
            out(['ok' => true, 'lead' => lead_get($id)]);
        case 'lead_note':
            $u = need($SALES); $id = (int)($in['id'] ?? 0); lead_get($id); $t = clip($in['text'] ?? '', 2000); if ($t === '') fail('Write a note first');
            lead_note_add($id, $u['name'], $t); log_act($u, 'lead.note', '#' . $id); out(['ok' => true, 'lead' => lead_get($id)]);
        case 'lead_delete':
            $u = need(['owner', 'admin']); $l = lead_get((int)($in['id'] ?? 0));
            q('DELETE FROM wx_lead_notes WHERE lead_id=?', [$l['id']]); q('DELETE FROM wx_leads WHERE id=?', [$l['id']]); log_act($u, 'lead.delete', '#' . $l['id'] . ' ' . $l['name']); out(['ok' => true]);
        case 'leads_import':
            $u = need(['owner', 'admin']); $n = 0;
            foreach (array_slice((array)($in['rows'] ?? []), 0, 2000) as $r) {
                if (!is_array($r) || ($name = clip($r['name'] ?? '', 120)) === '') continue;
                $st = in_array(strtolower((string)($r['stage'] ?? '')), CRM_STAGES, true) ? strtolower($r['stage']) : 'new';
                $ca = preg_match('~^\d{4}-\d{2}-\d{2}~', (string)($r['created_at'] ?? '')) ? clip($r['created_at'], 19) : now();
                q("INSERT INTO wx_leads (created_at,source,name,phone,email,service,message,stage,value,is_read) VALUES (?,'import',?,?,?,?,?,?,?,1)", [$ca, $name, clip($r['phone'] ?? '', 40), clip($r['email'] ?? '', 190), clip($r['service'] ?? '', 190), clip($r['message'] ?? '', 4000), $st, max(0, (int)($r['value'] ?? 0))]); $n++;
            }
            log_act($u, 'lead.import', $n . ' rows'); out(['ok' => true, 'imported' => $n]);
        case 'lead_convert':
            $u = need($SALES); $l = lead_get((int)($in['id'] ?? 0));
            if ($l['client_id'] && q('SELECT 1 FROM wx_clients WHERE id=?', [$l['client_id']])->fetchColumn()) out(['ok' => true, 'client_id' => $l['client_id']]);
            $digits = preg_replace('~\D~', '', $l['phone']); $cid = 0;
            foreach (q('SELECT id,phone,email FROM wx_clients')->fetchAll() as $c) if (($digits && preg_replace('~\D~', '', (string)$c['phone']) === $digits) || ($l['email'] && $c['email'] === $l['email'])) { $cid = (int)$c['id']; break; }
            if (!$cid) { q("INSERT INTO wx_clients (name,phone,email,company,city,address,notes,created_at) VALUES (?,?,?,'','Lahore','','',?)", [$l['name'], $l['phone'], $l['email'], now()]); $cid = (int)db()->lastInsertId(); }
            q('UPDATE wx_leads SET client_id=? WHERE id=?', [$cid, $l['id']]);
            if (!in_array($l['stage'], ['won', 'lost'], true)) { q("UPDATE wx_leads SET stage='won' WHERE id=?", [$l['id']]); lead_note_add($l['id'], $u['name'], "Stage: {$l['stage']} → won", true); }
            log_act($u, 'client.create', $l['name'] . ' (from #' . $l['id'] . ')'); out(['ok' => true, 'client_id' => $cid]);
        case 'clients_list':
            need($SALES); $by = [];
            foreach (q('SELECT id,client_id,stage,service,value,created_at FROM wx_leads WHERE client_id IS NOT NULL')->fetchAll() as $l) $by[(int)$l['client_id']][] = ['id' => (int)$l['id'], 'stage' => $l['stage'], 'service' => (string)$l['service'], 'value' => (int)$l['value'], 'created_at' => $l['created_at']];
            $cl = array_map(function ($c) use ($by) { $c['id'] = (int)$c['id']; $ls = $by[$c['id']] ?? []; foreach (['phone', 'email', 'company', 'city', 'address', 'notes'] as $k) $c[$k] = (string)($c[$k] ?? '');
                $c['leads'] = $ls; $c['value'] = array_sum(array_map(fn($l) => $l['stage'] === 'won' ? $l['value'] : 0, $ls)); return $c; }, q('SELECT * FROM wx_clients ORDER BY id DESC')->fetchAll());
            out(['ok' => true, 'clients' => $cl]);
        case 'client_save':
            $u = need($SALES); $name = clip($in['name'] ?? '', 120); if ($name === '') fail('Name is required'); $id = (int)($in['id'] ?? 0);
            $v = [$name, clip($in['phone'] ?? '', 40), clip($in['email'] ?? '', 190), clip($in['company'] ?? '', 120), clip($in['city'] ?? '', 80), clip($in['address'] ?? '', 300), clip($in['notes'] ?? '', 4000)];
            if ($id) { if (!q('SELECT 1 FROM wx_clients WHERE id=?', [$id])->fetchColumn()) fail('Client not found', 404); q('UPDATE wx_clients SET name=?,phone=?,email=?,company=?,city=?,address=?,notes=? WHERE id=?', array_merge($v, [$id])); }
            else { q('INSERT INTO wx_clients (name,phone,email,company,city,address,notes,created_at) VALUES (?,?,?,?,?,?,?,?)', array_merge($v, [now()])); $id = (int)db()->lastInsertId(); }
            log_act($u, !empty($in['id']) ? 'client.update' : 'client.create', $name); out(['ok' => true, 'client' => q('SELECT * FROM wx_clients WHERE id=?', [$id])->fetch()]);
        case 'client_delete':
            $u = need(['owner', 'admin']); $c = q('SELECT * FROM wx_clients WHERE id=?', [(int)($in['id'] ?? 0)])->fetch(); if (!$c) fail('Client not found', 404);
            q('UPDATE wx_leads SET client_id=NULL WHERE client_id=?', [$c['id']]); q('DELETE FROM wx_clients WHERE id=?', [$c['id']]); log_act($u, 'client.delete', $c['name']); out(['ok' => true]);
        case 'crm_settings':
            need(['owner', 'admin']); out(['ok' => true, 'settings' => crm_cfg_pub(crm_cfg())]);
        case 'crm_settings_save':
            $u = need(['owner', 'admin']); $c = crm_cfg(); $s = (array)($in['settings'] ?? []);
            foreach ($c as $k => $old) { if (!array_key_exists($k, $s)) continue; if (in_array($k, CRM_SECRETS, true) && $s[$k] === '' && empty($s[$k . 'Clear'])) continue;
                $c[$k] = is_bool($old) ? !empty($s[$k]) : ($k === 'smtpPort' ? ((int)$s[$k] ?: 465) : clip($s[$k], 600)); }
            foreach (array_filter(preg_split('~[\s,]+~', $c['emailTo'])) as $e) if (!filter_var($e, FILTER_VALIDATE_EMAIL)) fail('Check the alert email address(es)');
            jwrite(CRM_FILE, $c); log_act($u, 'settings.crm'); out(['ok' => true, 'settings' => crm_cfg_pub($c)]);
        case 'crm_test':
            need(['owner', 'admin']); $ch = ($in['channel'] ?? '') === 'whatsapp' ? 'whatsapp' : 'email'; $c = crm_cfg();
            if ($ch === 'email' && !$c['emailTo']) fail('Add an alert email address first');
            if ($ch === 'whatsapp' && !($c['waToken'] && $c['waPhoneId'] && $c['waTo'])) fail('Add the WhatsApp token, phone number ID and recipient first');
            $r = send_alerts(['id' => 0, 'source' => 'manual', 'name' => 'Test enquiry', 'phone' => '+92 300 0000000', 'email' => '', 'service' => 'Test', 'message' => 'This is a test alert from Woodex Admin.', 'fields' => [], 'page' => '/admin/'], $ch);
            $v = $r[$ch] ?? 'not sent'; if (strpos($v, 'failed') === 0) fail($v); out(['ok' => true, 'result' => $v]);
    }
    return false;
}
