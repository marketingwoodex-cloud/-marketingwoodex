<?php
/**
 * ARC.STUDIO step A4 — Team Feed: staff messages per project (architects, contractors, fabricators, office).
 * Separate from the website visitor chat (chat-lib.php). Wired into admin.php's default dispatch.
 * Not runtime-tested (no PHP runtime, see plans/00-master-plan.md section 0). Syntax-checked only.
 *
 * Needs from the includer: q(), db(), need(), out(), fail(), log_act().
 * Messages are stored as plain text. The screen escapes them. Nothing here renders HTML.
 */
declare(strict_types=1);
if (!defined('PRIVATE_DIR')) { http_response_code(404); exit; }

const ARC_FEED_MAX_TEXT = 2000;
const ARC_FEED_ROLES    = ['owner', 'admin', 'editor'];   // ARC roles are added in step A9

function arc_feed_migrate(): void {
    static $done = false; if ($done) return; $done = true;
    q('CREATE TABLE IF NOT EXISTS wx_arc_feed (id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, author_id INT NOT NULL, author_name VARCHAR(120) NOT NULL, author_role VARCHAR(20) NOT NULL, body TEXT NOT NULL, created_at INT NOT NULL, INDEX(project_id, id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
}

/** Dispatcher in the admin.php style: returns true when the action is handled (and has already sent the response). */
function arc_feed_actions(string $action, array $in): bool {
    switch ($action) {
        case 'arc_feed_list':
            $u = need(ARC_FEED_ROLES); arc_feed_migrate();
            $pid = (int)($in['project_id'] ?? 0); if ($pid <= 0) fail('Choose a project', 400);
            $since = max(0, (int)($in['since'] ?? 0));
            arc_feed_project_exists($pid);
            $rows = q('SELECT id,author_id,author_name,author_role,body,created_at FROM wx_arc_feed WHERE project_id=? AND id>? ORDER BY id DESC LIMIT 100', [$pid, $since])->fetchAll();
            $items = array_map(fn($r) => [
                'id' => (int)$r['id'], 'author_id' => (int)$r['author_id'], 'author' => (string)$r['author_name'],
                'role' => (string)$r['author_role'], 'text' => (string)$r['body'], 'at' => (int)$r['created_at'],
            ], array_reverse($rows));
            out(['ok' => true, 'project_id' => $pid, 'items' => $items, 'me' => (int)$u['id']]);
        case 'arc_feed_post':
            $u = need(ARC_FEED_ROLES); arc_feed_migrate();
            $pid = (int)($in['project_id'] ?? 0); if ($pid <= 0) fail('Choose a project', 400);
            $text = trim((string)($in['text'] ?? ''));
            if ($text === '') fail('Write a message first', 400);
            if (mb_strlen($text) > ARC_FEED_MAX_TEXT) fail('Message is too long (max ' . ARC_FEED_MAX_TEXT . ' characters)', 400);
            arc_feed_project_exists($pid);
            q('INSERT INTO wx_arc_feed (project_id, author_id, author_name, author_role, body, created_at) VALUES (?,?,?,?,?,?)',
              [$pid, (int)$u['id'], substr((string)($u['name'] ?? ''), 0, 120), substr((string)$u['role'], 0, 20), $text, time()]);
            $id = (int)db()->lastInsertId();
            log_act($u, 'feed.post', 'project ' . $pid);
            out(['ok' => true, 'id' => $id]);
        default:
            return false;
    }
}

function arc_feed_project_exists(int $pid): void {
    if (!q('SELECT id FROM wx_projects WHERE id=?', [$pid])->fetch()) fail('Project not found', 404);
}
