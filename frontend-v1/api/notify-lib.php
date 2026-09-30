<?php
/**
 * Phase 12: automatic client status updates (WhatsApp + email, English + Urdu).
 * Events: lead (enquiry received), quote (quotation sent), started (work started), handover.
 * Settings: _private/notify.json. Log: wx_notify_log. Admin actions: notify_*.
 */
const NOTIFY_FILE = PRIVATE_DIR . '/notify.json';
const NOTIFY_EVENTS = ['lead' => 'Enquiry received', 'quote' => 'Quotation sent', 'started' => 'Work started', 'handover' => 'Handover'];
const NOTIFY_DEF = [
    'email' => true, 'wa' => true,
    'ev' => [
        'lead' => ['on' => true, 'subject' => 'We received your enquiry: {company}', 'tpl' => '', 'text' =>
            "Dear {name},\nThank you for contacting {company}. We have received your enquiry and our team will call you shortly.\n\nمحترم {name}، {company} سے رابطہ کرنے کا شکریہ۔ ہمیں آپ کی درخواست موصول ہو گئی ہے، ہماری ٹیم جلد آپ سے رابطہ کرے گی۔\n\n{company} · {phone}"],
        'quote' => ['on' => true, 'subject' => 'Your quotation {ref} from {company}', 'tpl' => '', 'text' =>
            "Dear {name},\nYour quotation {ref} for {project} is ready. View it here: {link}\nPlease let us know if you have any questions.\n\nمحترم {name}، {project} کے لیے آپ کی کوٹیشن {ref} تیار ہے۔ یہاں دیکھیں: {link}\n\n{company} · {phone}"],
        'started' => ['on' => true, 'subject' => 'Work has started on {project}', 'tpl' => '', 'text' =>
            "Dear {name},\nGood news! Work has started on {project}. Our project team will keep you updated at every step.\n\nمحترم {name}، خوشخبری! {project} پر کام شروع ہو گیا ہے۔ ہماری ٹیم آپ کو ہر مرحلے سے آگاہ رکھے گی۔\n\n{company} · {phone}"],
        'handover' => ['on' => true, 'subject' => 'Your project {project} is ready', 'tpl' => '', 'text' =>
            "Dear {name},\n{project} is complete and ready for handover. Thank you for choosing {company}! We would love your feedback.\n\nمحترم {name}، {project} مکمل ہو گیا ہے اور حوالگی کے لیے تیار ہے۔ {company} کا انتخاب کرنے کا شکریہ!\n\n{company} · {phone}"],
    ],
    'waLang' => 'en',
];
function notify_cfg(): array {
    $c = array_replace_recursive(NOTIFY_DEF, jread(NOTIFY_FILE));
    foreach (array_keys(NOTIFY_EVENTS) as $e) $c['ev'][$e] = array_merge(NOTIFY_DEF['ev'][$e], $c['ev'][$e] ?? []);
    return $c;
}
function notify_migrate(): void {
    static $d = false; if ($d) return; $d = true;
    q('CREATE TABLE IF NOT EXISTS wx_notify_log (id INT AUTO_INCREMENT PRIMARY KEY, t DATETIME NOT NULL, event VARCHAR(12) NOT NULL, ref VARCHAR(120) NULL, name VARCHAR(160) NULL, channel VARCHAR(8) NOT NULL, dest VARCHAR(190) NOT NULL, result VARCHAR(255) NOT NULL, INDEX(t)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
}
function notify_fill(string $t, array $v): string { return strtr($t, array_combine(array_map(fn($k) => '{' . $k . '}', array_keys($v)), array_map('strval', array_values($v)))); }
function notify_pk(string $p): string { $d = preg_replace('~\D~', '', $p); if (str_starts_with($d, '00')) $d = substr($d, 2); if (str_starts_with($d, '0')) $d = '92' . substr($d, 1); return strlen($d) >= 10 ? $d : ''; }

/** Send one event to a client. $d: name, phone, email, ref, project, link. Returns per-channel results. Never throws. */
function notify_client(string $event, array $d, bool $force = false): array {
    $res = [];
    try {
        notify_migrate(); $c = notify_cfg(); $ev = $c['ev'][$event] ?? null; if (!$ev || (!$ev['on'] && !$force)) return ['skipped' => 'off'];
        $co = function_exists('company_cfg') ? company_cfg() : ['name' => 'Woodex Interior', 'phones' => '+92 322 4000768']; $v = ['name' => trim((string)($d['name'] ?? '')) ?: 'Customer', 'company' => $co['name'], 'phone' => trim(preg_split('~[,·]~u', (string)$co['phones'])[0] ?? ''),
            'ref' => (string)($d['ref'] ?? ''), 'project' => (string)($d['project'] ?? '') ?: 'your project', 'link' => (string)($d['link'] ?? '')];
        $text = trim(preg_replace("~[^\n]*\{link\}[^\n]*\n?~u", $v['link'] === '' ? '' : '$0', $ev['text'])); $text = notify_fill($text, $v);
        $crm = crm_cfg();
        $wa = notify_pk((string)($d['phone'] ?? ''));
        if ($c['wa'] && $wa !== '') {
            if ($crm['waToken'] === '' || $crm['waPhoneId'] === '') $r = 'WhatsApp not connected';
            elseif ($ev['tpl'] !== '') $r = notify_wa_tpl($crm, $wa, $ev['tpl'], $c['waLang'], [$v['name'], $v['ref'] ?: $v['project']]);
            else $r = wa_text($wa, $text);
            $res['whatsapp'] = $r ?: 'sent'; q('INSERT INTO wx_notify_log (t,event,ref,name,channel,dest,result) VALUES (?,?,?,?,?,?,?)', [now(), $event, mb_substr($v['ref'], 0, 120), mb_substr($v['name'], 0, 160), 'wa', '+' . $wa, mb_substr($r ?: 'sent', 0, 255)]);
        }
        $em = trim((string)($d['email'] ?? ''));
        if ($c['email'] && filter_var($em, FILTER_VALIDATE_EMAIL)) {
            $r = $crm['smtpHost'] === '' ? 'Email not set up (Settings → Integrations)' : smtp_send($crm, [$em], notify_fill($ev['subject'], $v), $text);
            $res['email'] = $r ?: 'sent'; q('INSERT INTO wx_notify_log (t,event,ref,name,channel,dest,result) VALUES (?,?,?,?,?,?,?)', [now(), $event, mb_substr($v['ref'], 0, 120), mb_substr($v['name'], 0, 160), 'email', mb_substr($em, 0, 190), mb_substr($r ?: 'sent', 0, 255)]);
        }
        if (!$res) $res['skipped'] = 'no phone or email';
    } catch (Throwable $e) { error_log('notify: ' . $e->getMessage()); $res['error'] = $e->getMessage(); }
    return $res;
}
/** Approved WhatsApp template (works any time, not only inside the 24-hour window). Body params: {{1}} name, {{2}} reference/project. */
function notify_wa_tpl(array $crm, string $to, string $tpl, string $lang, array $params): string {
    if (!function_exists('curl_init')) return 'cURL missing';
    $ch = curl_init('https://graph.facebook.com/v21.0/' . rawurlencode($crm['waPhoneId']) . '/messages');
    curl_setopt_array($ch, [CURLOPT_CAINFO => __DIR__ . '/cacert.pem', CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $crm['waToken'], 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'template', 'template' => ['name' => $tpl, 'language' => ['code' => $lang ?: 'en'],
            'components' => [['type' => 'body', 'parameters' => array_map(fn($p) => ['type' => 'text', 'text' => (string)$p], $params)]]]])]);
    $r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($r === false) return 'failed: ' . $err;
    if ($code >= 300) { $j = json_decode((string)$r, true); return 'failed: ' . ($j['error']['message'] ?? "HTTP $code"); }
    return '';
}
/** Contact details for a project: linked client, else the quotation's client. */
function notify_proj_contact(array $p): array {
    $d = ['name' => $p['client_name'] ?? '', 'phone' => '', 'email' => '', 'ref' => $p['no'] ?? '', 'project' => $p['name'] ?? ''];
    if (!empty($p['client_id'])) { $cl = q('SELECT name,phone,email FROM wx_clients WHERE id=?', [(int)$p['client_id']])->fetch(); if ($cl) { $d['name'] = $cl['name'] ?: $d['name']; $d['phone'] = (string)$cl['phone']; $d['email'] = (string)$cl['email']; } }
    if ($d['phone'] === '' && $d['email'] === '' && !empty($p['quote_id'])) { $r = q('SELECT data FROM wx_quotes WHERE id=?', [(int)$p['quote_id']])->fetch(); if ($r) { $x = json_decode($r['data'], true); $d['phone'] = (string)($x['client']['phone'] ?? ''); $d['email'] = (string)($x['client']['email'] ?? ''); } }
    return $d;
}
/** Called after a project stage change. Sends each event once per project. Returns the project (with 'notified' marks). */
function notify_project_stage(array $p, string $before): array {
    $order = array_flip(SALES_PSTAGES); $now = $order[$p['stage']] ?? 0; $was = $order[$before] ?? 0; if ($now <= $was) return $p;
    $ev = $now >= $order['handover'] ? 'handover' : ($now >= $order['execution'] ? 'started' : ''); if ($ev === '' || !empty($p['notified'][$ev])) return $p;
    $r = notify_client($ev, notify_proj_contact($p)); if (isset($r['skipped']) && $r['skipped'] === 'off') return $p;
    $p['notified'][$ev] = now(); return doc_put('wx_projects', $p);
}

function notify_actions(string $action, array $in): bool {
    if (!str_starts_with($action, 'notify_')) return false;
    notify_migrate();
    switch ($action) {
        case 'notify_get':
            need(['owner', 'admin']); $crm = crm_cfg();
            out(['ok' => true, 'cfg' => notify_cfg(), 'events' => NOTIFY_EVENTS, 'waReady' => $crm['waToken'] !== '' && $crm['waPhoneId'] !== '', 'emailReady' => $crm['smtpHost'] !== '',
                'log' => q('SELECT * FROM wx_notify_log ORDER BY id DESC LIMIT 60')->fetchAll()]);
        case 'notify_save':
            $u = need(['owner', 'admin']); $s = is_array($in['cfg'] ?? null) ? $in['cfg'] : []; $c = notify_cfg();
            foreach (['email', 'wa'] as $k) if (array_key_exists($k, $s)) $c[$k] = !empty($s[$k]);
            if (isset($s['waLang'])) $c['waLang'] = preg_replace('~[^a-zA-Z_]~', '', (string)$s['waLang']) ?: 'en';
            foreach (array_keys(NOTIFY_EVENTS) as $e) if (isset($s['ev'][$e]) && is_array($s['ev'][$e])) { $x = $s['ev'][$e];
                if (array_key_exists('on', $x)) $c['ev'][$e]['on'] = !empty($x['on']);
                if (isset($x['subject'])) $c['ev'][$e]['subject'] = mb_substr(trim((string)$x['subject']), 0, 200);
                if (isset($x['text'])) $c['ev'][$e]['text'] = mb_substr(trim((string)$x['text']), 0, 3000) ?: NOTIFY_DEF['ev'][$e]['text'];
                if (isset($x['tpl'])) $c['ev'][$e]['tpl'] = preg_replace('~[^a-z0-9_]~', '', strtolower((string)$x['tpl'])); }
            jwrite(NOTIFY_FILE, $c); log_act($u, 'notify.settings'); out(['ok' => true, 'cfg' => $c]);
        case 'notify_test':
            $u = need(['owner', 'admin']); $e = (string)($in['event'] ?? ''); if (!isset(NOTIFY_EVENTS[$e])) fail('Unknown event');
            $ph = trim((string)($in['phone'] ?? '')); $em = trim((string)($in['email'] ?? '')); if ($ph === '' && $em === '') fail('Enter your phone or email to receive the test');
            $r = notify_client($e, ['name' => $u['name'], 'phone' => $ph, 'email' => $em, 'ref' => 'WI-10000', 'project' => 'Test project', 'link' => 'https://' . preg_replace('~[^a-z0-9.\-:]~i', '', (string)($_SERVER['HTTP_HOST'] ?? 'woodex.com.pk')) . '/'], true);
            out(['ok' => true, 'result' => $r]);
    }
    return false;
}
