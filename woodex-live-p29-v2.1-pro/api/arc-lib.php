<?php
/**
 * ARC.STUDIO phase 1 — drawing records and the append-only revision log.
 * Not wired to any route yet (see plans/arc-studio/02-data-model.md).
 * Needs from the includer: q(), db(), fail().
 *
 * Rules: revisions are only inserted, never updated or deleted. Each row carries a SHA-256 hash
 * over the previous row's hash and its own payload, so a changed or removed row breaks the chain.
 * A chain is kept per scope: 'drawing' (drawing state), 'line' (material line cost) or 'project' (contract value).
 */
declare(strict_types=1);
if (!defined('PRIVATE_DIR')) { http_response_code(404); exit; }

const ARC_DRAWING_KINDS = ['floor_plan', 'elevation', 'render', 'structural', 'site_plan', 'other'];
const ARC_REV_SCOPES    = ['drawing', 'line', 'project'];

function arc_migrate(): void {
    static $done = false; if ($done) return; $done = true;
    $e = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    q('CREATE TABLE IF NOT EXISTS wx_arc_drawings (id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, kind VARCHAR(20) NOT NULL, title VARCHAR(160) NOT NULL, data LONGTEXT NOT NULL, INDEX(project_id))' . $e);
    q('CREATE TABLE IF NOT EXISTS wx_arc_revisions (id INT AUTO_INCREMENT PRIMARY KEY, scope VARCHAR(16) NOT NULL, scope_id INT NOT NULL, rev VARCHAR(20) NOT NULL, by_user INT NOT NULL, created_at INT NOT NULL, note VARCHAR(255) NOT NULL DEFAULT \'\', prev_hash CHAR(64) NOT NULL, hash CHAR(64) NOT NULL, data LONGTEXT NOT NULL, INDEX(scope, scope_id), UNIQUE(hash))' . $e);
}

/** Canonical JSON for hashing: object keys sorted recursively, no slash escaping, unicode kept. */
function arc_sort_keys($v) {
    if (!is_array($v)) return $v;
    $isList = array_keys($v) === range(0, count($v) - 1);
    if (!$isList) ksort($v);
    foreach ($v as $k => $x) $v[$k] = arc_sort_keys($x);
    return $v;
}
function arc_canon($v): string {
    return json_encode(arc_sort_keys($v), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
}

function arc_hash(string $prevHash, array $payload): string {
    return hash('sha256', $prevHash . '|' . arc_canon($payload));
}

/**
 * Append one revision to a scope. $payload is the full state after the change.
 * Runs in a transaction; the last row of the scope is locked so two saves cannot share a prev_hash.
 * Callers that also change a row (e.g. a project value) must run inside their own transaction (see arc-approvals-lib.php).
 */
function arc_add_revision(string $scope, int $scopeId, string $rev, array $payload, int $userId, string $note = ''): array {
    if (!in_array($scope, ARC_REV_SCOPES, true)) fail('Unknown revision scope', 500);
    arc_migrate();
    $own = !db()->inTransaction();
    if ($own) db()->beginTransaction();
    try {
        $last = q('SELECT hash FROM wx_arc_revisions WHERE scope=? AND scope_id=? ORDER BY id DESC LIMIT 1 FOR UPDATE', [$scope, $scopeId])->fetch();
        $prev = $last ? (string)$last['hash'] : '';
        $hash = arc_hash($prev, $payload);
        q('INSERT INTO wx_arc_revisions (scope, scope_id, rev, by_user, created_at, note, prev_hash, hash, data) VALUES (?,?,?,?,?,?,?,?,?)',
          [$scope, $scopeId, substr($rev, 0, 20), $userId, time(), substr($note, 0, 255), $prev, $hash, arc_canon($payload)]);
        if ($own) db()->commit();
    } catch (Throwable $e) {
        if ($own && db()->inTransaction()) db()->rollBack();
        throw $e;
    }
    return ['scope' => $scope, 'scope_id' => $scopeId, 'rev' => $rev, 'hash' => $hash, 'prev_hash' => $prev];
}

/** Recompute the chain for one scope. Returns ['ok' => bool, 'rows' => n, 'bad_id' => id|null]. */
function arc_verify_chain(string $scope, int $scopeId): array {
    arc_migrate();
    $rows = q('SELECT id,prev_hash,hash,data FROM wx_arc_revisions WHERE scope=? AND scope_id=? ORDER BY id ASC', [$scope, $scopeId])->fetchAll();
    $prev = '';
    foreach ($rows as $r) {
        $payload = json_decode((string)$r['data'], true);
        if ($r['prev_hash'] !== $prev || !is_array($payload) || arc_hash($prev, $payload) !== $r['hash']) {
            return ['ok' => false, 'rows' => count($rows), 'bad_id' => (int)$r['id']];
        }
        $prev = (string)$r['hash'];
    }
    return ['ok' => true, 'rows' => count($rows), 'bad_id' => null];
}
