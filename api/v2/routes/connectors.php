<?php
/**
 * api/v2/routes/connectors.php — the Integrations screen: the studio's connectors, and their keys.
 *
 * Three routes:
 *
 *   1. `GET  /connectors`              the list, masked, with the counts the screen states.
 *   2. `POST /connectors`              create or change one. Queued for a Manager under v2.1's own policy
 *                                      (`conn_save` ends in `save`, so the gate already catches it).
 *   3. `POST /connectors/{conn}/delete` remove one. Queued the same way (`conn_delete`).
 *
 * Who may do it: v2.1 asked for owner or admin on every connector action, and that is kept. A connector holds
 * the studio's keys to GitHub, Gmail and Drive, which is not an editor's job.
 *
 * What is not here: testing a connector against its provider and pushing a backup. Both make outward calls with
 * live credentials, and they stay in v2.1 until they can be run on the host. The screen says so.
 */

declare(strict_types=1);

/** GET /connectors — every connector, masked. */
function wx_route_conn_list(array $ctx): array
{
    wx_require_user('conn_list', WX_CONN_ROLES);
    return ['data' => wx_conn_state()];
}

/** POST /connectors — save one. The gate is the policy's; the write is `wx_route_conn_save_do`. */
function wx_route_conn_save(array $ctx): array
{
    return wx_appr_route('conn_save', $ctx, 'connectors', 'wx_route_conn_save_do', static fn() => wx_route_conn_save_do($ctx));
}

function wx_route_conn_save_do(array $ctx): array
{
    $u = wx_require_user('conn_save', WX_CONN_ROLES);
    $in = is_array($ctx['body'] ?? null) ? $ctx['body'] : [];
    return wx_guard('connectors.save', static function () use ($u, $in) {
        [$item, $changed] = wx_conn_save($in);
        /* The fields are recorded and the values are not: an audit row that carried a key would be a second copy of it. */
        wx_audit($u, 'conn.save', (string) $item['name'], ['changed' => $changed]);
        return ['data' => ['item' => $item, 'changed' => $changed] + wx_conn_state()];
    });
}

/** POST /connectors/{conn}/delete — remove one. Queued under `conn_delete`. */
function wx_route_conn_delete(array $ctx): array
{
    return wx_appr_route('conn_delete', $ctx, 'connectors', 'wx_route_conn_delete_do', static fn() => wx_route_conn_delete_do($ctx));
}

function wx_route_conn_delete_do(array $ctx): array
{
    $u = wx_require_user('conn_delete', WX_CONN_ROLES);
    $id = (string) ($ctx['params']['conn'] ?? '');
    if ($id === '' || !preg_match('~^[A-Za-z0-9_-]{1,40}$~', $id)) {
        throw ApiError::validation('Which connector? The address did not name one.', 'conn');
    }
    return wx_guard('connectors.delete', static function () use ($u, $id) {
        [$gone] = wx_conn_delete($id);
        wx_audit($u, 'conn.delete', (string) $gone['name']);
        return ['data' => wx_conn_state()];
    });
}
