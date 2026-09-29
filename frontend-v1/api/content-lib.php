<?php
/**
 * Woodex Admin v2 — Phase A6a: content collections (blog, portfolio, testimonials, team, FAQ groups) + AI writing help.
 * Included by api/admin.php. Mirrors tools/frontend-v1-admin.mjs a6() one-to-one.
 * Pages themselves are rendered in the browser and written through builder.php (same backups/checks as the builder);
 * this file stores the content, publishes scheduled pages, keeps sitemap.xml up to date and proxies AI requests.
 */
declare(strict_types=1);
if (!defined('PRIVATE_DIR')) { http_response_code(404); exit; }

const CMS_FILE   = PRIVATE_DIR . '/content.json';
const CMS_TYPES  = ['post', 'study', 'testimonial', 'member', 'faq'];
const CMS_PAGES  = ['post' => 'insights', 'study' => 'projects'];
const AI_SECRETS = ['anthropicKey', 'openaiKey', 'openrouterKey'];
const AI_DEF = ['provider' => 'anthropic', 'anthropicKey' => '', 'anthropicModel' => 'claude-sonnet-4-5', 'openaiKey' => '', 'openaiModel' => 'gpt-4o-mini', 'openrouterKey' => '', 'openrouterModel' => 'nousresearch/hermes-3-llama-3.1-405b',
    'voice' => 'Calm, plain, confident British English. Short sentences. No hype, no exclamation marks. Woodex Interior is a design, fit-out and renovation studio in Lahore, Pakistan.'];

function cms_load(): array { $c = jread(CMS_FILE); $c['items'] = $c['items'] ?? []; $c['seq'] = (int)($c['seq'] ?? 0); $c['ai'] = array_merge(AI_DEF, $c['ai'] ?? []); return $c; }
function cms_save_file(array $c): void { jwrite(CMS_FILE, $c); }
function ai_pub(array $a): array { foreach (AI_SECRETS as $k) { $a[$k . 'Set'] = $a[$k] !== ''; $a[$k] = ''; } return $a; }
function cms_rel_ok($rel, string $type): bool { return is_string($rel) && isset(CMS_PAGES[$type]) && (bool)preg_match('~^' . CMS_PAGES[$type] . '/[a-z0-9][a-z0-9-]{0,59}/index\.html$~', $rel); }
function cms_html_ok($h): bool { return is_string($h) && strlen($h) < 3 * 1024 * 1024 && preg_match('~<html~i', $h) && preg_match('~</html>~i', $h) && !preg_match('~<[^>]+\s(contenteditable|data-wx-ed)[\s=>]~i', $h); }
function cms_now(): string { return gmdate('Y-m-d H:i:s'); } // schedule times are stored in UTC
function sitemap_add(string $rel): void {
    $f = ROOT_DIR . '/sitemap.xml'; if (!is_file($f)) return;
    $loc = 'https://woodex.com.pk/' . preg_replace('~index\.html$~', '', $rel); $x = (string)file_get_contents($f);
    if (strpos($x, '<loc>' . $loc . '</loc>') !== false || strpos($x, '</urlset>') === false) return;
    file_put_contents($f, str_replace('</urlset>', '  <url><loc>' . htmlspecialchars($loc, ENT_XML1) . "</loc></url>\n</urlset>", $x), LOCK_EX);
}
/** Publish scheduled items whose time has come. Called on every admin request; can also be hit by a cron job. */
function cms_tick(): int {
    if (!is_file(CMS_FILE)) return 0;
    $fh = fopen(CMS_FILE . '.lock', 'c'); if (!flock($fh, LOCK_EX | LOCK_NB)) { fclose($fh); return 0; }
    $c = cms_load(); $t = cms_now(); $n = 0;
    foreach ($c['items'] as &$it) {
        if (($it['status'] ?? '') !== 'scheduled' || empty($it['publishAt']) || $it['publishAt'] > $t) continue;
        if (!empty($it['pending']) && isset(CMS_PAGES[$it['type']])) {
            $p = $it['pending'];
            if (!cms_rel_ok($p['rel'] ?? '', $it['type']) || !cms_html_ok($p['html'] ?? '')) { $it['status'] = 'draft'; $it['error'] = 'Scheduled page was invalid'; continue; }
            $abs = ROOT_DIR . '/' . $p['rel']; if (is_file($abs)) backup_page($p['rel']); if (!is_dir(dirname($abs))) mkdir(dirname($abs), 0755, true);
            file_put_contents($abs, $p['html'], LOCK_EX);
            $listRel = CMS_PAGES[$it['type']] . '/index.html'; $li = ROOT_DIR . '/' . $listRel; $href = '/' . preg_replace('~index\.html$~', '', $p['rel']);
            if (!empty($p['card']) && is_file($li)) { $L = (string)file_get_contents($li); if (strpos($L, 'href="' . $href . '"') === false && strpos($L, '<div class="hx-cards">') !== false) { backup_page($listRel); file_put_contents($li, preg_replace('~<div class="hx-cards">~', "<div class=\"hx-cards\">\n" . str_replace(['\\', '$'], ['\\\\', '\\$'], $p['card']), $L, 1), LOCK_EX); } }
            $it['rel'] = $p['rel']; unset($it['pending']); sitemap_add($p['rel']);
        }
        $it['status'] = 'published'; $it['published_at'] = $t; $n++; log_act(null, 'content.autopublish', $it['title']);
    } unset($it);
    if ($n) cms_save_file($c);
    flock($fh, LOCK_UN); fclose($fh); return $n;
}
function ai_call(array $a, string $system, string $user): string {
    $p = $a['provider']; $key = $a[$p . 'Key'] ?? ''; $model = $a[$p . 'Model'] ?? '';
    if ($key === '') fail('Add an API key for ' . (['anthropic' => 'Claude', 'openai' => 'OpenAI', 'openrouter' => 'OpenRouter'][$p] ?? $p) . ' in Content → AI settings');
    if (!function_exists('curl_init')) fail('The server has no cURL extension', 500);
    if ($p === 'anthropic') { $url = 'https://api.anthropic.com/v1/messages'; $h = ['x-api-key: ' . $key, 'anthropic-version: 2023-06-01', 'content-type: application/json']; $body = ['model' => $model, 'max_tokens' => 2500, 'system' => $system, 'messages' => [['role' => 'user', 'content' => $user]]]; }
    else { $url = $p === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions'; $h = ['authorization: Bearer ' . $key, 'content-type: application/json', 'HTTP-Referer: https://woodex.com.pk', 'X-Title: Woodex Admin']; $body = ['model' => $model, 'max_tokens' => 2500, 'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $user]]]; }
    $ch = curl_init($url); curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_HTTPHEADER => $h, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60]);
    $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($raw === false) fail('AI request failed: ' . mb_substr($err, 0, 200), 502);
    $j = json_decode((string)$raw, true) ?: [];
    if ($code >= 400) fail('AI request failed: ' . mb_substr((string)($j['error']['message'] ?? $code), 0, 200), 502);
    if ($p === 'anthropic') return implode('', array_map(fn($x) => (string)($x['text'] ?? ''), $j['content'] ?? []));
    return (string)($j['choices'][0]['message']['content'] ?? '');
}
function ai_prompt(string $task, array $i): ?string {
    $s = fn($k, $n = 4000) => mb_substr((string)($i[$k] ?? ''), 0, $n);
    switch ($task) {
        case 'outline': return "Write a full blog article for the Woodex website.\nTitle: {$s('title', 200)}\nNotes from the team: " . ($s('notes', 3000) ?: '(none)') . "\nReturn ONLY JSON: {\"dek\":\"one-sentence standfirst\",\"blocks\":[{\"t\":\"h\",\"text\":\"...\"},{\"t\":\"p\",\"text\":\"...\"},{\"t\":\"list\",\"items\":[\"**Label:** text\"]}],\"summary\":[\"three short takeaways\"],\"faqs\":[{\"q\":\"...\",\"a\":\"...\"}],\"quote\":\"one pull quote\"}. 5-7 sections, each a heading plus 1-2 paragraphs. Use **bold** sparingly. Prices in PKR where relevant.";
        case 'meta': return "Write SEO metadata for this page.\nTitle: {$s('title', 200)}\nText: {$s('text')}\nReturn ONLY JSON: {\"title\":\"max 60 characters, ends with | Woodex Interior\",\"desc\":\"140-158 characters\"}";
        case 'alt': return "Write alt text (max 110 characters, no \"image of\") for a photo on the Woodex website. File: {$s('file', 200)}. Context: {$s('context', 600)}. Return only the alt text.";
        case 'improve': return "Rewrite this paragraph to be clearer and tighter, same meaning and length or shorter. Return only the paragraph.\n\n{$s('text', 3000)}";
        case 'excerpt': return "Write a card summary (max 150 characters) for this page. Return only the text.\nTitle: {$s('title', 200)}\n{$s('text', 3000)}";
        case 'faqs': return "Write 4 FAQs a Pakistani client would ask about: {$s('title', 200)}.\nContext: {$s('text', 3000)}\nReturn ONLY JSON: [{\"q\":\"...\",\"a\":\"1-3 sentences\"}]";
    }
    return null;
}
function cms_safe_rel($r): bool { return is_string($r) && preg_match('~^[a-z0-9][a-z0-9/_\-.]*\.html$~i', $r) && strpos($r, '..') === false && !preg_match('~^(_private|builder|admin|api|assets)/~', $r); }

function content_actions(string $action, array $in): bool {
    if (!preg_match('~^(cms_|ai_)~', $action)) return false;
    $ED = ['owner', 'admin', 'editor']; $OA = ['owner', 'admin'];
    $c = cms_load();
    $idx = function ($id) use (&$c): int { foreach ($c['items'] as $k => $x) if ((int)$x['id'] === (int)$id) return $k; fail('Item not found', 404); return -1; };
    switch ($action) {
        case 'cms_list':
            need($ED); $ty = in_array($in['type'] ?? '', CMS_TYPES, true) ? $in['type'] : null; $out = [];
            foreach (array_reverse($c['items']) as $x) { if ($ty && $x['type'] !== $ty) continue; $x['hasPending'] = !empty($x['pending']); unset($x['pending']); $out[] = $x; }
            out(['ok' => true, 'items' => $out, 'aiReady' => $c['ai'][$c['ai']['provider'] . 'Key'] !== '']);
        case 'cms_get': need($ED); $x = $c['items'][$idx($in['id'] ?? 0)]; unset($x['pending']); out(['ok' => true, 'item' => $x]);
        case 'cms_save':
            $u = need($ED); $type = (string)($in['type'] ?? ''); if (!in_array($type, CMS_TYPES, true)) fail('Unknown content type');
            $title = clip($in['title'] ?? '', 160); if ($title === '') fail(in_array($type, ['testimonial', 'member'], true) ? 'Name is required' : 'Title is required');
            $data = is_array($in['data'] ?? null) ? $in['data'] : []; if (strlen(json_encode($data)) > 400000) fail('Content is too large');
            $k = !empty($in['id']) ? $idx($in['id']) : -1; $it = $k >= 0 ? $c['items'][$k] : null;
            $slug = isset(CMS_PAGES[$type]) ? strtolower((string)($in['slug'] ?? '')) : '';
            $claim = (string)($in['claim'] ?? '');
            if (isset(CMS_PAGES[$type])) {
                if (!preg_match('~^[a-z0-9][a-z0-9-]{0,59}$~', $slug)) fail('Page address: lowercase letters, numbers and dashes only');
                if ($it && !empty($it['rel']) && $it['slug'] !== $slug) fail('The address of a published page cannot be changed');
                foreach ($c['items'] as $j => $x) if ($x['type'] === $type && $x['slug'] === $slug && $j !== $k) fail('Another item already uses that address');
                $rel = CMS_PAGES[$type] . '/' . $slug . '/index.html';
                if ((!$it || empty($it['rel'])) && is_file(ROOT_DIR . '/' . $rel) && $claim !== $rel) fail('A page already exists at /' . CMS_PAGES[$type] . '/' . $slug . '/');
            }
            if (!$it) { $it = ['id' => ++$c['seq'], 'type' => $type, 'status' => 'draft', 'created_at' => cms_now(), 'created_by' => $u['name'], 'rel' => null]; }
            $seo = is_array($in['seo'] ?? null) ? $in['seo'] : [];
            $it = array_merge($it, ['title' => $title, 'slug' => $slug, 'data' => $data, 'seo' => ['title' => clip($seo['title'] ?? '', 90), 'desc' => clip($seo['desc'] ?? '', 200), 'og' => clip($seo['og'] ?? '', 300)], 'order' => (int)($in['order'] ?? 0), 'updated_at' => cms_now(), 'updated_by' => $u['name']]);
            if ($claim !== '' && isset(CMS_PAGES[$type]) && $claim === CMS_PAGES[$type] . '/' . $slug . '/index.html') { $it['rel'] = $claim; $it['status'] = 'published'; $it['imported'] = true; }
            $st = (string)($in['status'] ?? '');
            if ($st === 'draft' && $it['status'] === 'scheduled') { $it['status'] = 'draft'; unset($it['pending']); }
            if ($st === 'scheduled') {
                $at = substr(str_replace('T', ' ', (string)($in['publishAt'] ?? '')), 0, 16); if (!preg_match('~^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$~', $at)) fail('Pick a publish date and time');
                if (!empty($it['rel'])) fail('This item is already live. Just publish your changes.');
                if (isset(CMS_PAGES[$type])) { $p = is_array($in['pending'] ?? null) ? $in['pending'] : []; if (!cms_rel_ok($p['rel'] ?? '', $type) || !cms_html_ok($p['html'] ?? '')) fail('Could not prepare the scheduled page'); $it['pending'] = ['rel' => $p['rel'], 'html' => $p['html'], 'card' => clip($p['card'] ?? '', 4000)]; }
                $it['status'] = 'scheduled'; $it['publishAt'] = $at . ':00';
            }
            if ($st === 'published' && !isset(CMS_PAGES[$type])) { $it['status'] = 'published'; $it['published_at'] = $it['published_at'] ?? cms_now(); }
            if ($k >= 0) $c['items'][$k] = $it; else $c['items'][] = $it;
            cms_save_file($c); log_act($u, 'content.save', $type . ': ' . $title);
            $pub = $it; unset($pub['pending']); out(['ok' => true, 'item' => $pub]);
        case 'cms_published':
            $u = need($ED); $k = $idx($in['id'] ?? 0); $it = $c['items'][$k]; if (!isset(CMS_PAGES[$it['type']])) fail('Not a page item');
            $rel = (string)($in['rel'] ?? ''); if (!cms_rel_ok($rel, $it['type']) || !is_file(ROOT_DIR . '/' . $rel)) fail('Page was not written');
            $it['rel'] = $rel; $it['status'] = 'published'; $it['published_at'] = $it['published_at'] ?? cms_now(); unset($it['pending']); $it['publishAt'] = null;
            $c['items'][$k] = $it; cms_save_file($c); sitemap_add($rel); log_act($u, 'content.publish', $it['title']); out(['ok' => true, 'item' => $it]);
        case 'cms_status':
            $u = need($ED); $k = $idx($in['id'] ?? 0); if (isset(CMS_PAGES[$c['items'][$k]['type']])) fail('Use Publish for pages');
            $c['items'][$k]['status'] = ($in['status'] ?? '') === 'published' ? 'published' : 'draft'; cms_save_file($c); log_act($u, 'content.' . $c['items'][$k]['status'], $c['items'][$k]['title']);
            out(['ok' => true, 'item' => $c['items'][$k]]);
        case 'cms_reorder':
            need($ED); $ids = array_map('intval', is_array($in['ids'] ?? null) ? $in['ids'] : []);
            foreach ($c['items'] as &$x) { $p = array_search((int)$x['id'], $ids, true); if ($p !== false) $x['order'] = $p + 1; } unset($x);
            cms_save_file($c); out(['ok' => true]);
        case 'cms_delete':
            $u = need($OA); $k = $idx($in['id'] ?? 0); $it = $c['items'][$k]; if (!empty($it['rel'])) fail('This page is live. Pages cannot be deleted; edit it instead.');
            array_splice($c['items'], $k, 1); cms_save_file($c); log_act($u, 'content.delete', $it['title']); out(['ok' => true]);
        case 'cms_placements': need($ED); out(['ok' => true, 'placements' => $c['placements'] ?? ['testimonial' => ['index.html', 'about/index.html'], 'member' => ['about/index.html']]]);
        case 'cms_placements_save':
            $u = need($OA); $p = is_array($in['placements'] ?? null) ? $in['placements'] : []; $c['placements'] = [];
            foreach (['testimonial', 'member'] as $k) {
                $c['placements'][$k] = array_values(array_slice(array_filter(is_array($p[$k] ?? null) ? $p[$k] : [], 'cms_safe_rel'), 0, 80));
                $s = is_array($p[$k . 'Set'] ?? null) ? $p[$k . 'Set'] : []; $c['placements'][$k . 'Set'] = ['kicker' => clip($s['kicker'] ?? '', 60), 'heading' => clip($s['heading'] ?? '', 120)];
            }
            cms_save_file($c); log_act($u, 'content.placements'); out(['ok' => true, 'placements' => $c['placements']]);
        case 'cms_ai_get': need($OA); out(['ok' => true, 'ai' => ai_pub($c['ai'])]);
        case 'cms_ai_save':
            $u = need($OA); $s = is_array($in['ai'] ?? null) ? $in['ai'] : [];
            foreach (array_keys(AI_DEF) as $k) { if (!array_key_exists($k, $s)) continue; if (in_array($k, AI_SECRETS, true) && $s[$k] === '' && empty($s[$k . 'Clear'])) continue; $c['ai'][$k] = clip($s[$k], $k === 'voice' ? 800 : 300); }
            if (!in_array($c['ai']['provider'], ['anthropic', 'openai', 'openrouter'], true)) $c['ai']['provider'] = 'anthropic';
            cms_save_file($c); log_act($u, 'settings.ai', $c['ai']['provider']); out(['ok' => true, 'ai' => ai_pub($c['ai'])]);
        case 'ai_run':
            $u = need($ED); $prompt = ai_prompt((string)($in['task'] ?? ''), is_array($in['input'] ?? null) ? $in['input'] : []); if ($prompt === null) fail('Unknown AI task');
            $text = ai_call($c['ai'], 'You write website copy for Woodex Interior. ' . $c['ai']['voice'], $prompt); log_act($u, 'ai.' . $in['task']); out(['ok' => true, 'text' => $text]);
        case 'ai_test': need($OA); $t = ai_call($c['ai'], 'Reply with one word.', 'Say OK.'); out(['ok' => true, 'text' => mb_substr($t, 0, 60)]);
    }
    return false;
}
