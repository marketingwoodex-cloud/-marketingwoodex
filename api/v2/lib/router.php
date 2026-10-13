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

        /* ------------------------------------------------------------ inbox
           One conversation list for the widget, WhatsApp and Telegram. `chat_*` is in the approval
           policy's never-queue list: answering a customer cannot wait for the Master to wake up. */
        ['GET',    'chats',                        'chats', 'wx_route_chats_list',     'chat_list'],
        ['GET',    'chats/settings',               'chats', 'wx_route_chats_cfg_get',  'chat_cfg_get'],
        ['POST',   'chats/settings',               'chats', 'wx_route_chats_cfg_save', 'chat_cfg_save'],
        ['POST',   'chats/test',                   'chats', 'wx_route_chats_test',     'chat_test'],
        ['GET',    'chats/{id}',                   'chats', 'wx_route_chats_get',      'chat_get'],
        ['POST',   'chats/{id}/reply',             'chats', 'wx_route_chats_reply',    'chat_reply'],
        ['POST',   'chats/{id}/note',              'chats', 'wx_route_chats_note',     'chat_note'],
        ['POST',   'chats/{id}/mode',              'chats', 'wx_route_chats_mode',     'chat_mode'],
        ['POST',   'chats/{id}/assign',            'chats', 'wx_route_chats_assign',   'chat_assign'],
        ['POST',   'chats/{id}/close',             'chats', 'wx_route_chats_close',    'chat_close'],
        ['POST',   'chats/{id}/tags',              'chats', 'wx_route_chats_tags',     'chat_tags'],
        ['POST',   'chats/{id}/lead',              'chats', 'wx_route_chats_lead',     'chat_lead'],
        ['POST',   'chats/{id}/typing',            'chats', 'wx_route_chats_typing',   'chat_typing'],
        ['POST',   'chats/{id}/file',              'chats', 'wx_route_chats_file',     'chat_file'],
        ['POST',   'chats/{id}/suggest',           'chats', 'wx_route_chats_suggest',  'chat_suggest'],

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

        /* -------------------------------------------------- people and security
           `users` and `user_save` are the two v2.1 action names for this screen; the capability matrix
           already restricts them to owner and admin (wx_action_roles), and user_save's group is
           `master`, which only the owner holds — so an admin can read the list and cannot change it.
           The security block is the `self` group: a person always manages their own account. */
        ['GET',    'users',                           'users',    'wx_route_users_list',              'users'],
        ['POST',   'users',                           'users',    'wx_route_users_save',              'user_save'],
        ['PATCH',  'users/{id}',                      'users',    'wx_route_users_save',              'user_save'],
        ['POST',   'users/{id}/2fa-reset',            'users',    'wx_route_users_2fa_reset',         'sec_2fa_reset'],
        ['DELETE', 'users/{id}/sessions',             'users',    'wx_route_users_sessions_revoke',   'sec_revoke'],

        ['GET',    'security',                        'security', 'wx_route_security_get',            'sec_get'],
        ['POST',   'security/2fa/begin',              'security', 'wx_route_security_2fa_begin',      'sec_2fa_begin'],
        ['POST',   'security/2fa/enable',             'security', 'wx_route_security_2fa_enable',     'sec_2fa_enable'],
        ['POST',   'security/2fa/disable',            'security', 'wx_route_security_2fa_disable',    'sec_2fa_disable'],
        ['POST',   'security/recovery',               'security', 'wx_route_security_recovery',       'sec_recovery_new'],
        ['POST',   'security/alerts',                 'security', 'wx_route_security_alerts',         'sec_alerts'],

        /* ------------------------------------------------------- delivery and SEO
           The redirect list is a file on the public server (`.htaccess`), so writing it is a change to
           what the world sees; the 404 report is public because the people who hit a 404 are exactly
           the people who have no session. Both are described in routes/redirects.php. */
        ['GET',    'redirects',                       'redirects', 'wx_route_redirects_list',  'redirects'],
        ['POST',   'redirects',                       'redirects', 'wx_route_redirects_save',  'redirects_save'],
        ['POST',   'redirects/plan',                  'redirects', 'wx_route_redirects_plan',  'redirects_plan'],
        ['GET',    '404s',                            'redirects', 'wx_route_r404_list',       'r404_list'],
        ['DELETE', '404s',                            'redirects', 'wx_route_r404_clear',      'r404_clear'],
        ['POST',   'r404',                            'redirects', 'wx_route_r404_report',     null],

        /* ------------------------------------------------------------- the library
           Phase 3: the pages, the pictures and the files. `pages` has no v2.1 alias (v2.1 had no pages
           API — screens wrote HTML directly and kept a copy), so its routes carry a null action and are
           checked by role. The media and file actions keep their v2.1 names, because the policy that
           decides what a Manager must ask the Master about is written in those names. */
        ['GET',    'pages',                           'pages', 'wx_route_pages_list',      null],
        ['GET',    'pages/search',                    'pages', 'wx_route_pages_search',    null],
        ['GET',    'pages/history',                   'pages', 'wx_route_pages_changes',   null],
        ['POST',   'pages',                           'pages', 'wx_route_pages_write',     null],
        ['POST',   'pages/rollback',                  'pages', 'wx_route_pages_rollback',  null],
        ['GET',    'pages/{rel}',                     'pages', 'wx_route_pages_get',       null],
        ['POST',   'pages/{rel}/restore',             'pages', 'wx_route_pages_restore',   null],

        ['GET',    'media',                           'media', 'wx_route_media_list',      'media_list'],
        ['GET',    'media/alt',                       'media', 'wx_route_media_alt_queue', 'media_alt'],
        ['POST',   'media/alt',                       'media', 'wx_route_media_alt_save',  'media_alt'],
        ['POST',   'media/upload',                    'media', 'wx_route_media_upload',    'media_upload'],
        ['POST',   'media/replace',                   'media', 'wx_route_media_replace',   'media_replace'],
        ['POST',   'media/sizes',                     'media', 'wx_route_media_sizes',     'media_sizes'],
        ['POST',   'media/folder',                    'media', 'wx_route_media_folder',    'media_folder'],
        ['POST',   'media/move',                      'media', 'wx_route_media_move',      'media_move'],
        ['GET',    'media/trash',                     'media', 'wx_route_media_trash_list', 'media_trash_list'],
        ['DELETE', 'media',                           'media', 'wx_route_media_trash',     'media_trash'],
        ['POST',   'media/trash/{id}/restore',        'media', 'wx_route_media_restore',   'media_restore'],
        ['DELETE', 'media/trash',                     'media', 'wx_route_media_purge',     'media_purge'],
        ['DELETE', 'media/trash/{id}',                'media', 'wx_route_media_purge',     'media_purge'],

        ['GET',    'files',                           'files', 'wx_route_files_list',      'fm_list'],
        ['GET',    'files/trash',                     'files', 'wx_route_files_trash',     'fm_trash'],
        ['GET',    'files/zip',                       'files', 'wx_route_files_zip',       'fm_zip'],
        ['POST',   'files/upload',                    'files', 'wx_route_files_upload',    'fm_upload'],
        ['POST',   'files/folder',                    'files', 'wx_route_files_folder',    'fm_mkdir'],
        ['POST',   'files/rename',                    'files', 'wx_route_files_rename',    'fm_rename'],
        ['DELETE', 'files',                           'files', 'wx_route_files_delete',    'fm_delete'],
        ['POST',   'files/trash/{id}/restore',        'files', 'wx_route_files_restore',   'fm_restore'],

        /* ------------------------------------------------- the visitor's widget
           Public on purpose: these five are what the website widget calls, and a visitor has no session
           to begin with. Auth here is the chat token in the body — 20 random bytes whose sha256 is the
           only thing stored — plus the per-IP limit inside each handler, so a request that guesses is
           cheap to refuse and a bot that scrapes is expensive to keep. `chat.php` was v2.1's entry point;
           the old URL keeps working until the widget itself is re-pointed in Phase 3. */
        ['GET',    'chat/config',                     'chat_public', 'wx_route_chat_cfg',    null],
        ['POST',   'chat/send',                       'chat_public', 'wx_route_chat_send',   null],
        ['POST',   'chat/poll',                       'chat_public', 'wx_route_chat_poll',   null],
        ['POST',   'chat/typing',                     'chat_public', 'wx_route_chat_typing', null],
        ['POST',   'chat/file',                       'chat_public', 'wx_route_chat_file',   null],

        /* ----------------------------------------------------------- the bell
           Polled by the shell, so it is in the `self` group: everyone gets their own bell, and what is
           in it depends on what they can see (see routes/notifications.php). The settings half is
           owner/admin — the `settings` group in the matrix. */
        ['GET',    'notifications/poll',              'notifications', 'wx_route_notif_poll',        'notif_poll'],
        ['GET',    'notifications',                   'notifications', 'wx_route_notify_get',        'notify_get'],
        ['POST',   'notifications/settings',          'notifications', 'wx_route_notify_save',       'notify_save'],
        ['POST',   'notifications/test',              'notifications', 'wx_route_notify_test',       'notify_test'],
        ['POST',   'notifications/project/{id}',      'notifications', 'wx_route_notify_proj_send',  'notify_proj_send'],

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
/**
 * The patterns that answer without a session. One list, in one place, because two things need to agree
 * about it: the dispatcher's own review (tests/conformance.mjs reads this function) and anyone asking
 * "what can a stranger reach?".
 *
 * The rule for being on this list is that the route authenticates by something other than a session, and
 * says what: `health` and `version` are monitors with nothing to leak; `auth/*` is how a session is
 * obtained; `me` answers "who am I" and so must be able to say "nobody" with a clean 401; the booking
 * form and the chat widget are used by people who have never signed in — they carry a rate limit and, in
 * the chat's case, a per-conversation token instead.
 *
 * Anything not on this list must call wx_require_user() in its handler. That is checked, not assumed.
 */
function wx_public_routes(): array
{
    return [
        'health', 'version',
        'auth/login', 'auth/login/2fa', 'auth/logout',
        'me',
        'book/config', 'book/slots', 'book',
        'r404',
        'chat/config', 'chat/send', 'chat/poll', 'chat/typing', 'chat/file',
    ];
}

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
    /* A handler may answer with a file instead of data — the file manager's zip download is the case
       that exists today. `__file` is deliberately not a word any handler would return by accident, and
       it is pulled out before the envelope is built so a file response can never carry a JSON body. */
    if (is_array($result) && isset($result['__file']) && is_array($result['__file'])) {
        return ['data' => null, 'meta' => [], 'file' => $result['__file']];
    }
    if (!is_array($result)) {
        return ['data' => $result, 'meta' => []];
    }
    if (array_key_exists('data', $result) || array_key_exists('meta', $result)) {
        return ['data' => $result['data'] ?? null, 'meta' => $result['meta'] ?? []];
    }
    return ['data' => $result, 'meta' => []];
}
