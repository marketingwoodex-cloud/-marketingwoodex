<?php
/**
 * P40 Part E — Social media planner (Facebook Page + Instagram Business).
 *  - Posts: draft → scheduled → published / failed. Text, one image (from the Media library) and an optional link.
 *  - AI captions in the Woodex designer voice (no prices), with hashtags, per platform.
 *  - Scheduled posts are published by the existing cron job (api/wa-cron.php → soc_tick()).
 *  - Manager changes go to Master approval automatically (approvals-lib: "save"/"submit"/"send" actions).
 * State: _private/social.json  { cfg: {pageId, igId, token, tz}, posts: [...] }
 */
const SOC_FILE = PRIVATE_DIR . '/social.json';
const SOC_GRAPH = 'https://graph.facebook.com/v21.0/';

function soc_load(): array {
    $d = jread(SOC_FILE);
    $d['cfg'] = array_merge(['pageId' => '', 'igId' => '', 'token' => '', 'tags' => '#WoodexInterior #InteriorDesignLahore #Lahore'], is_array($d['cfg'] ?? null) ? $d['cfg'] : []);
    $d['posts'] = array_values(is_array($d['posts'] ?? null) ? $d['posts'] : []);
    return $d;
}
function soc_save(array $d): void { jwrite(SOC_FILE, $d); }
function soc_id(): string { return 'p' . bin2hex(random_bytes(5)); }
function soc_base(): string { $h = preg_replace('~[^a-z0-9.:-]~i', '', (string)($_SERVER['HTTP_HOST'] ?? '')); return $h !== '' ? 'https://' . $h : 'https://woodex.com.pk'; }
function soc_pub_cfg(array $c): array { $o = $c; $o['tokenSet'] = $c['token'] !== ''; $o['token'] = ''; return $o; }

/** One Graph API call. Returns decoded JSON or ['error' => ['message' => ...]]. */
function soc_graph(string $path, array $post, string $token): array {
    if (!function_exists('curl_init')) return ['error' => ['message' => 'The server has no cURL']];
    $ch = curl_init(SOC_GRAPH . $path);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 40, CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($post + ['access_token' => $token])]);
    if (is_file(__DIR__ . '/cacert.pem')) curl_setopt($ch, CURLOPT_CAINFO, __DIR__ . '/cacert.pem');
    $raw = curl_exec($ch); $err = curl_error($ch); curl_close($ch);
    $j = json_decode((string)$raw, true);
    return is_array($j) ? $j : ['error' => ['message' => $err ?: 'No answer from Meta']];
}

/** Publish one post to its platforms. Updates $p in place (status, results). */
function soc_publish(array &$p, array $cfg): void {
    $img = trim((string)($p['image'] ?? '')); $url = $img === '' ? '' : (preg_match('~^https?://~', $img) ? $img : soc_base() . '/' . ltrim($img, '/'));
    $text = trim((string)$p['text']); $link = trim((string)($p['link'] ?? ''));
    $res = is_array($p['res'] ?? null) ? $p['res'] : [];
    if ($cfg['token'] === '') { $p['status'] = 'failed'; $p['error'] = 'Connect Facebook first (Social media → Settings)'; return; }
    foreach ((array)$p['nets'] as $n) {
        if (!empty($res[$n]['id'])) continue; // already published there
        if ($n === 'fb') {
            if ($cfg['pageId'] === '') { $res['fb'] = ['error' => 'Facebook Page ID is missing']; continue; }
            $j = $url !== '' ? soc_graph($cfg['pageId'] . '/photos', ['url' => $url, 'caption' => $text . ($link ? "\n\n" . $link : '')], $cfg['token'])
                             : soc_graph($cfg['pageId'] . '/feed', ['message' => $text] + ($link ? ['link' => $link] : []), $cfg['token']);
            $res['fb'] = isset($j['error']) ? ['error' => (string)($j['error']['error_user_msg'] ?? $j['error']['message'])] : ['id' => (string)($j['post_id'] ?? $j['id'] ?? ''), 't' => now()];
        } elseif ($n === 'ig') {
            if ($cfg['igId'] === '') { $res['ig'] = ['error' => 'Instagram account ID is missing']; continue; }
            if ($url === '') { $res['ig'] = ['error' => 'Instagram needs an image']; continue; }
            if (preg_match('~\.(webp|gif|svg|avif)(\?|$)~i', $url)) { $res['ig'] = ['error' => 'Instagram only accepts JPG images. Choose a .jpg from the Media library']; continue; }
            $c = soc_graph($cfg['igId'] . '/media', ['image_url' => $url, 'caption' => $text], $cfg['token']);
            if (isset($c['error']) || empty($c['id'])) { $res['ig'] = ['error' => (string)($c['error']['error_user_msg'] ?? $c['error']['message'] ?? 'Upload failed')]; continue; }
            $j = soc_graph($cfg['igId'] . '/media_publish', ['creation_id' => $c['id']], $cfg['token']);
            $res['ig'] = isset($j['error']) ? ['error' => (string)($j['error']['error_user_msg'] ?? $j['error']['message'])] : ['id' => (string)($j['id'] ?? ''), 't' => now()];
        }
    }
    $p['res'] = $res; $ok = 0; $bad = [];
    foreach ((array)$p['nets'] as $n) { if (!empty($res[$n]['id'])) $ok++; elseif (!empty($res[$n]['error'])) $bad[] = strtoupper($n) . ': ' . $res[$n]['error']; }
    $p['status'] = $ok === count((array)$p['nets']) ? 'published' : ($ok ? 'partial' : 'failed'); $p['error'] = implode(' · ', $bad);
    if ($ok) $p['published_at'] = now();
}

/** Cron: publish posts whose time has come (max 5 per run). */
function soc_tick(): array {
    if (!is_file(SOC_FILE)) return ['social' => 0];
    $d = soc_load(); $n = 0;
    foreach ($d['posts'] as &$p) { if ($n >= 5) break; if (($p['status'] ?? '') === 'scheduled' && (string)$p['when'] !== '' && $p['when'] <= now()) { soc_publish($p, $d['cfg']); $n++; } } unset($p);
    if ($n) soc_save($d);
    return ['social' => $n];
}

function soc_clean(array $in, ?array $old): array {
    $nets = array_values(array_intersect(['fb', 'ig'], (array)($in['nets'] ?? [])));
    if (!$nets) fail('Choose Facebook, Instagram or both');
    $text = mb_substr(trim(strip_tags((string)($in['text'] ?? ''))), 0, 2200); if ($text === '') fail('Write the post text');
    $img = trim((string)($in['image'] ?? '')); if ($img !== '' && !preg_match('~^(/[\w\-./%]+|https://[^\s"<>]+)$~', $img)) fail('Image must be from the Media library or an https link');
    $link = trim((string)($in['link'] ?? '')); if ($link !== '' && !preg_match('~^https?://[^\s"<>]+$~', $link)) fail('The link must start with https://');
    if (in_array('ig', $nets, true) && $img === '') fail('Instagram posts need an image');
    $when = trim((string)($in['when'] ?? '')); if ($when !== '') { $ts = strtotime($when); if (!$ts) fail('Pick a valid date and time'); $when = date('Y-m-d H:i:00', $ts); }
    $st = (string)($in['status'] ?? 'draft'); if (!in_array($st, ['draft', 'scheduled'], true)) $st = 'draft';
    if ($st === 'scheduled' && $when === '') fail('Pick a date and time to schedule');
    return array_merge($old ?? ['id' => soc_id(), 'created_at' => now(), 'res' => []], ['nets' => $nets, 'text' => $text, 'image' => $img, 'link' => $link, 'when' => $when, 'status' => $st, 'error' => '', 'title' => mb_substr(trim((string)($in['title'] ?? '')), 0, 80)]);
}

function soc_actions(string $action, array $in): bool {
    if (!preg_match('~^soc_~', $action)) return false;
    $OA = ['owner', 'admin'];
    switch ($action) {
        case 'soc_get':
            $u = need($OA); $d = soc_load(); $c = $d['cfg'];
            $posts = $d['posts']; usort($posts, fn($a, $b) => strcmp((string)($b['when'] ?: $b['created_at']), (string)($a['when'] ?: $a['created_at'])));
            out(['ok' => true, 'cfg' => soc_pub_cfg($c), 'connected' => $c['token'] !== '' && ($c['pageId'] !== '' || $c['igId'] !== ''), 'posts' => $posts, 'now' => now()]);
        case 'soc_cfg_save':
            $u = need($OA); $d = soc_load(); $s = (array)($in['cfg'] ?? []);
            foreach (['pageId', 'igId'] as $k) if (isset($s[$k])) $d['cfg'][$k] = substr(preg_replace('~\D~', '', (string)$s[$k]), 0, 30);
            if (isset($s['token']) && trim((string)$s['token']) !== '') $d['cfg']['token'] = substr(preg_replace('~[^A-Za-z0-9_\-|.]~', '', (string)$s['token']), 0, 600);
            if (!empty($s['clearToken'])) $d['cfg']['token'] = '';
            if (isset($s['tags'])) $d['cfg']['tags'] = mb_substr(trim(strip_tags((string)$s['tags'])), 0, 300);
            soc_save($d); log_act($u, 'social.cfg', ''); out(['ok' => true, 'cfg' => soc_pub_cfg($d['cfg'])]);
        case 'soc_post_save':
            $u = need($OA); $d = soc_load(); $id = (string)($in['post']['id'] ?? ''); $old = null; $ix = -1;
            foreach ($d['posts'] as $i => $p) if ($p['id'] === $id) { $old = $p; $ix = $i; }
            if ($old && in_array($old['status'], ['published', 'partial'], true)) fail('This post is already published. Duplicate it to post again.');
            $p = soc_clean((array)($in['post'] ?? []), $old); $p['by'] = $u['name']; $p['updated_at'] = now();
            if ($ix >= 0) $d['posts'][$ix] = $p; else { if (count($d['posts']) >= 1000) array_shift($d['posts']); $d['posts'][] = $p; }
            soc_save($d); log_act($u, 'social.post', $p['status'] . ' ' . mb_substr($p['text'], 0, 40)); out(['ok' => true, 'post' => $p]);
        case 'soc_post_delete':
            $u = need($OA); $d = soc_load(); $id = (string)($in['id'] ?? '');
            $d['posts'] = array_values(array_filter($d['posts'], fn($p) => $p['id'] !== $id)); soc_save($d); log_act($u, 'social.delete', $id); out(['ok' => true]);
        case 'soc_post_send': // publish now
            $u = need($OA); $d = soc_load(); $id = (string)($in['id'] ?? ''); $hit = null;
            foreach ($d['posts'] as &$p) if ($p['id'] === $id) { soc_publish($p, $d['cfg']); $hit = $p; } unset($p);
            if (!$hit) fail('Post not found'); soc_save($d); log_act($u, 'social.publish', $hit['status']);
            out(['ok' => $hit['status'] !== 'failed', 'post' => $hit, 'error' => $hit['status'] === 'failed' ? $hit['error'] : null]);
        case 'soc_ai_caption':
            $u = need($OA); $topic = mb_substr(trim(strip_tags((string)($in['topic'] ?? ''))), 0, 600); if ($topic === '') fail('Describe the post first (e.g. "DHA office fit-out, walnut and brass, 40 seats")');
            $nets = array_values(array_intersect(['fb', 'ig'], (array)($in['nets'] ?? ['fb', 'ig']))); $tone = (string)($in['tone'] ?? 'designer');
            $d = soc_load(); $co = function_exists('company_cfg') ? company_cfg() : ['phones' => '+92 322 4000768'];
            $sys = "You write social media captions for Woodex Interior, a design-and-build studio in Lahore (200+ completed spaces, in-house 3D studio). Voice: an experienced interior designer, warm and specific, never salesy. " .
                "Rules: no prices, rates, discounts or promises; no 'free', 'guarantee', 'warranty'; no invented facts or project names; plain English; 1–2 emojis at most. " .
                "Write 3 short options. Each: a strong first line, 2–3 sentences about the design thinking (materials, light, layout, how the space is used), then a soft call to action (WhatsApp " . $co['phones'] . " or 'link in bio' for Instagram). " .
                "End each option with 6–10 relevant hashtags including: " . $d['cfg']['tags'] . ". Return ONLY JSON: {\"options\":[\"...\",\"...\",\"...\"]}";
            $raw = ai_call(cms_load()['ai'], $sys, 'Platforms: ' . implode(' + ', array_map(fn($n) => $n === 'fb' ? 'Facebook' : 'Instagram', $nets)) . "\nTone: $tone\nPost about: $topic");
            $j = json_decode(preg_replace('~^[^{]*|[^}]*$~s', '', $raw), true); $opts = array_values(array_filter(array_map(fn($x) => mb_substr(trim((string)$x), 0, 2200), (array)($j['options'] ?? []))));
            if (!$opts) $opts = [trim($raw)];
            out(['ok' => true, 'options' => array_slice($opts, 0, 3)]);
    }
    return false;
}
