<?php
/**
 * Phase 10 — Live chat (AI first, team can take over) + Admin notifications.
 * Tables: wx_chats, wx_chat_msgs. Settings: _private/chat.json.
 * Public endpoint: api/chat.php (visitor). Admin actions here: chat_*, notif_poll.
 */
const CHAT_FILE = PRIVATE_DIR . '/chat.json';
const CHAT_DEF = [
    'on' => true, 'ai' => true, 'emailAlert' => true, 'autoLead' => true,
    'greeting' => 'Assalam-o-Alaikum! 👋 I am the Woodex assistant. Ask me anything about interior design, renovation, fit-out or prices. A team member can join any time.',
    'hours' => 'Mon–Sat, 9:30 am – 6:30 pm',
    'knowledge' => "Woodex Interior is an interior design and build company in Lahore, Pakistan (since 2011).\nServices: interior design (homes, offices, retail, restaurants), renovation, office fit-out, turnkey design-build, architecture and house design (5 marla to 2 kanal), 3D visualization, custom furniture.\nProcess: free consultation → site visit and measurements → design and 3D views → quotation → execution → handover.\nWe work across Lahore and also take projects in Islamabad, Karachi and other cities.\nPrices depend on area, finishes and scope; a site visit gives an exact quotation. The online cost estimator is at /cost-estimator/ (if available).\nFor a quote or site visit ask for the client's name, phone number, area/location and what they need.",
];
function chat_cfg(): array { return array_merge(CHAT_DEF, jread(CHAT_FILE)); }
function chat_open_now(): bool { $d = new DateTime('now', new DateTimeZone('Asia/Karachi')); $w = (int)$d->format('w'); $m = (int)$d->format('G') * 60 + (int)$d->format('i'); return $w !== 0 && $m >= 570 && $m < 1110; }

function chat_migrate(): void {
    static $done = false; if ($done) return; $done = true; $e = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    q('CREATE TABLE IF NOT EXISTS wx_chats (id INT AUTO_INCREMENT PRIMARY KEY, token CHAR(64) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, name VARCHAR(120) NULL, phone VARCHAR(40) NULL, email VARCHAR(190) NULL,
        page VARCHAR(200) NULL, ip VARCHAR(64) NULL, status VARCHAR(10) NOT NULL DEFAULT \'open\', mode VARCHAR(10) NOT NULL DEFAULT \'ai\', agent_name VARCHAR(120) NULL, unread INT NOT NULL DEFAULT 0,
        needs TINYINT NOT NULL DEFAULT 0, last_text VARCHAR(255) NULL, lead_id INT NULL, alerted TINYINT NOT NULL DEFAULT 0, INDEX(updated_at))' . $e);
    q('CREATE TABLE IF NOT EXISTS wx_chat_msgs (id INT AUTO_INCREMENT PRIMARY KEY, chat_id INT NOT NULL, t DATETIME NOT NULL, who VARCHAR(8) NOT NULL, name VARCHAR(120) NULL, text TEXT NOT NULL, INDEX(chat_id, id))' . $e);
}
function chat_get(int $id): array { $c = q('SELECT * FROM wx_chats WHERE id=?', [$id])->fetch(); if (!$c) fail('Chat not found', 404); return $c; }
function chat_msgs(int $cid, int $since = 0): array {
    return array_map(fn($m) => ['id' => (int)$m['id'], 't' => $m['t'], 'who' => $m['who'], 'name' => (string)$m['name'], 'text' => $m['text']], q('SELECT * FROM wx_chat_msgs WHERE chat_id=? AND id>? ORDER BY id LIMIT 300', [$cid, $since])->fetchAll());
}
function chat_add(int $cid, string $who, string $name, string $text): int {
    q('INSERT INTO wx_chat_msgs (chat_id,t,who,name,text) VALUES (?,?,?,?,?)', [$cid, now(), $who, mb_substr($name, 0, 120), mb_substr($text, 0, 4000)]); $mid = (int)db()->lastInsertId();
    q('UPDATE wx_chats SET updated_at=?, last_text=?' . ($who === 'visitor' ? ', unread=unread+1' : '') . ' WHERE id=?', [now(), mb_substr(($who === 'visitor' ? '' : ($who === 'agent' ? 'You: ' : 'AI: ')) . $text, 0, 250), $cid]);
    return $mid;
}
function chat_pub(array $c): array {
    return ['id' => (int)$c['id'], 'created_at' => $c['created_at'], 'updated_at' => $c['updated_at'], 'name' => (string)$c['name'], 'phone' => (string)$c['phone'], 'email' => (string)$c['email'], 'page' => (string)$c['page'],
        'status' => $c['status'], 'mode' => $c['mode'], 'agent' => (string)$c['agent_name'], 'unread' => (int)$c['unread'], 'needs' => (bool)$c['needs'], 'last' => (string)$c['last_text'], 'lead_id' => $c['lead_id'] !== null ? (int)$c['lead_id'] : null];
}

/** Pull name / phone / email out of a visitor message; save as a lead once a phone or email is known. */
function chat_capture(array $c, string $text): array {
    $set = [];
    if (!$c['phone'] && preg_match('~(?:\+?92|0)\s?3\d{2}[\s-]?\d{7}|\+?\d[\d\s-]{8,14}\d~', $text, $m)) $set['phone'] = preg_replace('~[^\d+]~', '', $m[0]);
    if (!$c['email'] && preg_match('~[\w.+-]+@[\w-]+\.[\w.]{2,}~', $text, $m)) $set['email'] = strtolower($m[0]);
    if (!$c['name'] && preg_match('~\b(?:my name is|this is|i am|i\'m|name:)\s+([a-z][a-z]+(?:\s[a-z][a-z]+)?)~i', $text, $m) && !preg_match('~^(looking|interested|from|here|planning|a|an|the)\b~i', $m[1])) $set['name'] = ucwords(strtolower($m[1]));
    if ($set) { $f = []; $p = []; foreach ($set as $k => $v) { $f[] = "$k=?"; $p[] = $v; } $p[] = $c['id']; q('UPDATE wx_chats SET ' . implode(',', $f) . ' WHERE id=?', $p); $c = array_merge($c, $set); }
    if (!$c['lead_id'] && ($c['phone'] || $c['email']) && chat_cfg()['autoLead']) $c = chat_make_lead($c);
    return $c;
}
function chat_make_lead(array $c): array {
    crm_migrate();
    $msgs = array_filter(chat_msgs((int)$c['id']), fn($m) => $m['who'] === 'visitor');
    $txt = mb_substr(implode("\n", array_map(fn($m) => '• ' . $m['text'], $msgs)), 0, 3900);
    q('INSERT INTO wx_leads (created_at,source,page,name,phone,email,service,message,fields,stage,is_read,ip) VALUES (?,?,?,?,?,?,?,?,?,\'new\',0,?)',
        [now(), 'chat', $c['page'], $c['name'] ?: 'Chat visitor #' . $c['id'], (string)$c['phone'], (string)$c['email'], '', $txt, json_encode(['chat' => (int)$c['id']]), $c['ip']]);
    $lid = (int)db()->lastInsertId(); q('UPDATE wx_chats SET lead_id=? WHERE id=?', [$lid, $c['id']]); $c['lead_id'] = $lid;
    try { $l = q('SELECT * FROM wx_leads WHERE id=?', [$lid])->fetch(); if ($l) send_alerts(lead_row($l)); } catch (Throwable $e) { error_log('chat lead alert: ' . $e->getMessage()); }
    return $c;
}
function chat_email_alert(array $c, string $text): void {
    $cfg = chat_cfg(); $crm = crm_cfg(); if (!$cfg['emailAlert'] || $crm['smtpHost'] === '' || !$crm['emailTo']) return;
    $to = array_values(array_filter(preg_split('~[\s,]+~', $crm['emailTo'])));
    $h = preg_replace('~[^a-z0-9.\-:]~i', '', (string)($_SERVER['HTTP_HOST'] ?? 'woodex.com.pk'));
    smtp_send($crm, $to, 'New live chat on the website', "A visitor started a live chat.\n\nPage: " . $c['page'] . "\nMessage: " . $text . "\n\nReply in Admin → Live chat: https://$h/admin/#/chat/" . $c['id']);
}

/** Multi-turn AI reply; returns '' when AI is off / not configured / failed (never exits). */
function chat_ai_reply(array $c): string {
    $cfg = chat_cfg(); if (!$cfg['ai'] || $c['mode'] !== 'ai') return '';
    $a = cms_load()['ai']; $p = $a['provider']; $key = $a[$p . 'Key'] ?? ''; $model = $a[$p . 'Model'] ?? ''; if ($key === '' || !function_exists('curl_init')) return '';
    $co = company_cfg(); $faq = [];
    foreach (cms_load()['items'] as $it) if ($it['type'] === 'faq' && ($it['status'] ?? '') === 'published') foreach (($it['data']['items'] ?? []) as $f) if (!empty($f['q'])) $faq[] = 'Q: ' . $f['q'] . "\nA: " . strip_tags((string)($f['a'] ?? ''));
    $sys = "You are the friendly live-chat assistant on the website of {$co['name']} (Lahore, Pakistan). Reply in the visitor's language (English, Urdu or Roman Urdu). Keep answers short: 1–4 sentences, plain text, no markdown headings.\n" .
        "Goal: help, then collect the visitor's name, phone number, location and what they need so the team can call them or book a site visit. Ask for one detail at a time, naturally.\n" .
        "Never invent exact prices, discounts, timelines or promises that are not in the knowledge below; say the team will confirm after a site visit. Currency is PKR.\n" .
        "If the visitor asks for a human, is upset, or asks something you cannot answer, say a team member will join shortly and add the tag [HUMAN] at the very end of your reply.\n" .
        "Office hours: {$cfg['hours']}. It is currently " . (chat_open_now() ? 'within' : 'outside') . " office hours.\nContact: {$co['phones']} · {$co['email']} · {$co['address']}\n\nKNOWLEDGE:\n" . $cfg['knowledge'] . ($faq ? "\n\nFAQ:\n" . mb_substr(implode("\n\n", $faq), 0, 6000) : '') .
        "\n\nVisitor is on page: " . $c['page'] . ($c['name'] ? "\nVisitor name: " . $c['name'] : '') . ($c['phone'] ? "\nPhone already given: yes" : '');
    $turns = []; foreach (array_slice(chat_msgs((int)$c['id']), -16) as $m) { if ($m['who'] === 'sys') continue; $r = $m['who'] === 'visitor' ? 'user' : 'assistant'; if ($turns && end($turns)['role'] === $r) $turns[count($turns) - 1]['content'] .= "\n" . $m['text']; else $turns[] = ['role' => $r, 'content' => $m['text']]; }
    while ($turns && $turns[0]['role'] !== 'user') array_shift($turns); if (!$turns) return '';
    if ($p === 'anthropic') { $url = 'https://api.anthropic.com/v1/messages'; $h = ['x-api-key: ' . $key, 'anthropic-version: 2023-06-01', 'content-type: application/json']; $body = ['model' => $model, 'max_tokens' => 400, 'system' => $sys, 'messages' => $turns]; }
    else { $url = $p === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions'; $h = ['authorization: Bearer ' . $key, 'content-type: application/json', 'HTTP-Referer: https://woodex.com.pk', 'X-Title: Woodex Chat']; $body = ['model' => $model, 'max_tokens' => 400, 'messages' => array_merge([['role' => 'system', 'content' => $sys]], $turns)]; }
    $ch = curl_init($url); curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_HTTPHEADER => $h, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25]);
    $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($raw === false || $code >= 400) { error_log('chat ai: HTTP ' . $code); return ''; }
    $j = json_decode((string)$raw, true) ?: [];
    return trim($p === 'anthropic' ? implode('', array_map(fn($x) => (string)($x['text'] ?? ''), $j['content'] ?? [])) : (string)($j['choices'][0]['message']['content'] ?? ''));
}

function chat_actions(string $action, array $in): bool {
    if (!preg_match('~^(chat_|notif_)~', $action)) return false;
    chat_migrate(); $SALES = ['owner', 'admin', 'sales'];
    switch ($action) {
        case 'chat_list':
            need($SALES); $st = ($in['status'] ?? 'open') === 'closed' ? 'closed' : 'open';
            out(['ok' => true, 'chats' => array_map('chat_pub', q('SELECT * FROM wx_chats WHERE status=? ORDER BY needs DESC, updated_at DESC LIMIT 200', [$st])->fetchAll()), 'cfg' => ['ai' => chat_cfg()['ai'], 'on' => chat_cfg()['on']]]);
        case 'chat_get':
            need($SALES); $c = chat_get((int)($in['id'] ?? 0)); $since = (int)($in['since'] ?? 0);
            if ((int)$c['unread'] || (int)$c['needs']) q('UPDATE wx_chats SET unread=0, needs=0 WHERE id=?', [$c['id']]);
            out(['ok' => true, 'chat' => chat_pub($c), 'messages' => chat_msgs((int)$c['id'], $since)]);
        case 'chat_reply':
            $u = need($SALES); $c = chat_get((int)($in['id'] ?? 0)); $t = trim((string)($in['text'] ?? '')); if ($t === '') fail('Write a message');
            if ($c['mode'] === 'ai') chat_add((int)$c['id'], 'sys', '', $u['name'] . ' joined the chat');
            $mid = chat_add((int)$c['id'], 'agent', $u['name'], $t); q("UPDATE wx_chats SET mode='human', agent_name=?, status='open', unread=0, needs=0 WHERE id=?", [$u['name'], $c['id']]);
            out(['ok' => true, 'id' => $mid, 'chat' => chat_pub(chat_get((int)$c['id']))]);
        case 'chat_mode':
            $u = need($SALES); $c = chat_get((int)($in['id'] ?? 0)); $m = ($in['mode'] ?? '') === 'ai' ? 'ai' : 'human';
            q('UPDATE wx_chats SET mode=?, agent_name=? WHERE id=?', [$m, $m === 'human' ? $u['name'] : null, $c['id']]);
            chat_add((int)$c['id'], 'sys', '', $m === 'human' ? $u['name'] . ' joined the chat' : 'The assistant is back in this chat');
            out(['ok' => true, 'chat' => chat_pub(chat_get((int)$c['id']))]);
        case 'chat_close':
            $u = need($SALES); $c = chat_get((int)($in['id'] ?? 0)); $open = !empty($in['reopen']);
            q('UPDATE wx_chats SET status=?, unread=0, needs=0 WHERE id=?', [$open ? 'open' : 'closed', $c['id']]); log_act($u, $open ? 'chat.reopen' : 'chat.close', '#' . $c['id']);
            out(['ok' => true, 'chat' => chat_pub(chat_get((int)$c['id']))]);
        case 'chat_lead':
            $u = need($SALES); $c = chat_get((int)($in['id'] ?? 0));
            foreach (['name' => 120, 'phone' => 40, 'email' => 190] as $k => $n) if (isset($in[$k]) && trim((string)$in[$k]) !== '') { $c[$k] = mb_substr(trim((string)$in[$k]), 0, $n); q("UPDATE wx_chats SET $k=? WHERE id=?", [$c[$k], $c['id']]); }
            if (!$c['lead_id']) $c = chat_make_lead($c); log_act($u, 'chat.lead', '#' . $c['id']);
            out(['ok' => true, 'chat' => chat_pub(chat_get((int)$c['id']))]);
        case 'chat_cfg_get':
            need(['owner', 'admin']); out(['ok' => true, 'cfg' => chat_cfg(), 'aiReady' => (function () { $a = cms_load()['ai']; return ($a[$a['provider'] . 'Key'] ?? '') !== ''; })()]);
        case 'chat_cfg_save':
            $u = need(['owner', 'admin']); $s = is_array($in['cfg'] ?? null) ? $in['cfg'] : []; $c = chat_cfg();
            foreach (['on', 'ai', 'emailAlert', 'autoLead'] as $k) if (array_key_exists($k, $s)) $c[$k] = !empty($s[$k]);
            foreach (['greeting' => 500, 'hours' => 80, 'knowledge' => 12000] as $k => $n) if (array_key_exists($k, $s)) $c[$k] = mb_substr(trim((string)$s[$k]), 0, $n);
            jwrite(CHAT_FILE, $c); log_act($u, 'chat.settings'); out(['ok' => true, 'cfg' => $c]);
        case 'notif_poll': // bell: unread leads + chats waiting; items for the dropdown
            $u = need(); crm_migrate(); $items = [];
            $sales = in_array($u['role'], $SALES, true);
            $lu = $sales ? (int)q('SELECT COUNT(*) FROM wx_leads WHERE is_read=0')->fetchColumn() : 0;
            $cu = $sales ? (int)q("SELECT COUNT(*) FROM wx_chats WHERE status='open' AND (unread>0 OR needs=1)")->fetchColumn() : 0;
            if ($sales) {
                foreach (q("SELECT id,name,page,last_text,updated_at,unread,needs FROM wx_chats WHERE status='open' AND (unread>0 OR needs=1) ORDER BY updated_at DESC LIMIT 8")->fetchAll() as $r)
                    $items[] = ['kind' => 'chat', 'id' => (int)$r['id'], 't' => $r['updated_at'], 'title' => ($r['needs'] ? 'Needs a person · ' : 'Live chat · ') . ($r['name'] ?: 'Visitor #' . $r['id']), 'text' => (string)$r['last_text'], 'href' => '#/chat/' . $r['id']];
                foreach (q('SELECT id,name,source,service,created_at FROM wx_leads WHERE is_read=0 ORDER BY id DESC LIMIT 8')->fetchAll() as $r)
                    $items[] = ['kind' => 'lead', 'id' => (int)$r['id'], 't' => $r['created_at'], 'title' => 'New enquiry · ' . $r['name'], 'text' => (CRM_SOURCES[$r['source']] ?? $r['source']) . ($r['service'] ? ' · ' . $r['service'] : ''), 'href' => '#/leads'];
                usort($items, fn($a, $b) => strcmp($b['t'], $a['t']));
            }
            $stamp = $sales ? (string)q('SELECT GREATEST(COALESCE((SELECT MAX(id) FROM wx_leads),0)*100000, 0) + COALESCE((SELECT MAX(id) FROM wx_chat_msgs WHERE who=\'visitor\'),0)')->fetchColumn() : '0';
            out(['ok' => true, 'leads' => $lu, 'chats' => $cu, 'total' => $lu + $cu, 'items' => array_slice($items, 0, 12), 'stamp' => $stamp]);
    }
    return false;
}
