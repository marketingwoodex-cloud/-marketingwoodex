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
 * document arithmetic, date validation, the TOTP algorithm, the permission and approval decision
 * tables, and the envelope contract. Those are exactly the places v2.1 was wrong and where nobody noticed, because
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
   The unit is whole rupees, because that is what v2.1 stores — see db/migrations/README.md for why
   changing it would be worse than keeping it. What is tested here is that the unit is unambiguous:
   a client sending "12,345.4" gets 12345 and never 1234540. */
group('Money is a whole number of rupees');
eq(wx_v_pkr('1234', 'v'), 1234, 'a whole number is itself');
eq(wx_v_pkr(1234, 'v'), 1234, 'an integer is itself');
eq(wx_v_pkr('1,234', 'v'), 1234, 'thousands separators are accepted');
eq(wx_v_pkr('1,234.4', 'v'), 1234, 'a fraction of a rupee rounds down when small');
eq(wx_v_pkr('1,234.6', 'v'), 1235, 'a fraction of a rupee rounds up when large');
eq(wx_v_pkr(1234.56, 'v'), 1235, 'a float is rounded, never truncated');
eq(wx_v_pkr('1234.56', 'v'), 1235, 'a decimal string rounds to the rupee');
eq(wx_pkr_out(1234), '1,234', 'an amount formats the way a document writes it');
eq(wx_pkr_out(0), '0', 'zero formats correctly');
eq(wx_pkr_out(1234567), '1,234,567', 'a large amount groups correctly');
throws('VALIDATION', 'v', static function () { wx_v_pkr('12.3.4', 'v'); }, 'a malformed amount is refused');
throws('VALIDATION', 'v', static function () { wx_v_pkr('abc', 'v'); }, 'a non-number is refused');
throws('VALIDATION', 'v', static function () { wx_v_pkr('-5', 'v', 0); }, 'a negative amount is refused when a floor is set');
throws('VALIDATION', 'v', static function () { wx_v_pkr('999', 'v', null, 100); }, 'an amount above a ceiling is refused');

/* ====================================================== document arithmetic
   This group is the money rule of Phase 2. wx_doc_totals() is a port of v2.1's doc_totals() — the
   point of these assertions is that the port did not change the arithmetic, because a document made
   in v2.5 is printed by the v2.1 admin during the cut-over. */
group('Document totals are computed, not trusted');

$d = wx_doc_totals([
    'sections' => [
        ['name' => 'Living room', 'items' => [
            ['desc' => 'TV unit', 'qty' => 8, 'unit' => 'sft', 'rate' => 1250.5],
            ['desc' => 'Wall panel', 'qty' => 3, 'unit' => 'nos', 'rate' => 999.75],
        ]],
        ['name' => 'Bedroom', 'items' => [
            ['desc' => 'Wardrobe', 'qty' => 1, 'unit' => 'job', 'rate' => 85000],
        ]],
    ],
    'discount' => 0, 'taxPct' => 0, 'rent' => 0, 'advance' => 0,
]);
eq(round($d['sections'][0]['items'][0]['amount'], 2), 10004.0, 'an item amount is qty x rate to two decimals');
eq(round($d['sections'][0]['subtotal'], 2), 13003.25, 'a section subtotal is the sum of its items');
eq($d['subtotal'], 98003, 'the document subtotal is a whole number of rupees');
eq($d['tax'], 0, 'no tax percentage means no tax');
eq($d['total'], 98003, 'total = subtotal - discount + rent + tax');
eq($d['taxPct'], 0.0, 'the tax percentage is echoed back');

$t = wx_doc_totals(['sections' => [['name' => 'A', 'items' => [['desc' => 'x', 'qty' => 1, 'rate' => 100000]]]], 'discount' => 5000, 'taxPct' => 17, 'rent' => 2500, 'advance' => 0]);
eq($t['subtotal'], 100000, 'subtotal before deductions');
eq($t['discount'], 5000, 'the discount is kept');
eq($t['tax'], (int) round((100000 - 5000 + 2500) * 17 / 100), 'tax is charged on subtotal - discount + rent');
eq($t['total'], 100000 - 5000 + 2500 + (int) round(97500 * 17 / 100), 'the total adds the tax');

$clamp = wx_doc_totals(['sections' => [['name' => 'A', 'items' => [['desc' => 'x', 'qty' => 1, 'rate' => 1000]]]], 'discount' => 999999, 'taxPct' => 90, 'advance' => 999999]);
eq($clamp['discount'], 1000, 'a discount above the subtotal is clamped to it');
eq((float) $clamp['taxPct'], 50.0, 'the tax percentage is capped at 50');
eq($clamp['advance'], $clamp['total'], 'an advance is clamped to the total, never above it');
eq($clamp['total'], 0, 'a discount equal to the subtotal leaves nothing to pay');

$head = wx_doc_totals(['sections' => [['name' => 'A', 'items' => [
    ['desc' => 'SECTION HEADING', 'qty' => 0, 'rate' => 0, 'kind' => 'head'],
    ['desc' => 'Real item', 'qty' => 2, 'rate' => 500],
]]]]);
eq($head['sections'][0]['items'][0]['amount'], 0.0, 'a heading carries no amount even if numbers are sent');
eq($head['subtotal'], 1000, 'a heading does not inflate the subtotal');

$neg = wx_doc_totals(['sections' => [['name' => 'A', 'items' => [['desc' => 'x', 'qty' => -5, 'rate' => 100]]]], 'rent' => -500]);
eq($neg['subtotal'], 0, 'a negative quantity is treated as zero, not as a credit');
eq($neg['rent'], 0, 'a negative rent is floored at zero');

group('Sections are cleaned and bounded');
$many = [];
for ($i = 0; $i < 60; $i++) {
    $many[] = ['name' => 'S' . $i, 'items' => [['desc' => 'item ' . $i, 'qty' => 1, 'rate' => 10]]];
}
$clean = wx_clean_sections($many);
eq(count($clean), 40, 'at most 40 sections are kept, as v2.1 enforces');
eq($clean[0]['name'], 'S0', 'the order is preserved');
$units = wx_clean_sections([['name' => 'A', 'items' => [['desc' => 'x', 'qty' => 1, 'rate' => 1, 'unit' => 'cubic-parsec']]]]);
eq($units[0]['items'][0]['unit'], 'job', 'an unknown unit falls back to job rather than being stored');
throws('VALIDATION', 'sections.0.items.0.desc', static function () {
    wx_clean_sections([['name' => 'A', 'items' => [['desc' => '', 'qty' => 1, 'rate' => 1]]]]);
}, 'a line with no description is refused, not saved blank');

/* ======================================================== invoice position
   paid / balance / payStatus / overdue are derived. These five values are what the invoice tracker,
   the printed invoice and the client link all read, so they are asserted against the same inputs
   v2.1 computed them from. */
group('An invoice derives paid, balance, payStatus and overdue');
$inv = ['id' => 7, 'no' => 'WI-10123', 'total' => 98003, 'due_date' => date('Y-m-d', time() + 7 * 86400), 'sections' => [], 'discount' => 0, 'taxPct' => 0, 'rent' => 0];
$p0 = wx_inv_public($inv, []);
eq($p0['paid'], 0, 'no payments means nothing paid');
eq($p0['balance'], 98003, 'the whole total is outstanding');
eq($p0['payStatus'], 'unpaid', 'an invoice with no payments is unpaid');
ok(!$p0['overdue'], 'an invoice due in the future is not overdue');
eq($p0['totalDisplay'], '98,003', 'the total is formatted for printing');

$p1 = wx_inv_public($inv, [['id' => 1, 'amount' => 40000, 'rcpt' => 'WI-10123-R1']]);
eq($p1['paid'], 40000, 'a partial payment is counted');
eq($p1['balance'], 58003, 'the balance is total minus paid');
eq($p1['payStatus'], 'partial', 'a part payment makes the invoice partial');

$p2 = wx_inv_public($inv, [['id' => 1, 'amount' => 40000], ['id' => 2, 'amount' => 58003]]);
eq($p2['paid'], 98003, 'payments add up');
eq($p2['balance'], 0, 'a fully paid invoice has no balance');
eq($p2['payStatus'], 'paid', 'and reads as paid');
ok(!$p2['overdue'], 'a fully paid invoice is never overdue');

$late = wx_inv_public(['id' => 8, 'no' => 'WI-10124', 'total' => 5000, 'due_date' => '2020-01-01', 'sections' => [], 'discount' => 0, 'taxPct' => 0, 'rent' => 0], [['id' => 3, 'amount' => 1000]]);
ok($late['overdue'], 'a balance past its due date is overdue');
eq($late['balance'], 4000, 'the overdue amount is part of the balance');

/* ======================================================= approval policy
   These copy v2.1's appr_needed() case for case. The rule is the product's central permission
   idea — a Manager proposes, the Master decides — so it is asserted rather than assumed. */
group("A Manager's change waits for the Master");
ok(wx_appr_needed('admin', 'media_save'), 'a manager saving media needs approval');
ok(wx_appr_needed('admin', 'page_delete'), 'a manager deleting a page needs approval');
ok(wx_appr_needed('admin', 'quote_invoice'), 'a manager invoicing a quotation needs approval');
ok(wx_appr_needed('admin', 'pay_add'), 'a manager recording a payment needs approval');
ok(wx_appr_needed('admin', 'proj_meta'), 'a manager editing a project needs approval (the extra list)');
ok(wx_appr_needed('admin', 'blocks_sync'), 'a manager syncing sections needs approval');
ok(!wx_appr_needed('owner', 'media_save'), 'the Master never waits for the Master');
ok(!wx_appr_needed('admin', 'me_save'), 'a manager editing their own profile does not wait');
ok(!wx_appr_needed('admin', 'chat_reply'), 'a manager answering a chat does not wait');
ok(!wx_appr_needed('admin', 'crm_wa_status'), 'a read that looks like a write does not wait');
ok(!wx_appr_needed('admin', 'login'), 'logging in does not wait');
ok(!wx_appr_needed('admin', 'media_upload'), 'an upload is not live until used, so it does not wait');
ok(!wx_appr_needed('admin', 'leads_list'), 'reading the pipeline does not wait');
ok(!wx_appr_needed('editor', 'media_save'), 'an editor is not gated while the developer switch is off');
ok(!wx_appr_needed('sales', 'media_save'), 'a sales role is not gated by the manager switch');
$GLOBALS['WX_APPR_REPLAY'] = true;
ok(!wx_appr_needed('admin', 'media_save'), 'an approved replay is not queued again');
$GLOBALS['WX_APPR_REPLAY'] = false;

/* The switches themselves. Without a database the conservative defaults apply, which is the point:
   an unreadable policy must never mean "no approval needed". */
group('The approval switches default to the safe answer');
$cfg = wx_appr_cfg();
ok($cfg['manager'], 'with no readable settings, a manager is still gated');
ok(!$cfg['developer'], 'and an editor is not, matching the v2.1 default');
ok($cfg['notify'], 'the Master is notified by default');
eq($cfg['expire_days'], 14, 'the queue expires after 14 days');
/* Simulate a configured host: the per-request settings cache is what wx_setting_bool() reads. */
$GLOBALS['WX_ONCE'][wx_request_generation()]['settings.all'] = [
    'approval.manager' => '0', 'approval.developer' => '1', 'approval.notify' => '0', 'approval.expire_days' => '30',
];
ok(!wx_appr_needed('admin', 'media_save'), 'turning the manager switch off lets a manager act');
ok(wx_appr_needed('editor', 'media_save'), 'turning the developer switch on gates an editor');
ok(!wx_appr_needed('editor', 'blocks_theme'), 'a builder action not on the list is not gated');
ok(wx_appr_needed('editor', 'media_delete', 'builder'), 'a builder write on the list is gated');
ok(!wx_appr_needed('editor', 'builder_me', 'builder'), 'reading the builder is never gated');
eq(wx_appr_cfg()['expire_days'], 30, 'the expiry window is configurable');
unset($GLOBALS['WX_ONCE'][wx_request_generation()]['settings.all']);

group('An approval request says what it is');
eq(wx_appr_summary('admin', 'media_save', ['title' => 'Hero photo']), 'Change media: Hero photo', 'a save reads as a plain sentence');
eq(wx_appr_summary('admin', 'page_delete', ['title' => 'Winter offers']), 'Delete page: Winter offers', 'a delete says delete');
eq(wx_appr_summary('admin', 'page_new', ['title' => 'About us']), 'Add page: About us', 'a new page says add');
eq(wx_appr_summary('builder', 'blocks_import', []), 'Add section library', 'a builder import names its area');
eq(wx_appr_summary('builder', 'theme', ['name' => 'Woodex Ink']), 'Change website theme: Woodex Ink', 'a theme change names the theme');
eq(wx_appr_summary('admin', 'quote_invoice', ['no' => 'WI-10123']), 'Invoice a quotation: WI-10123', 'the v2.5 labels read better than the raw action');
eq(wx_appr_summary('admin', 'pay_add', ['no' => 'WI-10123-R2']), 'Record a payment: WI-10123-R2', 'a payment names its receipt');

group('A document carries a label and a link that cannot be guessed');
eq(wx_doc_label(['no' => 'WI-10123', 'version' => 1, 'option' => '']), 'WI-10123', 'a first version has no version suffix');
eq(wx_doc_label(['no' => 'WI-10123', 'version' => 3, 'option' => 'B']), 'WI-10123 · V3 · B', 'a revision shows its version and option');
try {
    $tok = wx_quote_view_token(['id' => 5, 'no' => 'WI-10123']);
    eq(strlen($tok), 32, 'the client link token is 32 characters');
    eq($tok, wx_quote_view_token(['id' => 5, 'no' => 'WI-10123']), 'the same quotation always produces the same token, so old links keep working');
    ok($tok !== wx_quote_view_token(['id' => 6, 'no' => 'WI-10123']), 'a different quotation gets a different token');
    ok($tok !== wx_quote_view_token(['id' => 5, 'no' => 'WI-10124']), 'and so does a different number');
} catch (ApiError $e) {
    /* signing needs the application secret, which lives in wx_secrets — a database test */
    skip('the client link token needs the application secret (run with --db)');
}

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

/* ---- recovery codes -------------------------------------------------------------------------
   Eight one-time codes, printed dashed, typed by a person who has just lost their phone. The three
   things that must agree are the format, the hash and the comparison: a code that looks right and is
   refused is the worst failure this product can have. */
$codes = wx_recovery_codes();
eq(count($codes), 8, 'eight recovery codes are issued');
eq(strlen($codes[0]), 8, 'a code is eight characters');
ok(ctype_xdigit($codes[0]), 'a code is hex, so it can be read off a printout without ambiguity');
$shown = wx_recovery_fmt($codes);
eq($shown[0], substr($codes[0], 0, 4) . '-' . substr($codes[0], 4), 'codes are shown dashed');
eq(wx_recovery_hash($shown[0]), wx_recovery_hash($codes[0]), 'the dashed and undashed forms hash the same');
eq(wx_recovery_hash('  ' . strtoupper($shown[0]) . '  '), wx_recovery_hash($codes[0]), 'case and stray spaces do not change the hash');
ok(wx_recovery_hash($shown[1]) !== wx_recovery_hash($codes[0]), 'two different codes do not collide');
eq(count(array_unique($codes)), 8, 'the eight codes are distinct');

/* The shape the sign-in path insists on, so a typed TOTP code is never mistaken for a recovery code. */
ok((bool) preg_match('~^[a-z0-9]{4}-?[a-z0-9]{4}$~i', $shown[0]), 'a shown code matches the shape the sign-in path accepts');
ok(!(bool) preg_match('~^[a-z0-9]{4}-?[a-z0-9]{4}$~i', '123456'), 'a six-digit TOTP code is not treated as a recovery code');

/* ---- base32 round trip ----------------------------------------------------------------------- */
$bin = random_bytes(20);
$enc = wx_b32_enc($bin);
ok((bool) preg_match('~^[A-Z2-7]+$~', $enc), 'wx_b32_enc produces the base32 alphabet');
eq(wx_b32_dec($enc), $bin, 'base32 survives a round trip');


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

/* ---- the table itself: every route must be reachable, and reach its own handler ----------------
   This is where a route goes wrong without anyone noticing. `DELETE /invoices/{id}/payments/{payment}`
   was unreachable for a while because the matcher only understood `{id}`; nothing failed, the endpoint
   simply answered 404 and the reversal path in the money test never ran. The checks below ask the
   matcher for a path built from each registered pattern and require the answer to be that same route. */

$routes = wx_routes();
/* The dispatcher loads a route file only when it has chosen a route from it, so nothing here exists yet.
   Loading all of them first — which is also a test that each one parses and declares what it should. */
$routeFiles = glob(dirname(__DIR__) . '/api/v2/routes/*.php') ?: [];
sort($routeFiles);
$loaded = [];
foreach ($routeFiles as $file) {
    try {
        require_once $file;
        $loaded[] = basename($file);
    } catch (Throwable $e) {
        $loaded[] = basename($file) . ' ✗ ' . $e->getMessage();
    }
}
ok(count($loaded) === count($routeFiles), 'every file in api/v2/routes loads without error');
$seen = [];
$unreachable = [];
$wrong = [];
foreach ($routes as $r) {
    $key = $r[0] . ' ' . $r[1];
    if (isset($seen[$key])) {
        $seen[$key]++;
        continue;
    }
    $seen[$key] = 1;
    $segments = [];
    foreach (explode('/', $r[1]) as $seg) {
        $segments[] = preg_match('~^\{([a-z0-9_]+)\}$~', $seg) ? ($seg === '{id}' ? '7' : 'sample') : $seg;
    }
    $hit = wx_route_match($r[0], $segments);
    if ($hit === null) {
        $unreachable[] = $key;
    } elseif ($hit[0]['fn'] !== $r[3]) {
        $wrong[] = $key . ' → ' . $hit[0]['fn'];
    }
}
eq($unreachable, [], 'every registered pattern can be matched by a path built from it');
eq($wrong, [], 'every pattern resolves to its own handler, not to an earlier one that shadows it');
$dupes = array_keys(array_filter($seen, static fn($n) => $n > 1));
eq($dupes, [], 'no route is registered twice (a duplicate would shadow the second one)');

/* Two parameters in one pattern, and the second one is a string, not an id. */
$m = wx_route_match('DELETE', ['invoices', '12', 'payments', 'R-4']);
ok($m !== null && $m[1]['id'] === 12 && $m[1]['payment'] === 'R-4', 'a two-parameter pattern captures both, with the id typed');
ok(wx_route_match('DELETE', ['invoices', '12', 'payments']) === null, 'a pattern does not match when a segment is missing');

/* A handler name that does not exist is a 500 in production and a typo at review time. */
$missing = [];
foreach ($routes as $r) {
    if (!function_exists($r[3])) {
        $missing[] = $r[3];
    }
}
eq($missing, [], 'every registered handler is a function that exists');

/* ---- the legacy bridge -------------------------------------------------------------------------
   The bridge is an array literal, and a repeated key in one is not an error: PHP keeps the last and
   says nothing. Counting the keys against the lines that define them is the only way to notice. */
$bridged = wx_legacy_bridged();
$lines = substr_count(file_get_contents(__DIR__ . '/../api/v2/routes/legacy.php'), "=> ['");
eq(count($bridged), $lines, 'every bridge key is distinct (a duplicate would silently replace one)');
$bad = [];
foreach ($bridged as $action => $spec) {
    if (!function_exists($spec[1])) {
        $bad[] = $action . ' → ' . $spec[1];
    }
}
eq($bad, [], 'every bridged action points at a handler that exists');
ok(count($bridged) > 60, 'the bridge covers the ported families (' . count($bridged) . ' actions)');

/* ---- public routes -----------------------------------------------------------------------------
   Every route that answers without a session has to be declared, and the declaration has to be true:
   a public pattern that is not registered is a typo, and a registered route that is not public must
   ask who is calling (conformance checks the handler; this checks the table). */
$patterns = array_column($routes, 1);
$unknown = array_values(array_diff(wx_public_routes(), $patterns));
eq($unknown, [], 'every pattern in wx_public_routes() is a registered route');

/* ---- what an account change means ------------------------------------------------------------
   wx_user_plan() is the rules — who may create an owner, whose last owner cannot be demoted, who
   cannot switch themselves off — as a pure decision, which is why they can be tested here at all. */
group('The rules that keep a company out of its own admin');

$owner = ['id' => 1, 'name' => 'Owner', 'role' => 'owner'];
$admin = ['id' => 2, 'name' => 'Manager', 'role' => 'admin'];
$row = ['id' => 5, 'name' => 'Someone', 'email' => 'someone@woodex.com.pk', 'role' => 'sales', 'active' => 1];
$new = ['name' => 'New Person', 'email' => 'New.Person@woodex.com.pk', 'role' => 'sales', 'password' => 'a-long-enough-password'];

$plan = wx_user_plan($new, $owner, null, 0);
ok(empty($plan['error']) && $plan['set']['email'] === 'new.person@woodex.com.pk', 'a new account is planned, with the email lowercased');
ok($plan['set']['active'] === 1, 'a new account is active by default');

ok(wx_user_plan(['name' => 'X', 'email' => 'x@y.pk', 'role' => 'owner', 'password' => 'a-long-enough-password'], $admin, null, 0)['error'] !== null, 'a manager cannot create an owner');
ok(empty(wx_user_plan(['name' => 'X', 'email' => 'x@y.pk', 'role' => 'owner', 'password' => 'a-long-enough-password'], $owner, null, 0)['error']), 'the owner can create another owner');
ok(wx_user_plan(['name' => 'X', 'email' => 'not-an-email', 'role' => 'sales', 'password' => 'a-long-enough-password'], $owner, null, 0)['error'] !== null, 'a malformed email is refused');
ok(wx_user_plan(['name' => '', 'email' => 'x@y.pk', 'role' => 'sales', 'password' => 'a-long-enough-password'], $owner, null, 0)['error'] !== null, 'a missing name is refused');
ok(wx_user_plan(['name' => 'X', 'email' => 'x@y.pk', 'role' => 'wizard', 'password' => 'a-long-enough-password'], $owner, null, 0)['error'] !== null, 'an unknown role is refused');
ok(wx_user_plan(['name' => 'X', 'email' => 'x@y.pk', 'role' => 'sales'], $owner, null, 0)['error'] !== null, 'a new account needs a password');
ok(wx_user_plan(['name' => 'X', 'email' => 'x@y.pk', 'role' => 'sales', 'password' => 'short'], $owner, null, 0)['error'] !== null, 'a short password is refused');

$ownerRow = ['id' => 1, 'name' => 'Owner', 'email' => 'o@y.pk', 'role' => 'owner', 'active' => 1];
ok(wx_user_plan(['name' => 'Owner', 'email' => 'o@y.pk', 'role' => 'sales'], $owner, $ownerRow, 0)['error'] !== null, 'the last active owner cannot be demoted');
ok(empty(wx_user_plan(['name' => 'Owner', 'email' => 'o@y.pk', 'role' => 'sales'], $owner, $ownerRow, 1)['error']), 'an owner can be demoted when another active owner exists');
ok(wx_user_plan(['name' => 'Owner', 'email' => 'o@y.pk', 'role' => 'owner', 'active' => false], $owner, $ownerRow, 1)['error'] !== null, 'the owner cannot switch themselves off');
ok(wx_user_plan(['name' => 'Owner', 'email' => 'o@y.pk', 'role' => 'owner', 'active' => 0], $admin, $ownerRow, 2)['error'] !== null, 'a manager cannot edit the owner at all');
ok(empty(wx_user_plan(['name' => 'Someone', 'email' => 'someone@woodex.com.pk', 'role' => 'sales', 'active' => false], $owner, $row, 3)['error']), 'someone else can be deactivated');

$changed = wx_user_plan(['name' => 'Someone', 'email' => 'someone@woodex.com.pk', 'role' => 'admin'], $owner, $row, 3);
ok($changed['signOut'] === true, 'a role change ends that person sessions');
$same = wx_user_plan(['name' => 'Someone Else', 'email' => 'someone@woodex.com.pk', 'role' => 'sales'], $owner, $row, 3);
eq($same['signOut'], false, 'renaming someone does not sign them out');
$pw = wx_user_plan(['name' => 'Someone', 'email' => 'someone@woodex.com.pk', 'role' => 'sales', 'password' => 'a-long-enough-password'], $owner, $row, 3);
ok($pw['signOut'] === true && $pw['password'] !== '', 'a new password ends their sessions');
$pw = wx_user_plan(['name' => 'Someone', 'email' => 'someone@woodex.com.pk', 'role' => 'sales', 'password' => 'a-long-enough-password'], $owner, $row, 3);

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
            $id = wx_insert('wx_leads', ['created_at' => wx_now(), 'source' => 'manual', 'name' => 'ZZ Test Lead', 'stage' => 'new', 'value' => 98450]);
            ok($id > 0, 'a lead can be inserted');
            eq((int) wx_val('SELECT value FROM wx_leads WHERE id = ?', [$id]), 98450, 'an amount round-trips through the database unchanged');
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
