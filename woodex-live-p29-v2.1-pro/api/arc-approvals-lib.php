<?php
/**
 * ARC.STUDIO step A3 — approval kinds for budget changes and drawing revisions.
 * Uses the existing approval queue (approvals-lib.php: appr_queue, appr_begin_replay).
 * NOT wired to admin.php yet. Syntax-checked only (no PHP runtime, see plans/00-master-plan.md section 0).
 *
 * Needs from the includer (in this order): admin.php helpers (q, db, fail, need, log_act),
 * approvals-lib.php, sales-lib.php (doc_get, doc_put), arc-lib.php.
 *
 * Flow: a Manager (role admin) submits -> arc_appr_submit() validates and queues it.
 * The Master approves -> appr_begin_replay() returns [action, input] -> arc_appr_apply() runs it once.
 * An owner's own change is applied directly by the caller; it does not come through this file.
 */
declare(strict_types=1);
if (!defined('PRIVATE_DIR')) { http_response_code(404); exit; }

const ARC_APPR_ACTIONS = ['arc_budget_change', 'arc_drawing_revision'];
const ARC_APPR_MONEY_MAX = 1000000000000.0; // 1e12

/** Validate a budget change request. Returns ['ok' => true, 'clean' => [...]] or ['ok' => false, 'error' => string]. */
function arc_appr_validate_budget(array $in): array {
    $pid = (int)($in['project_id'] ?? 0);
    if ($pid <= 0) return ['ok' => false, 'error' => 'Choose a project'];
    $old = arc_appr_money($in['old_value'] ?? null);
    $new = arc_appr_money($in['new_value'] ?? null);
    if ($old === null || $new === null) return ['ok' => false, 'error' => 'Budget values must be numbers from 0 to 1,000,000,000,000'];
    if (abs($new - $old) < 0.005) return ['ok' => false, 'error' => 'The budget is not changing'];
    $reason = trim(mb_substr((string)($in['reason'] ?? ''), 0, 500));
    if ($reason === '') return ['ok' => false, 'error' => 'Give a reason for the change'];
    return ['ok' => true, 'clean' => ['project_id' => $pid, 'old_value' => $old, 'new_value' => $new, 'reason' => $reason]];
}

/** Validate a drawing revision request. The state is the full drawing record after the change. */
function arc_appr_validate_drawing(array $in): array {
    $did = (int)($in['drawing_id'] ?? 0);
    if ($did <= 0) return ['ok' => false, 'error' => 'Choose a drawing'];
    $rev = trim(mb_substr((string)($in['rev'] ?? ''), 0, 20));
    if ($rev === '') return ['ok' => false, 'error' => 'Give the revision label (e.g. B)'];
    $note = trim(mb_substr((string)($in['note'] ?? ''), 0, 255));
    $state = $in['state'] ?? null;
    if (!is_array($state) || !$state) return ['ok' => false, 'error' => 'The drawing state is missing'];
    $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false || strlen($json) > (defined('APPR_MAX_PAYLOAD') ? APPR_MAX_PAYLOAD : 3000000)) {
        return ['ok' => false, 'error' => 'This drawing change is too large to approve'];
    }
    return ['ok' => true, 'clean' => ['drawing_id' => $did, 'rev' => $rev, 'note' => $note, 'state' => $state]];
}

/** Money: a finite number from 0 to the limit, rounded to cents. */
function arc_appr_money($v): ?float {
    if ($v === null || $v === '' || !is_numeric($v)) return null;
    $f = (float)$v;
    if (!is_finite($f) || $f < 0 || $f > ARC_APPR_MONEY_MAX) return null;
    return round($f, 2);
}

/**
 * Manager submits: validate, then queue on the existing approval queue.
 * Returns the queue result (['ok' => true, 'pending' => true, ...]) or an error array.
 */
function arc_appr_submit(array $u, string $action, array $in): array {
    if (!in_array($action, ARC_APPR_ACTIONS, true)) return ['ok' => false, 'error' => 'Unknown approval kind'];
    $v = $action === 'arc_budget_change' ? arc_appr_validate_budget($in) : arc_appr_validate_drawing($in);
    if (!$v['ok']) return ['ok' => false, 'error' => $v['error']];
    return appr_queue($u, 'admin', $action, $v['clean']);
}

/**
 * Master approved (replay): apply the change once, in one transaction, and log it to the revision chain.
 * Budget: refuses if the current value is no longer the value the request was made against.
 */
function arc_appr_apply(string $action, array $in, int $approverId): array {
    if (!in_array($action, ARC_APPR_ACTIONS, true)) fail('Unknown approval kind', 400);
    $own = !db()->inTransaction();
    if ($own) db()->beginTransaction();
    try {
        if ($action === 'arc_budget_change') {
            $v = arc_appr_validate_budget($in);
            if (!$v['ok']) fail($v['error'], 400);
            $c = $v['clean'];
            $p = doc_get('wx_projects', $c['project_id'], 'Project', true);
            if (abs((float)($p['value'] ?? 0) - $c['old_value']) > 0.005) fail('The project value changed after this request was made. Ask the Manager to resubmit.', 409);
            $p['value'] = $c['new_value'];
            $p = doc_put('wx_projects', $p);
            $rev = arc_add_revision('project', $c['project_id'], 'budget', [
                'field' => 'value', 'old' => $c['old_value'], 'new' => $c['new_value'], 'reason' => $c['reason'],
            ], $approverId, $c['reason']);
            $result = ['ok' => true, 'project' => $p['id'], 'value' => $c['new_value'], 'revision' => $rev['hash']];
        } else {
            $v = arc_appr_validate_drawing($in);
            if (!$v['ok']) fail($v['error'], 400);
            $c = $v['clean'];
            $ok = q('SELECT id FROM wx_arc_drawings WHERE id=?', [$c['drawing_id']])->fetch();
            if (!$ok) fail('Drawing not found', 404);
            $rev = arc_add_revision('drawing', $c['drawing_id'], $c['rev'], $c['state'], $approverId, $c['note']);
            $result = ['ok' => true, 'drawing' => $c['drawing_id'], 'rev' => $c['rev'], 'revision' => $rev['hash']];
        }
        if ($own) db()->commit();
        return $result;
    } catch (Throwable $e) {
        if ($own && db()->inTransaction()) db()->rollBack();
        throw $e;
    }
}
