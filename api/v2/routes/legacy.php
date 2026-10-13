<?php
/**
 * api/v2/routes/legacy.php — the bridge that keeps v2.1 clients alive during the strangler cut-over.
 *
 * Master plan §6.2 and §14: v2.1 stays live while v2.5 is built behind it, so for a while the same
 * host serves an old admin that calls `?action=lead_save` and a new SPA that calls `POST /leads`.
 * The old client cannot be changed first — it is the one being replaced.
 *
 * Two rules keep this honest:
 *
 *   1. **The shape is v2.1's.** Legacy clients do `r.error` and `r.ok` and read payload keys at the
 *      top level (`r.user`, `r.leads`, `r.token`). Wrapping those in `{data:…}` would break every
 *      screen at once. So a legacy request gets `{ok:true, …payload, meta:{…}}` — the v2.1 body with
 *      the request-id added, which v2.1 clients ignore harmlessly.
 *
 *   2. **The list is explicit.** Only actions named in WX_LEGACY_BRIDGED are served. Anything else
 *      gets a coded 404 that names the v2.1 endpoint to use, rather than a half-guessed translation.
 *      Guessing is how a migration silently corrupts data.
 *
 * Every bridged action maps onto the same handler the resource route uses — there is no second
 * implementation of lead saving, so the bridge cannot drift from the resource.
 */

declare(strict_types=1);

/** Legacy action => [route file, function, which ctx keys it needs] */
function wx_legacy_bridged(): array
{
    return [
        'status'          => ['health', 'wx_route_health', []],
        'ping'            => ['health', 'wx_route_version', []],
        'login'           => ['auth', 'wx_route_login', []],
        'login_2fa'       => ['auth', 'wx_route_login_2fa', []],
        'logout'          => ['auth', 'wx_route_logout', []],
        'me'              => ['me', 'wx_route_me', []],
        'me_get'          => ['me', 'wx_route_me', []],
        'me_save'         => ['me', 'wx_route_me_save', []],
        'password'        => ['me', 'wx_route_password', []],
        'dashboard'       => ['dashboard', 'wx_route_dashboard', []],
        'dash_data'       => ['dashboard', 'wx_route_dashboard', []],
        'list_leads'      => ['leads', 'wx_route_leads_list', []],
        'leads_list'      => ['leads', 'wx_route_leads_list', []],
        'get_lead'        => ['leads', 'wx_route_leads_get', ['id']],
        'lead_save'       => ['leads', 'wx_route_leads_save', ['id']],
        'lead_note'       => ['leads', 'wx_route_lead_note_add', ['id']],
        'add_lead_note'   => ['leads', 'wx_route_lead_note_add', ['id']],
        'activity'        => ['dashboard', 'wx_route_activity', []],
        /* Phase 2 — the money path. The v2.1 admin calls these names; each one lands on the same
           handler the resource route uses, so there is still one implementation of each change. */
        'list_quotes'     => ['quotations', 'wx_route_quotes_list', []],
        'quotes_list'     => ['quotations', 'wx_route_quotes_list', []],
        'get_quote'       => ['quotations', 'wx_route_quotes_get', ['id']],
        'quote_save'      => ['quotations', 'wx_route_quotes_save', ['id']],
        'create_quote_draft' => ['quotations', 'wx_route_quotes_save', []],
        'quote_status'    => ['quotations', 'wx_route_quotes_status', ['id']],
        'quote_delete'    => ['quotations', 'wx_route_quotes_delete', ['id']],
        'quote_invoice'   => ['quotations', 'wx_route_quotes_invoice', ['id']],
        'invs_tracker'    => ['invoices', 'wx_route_invoices_list', []],
        'proj_bill'       => ['projects', 'wx_route_projects_bill', ['id']],
        'pay_add'         => ['invoices', 'wx_route_invoices_pay', ['id']],
        'pay_delete'      => ['invoices', 'wx_route_invoices_pay_delete', ['id']],
        'projs_table'     => ['projects', 'wx_route_projects_list', []],
        'proj_meta'       => ['projects', 'wx_route_projects_get', ['id']],
        'proj_milestones' => ['projects', 'wx_route_projects_save', ['id']],
        'proj_bill'       => ['projects', 'wx_route_projects_get', ['id']],
        'appr_list'       => ['approvals', 'wx_route_approvals_list', []],
        'appr_count'      => ['approvals', 'wx_route_approvals_count', []],
        'appr_get'        => ['approvals', 'wx_route_approvals_get', ['id']],
        'appr_apply'      => ['approvals', 'wx_route_approvals_approve', ['id']],
        'appr_reject'     => ['approvals', 'wx_route_approvals_reject', ['id']],
        'appr_cancel'     => ['approvals', 'wx_route_approvals_cancel', ['id']],
        'appr_cfg_get'    => ['approvals', 'wx_route_approvals_cfg_get', []],
        'appr_cfg_save'   => ['approvals', 'wx_route_approvals_cfg_save', []],
        'sys_check'       => ['system', 'wx_route_sys_health', []],
    ];
}

function wx_route_legacy(string $action, string $resource, string $method): array
{
    $map = wx_legacy_bridged();
    if (!isset($map[$action])) {
        require_once WX_V2_DIR . '/aliases.php';
        $row = WX_V2_ALIASES[$action] ?? null;
        $origin = $row[1] ?? 'admin.php';
        throw new ApiError('NOT_FOUND', 'Not served by api/v2 yet — use /api/' . $origin . ' until this action is ported', null, 'action', ['action' => $action, 'resource' => $resource, 'servedBy' => 'v2.1']);
    }
    list($file, $fn, $paramKeys) = $map[$action];
    require_once WX_V2_DIR . '/routes/' . $file . '.php';

    $body = wx_body();
    $params = [];
    foreach ($paramKeys as $k) {
        // The old client sends ids in the body or the query string, never in the path.
        $v = $body[$k] ?? $_GET[$k] ?? null;
        if ($v === null || $v === '') {
            throw ApiError::validation('Missing ' . $k, $k);
        }
        $params[$k] = (int) $v;
    }
    $ctx = [
        'method' => $method,
        'path' => '/' . $action,
        'pattern' => $action,
        'params' => $params,
        'action' => $action,
        'query' => $_GET,
        'body' => $body,
        'user' => null,
        'legacy' => true,
    ];
    return wx_normalise_result(call_user_func($fn, $ctx));
}

/** v2.1's success body: payload flattened, meta additive. */
function wx_legacy_ok(array $payload, array $meta = []): void
{
    wx_respond(array_merge(['ok' => true], $payload, ['meta' => array_merge(wx_base_meta(), $meta)]));
}

/** v2.1's failure body: `error` is a string, because that is what the old clients render. */
function wx_legacy_fail(ApiError $e): void
{
    wx_respond([
        'ok' => false,
        'error' => $e->getMessage(),
        'errorCode' => $e->code,
        'meta' => array_merge(wx_base_meta(), ['requestId' => wx_request_id()]),
    ], $e->status);
}
