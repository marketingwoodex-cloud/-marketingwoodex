<?php
/**
 * Woodex — public site forms endpoint (Phase A4).
 * GET  /api/forms.php            → {ok, turnstile: siteKey}
 * POST /api/forms.php  JSON {form, name, phone, email, service, message, ...extra fields, _hp, cf-turnstile-response}
 * Saves the enquiry to MySQL (wx_leads) and sends email / WhatsApp alerts to the team.
 * Spam: honeypot, 5 per 10 min per IP, optional Cloudflare Turnstile (keys in Admin → Enquiries → Alerts & spam).
 */
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

const ROOT_DIR    = __DIR__ . '/..';
const PRIVATE_DIR = ROOT_DIR . '/_private';
const DB_FILE     = PRIVATE_DIR . '/db.json';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(array $d, int $code = 200): void { http_response_code($code); echo json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
function fail(string $m, int $code = 400): void { out(['ok' => false, 'error' => $m], $code); }
function jread(string $f): array { $r = is_file($f) ? @file_get_contents($f) : false; return $r ? (json_decode($r, true) ?: []) : []; }
function jwrite(string $f, array $d): void { file_put_contents($f, json_encode($d, JSON_PRETTY_PRINT), LOCK_EX); @chmod($f, 0600); }
function now(): string { return date('Y-m-d H:i:s'); }
function ip(): string { return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64); }
function db(): PDO {
    static $pdo = null; if ($pdo) return $pdo;
    $c = jread(DB_FILE); if (!$c) fail('Enquiries are not available right now. Please WhatsApp us.', 503);
    $pdo = new PDO('mysql:host=' . ($c['host'] ?: 'localhost') . ';dbname=' . $c['name'] . ';charset=utf8mb4', $c['user'], $c['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
    return $pdo;
}
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }
require __DIR__ . '/crm-lib.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') out(['ok' => true, 'turnstile' => crm_cfg()['tsSite']]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST required', 405);
$raw = (string)file_get_contents('php://input');
$in = json_decode($raw, true); if (!is_array($in)) $in = $_POST;

try {
    if (clip($in['_hp'] ?? '') !== '' || clip($in['company_hp'] ?? '') !== '') out(['ok' => true, 'id' => 0]); // bot: pretend success
    crm_migrate();
    // rate limit: 5 enquiries / 10 minutes / IP (wx_throttle table from admin setup)
    $key = 'form:' . ip(); $t = q('SELECT n,t FROM wx_throttle WHERE ip=?', [$key])->fetch();
    if ($t && time() - (int)$t['t'] < 600 && (int)$t['n'] >= 5) fail('Too many enquiries from this connection. Please WhatsApp us instead.', 429);
    if (!$t || time() - (int)$t['t'] >= 600) q('REPLACE INTO wx_throttle (ip,n,t) VALUES (?,1,?)', [$key, time()]); else q('UPDATE wx_throttle SET n=n+1 WHERE ip=?', [$key]);

    $cfg = crm_cfg();
    if ($cfg['tsSecret'] !== '') {
        $tok = clip($in['cf-turnstile-response'] ?? ($in['turnstile'] ?? ''), 2048); if ($tok === '') fail('Please complete the spam check');
        $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_POSTFIELDS => http_build_query(['secret' => $cfg['tsSecret'], 'response' => $tok, 'remoteip' => ip()])]);
        $r = curl_exec($ch); curl_close($ch);
        if ($r !== false) { $j = json_decode((string)$r, true); if (empty($j['success'])) fail('Spam check failed — please try again'); } // Cloudflare unreachable: accept rather than lose the lead
    }
    $name = clip($in['name'] ?? '', 120); $phone = clip($in['phone'] ?? '', 40); $email = clip($in['email'] ?? '', 190);
    if (mb_strlen($name) < 2) fail('Please enter your name');
    if (!preg_match('~^[+\d][\d\s()-]{6,}$~', $phone)) fail('Please enter a valid phone number');
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please check your email address');
    $form = (string)($in['form'] ?? ''); $source = isset(CRM_SOURCES[$form]) && !in_array($form, ['manual', 'import'], true) ? $form : 'contact';
    $skip = ['action', 'form', 'name', 'phone', 'email', 'message', 'service', 'page', '_hp', 'company_hp', 'cf-turnstile-response', 'turnstile']; $fields = [];
    foreach ($in as $k => $v) if (!in_array($k, $skip, true) && preg_match('~^[a-z0-9_ -]{1,40}$~i', (string)$k) && is_scalar($v) && (string)$v !== '' && count($fields) < 25) $fields[$k] = clip($v, 1000);
    q('INSERT INTO wx_leads (created_at,source,page,name,phone,email,service,message,fields,stage,is_read,ip) VALUES (?,?,?,?,?,?,?,?,?,\'new\',0,?)',
        [now(), $source, clip($in['page'] ?? '', 200), $name, $phone, $email, clip($in['service'] ?? '', 190), clip($in['message'] ?? '', 4000), json_encode($fields, JSON_UNESCAPED_UNICODE), ip()]);
    $id = (int)db()->lastInsertId();
    $lead = ['id' => $id, 'source' => $source, 'page' => clip($in['page'] ?? '', 200), 'name' => $name, 'phone' => $phone, 'email' => $email, 'service' => clip($in['service'] ?? '', 190), 'message' => clip($in['message'] ?? '', 4000), 'fields' => $fields];
    // reply to the visitor first, then send alerts (does not slow the form down)
    echo json_encode(['ok' => true, 'id' => $id]);
    if (function_exists('fastcgi_finish_request')) fastcgi_finish_request(); else { @ob_end_flush(); @flush(); }
    ignore_user_abort(true);
    try { send_alerts($lead); } catch (Throwable $e) { error_log('forms.php alerts: ' . $e->getMessage()); }
    exit;
} catch (PDOException $e) { error_log('forms.php: ' . $e->getMessage()); fail('Could not save your enquiry. Please WhatsApp us.', 500); }
