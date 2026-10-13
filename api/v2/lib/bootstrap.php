<?php
/**
 * api/v2/lib/bootstrap.php — constants, PHP compatibility shims, includes.
 *
 * Every v2 file starts here. Targets PHP 7.4 (Hostinger shared hosting may still run 7.4) while
 * being strict about types. Included by api/v2/index.php and by the CLI tools in db/.
 *
 * Master plan §6.3: the platform is same-origin; there is no CORS story because there is no
 * cross-origin client. Anything that renders to a browser lives under the same host.
 */

declare(strict_types=1);

/* ------------------------------------------------------------------ PHP 7.4 shims
   PHP 8 string helpers, so the code can use them regardless of the host's PHP version. */
if (!function_exists('str_starts_with')) {
    function str_starts_with(string $h, string $n): bool { return $n === '' || strncmp($h, $n, strlen($n)) === 0; }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with(string $h, string $n): bool { return $n === '' || substr($h, -strlen($n)) === $n; }
}
if (!function_exists('str_contains')) {
    function str_contains(string $h, string $n): bool { return $n === '' || strpos($h, $n) !== false; }
}
if (!function_exists('array_is_list')) {
    function array_is_list(array $a): bool { return $a === [] || array_keys($a) === range(0, count($a) - 1); }
}

/* ------------------------------------------------------------------ constants */
if (!defined('WX_V2_DIR'))      define('WX_V2_DIR', __DIR__ ? dirname(__DIR__) : '');           // api/v2
if (!defined('WX_SITE_ROOT'))   define('WX_SITE_ROOT', dirname(dirname(WX_V2_DIR)));            // site root
if (!defined('WX_PRIVATE_DIR')) define('WX_PRIVATE_DIR', WX_SITE_ROOT . '/_private');
if (!defined('WX_DB_FILE'))     define('WX_DB_FILE', WX_PRIVATE_DIR . '/db.json');
if (!defined('WX_V2_VERSION'))  define('WX_V2_VERSION', '2.5.0-p1');
if (!defined('WX_SESSION_COOKIE')) define('WX_SESSION_COOKIE', 'wx_sid');
if (!defined('WX_SESSION_TTL'))    define('WX_SESSION_TTL', 12 * 3600);
if (!defined('WX_PW_MIN'))         define('WX_PW_MIN', 10);
if (!defined('WX_CLI'))            define('WX_CLI', PHP_SAPI === 'cli');

/* Roles are unchanged from v2.1 so existing users keep working (plan §6.3). */
if (!defined('WX_ROLES')) define('WX_ROLES', ['owner', 'admin', 'editor', 'sales', 'support']);
if (!defined('WX_ROLE_LABELS')) define('WX_ROLE_LABELS', [
    'owner' => 'Master', 'admin' => 'Manager', 'editor' => 'Developer', 'sales' => 'Sales', 'support' => 'Support',
]);
if (!defined('WX_PERM_GROUPS')) define('WX_PERM_GROUPS', [
    'sales'         => 'Leads, pipeline, clients, quotes, invoices, projects, bookings',
    'conversations' => 'Inbox (website chat + WhatsApp)',
    'updates'       => 'Client updates (project messages)',
    'broadcast'     => 'WhatsApp offers, broadcasts and automation',
    'ai'            => 'Train AI and chat settings',
    'website'       => 'Pages, builder, content, media, SEO, theme',
    'settings'      => 'Business info, integrations, notifications, maintenance',
]);

/* ------------------------------------------------------------------ includes
   Order matters: errors → http → store/db → validate → audit → auth → caps → router. */
require_once WX_V2_DIR . '/lib/errors.php';
require_once WX_V2_DIR . '/lib/http.php';
require_once WX_V2_DIR . '/lib/store.php';
require_once WX_V2_DIR . '/lib/db.php';
require_once WX_V2_DIR . '/lib/validate.php';
require_once WX_V2_DIR . '/lib/audit.php';
require_once WX_V2_DIR . '/lib/auth.php';
require_once WX_V2_DIR . '/lib/caps.php';
require_once WX_V2_DIR . '/lib/router.php';

/**
 * Where the browser-facing half of the product lives. v2.1 served /admin/; v2.5 ships the React
 * build to /admin/v25/ and keeps /admin/ alive until cut-over (plan §14 strangler).
 */
if (!function_exists('wx_spa_url')) {
    function wx_spa_url(string $path = ''): string
    {
        return '/admin/v25/' . ltrim($path, '/');
    }
}
