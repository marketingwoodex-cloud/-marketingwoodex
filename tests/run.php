<?php
/**
 * tests/run.php — behavioural tests for the v2 platform.
 *
 * The sandbox that built Phase 1 has no PHP (see tools/phpwasm/README.md), which is why the
 * structural half of the gate lives in tests/conformance.mjs. This file is the other half: it needs a
 * real PHP binary, so it runs on the host, in CI, or on any machine with `php` installed.
 *
 *   php tests/run.php              pure tests — no database, no network, no side effects
 *   php tests/run.php --db         also runs the database tests (needs _private/db.json)
 *   php tests/run.php --verbose    print every assertion, not just failures
 *
 * The pure set deliberately covers the parts where a mistake is expensive and invisible:
 * money conversion, date validation, the TOTP algorithm, the permission decision table, and the
 * envelope contract. Those are exactly the places v2.1 was wrong and where nobody noticed, because
 * nothing tested them.
 */

declare(strict_types=1);

/* 'wasm' is the php-wasm SAPI used by tools/phpwasm/run-php.cjs, which provides argv and a
   filesystem but no HTTP request — it is a command line in every way that matters here. */
if (!in_array(PHP_SAPI, ['cli', 'phpdbg', 'wasm'], true)) {
    header('Content-Type: text/plain; charset=utf-8');
    http_response_code(403);
    echo "tests/run.php runs from the command line only.\n";
    exit(1);
}

require_once dirname(__DIR__) . '/api/v2/lib/bootstrap.php';

$VERBOSE = in_array('--verbose', $argv, true) || in_array('-v', $argv, true);
$WITH_DB = in_array('--db', $argv, true);

$passed = 0;
$failed = 0;
$skipped = 0;
$group = '';
$failures = [];

function group(string $name): void
{
    global $group;
    $group = $name;
    echo "\n  " . $name . "\n";
}

function ok(bool $cond, string $what): void
{
    global $passed, $failed, $group, $failures, $VERBOSE;
    if ($cond) {
        $passed++;
        if ($VERBOSE) {
            echo "    ✓ " . $what . "\n";
        }
        return;
    }
    $failed++;
    $failures[] = $group . ' → ' . $what;
    echo "    ✗ " . $what . "\n";
}

function eq($actual, $expected, string $what): void
{
    global $VERBOSE;
    $cond = $actual === $expected;
    if (!$cond) {
        echo "      got:      " . var_export($actual, true) . "\n";
        echo "      expected: " . var_export($expected, true) . "\n";
    }
    ok($cond, $what);
}

function skip(string $what): void
{
    global $skipped;
    $skipped++;
    echo "    · skipped: " . $what . "\n";
}

/** Assert that $fn throws an ApiError with the given code and field. */
function throws(string $code, ?string $field, callable $fn, string $what): void
{
    try {
        $fn();
    } catch (ApiError $e) {
        $good = $e->code === $code && ($field === null || $e->field === $field);
        if (!$good) {
            echo "      got code " . $e->code . " field " . var_export($e->field, true) . "\n";
        }
        ok($good, $what);
        return;
    } catch (Throwable $e) {
        echo "      got " . get_class($e) . ': ' . $e->getMessage() . "\n";
        ok(false, $what);
        return;
    }
    echo "      nothing was thrown\n";
    ok(false, $what);
}

echo "\n  Woodex api/v2 — behavioural tests" . ($WITH_DB ? ' (with database)' : '') . "\n";

/* ============================================================== money
   v2.1 did money in JavaScript with floating point and rounded per screen. The audit found totals
   that differed by a rupee depending on which screen you opened. */
group('Money is integer paisa');

eq(wx_v_money('1234.56', 'v'), 123456, 'a decimal string becomes paisa');
eq(wx_v_money('1234', 'v'), 123400, 'a whole number is rupees');
eq(wx_v_money('1,234.56', 'v'), 123456, 'thousands separators are accepted');
eq(wx_v_money('0.01', 'v'), 1, 'the smallest unit survives');
eq(wx_v_money(1234.56, 'v'), 123456, 'a float is rounded to paisa, not truncated');
eq(wx_v_money('1.005', 'v'), 101, 'sub-paisa precision rounds half up');
eq(wx_money_out(123456), '1234.56', 'paisa formats back to a readable amount');
eq(wx_money_out(1), '0.01', 'one paisa formats correctly');
eq(wx_money_out(0), '0.00', 'zero formats correctly');
throws('VALIDATION', 'v', static function () { wx_v_money('12.3.4', 'v'); }, 'a malformed amount is refused');
throws('VALIDATION', 'v', static function () { wx_v_money('abc', 'v'); }, 'a non-number is refused');
throws('VALIDATION', 'v', static function () { wx_v_money('-5', 'v', 0); }, 'a negative amount is refused when a floor is set');

/* ============================================================== validation */
group('Validation names the offending field');

throws('VALIDATION', 'name', static function () { wx_v_string('', 'name'); }, 'empty required text is refused');
throws('VALIDATION', 'name', static function () { wx_v_string('x', 'name', 2); }, 'too-short text is refused');
eq(wx_v_string("  hello  ", 'x'), 'hello', 'text is trimmed');
eq(wx_v_string("a\x00b\x07c", 'x'), 'abc', 'control characters are stripped');

throws('VALIDATION', 'd', static function () { wx_v_date('2026-02-31', 'd'); }, 'February 31st is refused');
throws('VALIDATION', 'd', static function () { wx_v_date('31-02-2026', 'd'); }, 'a non-ISO date is refused');
eq(wx_v_date('2024-02-29', 'd'), '2024-02-29', 'a leap day is accepted');
eq(wx_v_opt_date('', 'd'), null, 'an empty optional date is null');

throws('VALIDATION', 's', static function () { wx_v_enum('maybe', ['yes', 'no'], 's'); }, 'a value outside the enum is refused');
eq(wx_v_enum('YES', ['yes', 'no'], 's', false), 'yes', 'a case-insensitive enum returns the canonical value');

throws('VALIDATION', 'n', static function () { wx_v_int('1.5', 'n'); }, 'a fractional integer is refused');
throws('VALIDATION', 'n', static function () { wx_v_int('5', 'n', 10); }, 'a value under the minimum is refused');
eq(wx_v_int('42', 'n'), 42, 'a numeric string becomes an int');
eq(wx_v_bool('on', 'b'), true, 'a form checkbox reads as true');
eq(wx_v_bool('', 'b'), false, 'an empty value reads as false');

throws('VALIDATION', 'e', static function () { wx_v_email('not-an-email', 'e'); }, 'a malformed email is refused');
eq(wx_v_email('  Boss@Woodex.PK ', 'e'), 'boss@woodex.pk', 'an email is lowercased and trimmed');

throws('VALIDATION', 'p', static function () { wx_v_password('short', 'p'); }, 'a short password is refused');
ok(strlen(wx_v_password(str_repeat('a', WX_PW_MIN), 'p')) === WX_PW_MIN, 'a password at the limit is accepted');

eq(wx_v_pick(['a' => 1, 'b' => 2, 'c' => 3], ['a', 'c']), ['a' => 1, 'c' => 3], 'only declared keys are copied');
ok(wx_limit(0) === 50 && wx_limit(9999) === 200 && wx_limit(10) === 10, 'page size is clamped to 1..200');

/* ============================================================== TOTP
   RFC 6238 Appendix B test vectors (SHA-1, 20-byte ASCII key). Our implementation emits 6 digits, so
   each expected value is the standard 8-digit truncation modulo 10^6 — the dynamic truncation itself
   is identical, which is what the test is checking. 2FA was one of the few things v2.1 got right, and
   this test exists to keep it that way across the rewrite. */
group('TOTP matches RFC 6238');

$key = '12345678901234567890'; // the RFC's ASCII secret
$b32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
eq(wx_b32_dec($b32), $key, 'base32 decodes to the RFC key');

$vectors = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
];
foreach ($vectors as $v) {
    $counter = intdiv($v[0], 30);
    eq(wx_hotp($key, $counter), $v[1], 'RFC vector at T=' . $v[0]);
}

$state = [];
ok(wx_totp_ok($b32, wx_hotp($key, intdiv(time(), 30)), $state), 'a current code is accepted');
ok(!wx_totp_ok($b32, wx_hotp($key, intdiv(time(), 30)), $state), 'the same code cannot be replayed');
/* The third parameter is by reference (it advances the replay guard), so these need a variable. */
$noState = [];
ok(!wx_totp_ok($b32, '12345', $noState), 'a five-digit code is refused');
ok(!wx_totp_ok($b32, 'abcdef', $noState), 'a non-numeric code is refused');
ok(!wx_totp_ok('', '123456', $noState), 'an empty secret is refused');

/* ============================================================== errors & envelope */
group('The envelope and the closed error set');

$e = ApiError::validation('Quantity must be greater than zero.', 'lines.3.qty');
$env = $e->toEnvelope('r_8f31c2');
ok($env['ok'] === false, 'a failure envelope starts with ok:false');
eq($env['error']['code'], 'VALIDATION', 'the code is carried');
eq($env['error']['field'], 'lines.3.qty', 'the offending field is carried');
eq($env['error']['message'], 'Quantity must be greater than zero.', 'the message is carried');
eq($env['meta']['requestId'], 'r_8f31c2', 'the request-id is in meta');
ok(!isset($env['error']['context']), 'the internal context is not sent to the client');

eq(ApiError::auth()->status, 401, 'AUTH maps to 401');
eq(ApiError::forbidden()->status, 403, 'FORBIDDEN maps to 403');
eq(ApiError::validation('x')->status, 422, 'VALIDATION maps to 422');
eq(ApiError::notFound()->status, 404, 'NOT_FOUND maps to 404');
eq(ApiError::conflict('x')->status, 409, 'CONFLICT maps to 409');
eq(ApiError::rateLimit()->status, 429, 'RATE_LIMIT maps to 429');
eq(ApiError::upstream()->status, 502, 'UPSTREAM maps to 502');
eq(ApiError::internal()->status, 500, 'INTERNAL maps to 500');

$sneaky = new ApiError('NOT_A_REAL_CODE', 'details');
eq($sneaky->code, 'INTERNAL', 'an invented code is coerced to INTERNAL');
eq($sneaky->getMessage(), 'Internal error', 'and its message is not passed through');

$wrapped = wx_error_boundary(new RuntimeException('table wx_users does not exist'), 'r_test');
eq($wrapped->code, 'INTERNAL', 'an unexpected exception becomes INTERNAL');
ok(strpos($wrapped->getMessage(), 'wx_users') === false, 'the internal message does not leak the schema');

/* ============================================================== aliases */
group('Aliases and the legacy bridge');

require_once WX_V2_DIR . '/aliases.php';
/* The alias table is the contract, so the count is asserted against the generated map rather than
   a remembered figure: every v2.1 action must have an entry, and the two-letter action `me` is the
   one an earlier count missed. */
$aliasCount = count(WX_V2_ALIASES);
$jsonPath = WX_V2_DIR . '/aliases.json';
$jsonCount = is_file($jsonPath) ? (int) (json_decode((string) file_get_contents($jsonPath), true)['counts']['actions'] ?? -1) : -1;
eq($jsonCount, $aliasCount, 'aliases.json and aliases.php agree on how many actions exist');
ok($aliasCount >= 365, 'all v2.1 actions are mapped (got ' . $aliasCount . ')');
eq(wx_v2_resource_for('leads_list'), 'leads', 'leads_list resolves to the leads resource');
eq(wx_v2_resource_for('chat_reply'), 'chats', 'chat_reply resolves to the chats resource');
eq(wx_v2_resource_for('backup_run'), 'system', 'backup_run resolves to the system resource');
eq(wx_v2_resource_for('not_a_real_action_xyz'), '', 'an unknown action resolves to an empty string');

require_once WX_V2_DIR . '/routes/legacy.php';
$bridged = wx_legacy_bridged();
ok(count($bridged) >= 15, 'the legacy bridge carries the Phase 1 read paths');
$unknown = [];
foreach (array_keys($bridged) as $action) {
    if (!isset(WX_V2_ALIASES[$action])) {
        $unknown[] = $action;
    }
}
eq($unknown, [], 'every bridged action is a real v2.1 action name');

/* ============================================================== router */
group('Routing');

$m = wx_route_match('GET', ['leads', '12']);
ok($m !== null && $m[1]['id'] === 12, 'a path parameter is captured as an int');
ok(wx_route_match('GET', ['leads', 'abc']) === null, 'a non-numeric id does not match the id route');
ok(wx_route_match('DELETE', ['leads', '3']) !== null, 'the method is part of the match');
ok(wx_route_match('GET', ['nope']) === null, 'an unknown path does not match');
$m = wx_route_match('GET', ['leads']);
ok($m !== null && $m[0]['fn'] === 'wx_route_leads_list', 'the list route resolves to its handler');

/* ============================================================== JSON store */
group('Atomic JSON store');

$tmp = sys_get_temp_dir() . '/wx-test-' . bin2hex(random_bytes(4)) . '.json';
$store = new JsonStore($tmp, true);
eq($store->read(), [], 'a missing store reads as empty when optional');
$store->write(['a' => 1]);
eq($store->read(), ['a' => 1], 'a written value reads back');
$store->update(static function (array $d) { $d['b'] = 2; return $d; });
eq($store->read(), ['a' => 1, 'b' => 2], 'update() applies a read-modify-write');
$store->update(static function () { return null; });
eq($store->read(), ['a' => 1, 'b' => 2], 'returning null leaves the store untouched');
ok(is_file($tmp . '.lock'), 'the lock file is a sidecar, so the rename cannot invalidate it');

file_put_contents($tmp, '{"broken": ');
$raised = false;
try {
    $store->read();
} catch (ApiError $e) {
    $raised = $e->code === 'INTERNAL';
}
ok($raised, 'a corrupt store raises INTERNAL instead of silently reading as empty');
ok($store->tryRead() === null, 'tryRead() returns null on corruption for best-effort callers');
@unlink($tmp);
@unlink($tmp . '.lock');

$nonOptional = new JsonStore(sys_get_temp_dir() . '/wx-test-missing-' . bin2hex(random_bytes(4)) . '.json');
ok($nonOptional->read() === [], 'a missing non-optional store still reads empty for bootstrapping');

/* ============================================================== database */
group('Database behaviour');

if (!$WITH_DB) {
    skip('run with --db to test queries, permissions and the audit trail');
} elseif (!is_file(WX_DB_FILE)) {
    skip('no _private/db.json — configure the database first');
} else {
    try {
        wx_db();
    } catch (Throwable $e) {
        skip('database not reachable: ' . $e->getMessage());
    }

    if (wx_table_exists('wx_sessions')) {
        eq((int) wx_val('SELECT 1'), 1, 'a trivial query answers');
        ok(wx_table_exists('wx_leads'), 'wx_leads is present');
        ok(wx_column_exists('wx_leads', 'stage'), 'column introspection works');
        ok(!wx_column_exists('wx_leads', 'no_such_column'), 'a missing column is reported as missing');
        throws('INTERNAL', null, static function () { wx_update('wx_leads', ['stage' => 'new'], []); }, 'an unqualified UPDATE is refused');

        // The matrix must answer exactly as roles-lib.php did for the cases that matter most.
        $owner = ['id' => 1, 'role' => 'owner'];
        $sales = ['id' => 2, 'role' => 'sales'];
        $support = ['id' => 3, 'role' => 'support'];
        ok(wx_can($owner, 'leads_list'), 'the owner can list leads');
        ok(wx_can($sales, 'leads_list'), 'sales can list leads');
        ok(wx_can($support, 'get_lead'), 'support can open a client to answer a chat');
        ok(!wx_can($support, 'leads_list'), 'support cannot list the whole pipeline');
        ok(!wx_can($sales, 'users'), 'sales cannot manage users');
        ok(!wx_can($sales, 'backups'), 'sales cannot reach backups');
        ok(wx_can($owner, 'users'), 'the owner manages users');
        ok(wx_can($owner, 'backups'), 'the owner reaches backups');
        ok(!wx_can($sales, 'mcp_log'), 'sales cannot read the MCP log');

        $db = wx_db();
        $db->beginTransaction();
        try {
            $id = wx_insert('wx_leads', ['created_at' => wx_now(), 'source' => 'manual', 'name' => 'ZZ Test Lead', 'stage' => 'new', 'value' => 123456]);
            ok($id > 0, 'a lead can be inserted');
            eq((int) wx_val('SELECT value FROM wx_leads WHERE id = ?', [$id]), 123456, 'paisa round-trips through the database');
            $n = wx_update('wx_leads', ['stage' => 'contacted'], ['id' => $id]);
            eq($n, 1, 'wx_update reports one row changed');
            eq((string) wx_val('SELECT stage FROM wx_leads WHERE id = ?', [$id]), 'contacted', 'the update landed');
        } finally {
            $db->rollBack();
        }
    } else {
        skip('wx_sessions is absent — run: php db/migrate.php');
    }
}

/* ============================================================== report */
echo "\n";
if ($failures) {
    echo "  Failures:\n";
    foreach ($failures as $f) {
        echo "    ✗ " . $f . "\n";
    }
}
echo "  " . $passed . " passed · " . $failed . " failed" . ($skipped ? " · " . $skipped . " skipped" : "") . "\n\n";

exit($failed ? 1 : 0);
