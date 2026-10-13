<?php
/**
 * api/v2/lib/router.php — resource routing plus the v2.1 alias bridge.
 *
 * Master plan §6.2: "a noun is a resource; a verb becomes a method or a sub-resource", and the 364
 * v2.1 action names survive as an alias table so nothing breaks mid-migration. The alias table is
 * generated from the live dispatcher by tools/gen-aliases.mjs, which is what makes the
 * "cannot drift" promise in the plan checkable rather than aspirational.
 *
 * A request may arrive in any of these shapes; all resolve to the same handler:
 *
 *   GET  /api/v2/leads?stage=new                     resource + query
 *   GET  /api/v2/index.php?path=leads                no mod_rewrite
 *   POST /api/v2/index.php?action=leads_list         v2.1 alias
 *   POST /api/v2/leads                                JSON body
 *   GET  /api/v2/index.php/leads/12                  PATH_INFO
 */

declare(strict_types=1);

/**
 * The route register. Pattern segments in braces capture as params.
 * [method, pattern, handler-file, function, action-name-for-permissions]
 */
function wx_routes(): array
{
    static $routes = null;
    if ($routes !== null) {
        return $routes;
    }
    $routes = [
        /* ---------------------------------------------------------- platform */
        ['GET',    'health',                          'health', 'wx_route_health',        null],
        ['GET',    'version',                         'health', 'wx_route_version',       null],

        /* ---------------------------------------------------------- auth (public) */
        ['POST',   'auth/login',                      'auth',   'wx_route_login',         null],
        ['POST',   'auth/login/2fa',                  'auth',   'wx_route_login_2fa',     null],
        ['POST',   'auth/logout',                     'auth',   'wx_route_logout',        null],

        /* ---------------------------------------------------------- me */
        ['GET',    'me',                              'me',     'wx_route_me',            null],
        ['PATCH',  'me',                              'me',     'wx_route_me_save',       'me_save'],
        ['POST',   'me/password',                     'me',     'wx_route_password',      'password'],
        ['GET',    'me/sessions',                     'me',     'wx_route_sessions',      'sec_get'],
        ['DELETE', 'me/sessions',                     'me',     'wx_route_sessions_revoke', 'sec_revoke'],

        /* ---------------------------------------------------------- dashboard */
        ['GET',    'dashboard',                       'dashboard', 'wx_route_dashboard',  'dashboard'],

        /* ---------------------------------------------------------- leads */
        ['GET',    'leads',                           'leads',  'wx_route_leads_list',    'list_leads'],
        ['POST',   'leads',                           'leads',  'wx_route_leads_save',    'lead_save'],
        ['GET',    'leads/{id}',                      'leads',  'wx_route_leads_get',     'get_lead'],
        ['PATCH',  'leads/{id}',                      'leads',  'wx_route_leads_save',    'lead_save'],
        ['DELETE', 'leads/{id}',                      'leads',  'wx_route_leads_delete',  'lead_delete'],
        ['GET',    'leads/{id}/notes',                'leads',  'wx_route_leads_notes',   'get_lead'],
        ['POST',   'leads/{id}/notes',                'leads',  'wx_route_lead_note_add', 'add_lead_note'],

        /* ---------------------------------------------------------- activity */
        ['GET',    'activity',                        'dashboard', 'wx_route_activity',   'activity'],

        /* ------------------------------------------------------- quotations
           The chain the Phase 2 gate names: a lead is quoted, the quotation is approved, it becomes
           an invoice, the invoice is paid — all without the v2.1 admin. */
        ['GET',    'quotations',                      'quotations', 'wx_route_quotes_list',    'list_quotes'],
        ['POST',   'quotations',                      'quotations', 'wx_route_quotes_save',    'quote_save'],
        ['GET',    'quotations/{id}',                 'quotations', 'wx_route_quotes_get',     'get_quote'],
        ['PATCH',  'quotations/{id}',                 'quotations', 'wx_route_quotes_save',    'quote_save'],
        ['DELETE', 'quotations/{id}',                 'quotations', 'wx_route_quotes_delete',  'quote_delete'],
        ['POST',   'quotations/{id}/status',          'quotations', 'wx_route_quotes_status',  'quote_status'],
        ['POST',   'quotations/{id}/revise',          'quotations', 'wx_route_quotes_revise',  'create_quote_draft'],
        ['POST',   'quotations/{id}/invoice',         'quotations', 'wx_route_quotes_invoice', 'quote_invoice'],

        /* --------------------------------------------------------- invoices */
        ['GET',    'invoices',                        'invoices', 'wx_route_invoices_list',    'invs_list'],
        ['GET',    'invoices/{id}',                   'invoices', 'wx_route_invoices_get',     'inv_get'],
        ['PATCH',  'invoices/{id}',                   'invoices', 'wx_route_invoices_save',    'inv_save'],
        ['DELETE', 'invoices/{id}',                   'invoices', 'wx_route_invoices_delete',  'inv_save'],
        ['GET',    'invoices/summary',                'invoices', 'wx_route_invoices_summary', 'invs_tracker'],
        ['POST',   'invoices/{id}/payments',          'invoices', 'wx_route_invoices_pay',     'pay_add'],
        ['DELETE', 'invoices/{id}/payments/{payment}','invoices', 'wx_route_invoices_pay_delete', 'pay_delete'],

        /* ---------------------------------------------------------- payments */
        ['GET',    'payments',                        'invoices', 'wx_route_payments_list',    'invs_tracker'],

        /* ---------------------------------------------------------- projects */
        ['GET',    'projects',                        'projects', 'wx_route_projects_list',    'projs_table'],
        ['GET',    'projects/{id}',                   'projects', 'wx_route_projects_get',     'proj_meta'],
        ['PATCH',  'projects/{id}',                   'projects', 'wx_route_projects_save',    'proj_meta'],
        ['POST',   'projects/{id}/updates',           'projects', 'wx_route_projects_update',  'proj_meta'],
        ['POST',   'projects/{id}/bill',              'projects', 'wx_route_projects_bill',    'proj_bill'],

        /* --------------------------------------------------------- approvals */
        ['GET',    'approvals',                       'approvals', 'wx_route_approvals_list',      'appr_list'],
        ['GET',    'approvals/count',                 'approvals', 'wx_route_approvals_count',     'appr_count'],
        ['GET',    'approvals/config',                'approvals', 'wx_route_approvals_cfg_get',   'appr_cfg_get'],
        ['POST',   'approvals/config',                'approvals', 'wx_route_approvals_cfg_save',  'appr_cfg_save'],
        ['GET',    'approvals/{id}',                  'approvals', 'wx_route_approvals_get',       'appr_get'],
        ['POST',   'approvals/{id}/approve',          'approvals', 'wx_route_approvals_approve',   'appr_apply'],
        ['POST',   'approvals/{id}/reject',           'approvals', 'wx_route_approvals_reject',    'appr_reject'],
        ['POST',   'approvals/{id}/cancel',           'approvals', 'wx_route_approvals_cancel',    'appr_cancel'],

        /* ----------------------------------------------------------- clients
           Three read shapes of one resource: the list, one client in full, and the conversations.
           `clients_master` and `client_360` are v2.1's own action names, so the permission each route
           asks for is the permission v2.1 already granted — a salesperson who could open the client
           master still can, and support's read-only view of client_360 is still read-only. */
        ['GET',    'clients',                         'clients', 'wx_route_clients_list',    'clients_master'],
        ['POST',   'clients',                         'clients', 'wx_route_clients_save',    'client_save'],
        ['POST',   'clients/link',                    'clients', 'wx_route_clients_link',    'clients_link'],
        ['GET',    'clients/{id}',                    'clients', 'wx_route_clients_get',     'client_360'],
        ['PATCH',  'clients/{id}',                    'clients', 'wx_route_clients_save',    'client_save'],
        ['DELETE', 'clients/{id}',                    'clients', 'wx_route_clients_delete',  'client_delete'],
        ['POST',   'clients/{id}/merge',              'clients', 'wx_route_clients_merge',   'clients_merge'],
        ['GET',    'clients/{id}/comms',              'clients', 'wx_route_clients_comms',   'client_comms'],

        /* ---------------------------------------------------------- bookings
           The last three are the public booking form: no session, so they are rate-limited and
           honeypot-aware, and they create the lead as well as the booking. */
        ['GET',    'bookings',                        'bookings', 'wx_route_bookings_list',      'bk_list'],
        ['POST',   'bookings',                        'bookings', 'wx_route_bookings_save',      'bk_save'],
        ['GET',    'bookings/availability',           'bookings', 'wx_route_bookings_slots',     'bk_slots'],
        ['GET',    'bookings/settings',               'bookings', 'wx_route_bookings_cfg_get',   'bk_cfg'],
        ['POST',   'bookings/settings',               'bookings', 'wx_route_bookings_cfg_save',  'bk_cfg_save'],
        ['PATCH',  'bookings/{id}',                   'bookings', 'wx_route_bookings_save',      'bk_save'],
        ['POST',   'bookings/{id}/status',            'bookings', 'wx_route_bookings_status',    'bk_status'],
        ['GET',    'book/config',                     'bookings', 'wx_route_book_config',         null],
        ['GET',    'book/slots',                      'bookings', 'wx_route_book_slots',          null],
        ['POST',   'book',                            'bookings', 'wx_route_book_create',         null],

        /* ---------------------------------------------------------- system */
        ['GET',    'system/health',                   'system', 'wx_route_sys_health',    'sys_check'],
        ['GET',    'system/schema',                   'system', 'wx_route_sys_schema',    'dbx_browse'],
    ];
    return $routes;
}

/**
 * Find a route for method+segments. Returns [route, params] or null.
 *
 * Every `{name}` in a pattern captures: `{id}` as an integer (digits only, so `invoices/summary`
 * cannot be read as invoice "summary"), anything else as a slug-ish string. Until this was
 * generalised the only brace the matcher knew was `{id}`, which meant
 * `DELETE invoices/{id}/payments/{payment}` was a route no request could ever reach — the pattern
 * stayed literal and the deletion 404'd. That is the sort of bug a test finds and a review does not,
 * so the pattern-a-capture test in tests/run.php now walks the register and asserts every brace in
 * every pattern resolves.
 */
function wx_route_match(string $method, array $segments): ?array
{
    $path = implode('/', $segments);
    foreach (wx_routes() as $route) {
        list($m, $pattern, $file, $fn, $action) = $route;
        if ($m !== $method) {
            continue;
        }
        if ($pattern === $path) {
            return [['method' => $m, 'pattern' => $pattern, 'file' => $file, 'fn' => $fn, 'action' => $action], []];
        }
        if (strpos($pattern, '{') === false) {
            continue;
        }
        $names = [];
        $regex = '~^' . preg_replace_callback(
            '~\\\\\{([a-z0-9_]+)\\\\\}~',
            static function (array $mm) use (&$names): string {
                $names[] = $mm[1];
                return $mm[1] === 'id' ? '(\\d+)' : '([A-Za-z0-9_.-]+)';
            },
            preg_quote($pattern, '~')
        ) . '$~';
        if (preg_match($regex, $path, $mm)) {
            $params = [];
            foreach ($names as $i => $name) {
                $params[$name] = $name === 'id' ? (int) $mm[$i + 1] : (string) $mm[$i + 1];
            }
            return [['method' => $m, 'pattern' => $pattern, 'file' => $file, 'fn' => $fn, 'action' => $action], $params];
        }
    }
    return null;
}

/** The legacy action name, if the request came in through that door. */
function wx_legacy_action(): string
{
    return wx_once('legacy_action', static function (): string {
        $raw = (string) ($_GET['action'] ?? '');
        if ($raw === '') {
            return '';
        }
        return (string) preg_replace('~[^a-z0-9_]~', '', strtolower($raw));
    });
}

/**
 * Dispatch the request. Returns ['data' => …, 'meta' => …] for the front controller to envelope.
 *
 * Alias handling is deliberately thin: it maps the old action to a v2 resource and lets the normal
 * handlers run. Full per-action compatibility is Phase 2 work, done route by route with the v2.1
 * payload captured as a fixture first — inventing a translation layer now would be guessing.
 */
function wx_dispatch(): array
{
    $method = wx_method();
    $segments = wx_segments();
    $route = wx_route_match($method, $segments);

    if ($route === null) {
        $legacy = wx_legacy_action();
        if ($legacy !== '') {
            return wx_dispatch_legacy($legacy, $method);
        }
        throw ApiError::notFound('No such endpoint: ' . ($method . ' /' . implode('/', $segments)));
    }

    list($r, $params) = $route;
    $handlerFile = WX_V2_DIR . '/routes/' . $r['file'] . '.php';
    if (!is_file($handlerFile)) {
        throw ApiError::internal('Route file missing: routes/' . $r['file'] . '.php');
    }
    require_once $handlerFile;
    if (!function_exists($r['fn'])) {
        throw ApiError::internal('Route handler missing: ' . $r['fn']);
    }

    $ctx = [
        'method' => $method,
        'path' => '/' . implode('/', $segments),
        'pattern' => $r['pattern'],
        'params' => $params,
        'action' => $r['action'],
        'query' => $_GET,
        'body' => wx_body(),
        'user' => null,
    ];
    $result = call_user_func($r['fn'], $ctx);
    return wx_normalise_result($result);
}

/** Legacy ?action= → resource. Unknown actions are NOT_FOUND, never silently ignored. */
function wx_dispatch_legacy(string $action, string $method): array
{
    require_once WX_V2_DIR . '/aliases.php';
    $resource = wx_v2_resource_for($action);
    if ($resource === '') {
        throw ApiError::notFound('Unknown action: ' . $action);
    }
    $legacyFile = WX_V2_DIR . '/routes/legacy.php';
    if (!is_file($legacyFile)) {
        throw new ApiError('INTERNAL', 'The legacy bridge is not installed', null, null, ['action' => $action]);
    }
    require_once $legacyFile;
    return wx_normalise_result(wx_route_legacy($action, $resource, $method));
}

/** A handler may return its payload, or a full ['data'=>…,'meta'=>…] shape. */
function wx_normalise_result($result): array
{
    if (!is_array($result)) {
        return ['data' => $result, 'meta' => []];
    }
    if (array_key_exists('data', $result) || array_key_exists('meta', $result)) {
        return ['data' => $result['data'] ?? null, 'meta' => $result['meta'] ?? []];
    }
    return ['data' => $result, 'meta' => []];
}
