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

/* The audit that found a gate with nothing behind it. POST /pages arrived with the action `page_write` — a
   name no v2.1 verb matches — so a Manager would have edited any of the 150 pages with no approval while
   needing one to change a section block. The route now carries the builder's own `save`, and these tests
   are what keeps the pair honest: the action queues in the source the route says it is. */
ok(wx_appr_needed('admin', 'save', 'builder'), 'a manager saving a page waits, exactly as in the builder');
/* The policy is keyed on the *pair* of action and source, and this is the pair that shows it: `theme` is a
   builder action and not an admin verb, `proj_meta` is the other way round. Losing the source in
   `wx_appr_route()` would have made the builder's theme change stop queueing without a single test failing. */
ok(!wx_appr_needed('admin', 'theme'), 'the builder theme name is not an admin verb');
ok(wx_appr_needed('admin', 'theme', 'builder'), 'but as a builder action it queues');
ok(!wx_appr_needed('admin', 'proj_meta', 'builder'), 'and an admin-only change is not queued as a builder one');
ok(!wx_appr_needed('owner', 'save', 'builder'), 'the Master does not queue for their own page save');
ok(wx_appr_needed('admin', 'restore', 'builder'), 'restoring a page version waits');
ok(wx_appr_needed('admin', 'page_new', 'builder'), 'adding a page waits');
ok(!wx_appr_needed('admin', 'page_rollback', 'builder'), 'a rollback is an undo, so it does not wait for the Master');

/* v2.5's never-queued list. Every entry is a decision with a reason, and a route that passes one of these
   actions has a gate that is a pass-through *on purpose* rather than by accident. */
ok(!wx_appr_needed('admin', 'cms_published'), 'publishing an article does not queue — it never did in v2.1');
ok(!wx_appr_needed('admin', 'media_sizes'), 'regenerating image derivatives does not queue');
ok(!wx_appr_needed('admin', 'create_quote_draft'), 'a draft revision of a quotation does not queue');
ok(wx_appr_needed('admin', 'quote_status'), 'but sending the revised quotation does');
ok(wx_appr_needed('admin', 'redirects_save'), 'merging the redirect plan queues under the rule it rewrites');
ok(!wx_appr_needed('admin', 'pages_export'), 'an unknown action still falls through to the verb rules');
{
    /* Read the list out of the policy itself rather than restating it here: a test that hard-codes the
       entries passes after somebody adds a fifth one *without* a reason, which is the failure that matters.
       The reason is anything after the arrow — a bare `true` or a one-word value would be tautology, so the
       check is that each key maps to a sentence, and that each key really does skip the queue. */
    $src = (string) file_get_contents(__DIR__ . '/../api/v2/lib/approvals.php');
    $body = '';
    if (preg_match('/const WX_APPR_NEVER = \[(.*?)\n\];/s', $src, $m)) {
        $body = $m[1];
    }
    $entries = [];
    preg_match_all("/'([a-z0-9_]+)'\s*=>\s*'([^']+)'/", $body, $m2, PREG_SET_ORDER);
    foreach ($m2 as $row) {
        $entries[$row[1]] = $row[2];
    }
    ok(count($entries) >= 4, 'the never-queued list reads back out of the policy: ' . implode(', ', array_keys($entries)));
    $queuedByMistake = [];
    $tooShort = [];
    foreach ($entries as $action => $reason) {
        if (wx_appr_needed('admin', (string) $action)) {
            $queuedByMistake[] = (string) $action;
        }
        if (strlen($reason) < 20) {
            $tooShort[] = (string) $action;
        }
    }
    eq(implode(',', $queuedByMistake), '', 'every entry in the never-queued list really does skip the queue');
    eq(implode(',', $tooShort), '', 'every entry says why, in a sentence');
}
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

/* ==================================================== Phase 3 · redirects */

/* The rules that stop a redirect from breaking the site are pure functions, so they are tested without
   a database — which matters, because the failure they prevent (a redirect that takes over /admin, or
   one that points at itself) is only visible in production. */

eq(wx_rd_one(['from' => 'design-planning', 'to' => '/interior-design/', 'type' => 301])['from'], '/design-planning/', 'a rule is normalised to have both slashes');
eq(wx_rd_one(['from' => '/Page/', 'to' => '/blog/'])['from'], '/page/', 'the old address is lower-cased — MySQL compares paths case-insensitively');
eq(wx_rd_one(['from' => '/x/', 'to' => '/y/', 'type' => 410])['to'], '', '410 is gone: it carries no target');
eq(wx_rd_one(['from' => '/x/', 'to' => '/y/', 'type' => 999])['type'], 301, 'an unknown status code falls back to 301, not to a 500');
eq(wx_rd_one(['from' => '/x/', 'to' => '/y/', 'match' => 'prefix'])['match'], 'prefix', 'prefix matching survives');
eq(wx_rd_one(['from' => '/x/', 'to' => '/y/', 'match' => 'regex'])['match'], 'exact', 'anything that is not "prefix" is exact — there is no third kind');

$ok = wx_rd_clean([['from' => '/a/', 'to' => '/b/'], ['from' => '/a/', 'to' => '/c/']]);
eq(count($ok), 1, 'the same address twice collapses to the first rule — the one the unique key would keep');
eq($ok[0]['to'], '/b/', 'the first rule is the one kept');

$threw = '';
try { wx_rd_clean([['from' => '/a/', 'to' => '/a/']]); } catch (Throwable $e) { $threw = $e->getMessage(); }
ok(str_contains($threw, 'itself'), 'a redirect that points at itself is refused by name');

$threw = '';
try { wx_rd_clean([['from' => '/admin/', 'to' => '/']]); } catch (Throwable $e) { $threw = $e->getMessage(); }
ok(str_contains($threw, 'system folder'), 'a system folder cannot be redirected');

$threw = '';
try { wx_rd_clean([['from' => '/', 'to' => '/home/']]); } catch (Throwable $e) { $threw = $e->getMessage(); }
ok(str_contains($threw, 'home page'), 'the home page cannot be redirected');

$threw = '';
try { wx_rd_clean([['from' => '/a/', 'to' => '']]); } catch (Throwable $e) { $threw = $e->getMessage(); }
ok(str_contains($threw, 'Choose a new address'), 'a redirect with nowhere to go is refused');
eq(count(wx_rd_clean([['from' => '/a/', 'to' => '', 'type' => 410]])), 1, 'the same rule with 410 is allowed — gone needs no target');

$plan = wx_rd_plan();
ok(count($plan) >= 30, 'the verified redirect plan ships with the product (' . count($plan) . ' addresses)');
$merged = wx_rd_merge([['from' => '/page/', 'to' => '/blog/', 'type' => 301, 'match' => 'prefix', 'src' => 'mine', 'on' => true]], $plan);
ok($merged['added'] < count($plan), 'merging the plan skips an address that already has a rule');
eq($merged['added'] + 1, count($plan), 'only the already-decided address was skipped');
$pageRule = array_values(array_filter($merged['list'], static fn($r) => $r['from'] === '/page/'))[0] ?? null;
eq($pageRule['to'] ?? '', '/blog/', 'the existing decision wins over the shipped plan');

/* The .htaccess lines read the two switches and the saved rules, so this part needs the tables. */
if ($WITH_DB && is_file(WX_DB_FILE) && wx_table_exists('wx_redirects')) {
    $lines = implode("\n", wx_rd_lines());
    ok(str_contains($lines, 'RewriteRule ^design-planning/?$ /interior-design/ [R=301,L]'), 'an exact rule becomes one RewriteRule with the right status');
    ok(str_contains($lines, '[G,L]'), 'the spam cleanup answers 410, so Google drops the URL');
    ok(str_contains($lines, '^www\\\\.'), 'the published block forces one official hostname');
} else {
    skip('the .htaccess lines need the redirect tables — run with --db after db/migrate.php');
}

/* ========================================== Phase 3 · pages, media, files */

/* Pages are written through one function, and the parts of it that say no are pure — no database, no
   filesystem change — which is exactly why they can be tested here. The cases below are the ones that
   would otherwise be found in production: a path that escapes the site, a system folder, and a page path
   that is not a page. */

/* `about/` is a real folder in the site tree; inside the wasm harness only the PHP trees are mounted,
   so it is created when it is missing. Nothing is written — the guard only resolves the folder. */
@mkdir(WX_SITE_ROOT . '/about', 0755, true);
eq(wx_page_rel('about/index.html'), 'about/index.html', 'a sub-folder page path is accepted');
eq(wx_page_rel('/about/index.html'), 'about/index.html', 'a leading slash is normalised away');

foreach ([
    '../../etc/passwd'        => 'escapes the site',
    'about/../../index.html'  => 'escapes the site',
    'admin/index.html'        => 'is a system folder',
    'api/v2/x.html'           => 'is a system folder',
    'assets/img/x.html'       => 'is a system folder',
    'index.php'               => 'is not a page',
] as $bad => $why) {
    $threw = '';
    try { wx_page_rel($bad); } catch (Throwable $e) { $threw = $e->getMessage(); }
    ok($threw !== '', '"' . $bad . '" ' . $why . ' and is refused');
}

eq(wx_page_title_of('<html><head><TITLE> Woodex  Interiors </TITLE></head>'), 'Woodex Interiors', 'the title is read out of a page for the index');
eq(wx_page_title_of('<html><head></head>'), '', 'a page with no title reports an empty one rather than a notice');

/* A batch id has to be a real UUID: it travels in URLs and the history groups by it. */
$uuid = wx_uuid();
ok((bool) preg_match('~^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$~', $uuid), 'a batch id is a version-4 UUID');
ok(wx_uuid() !== $uuid, 'two batch ids are not the same');

/* The site's own pages are found by the walk that the header-across-150-pages change relies on. In the
   wasm harness only the PHP trees are mounted, so this part runs where the site is actually present. */
$pages = wx_page_walk(WX_SITE_ROOT);
if (count($pages) > 10) {
    ok(count($pages) > 50, 'the page walk finds the site\'s pages (' . count($pages) . ')');
    ok(!in_array('api/v2/index.php', $pages, true), 'the walk does not enter system folders');
    ok(in_array('about/index.html', $pages, true), 'the walk finds a page in a sub-folder');
} else {
    skip('the page walk needs the site tree — only the PHP trees are mounted in the wasm harness');
}

/* ------------------------------------------------ images */
ok(wx_media_ok('/assets/img/kitchen-1.webp'), 'an image URL in assets/img is valid');
ok(wx_media_ok('/assets/uploads/2026-10/kitchen-1.jpeg'), 'an image URL in an uploads sub-folder is valid');
ok(!wx_media_ok('/assets/img/../_private/db.json'), 'an image URL cannot walk up out of its folder');
ok(!wx_media_ok('/assets/img/logo.php'), 'an image URL is an image extension, not any file');
ok(!wx_media_ok('/uploads/logo.webp'), 'an image outside assets is not valid');

eq(wx_media_sniff("\xFF\xD8\xFF\xE0rest"), 'jpg', 'JPEG bytes are recognised by their marker');
eq(wx_media_sniff("\x89PNG\r\n"), 'png', 'PNG bytes are recognised');
eq(wx_media_sniff('RIFFxxxxWEBPVP8 '), 'webp', 'RIFF/WEBP is recognised');
eq(wx_media_sniff('GIF89a'), 'gif', 'GIF is recognised');
eq(wx_media_sniff("\x00\x00\x00 ftypavif"), 'avif', 'AVIF is recognised by its brand');
eq(wx_media_sniff('<?php echo 1;'), null, 'a PHP file uploaded as an image is not an image');
eq(wx_media_sniff('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), null, 'an SVG is not accepted as an image upload — it is HTML, and assets are same-origin');

eq(wx_media_variant('/assets/img/kitchen-1.webp', 960), '/assets/img/kitchen-1.w960.webp', 'the derivative name is the width, not a folder');
eq(count(WX_MEDIA_RS_W), 3, 'three widths are generated, as v2.1 did');

$threw = '';
try { wx_media_b64(''); } catch (Throwable $e) { $threw = $e->getMessage(); }
ok(str_contains($threw, 'base64'), 'empty image data is refused by name');
eq(strlen(wx_media_b64('data:image/png;base64,' . base64_encode('hello'))), 5, 'the browser\'s data: URL prefix is stripped before decoding');
$threw = '';
try { wx_media_b64('not base64 at all !!'); } catch (Throwable $e) { $threw = $e->getMessage(); }
ok($threw !== '', 'data that is not base64 is refused before anything is written');

/* ------------------------------------------------ the file manager */
ok(wx_fm_ro('assets'), 'the assets root is read-only');
ok(wx_fm_ro('assets/css/app.css'), 'the stylesheet folder is read-only');
ok(!wx_fm_ro('assets/uploads'), 'uploads is writable');
ok(!wx_fm_ro('assets/uploads/2026-10'), 'a folder inside uploads is writable');

eq(wx_fm_clean('My File Name.PNG'), 'my-file-name.png', 'an uploaded name is normalised, not trusted');
eq(wx_fm_clean('../../x'), 'x', 'dots and slashes do not survive a name');

foreach (['../etc/passwd', 'assets/../_private/db.json', 'api/v2/index.php', 'assets/.hidden/x'] as $bad) {
    $threw = '';
    try { wx_fm_path($bad, false); } catch (Throwable $e) { $threw = $e->getMessage(); }
    ok($threw !== '', 'the file manager refuses "' . $bad . '"');
}
ok(!in_array('php', WX_FM_EXT, true), 'PHP is not an uploadable file type');
ok(in_array('svg', WX_FM_EXT, true) && in_array('pdf', WX_FM_EXT, true), 'the document and image types v2.1 allowed are still allowed');

/* ============================================== Phase 3 · the header, menu, footer
   These transformations are the ones that decide whether "change the header across 150 pages" is one
   edit or 150 small mistakes, and every one of them is pure — page HTML in, page HTML out. */

/** A page shaped like the site's own: brand, header CTA, desktop nav, mobile panel, footer, sections. */
function wx_test_page(string $url, string $extra = ''): string
{
    return '<!doctype html><html><head><title>Test</title>' . $extra . '</head><body>'
        . '<header class="site-header">'
        . '<a class="brand" href="/"><img src="/assets/img/logo.svg" alt="Woodex"></a>'
        . '<nav class="desktop-nav"><a href="/">Home</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav>'
        . '<a class="header-cta" href="/contact/"><span class="header-cta-label">Get a quote</span></a>'
        . '<nav class="mobile-panel"><a class="mobile-primary" href="/contact/">Get a quote</a><a href="/about/">About</a></nav>'
        . '</header>'
        . '<main>' . $extra . '</main>'
        /* Shaped like the site's own footer, which matters: the intro is the block immediately before a
           `<nav>`, and that is what tells the shared footer which sentence belongs to this page. */
        . '<footer class="footer"><div class="footer-main">'
        . '<div class="footer-intro">A sentence about this page.</div>'
        . '<nav class="footer-column"><a id="footer-process" href="' . $url . '#process">Process</a>'
        . '<a id="footer-services" href="' . $url . '#services">Services</a>'
        . '<a id="footer-faq" href="' . $url . '#faqs">FAQs</a></nav>'
        . '<nav class="footer-cols"><a id="footer-cta" href="/#page-contact">Contact</a></nav>'
        . '</div></footer>'
        . '</body></html>';
}

$homePage = wx_test_page('/');
$aboutPage = wx_test_page('/about/', '<section id="page-contact">Contact form</section>');

/* ---- the brand: the home page's own brand is marked current, every other page's is not */
$brand = '<a class="brand" href="/"><img src="/assets/img/logo.svg" alt="Woodex"></a>';
$newHome = wx_chrome_apply_html('index.html', $homePage, ['regions' => ['brand'], 'brand' => $brand]);
ok($newHome === null || !str_contains($newHome, 'aria-current="page"') || str_contains((string) $newHome, '<a class="brand" aria-current="page"'),
    'the home page brand keeps aria-current when the brand is applied');
$brandNew = '<a class="brand" href="/"><img src="/assets/img/logo-v2.svg" alt="Woodex"></a>';
$changedHome = wx_chrome_apply_html('index.html', $homePage, ['regions' => ['brand'], 'brand' => $brandNew]);
ok(str_contains((string) $changedHome, 'logo-v2.svg'), 'a brand change reaches the home page');
ok(str_contains((string) $changedHome, 'aria-current="page"'), 'and the home page still marks its own brand as the current page');
$changedAbout = wx_chrome_apply_html('about/index.html', $aboutPage, ['regions' => ['brand'], 'brand' => $brandNew]);
ok(!str_contains((string) $changedAbout, 'aria-current="page"'), 'the about page does not claim the home page is current');
eq(wx_chrome_apply_html('about/index.html', $aboutPage, ['regions' => ['brand'], 'brand' => $brand]), null,
    'applying the brand the page already has changes nothing — a no-op is reported as one');

/* ---- the call-to-action label */
$cta = wx_chrome_apply_html('about/index.html', $aboutPage, ['regions' => ['cta'], 'cta' => 'Get a quote →']);
ok(str_contains((string) $cta, '>Get a quote →<'), 'the button text is replaced');
ok(substr_count((string) $cta, 'Get a quote →') === 1, 'only the header button is touched, not the mobile menu copy');

/* ---- the desktop menu: this page's own link is marked current, and only one link is */
$menu = '<nav class="desktop-nav"><a href="/">Home</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav>';
$aboutMenu = wx_chrome_apply_html('about/index.html', $aboutPage, ['regions' => ['menu'], 'menuDesktop' => $menu]);
ok(substr_count((string) $aboutMenu, 'aria-current="page"') === 1, 'exactly one menu link is marked as the current page');
ok((bool) preg_match('~<a href="/about/" aria-current="page"~', (string) $aboutMenu), 'and it is this page\'s own link');
$homeMenu = wx_chrome_apply_html('index.html', $homePage, ['regions' => ['menu'], 'menuDesktop' => $menu]);
ok((bool) preg_match('~<a href="/" aria-current="page"~', (string) $homeMenu), 'the home page marks Home');

/* ---- the mobile menu keeps this page's own "Get a quote" target */
$mobile = '<nav class="mobile-panel"><a class="mobile-primary" href="/contact/">Get a quote</a><a href="/">Home</a></nav>';
$pageWithOwnCta = str_replace('href="/contact/">Get a quote</a><a href="/about/', 'href="/services/">Get a quote</a><a href="/about/', $aboutPage);
$mobileApplied = wx_chrome_apply_html('about/index.html', $pageWithOwnCta, ['regions' => ['menu'], 'menuMobile' => $mobile]);
ok(str_contains((string) $mobileApplied, '<a class="mobile-primary" href="/services/">'), 'the mobile button keeps the target this page chose');
$plainApplied = wx_chrome_apply_html('about/index.html', $aboutPage, ['regions' => ['menu'], 'menuMobile' => $mobile]);
ok(str_contains((string) $plainApplied, '<a class="mobile-primary" href="/contact/">'), 'and keeps it when the page has no different target of its own');

/* ---- the footer: shared, but this page's anchors and its own intro survive */
$footer = '<footer class="footer"><div class="footer-main">'
    . '<div class="footer-intro">Woodex builds interiors.</div>'
    . '<nav class="footer-column"><a id="footer-process" href="/#process">Process</a>'
    . '<a id="footer-services" href="/#services">Services</a><a id="footer-faq" href="/#faqs">FAQs</a></nav>'
    . '<nav class="footer-cols"><a id="footer-cta" href="/#page-contact">Contact</a></nav></div></footer>';
$pageWithAnchors = str_replace(
    ['href="/#process"', 'href="/#services"', 'href="/#faqs"'],
    ['href="/about/#process"', 'href="/about/#services"', 'href="/about/#faqs"'],
    wx_test_page('/about/', '<section id="page-contact">Contact form</section>')
);
$footApplied = wx_chrome_apply_html('about/index.html', $pageWithAnchors, ['regions' => ['footer'], 'footer' => $footer]);
ok(str_contains((string) $footApplied, 'id="footer-process" href="/about/#process"'), 'the footer keeps this page\'s own process anchor');
ok(str_contains((string) $footApplied, 'id="footer-services" href="/about/#services"'), 'and the services anchor');
ok(str_contains((string) $footApplied, 'id="footer-faq" href="/about/#faqs"'), 'and the FAQ anchor');
ok(str_contains((string) $footApplied, 'A sentence about this page.'), 'the page keeps its own footer intro by default');
$footAll = wx_chrome_apply_html('about/index.html', $pageWithAnchors, ['regions' => ['footer'], 'footer' => $footer, 'introAll' => true]);
ok(str_contains((string) $footAll, 'Woodex builds interiors.') && !str_contains((string) $footAll, 'A sentence about this page.'),
    'with introAll the shared intro replaces every page\'s own — which is what that switch means');

/* The `/#page-contact` fix: a link that would send this visitor back to the home page, when the section
   is right here. */
$pageContact = wx_test_page('/contact/', '<section id="page-contact">Contact form</section>');
$contactFoot = wx_chrome_apply_html('contact/index.html', $pageContact, ['regions' => ['footer'], 'footer' => $footer]);
ok(str_contains((string) $contactFoot, 'id="footer-cta" href="#page-contact"'), 'a footer link to the home page\'s contact section becomes this page\'s, where the section exists');
$pageNoContact = wx_test_page('/services/');
/* The shared footer here differs from the page's own, so the apply genuinely changes something and the
   result is a page rather than "null means nothing changed" — which is itself the honest answer when a
   footer is applied to a page that already has it. */
$footerV2 = str_replace('>Contact</a>', '>Contact us</a>', $footer);
$servicesFoot = wx_chrome_apply_html('services/index.html', $pageNoContact, ['regions' => ['footer'], 'footer' => $footerV2]);
ok(str_contains((string) $servicesFoot, '>Contact us</a>'), 'the shared footer reaches a page that had a different one');
ok(str_contains((string) $servicesFoot, 'id="footer-cta" href="/#page-contact"'), 'and a footer link to the home page stays a link to the home page where that section does not exist');
ok(str_contains((string) $servicesFoot, 'A sentence about this page.'), 'and the page still keeps its own intro');

/* ---- the design block and the header phone */
$style = '<style id="wx-chrome-style" data-cfg="banner">.site-header{--h:72px}</style>';
$phone = '<a class="wx-hphone" href="tel:+923224000768">+92 322 4000768</a>';
$styled = wx_chrome_apply_html('about/index.html', $aboutPage, ['regions' => ['design'], 'style' => $style, 'phone' => $phone]);
ok(str_contains((string) $styled, 'wx-chrome-style'), 'the design block is written into the head');
ok(strpos((string) $styled, 'wx-chrome-style') < strpos((string) $styled, '</head>'), 'and it lands before </head>');
ok(str_contains((string) $styled, 'wx-hphone') && strpos((string) $styled, 'wx-hphone') < strpos((string) $styled, 'class="header-cta"'),
    'the phone sits immediately before the header button');
$restyled = wx_chrome_apply_html('about/index.html', (string) $styled, ['regions' => ['design'], 'style' => $style, 'phone' => $phone]);
eq($restyled, null, 'applying the same design twice leaves the page alone — one style block, not two');

/* ---- what the preview and the apply agree on */
$spans = wx_chrome_spans($aboutPage);
ok(isset($spans['brand'], $spans['footer'], $spans['menuDesktop'], $spans['menuMobile']), 'every region of a real page is found by the span reader');

/* TODO-DB: coverage, the diff walk and the batch write need the site tree and the tables. */
if (count(wx_page_walk(WX_SITE_ROOT)) > 10 && wx_table_exists('wx_page_versions')) {
    $cov = wx_chrome_coverage();
    ok($cov['pages'] > 50, 'the coverage count walks the site (' . $cov['pages'] . ' pages)');
    ok($cov['regions']['footer'] > 0, 'and reports how many pages have a footer');
    ok($cov['regions']['footer'] <= $cov['pages'], 'the region count can never exceed the page count');
    $diff = wx_chrome_diff(['regions' => ['cta'], 'cta' => 'Get a quote'], ['limit' => 3]);
    eq(count($diff['changed']), 3, 'the preview stops at the limit it was given');
    ok($diff['scanned'] > 3, 'and reports how many pages it read to find them');
} else {
    skip('the chrome coverage and diff need the site tree and migration 011');
}

/* ================================================== Phase 3 · the content CMS
   The claim this slice makes is narrow and testable: **nothing a browser sends reaches a published page
   as markup.** v2.1 took a composed HTML document from the browser and stored it; here an item is data
   and the server renders it. These tests are the evidence for that sentence. */

/** An item in the shape the editor sends, ready to render. */
function wx_test_item(array $over = []): array
{
    return array_replace([
        'id' => 7,
        'type' => 'post',
        'status' => 'draft',
        'slug' => 'how-we-quote',
        'title' => 'How we quote a project',
        'rel' => null,
        'url' => null,
        'data' => [
            'hero' => ['kicker' => 'Process', 'dek' => 'From first call to a signed quote.', 'category' => 'Process', 'readTime' => '5 min read'],
            'sections' => [
                ['kind' => 'lead', 'text' => 'A quote is a promise.'],
                ['kind' => 'heading', 'text' => 'What we measure'],
                ['kind' => 'para', 'text' => "First line.\nSame paragraph, next line.\n\nSecond paragraph."],
                ['kind' => 'list', 'items' => ['Site visit', 'Measurements']],
            ],
        ],
        'seo' => ['title' => 'How we quote', 'desc' => 'The quoting process.', 'og' => '', 'kw' => 'quoting', 'related' => []],
        'tpl' => null,
        'order' => 0,
        'imported' => false,
        'publishAt' => null,
        'publishedAt' => '2026-10-14 09:00:00',
        'createdAt' => '2026-10-01 10:00:00',
        'createdBy' => 'Owner',
        'updatedAt' => null,
        'updatedBy' => '',
    ], $over);
}

/* ---- the body renders, and what it renders is escaped */
$body = wx_content_body(wx_test_item());
ok(str_contains($body['html'], '<h1 id="dx-title">How we quote a project</h1>'), 'the article title becomes the page h1');
ok(str_contains($body['html'], '<p class="dx-lead">A quote is a promise.</p>'), 'the lead renders');
ok(str_contains($body['html'], '<h2>What we measure</h2>'), 'a level-2 heading renders as h2');
ok(substr_count($body['html'], '<p>') >= 2, 'a blank line in a paragraph becomes two paragraphs');
ok(str_contains($body['html'], '<br>'), 'and a single newline becomes a line break');
ok(str_contains($body['html'], '<ul class="dx-list"><li>Site visit</li><li>Measurements</li></ul>'), 'a list renders as a list');

$evil = wx_test_item(['title' => 'Fees & <script>alert(1)</script>', 'data' => ['sections' => [['kind' => 'para', 'text' => 'Pay <b>now</b> — 5 < 10']]]]);
$evilBody = wx_content_body($evil);
ok(!str_contains($evilBody['html'], '<script'), 'a script tag in the title is not a script tag in the page');
ok(str_contains($evilBody['html'], '&lt;script&gt;'), 'it is the text the editor typed, escaped');
ok(str_contains($evilBody['html'], '&lt;b&gt;now&lt;/b&gt;') && str_contains($evilBody['html'], '5 &lt; 10'),
    'and markup inside a paragraph is text too — the server renders, the browser never composes');
$ampTitle = wx_content_body(wx_test_item(['title' => 'Fees & charges', 'seo' => ['title' => 'Fees & charges', 'desc' => 'Rates.', 'og' => '', 'kw' => '', 'related' => []]]));
ok(str_contains($ampTitle['html'], 'Fees &amp; charges'), 'an ampersand in a title is escaped as an entity');

/* ---- the refusals: a section the renderer does not know, an empty body, a javascript: link */
try {
    wx_content_section(['kind' => 'iframe', 'text' => 'x']);
    ok(false, 'an unknown section kind should be refused');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'Unknown section'), 'an unknown section is refused rather than silently dropped: ' . $e->getMessage());
}
try {
    wx_content_body(wx_test_item(['data' => ['sections' => []]]));
    ok(false, 'an article with no body should be refused');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'no body'), 'an article with no sections is refused: ' . $e->getMessage());
}
try {
    wx_content_section(['kind' => 'cta', 'label' => 'Call', 'href' => 'javascript:alert(1)']);
    ok(false, 'a javascript: link should be refused');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'https://'), 'a button that runs code is refused: ' . $e->getMessage());
}
ok(wx_content_section(['kind' => 'cta', 'label' => 'Call the studio', 'href' => '/contact/']) ===
    '<aside class="dx-cta"><a class="btn" href="/contact/">Call the studio</a></aside>', 'and a real button renders');
ok(wx_content_url('https://example.com/quote') === 'https://example.com/quote', 'an https link is allowed');
try {
    wx_content_url('//evil.example.com/x');
    ok(false, 'a protocol-relative link should be refused');
} catch (Throwable $e) {
    ok(true, 'a protocol-relative link is refused');
}

/* ---- images come from the media library, and nothing else */
try {
    wx_content_section(['kind' => 'image', 'url' => '/assets/js/site.js']);
    ok(false, 'a script path should not pass as an image');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'media library'), 'an image section only accepts a media-library image: ' . $e->getMessage());
}
$img = wx_content_section(['kind' => 'image', 'url' => '/assets/img/kitchen.webp', 'alt' => 'A kitchen']);
ok(str_contains($img, 'src="/assets/img/kitchen.webp"') && str_contains($img, 'alt="A kitchen"'), 'a real image renders with its alt text');
ok(!str_contains($img, 'srcset'), 'and no srcset for derivatives the site does not have');
try {
    wx_content_body(wx_test_item(['data' => ['hero' => ['image' => '/assets/css/site.css'], 'sections' => [['kind' => 'lead', 'text' => 'x']]]]));
    ok(false, 'a stylesheet should not pass as a hero image');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'media library'), 'the hero image has to be an image: ' . $e->getMessage());
}

/* ---- the shell: the site's page furniture, with the article's head and main */
$shell = '<!doctype html><html><head><title>Insights — Woodex</title><meta name="description" content="Notes."></head>'
    . '<body class="page-insights"><header class="site-header"><nav class="desktop-nav"></nav></header>'
    . '<main id="main-content"><section class="hx-hero">the list page hero</section></main>'
    . '<footer class="footer"></footer></body></html>';
$item = wx_test_item(['url' => '/insights/how-we-quote/', 'rel' => 'insights/how-we-quote/index.html', 'status' => 'published']);
$page = wx_content_render($item, wx_content_body($item)['html'], $shell);
ok(str_contains($page, '<header class="site-header">'), 'the published page keeps the site header');
ok(str_contains($page, '<footer class="footer">'), 'and the footer');
ok(!str_contains($page, 'the list page hero'), 'and does not keep the list page\'s hero — the <main> is replaced whole');
ok(str_contains($page, '<title>How we quote · Woodex Interiors</title>'), 'the title comes from the item\'s SEO title');
ok(str_contains($page, '<link rel="canonical" href="https://woodex.com.pk/insights/how-we-quote/">'), 'the canonical address is the page\'s own');
ok(str_contains($page, '<meta property="og:description" content="The quoting process.">'), 'a social card tag the shell did not have is added');
ok(substr_count($page, '<main') === 1, 'the page has exactly one main element');

/* ---- the item rules: addresses are the ones the site can serve */
$clean = wx_content_clean(['type' => 'post', 'title' => '  How we quote  ', 'slug' => 'How-We-Quote', 'data' => ['sections' => []], 'seo' => ['desc' => 'x']]);
eq($clean['slug'], 'how-we-quote', 'a slug is lower-cased');
eq($clean['title'], 'How we quote', 'a title is trimmed');
ok(strlen($clean['seo']['desc']) <= 200, 'the description is clipped to what a search result shows');
foreach ([['type' => 'widget', 'title' => 'x', 'slug' => 'y'], ['type' => 'post', 'title' => '', 'slug' => 'y'], ['type' => 'post', 'title' => 'x', 'slug' => '-bad-']] as $i => $bad) {
    try {
        wx_content_clean($bad, null);
        ok(false, 'an invalid item should be refused (case ' . $i . ')');
    } catch (Throwable $e) {
        ok(true, 'refused case ' . $i . ': ' . substr($e->getMessage(), 0, 70));
    }
}
$published = ['id' => 3, 'slug' => 'how-we-quote', 'rel' => 'insights/how-we-quote/index.html'];
try {
    wx_content_clean(['type' => 'post', 'title' => 'T', 'slug' => 'a-new-address', 'data' => [], 'seo' => []], $published);
    ok(false, 'a published page\'s address should be immutable');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'cannot be changed'), 'a live address cannot be rewritten: ' . $e->getMessage());
}
ok(wx_content_clean(['type' => 'testimonial', 'title' => 'A happy client', 'data' => [], 'seo' => []])['slug'] === '',
    'a testimonial has no address of its own — it appears inside pages, not as a page');

/* ---- templates: the v2.1 rules, kept */
$tpl = wx_content_tpl_clean(['type' => 'post', 'name' => '  Deep dive  ', 'hero' => 'navy', 'sections' => [['k' => 'body', 'on' => false], ['k' => 'body', 'on' => true], ['k' => 'nonsense', 'on' => true]]]);
eq($tpl['name'], 'Deep dive', 'a template name is trimmed');
eq($tpl['hero'], 'navy', 'the hero style is kept');
eq(count($tpl['sections']), 5, 'every known section appears once, in order, even the ones the editor did not list');
ok($tpl['sections'][0]['k'] === 'body' && $tpl['sections'][0]['on'] === false, 'and the editor\'s own switch wins');
foreach ([['type' => 'shoe', 'name' => 'x'], ['type' => 'post', 'name' => '  '], ['type' => 'city', 'name' => 'Lahore', 'order' => []]] as $i => $bad) {
    try {
        wx_content_tpl_clean($bad);
        ok(false, 'an invalid template should be refused (case ' . $i . ')');
    } catch (Throwable $e) {
        ok(true, 'template refused case ' . $i . ': ' . substr($e->getMessage(), 0, 60));
    }
}
$city = wx_content_tpl_clean(['type' => 'city', 'name' => 'Lahore', 'source' => 'interior-design', 'order' => [['id' => 'hero', 'on' => true, 'label' => 'Hero'], ['id' => 'bad id!', 'on' => true]]]);
eq(count($city['order']), 1, 'a city template keeps only well-formed section ids');

/* TODO-DB: the publish path needs the tables (012) and the site tree, which the wasm harness has neither
   of. The sitemap rules are the same insertion v2.1 shipped, with the `unlisted` rule kept. */
skip('publishing an article, the sitemap and the tick need migration 012 and the site tree');

/* ==================================================== Phase 3 · the gate, as wiring
   The gate's three sentences, each one a route that exists with the permission and approval action the
   business already agreed to. The behaviour behind them is tested above (the chrome transformations, the
   composer) and in the host run (the tables); what this asserts is that nothing was renamed into a route
   the policy does not know. */

$table = wx_routes();
/** Find one route by method + pattern. */
$find = static function (string $method, string $pattern) use ($table): ?array {
    foreach ($table as $r) {
        if ($r[0] === $method && $r[1] === $pattern) {
            return ['handler' => $r[3], 'action' => $r[4], 'family' => $r[2]];
        }
    }
    return null;
};

$publish = $find('POST', 'content/{id}/publish');
ok($publish !== null && $publish['handler'] === 'wx_route_content_publish', 'the gate\'s first sentence is a route: POST content/{id}/publish');
eq($publish['action'] ?? null, 'cms_published', 'and it carries the v2.1 action that means "put this article on the site"');
$chrome = $find('POST', 'chrome');
ok($chrome !== null && $chrome['handler'] === 'wx_route_chrome_apply', 'the second: POST chrome changes the header across the site');
eq($chrome['action'] ?? null, 'global_chrome', 'through the action v2.1 used for the site-wide chrome');
$rollback = $find('POST', 'pages/rollback');
ok($rollback !== null && $rollback['handler'] === 'wx_route_pages_rollback', 'the third: POST pages/rollback undoes a whole change');
ok($find('GET', 'pages/history') !== null, 'and the history that names the change to undo is readable');
ok($find('GET', 'chrome') !== null && $find('POST', 'chrome/preview') !== null,
    'the chrome can be read and previewed before it is applied');
ok($find('POST', 'content/tick') !== null, 'and scheduled items can be published when their time comes');

/* The preview must not be a route the approval policy queues: it is a read that happens to be a POST,
   and putting it in the Master's queue would train people to approve without reading. */
/* `wx_appr_needed(role, action)`: a Manager's changes are the ones the default policy queues. */
eq(wx_appr_needed('admin', 'global_chrome'), true, 'applying the chrome is a change that can need the Master\'s approval');
eq(wx_appr_needed('admin', 'chrome_versions'), false, 'reading the chrome versions is not a change and is never queued');
eq(wx_appr_needed('admin', 'cms_save'), true, 'saving an article is a change');
/* Publishing is *not* queued, and that is v2.1's own decision kept verbatim: "published" is not one of the
   verbs the policy queues, so a Manager publishes without waiting for the Master — which is the whole point
   of having an editor who can publish. Asserting the opposite would be rewriting the business rule. */
eq(wx_appr_needed('admin', 'cms_published'), false, 'publishing an article is not queued — the policy is the one v2.1 shipped');
eq(wx_appr_needed('admin', 'global_replace'), true, 'find-and-replace across the site is a change');
eq(wx_appr_needed('owner', 'global_chrome'), false, 'the Master\'s own changes are never queued');

/* ================================================= Phase 3 · the section library
   `wx_block_ranges()` is the function that finds a global section inside a page by balancing tags. It is
   the one piece of this slice that can destroy a live page, so it is tested the way it will be used: a
   global section that contains elements of its own, including another one of its own tag. */

$sec = '<section class="band" data-wx-global="abc123"><h2>Hello</h2><p>Text</p></section>';
eq(count(wx_block_ranges($sec, 'abc123')), 1, 'a global section is found by its token');
[$a, $b] = wx_block_ranges($sec, 'abc123')[0];
eq(trim(substr($sec, $a, $b - $a)), $sec, 'and the range covers exactly the element, not a byte more');

/* Nested elements, including the same tag name — this is what depth counting is for. If the walk closed on
   the first `</section>` it found, everything after the second one's start would be swallowed. */
$nested = '<div class="page">'
    . '<section data-wx-global="a1b2c3"><div class="wrap"><section class="inner"><p>One</p></section>'
    . '<p>Two</p></div></section>'
    . '<p>After the section</p></div>';
$ranges = wx_block_ranges($nested, 'a1b2c3');
eq(count($ranges), 1, 'a section containing a section is one range');
[$a, $b] = $ranges[0];
ok(str_contains(substr($nested, $a, $b - $a), '<section class="inner">'), 'the range includes the nested element');
ok(!str_contains(substr($nested, $a, $b - $a), 'After the section'), 'and stops at the outer closing tag — a premature close would take the rest of the page with it');

/* Two instances on one page, and the replacement keeps the text between them. */
$twice = '<header>x</header>' . $sec . '<p>Middle</p>' . str_replace('Hello', 'Again', $sec) . '<footer>y</footer>';
eq(count(wx_block_ranges($twice, 'abc123')), 2, 'a section used twice on one page is two ranges');
$replaced = wx_block_replace($twice, 'abc123', '<section data-wx-global="abc123"><h2>New</h2></section>');
eq(substr_count($replaced, '<h2>New</h2>'), 2, 'both instances are replaced');
ok(str_contains($replaced, '<p>Middle</p>') && str_contains($replaced, '<footer>y</footer>'), 'and the page around them survives');

/* Tokens that share a prefix, and tokens that are not there. */
$long = str_replace('abc123', 'abc1234', $sec);
eq(count(wx_block_ranges($long, 'abc123')), 0, 'a token that is a prefix of another does not match it');
$sibling = $sec . '<section data-wx-global="abcdef"></section>';
eq(count(wx_block_ranges($sibling, 'abc123')), 1, 'and a page holding both tokens only gives up the one asked for');
eq(count(wx_block_ranges($sec, 'nothing')), 0, 'a token the page does not carry gives no range');
eq(wx_block_replace($sec, 'nothing', '<p>x</p>'), $sec, 'and replacing nothing changes nothing');

/* An element that never closes is refused rather than guessed at. */
$broken = '<section data-wx-global="abc123"><p>Nothing closes this';
eq(count(wx_block_ranges($broken, 'abc123')), 0, 'an unclosed element gives no range — the push leaves that page alone');
eq(wx_block_replace($broken, 'abc123', '<section>new</section>'), $broken, 'and does not rewrite the page');

/* Self-closing and void elements inside the section must not unbalance the count. */
$selfclose = '<section data-wx-global="abc123"><img src="/assets/img/a.webp"><br><input type="text"></section>';
[$a, $b] = wx_block_ranges($selfclose, 'abc123')[0];
ok(str_ends_with(substr($selfclose, $a, $b - $a), '</section>'), 'void elements do not end the range early');

/* ---- stamping: the token goes on the block's own root, on the copy that goes into pages */
$block = '<section class="hero"><h1>We build interiors</h1></section>';
$stamped = wx_block_stamp($block, '3f9a2c1b8d4e');
/* The attribute goes immediately after the tag name — v2.1 wrote it there too, and attribute order is
   not meaningful in HTML. What matters is that it lands on the root and only once. */
ok(str_starts_with(trim($stamped), '<section data-wx-global="3f9a2c1b8d4e"'), 'the token is added to the block\'s root element');
ok(str_contains($stamped, 'class="hero"'), 'and the rest of the opening tag is kept');
eq(wx_block_stamp($block, '3f9a2c1b8d4e'), $stamped, 'stamping is idempotent — a pushed page does not collect attributes');
try {
    wx_block_stamp('Just some text, no element', 'abc123');
    ok(false, 'a block that is not a single element should be refused');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'single element'), 'and it is refused in words a person can act on: ' . $e->getMessage());
}

/* ---- the block rules: the library refuses what would become a page's problem */
$clean = wx_block_clean(['name' => '  Services grid  ', 'html' => '<section>' . str_repeat('x', 10) . '</section>', 'cat' => 'Services', 'tags' => 'grid, SERVICES , grid', 'global' => true], null);
eq($clean['name'], 'Services grid', 'a block name is trimmed');
eq($clean['cat'], 'Services', 'a known category is kept');
eq($clean['tags'], 'grid,services', 'tags are lower-cased and deduplicated');
ok(preg_match('~^[a-f0-9]{12}$~', $clean['blk']) === 1, 'a new block gets a 12-hex token — the token that goes into pages');
eq(wx_block_clean(['name' => 'x', 'html' => '<section>y</section>', 'cat' => 'Not A Category'], null)['cat'], 'Custom',
    'an unknown category falls back to Custom rather than failing the save');
$kept = wx_block_clean(['tags' => 'one'], ['blk' => 'abc123abc123', 'name' => 'Old name', 'html' => '<section>old</section>', 'cat' => 'Hero', 'is_global' => 1]);
eq($kept['name'], 'Old name', 'an edit that carries no name keeps the stored one');
eq($kept['blk'], 'abc123abc123', 'and keeps the token, because the pages are carrying it');
ok($kept['is_global'] === 1, 'and keeps being global unless the request says otherwise');
foreach ([
    ['name' => 'x', 'html' => '<script>alert(1)</script>'],
    ['name' => 'x', 'html' => '<div onclick="go()">x</div>'],
    ['name' => 'x', 'html' => '<div style="background:url(javascript:alert(1))">x</div>'],
    ['name' => '', 'html' => '<section>x</section>'],
    ['name' => 'x', 'html' => '<div contenteditable="true">editing</div>'],
] as $i => $bad) {
    try {
        wx_block_clean($bad, null);
        ok(false, 'a block that breaks a rule should be refused (case ' . $i . ')');
    } catch (Throwable $e) {
        ok(true, 'refused: ' . substr($e->getMessage(), 0, 64));
    }
}
try {
    wx_block_clean(['name' => 'Loose text', 'html' => 'Just words', 'global' => true], null);
    ok(false, 'loose text cannot be a global section');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'single element'), 'loose text is refused as a global section: ' . $e->getMessage());
}
ok(wx_block_clean(['name' => 'Loose text', 'html' => 'Just words'], null)['is_global'] === 0,
    'but the same text is a perfectly good library block — a snippet people paste, without a token');

/* TODO-DB: the library table, usage walking the site and the push need migration 013 and the site tree. */
skip('the block library table, usage and the push need migration 013 and the site tree');

/* ============================================ Phase 3 · the page editor and the script rule
   The audit's finding F-05 was that a Manager could paste a script into a page through the builder, and the
   builder previews pages inside an authenticated session. The fix is a rule about *additions*, and these
   tests are the evidence that it is a rule about additions — not a sanitiser that rewrites pages, and not a
   blocklist that a page's own tags trip over. */

$plain = '<!doctype html><html><head><title>About</title></head><body><h1>About us</h1></body></html>';
$withTag = '<!doctype html><html><head><script async src="https://www.googletagmanager.com/gtag/js?id=G-1"></script></head><body><h1>About us</h1></body></html>';

/* Keeping what a page already has is always allowed: editing a headline must not mean rewriting the
   analytics tag. */
eq(wx_code_new_tokens($withTag, $withTag), [], 'a page that keeps its own script adds no tokens');
wx_code_guard($withTag, $withTag, 'admin');
ok(true, 'and a Manager may save it — keeping is not adding');

/* Adding one is not. */
$adds = wx_code_new_tokens($withTag, $plain);
eq(count($adds), 1, 'adding a script tag to a page that had none is one new token');
try {
    wx_code_guard($withTag, $plain, 'admin', ['siteTokens' => []]);
    ok(false, 'a Manager adding a script should be refused');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'Only the owner') && str_contains($e->getMessage(), 'googletagmanager'),
        'a Manager is refused, and the message names the thing to remove: ' . mb_substr($e->getMessage(), 0, 110));
}
wx_code_guard($withTag, $plain, 'owner', ['siteTokens' => []]);
ok(true, 'the owner may add it');
/* And a tag the site already uses elsewhere is the site's, not a privilege — otherwise every new page
   would need the owner to paste the same analytics tag again. */
wx_code_guard($withTag, $plain, 'editor', ['siteTokens' => wx_code_tokens($withTag)]);
ok(true, 'and anybody may add a tag the site already uses somewhere else');

/* The tokens are the exact pieces, so a *different* script is still new. */
$other = str_replace('G-1', 'G-2', $withTag);
eq(count(wx_code_new_tokens($other, $withTag)), 1, 'a different analytics id is a different token, not a repeat');

/* Event handlers, script URLs and embeds are code too — and the encoded forms are the same token. */
$cases = [
    '<div onclick="steal()">x</div>' => 'onclick',
    '<a href="javascript:alert(1)">x</a>' => 'javascript',
    '<a href="java&#115;cript:alert(1)">x</a>' => 'entity-encoded javascript',
    '<a href="jAvA sCrIpT&#58;alert(1)">x</a>' => 'mixed case and an encoded colon',
    '<iframe src="https://example.com"></iframe>' => 'iframe',
    '<meta http-equiv="refresh" content="0;url=https://evil.example.com">' => 'meta refresh',
    '<svg><a xlink:href="javascript:alert(1)">x</a></svg>' => 'xlink:href',
    '<object data="/x"></object>' => 'object',
];
foreach ($cases as $fragment => $what) {
    $html = str_replace('<h1>About us</h1>', '<h1>About us</h1>' . $fragment, $plain);
    $new = wx_code_new_tokens($html, $plain);
    ok(count($new) >= 1, 'adding ' . $what . ' is detected as new code');
    try {
        wx_code_guard($html, $plain, 'admin', ['siteTokens' => []]);
        ok(false, $what . ' should be refused for a Manager');
    } catch (Throwable $e) {
        ok(true, $what . ' is refused for a Manager');
    }
}

/* A paragraph that *talks* about code is text. This is the false-positive half of the rule, and it matters:
   a guard that refuses a blog post about javascript: would be turned off within a week. */
$prose = str_replace('<h1>About us</h1>', '<h1>About us</h1><p>We use javascript: links nowhere, and we never write onclick= handlers. An &lt;iframe&gt; is not allowed either.</p>', $plain);
eq(wx_code_new_tokens($prose, $plain), [], 'text that mentions scripts and handlers is not code');
wx_code_guard($prose, $plain, 'admin', ['siteTokens' => []]);
ok(true, 'and saving it is allowed for anybody');

/* Structured data is data, not code — the site writes its own schema.org blocks by hand. */
$ld = str_replace('</head>', '<script type="application/ld+json">{"@type":"LocalBusiness"}</script></head>', $plain);
eq(wx_code_new_tokens($ld, $plain), [], 'an application/ld+json block is not a script for this rule');

/* ---- the page rules: a document, not a fragment; not somebody's editing session */
wx_page_html_ok($plain);
ok(true, 'a complete document passes');
try {
    wx_page_html_ok('<section>just a fragment</section>');
    ok(false, 'a fragment should be refused');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'complete document'), 'a fragment is refused: ' . mb_substr($e->getMessage(), 0, 80));
}
try {
    wx_page_html_ok(str_replace('<h1>About us</h1>', '<h1 contenteditable="true">About us</h1>', $plain));
    ok(false, 'editor markers should be refused');
} catch (Throwable $e) {
    ok(str_contains($e->getMessage(), 'editor markers'), 'editor markers are refused, and the message says why: ' . mb_substr($e->getMessage(), 0, 80));
}
try {
    wx_page_html_ok('<html><body><div data-wx-ed="1">x</div></body></html>');
    ok(false, 'data-wx-ed should be refused');
} catch (Throwable $e) {
    ok(true, 'the builder\'s own editing marker is refused too');
}

/* TODO-DB: saving, creating and restoring a page need the tables and the site tree. What is asserted above
   is the part that decides whether a save is allowed at all — the part that has to be right before it can
   touch a file. */
skip('saving, creating and restoring pages need migration 010 and the site tree');

/* ============================================================== the site theme */
group('The site theme lands in the stylesheet the site actually loads');

/* The file the live pages read. v2.1's builder wrote `assets/theme.css`, which this site does not have and
   nothing links — a port that wrote it would have looked finished and changed nothing on the site. */
eq(WX_THEME_FILE, 'assets/site.css', 'the theme is written into the stylesheet the pages link');
ok(!is_file(WX_SITE_ROOT . '/assets/theme.css'), 'and not into the theme.css that nothing loads any more');

$css = "/*! Woodex */\n:root{--navy:#0b1b33;--ink:#12212f}\nbody{color:var(--ink)}\nmain h1{font-size:44px}\n";

/* --- v2.1's validation, value for value ------------------------------------------------------------------ */
$clean = wx_theme_clean(['--wx-navy' => '#0b1b33']);
eq($clean['vars']['--wx-navy'], '#0b1b33', 'a colour comes through as chosen');
eq($clean['import'], '', 'no Google font chosen means no import line');
eq($clean['faces'], '', 'and no font files');
eq(wx_theme_clean(['--wx-navy' => '   '])['vars'], [], 'an empty value clears the setting instead of writing a blank');

throws('VALIDATION', 'vars', static fn() => wx_theme_clean(['--wx-navy' => 'navy']), 'a colour must be a hex value');
throws('VALIDATION', 'vars', static fn() => wx_theme_clean(['--wx-navy' => '#0b1b33;} body{display:none']), 'a colour cannot close the block');
throws('VALIDATION', 'vars', static fn() => wx_theme_clean(['--wx-h1' => '44']), 'a size must carry its unit');
throws('VALIDATION', 'vars', static fn() => wx_theme_clean(['--wx-h1' => '44px;} html{display:none']), 'a size cannot close the block either');
throws('VALIDATION', 'vars', static fn() => wx_theme_clean(['--wx-preset' => 'Ink Theme']), 'a preset name is letters, numbers and dashes');
throws('VALIDATION', 'vars', static fn() => wx_theme_clean(['--wx-font' => 'Comic Sans']), 'a font must be one the site can serve');
throws('VALIDATION', 'vars', static fn() => wx_theme_clean(['--wx-navy' => '#0b1b33', '--wx-nope' => '1']), 'a setting that is not in the list is refused');

/* A Google font is a family and a weight list, and the family goes into the import rather than the value. */
$g = wx_theme_clean(['--wx-font' => 'g:Playfair Display:400;700']);
ok(str_contains($g['import'], 'family=Playfair+Display:wght@400;700'), 'a Google font becomes an import URL');
eq($g['vars']['--wx-font'], '"Playfair Display",system-ui,sans-serif', 'and the value stored is the family itself');

/* A self-hosted family brings its own faces; Plus Jakarta Sans is the site's own, so it brings none. */
$localFont = wx_theme_clean(['--wx-font' => 'poppins']);
eq(substr_count($localFont['faces'], '@font-face'), 4, 'a self-hosted family brings four weights');
ok(str_contains($localFont['faces'], '/assets/fonts/poppins-600.woff2'), 'with the file names the site already has');
eq(wx_theme_clean(['--wx-font-head' => 'jakarta'])['faces'], '', 'the site\'s own font needs no faces of its own');

/* --- what the generated block says ----------------------------------------------------------------------- */
$block = wx_theme_block(['--wx-navy' => '#143a5c'], '', '');
ok(str_contains($block, '--wx-navy:#143a5c;'), 'the block carries the value');
ok(str_contains($block, '--navy:var(--wx-navy)'), 'and the alias that makes the site read it');
ok(str_contains($block, '--navy-2:var(--wx-navy)'), 'including the second name v2.1 gave the same colour');

/* v2.1 accepted a surface colour and only used it when a cream was chosen as well — a control that did
   nothing. The surface is aliased on its own here, and the cream still wins when both are set. */
$surface = wx_theme_block(['--wx-surface' => '#f4efe6'], '', '');
ok(str_contains($surface, '--surface:var(--wx-surface)'), 'a surface colour reaches --surface on its own');
$cream = wx_theme_block(['--wx-surface' => '#f4efe6', '--wx-cream' => '#efe6d6'], '', '');
ok(substr_count($cream, '--surface:') === 2 && strpos($cream, '--surface:var(--wx-cream)') > strpos($cream, '--surface:var(--wx-surface)'),
    'and a cream overrides it rather than fighting it');

/* The preset names the set of values; it is not a value the design reads, so it stays out of the CSS. */
$withPreset = wx_theme_block(wx_theme_clean(['--wx-navy' => '#0b1b33', '--wx-preset' => 'ink'])['vars'], '', '');
ok(!str_contains($withPreset, '--wx-preset'), 'the preset name is kept out of the stylesheet');

/* --- applying, reading back, and removing ---------------------------------------------------------------- */
$applied = wx_theme_apply($css, wx_theme_clean(['--wx-navy' => '#143a5c']));
ok(str_starts_with($applied, '/*! Woodex */'), 'the stylesheet keeps its own first byte');
ok(str_contains($applied, ':root{--navy:#0b1b33;--ink:#12212f}'), 'and its own token block, untouched');
ok(str_contains($applied, 'var(--wx-navy)'), 'while adding the chosen value below it');
eq(wx_theme_apply($applied, wx_theme_clean(['--wx-navy' => '#143a5c'])), $applied, 'applying the same settings twice changes nothing');
eq(wx_theme_strip($applied), $css, 'and removing the theme gives the file back byte for byte');
eq(wx_theme_strip(wx_theme_apply($applied, wx_theme_clean(['--wx-navy' => '#143a5c']))), $css, 'including after it has been applied twice');
ok(!str_contains(wx_theme_apply($css, ['vars' => [], 'faces' => '', 'import' => '']), 'wx:theme'), 'clearing every setting leaves no marker behind');

$readBack = wx_theme_vars($applied);
eq($readBack['--wx-navy'], '#143a5c', 'the settings read back out of the file the site is using');
eq(wx_theme_vars($css), [], 'and a stylesheet with no theme block reads back as nothing chosen');
eq(wx_theme_meta($applied)['theme'], true, 'the file is known to carry a theme');
eq(wx_theme_meta($css)['theme'], false, 'and a file without one is not');
ok(wx_theme_balanced($applied), 'the block is balanced');
ok(!wx_theme_balanced("a/* wx:theme:start */\nb"), 'a start marker with no end marker is refused, never guessed at');
ok(!wx_theme_balanced("/* wx:theme:start */a/* wx:theme:end */\n/* wx:theme:start */b/* wx:theme:end */"), 'and two blocks where there should be one is refused as well');

/* The import goes at the top because @import is only valid before any rule; the values go at the end so
   they win by order. Both are marked, so a person reading the file can see what the admin wrote. */
$withImport = wx_theme_apply($css, wx_theme_clean(['--wx-font' => 'g:Inter:400', '--wx-navy' => '#143a5c']));
ok(str_starts_with($withImport, '/* wx:theme:import:start */'), 'the font import comes before every rule');
ok(strpos($withImport, '@import') < strpos($withImport, ':root{--navy:#0b1b33'), 'because the spec requires it there');
ok(strpos($withImport, '/* wx:theme:end */') > strpos($withImport, 'body{color:var(--ink)}'), 'and the values come last, so they win');
eq(wx_theme_strip($withImport), $css, 'the import is removable too');

/* What the screen is told: which tokens are inside the theme, which are not, and whether the file agrees
   with the choice. A screen that showed only one of "chosen" and "live" would be confidently wrong. */
$tokens = wx_theme_tokens();
ok(isset($tokens['--wx-navy'], $tokens['--wx-font-head'], $tokens['--wx-preset']), 'the settings list is v2.1\'s');
eq(count(array_filter($tokens, static fn(array $t) => $t['type'] === 'color')), 13, 'with its thirteen colours');
ok(in_array('--line', wx_theme_untouched(), true), 'and the structural tokens are named as outside the theme');

/* TODO-DB: reading the file, writing it, the record and the history need the site tree and migration 010. */
skip('applying a theme needs the site tree, the version store and the audit table');

/* ============================================================== reaching out to another server */
group('A fetch goes where it is told and nowhere else');

/* Rule 1-3: the URL itself, before anything is resolved. These are v2.1's rules (audit F-06) with the
   reasons written next to them, because a rule about what may be requested is a rule somebody will one day
   want to relax. */
eq(wx_fetch_url_ok('https://www.woodex.pk/assets/img/hero.webp')['ok'], true, 'a public https link is allowed');
eq(wx_fetch_url_ok('https://WWW.Woodex.pk/x.jpg')['host'], 'www.woodex.pk', 'the host is read case-insensitively');
foreach ([
    'http://www.woodex.pk/x.jpg' => 'plain http is refused',
    'https://user:pw@www.woodex.pk/x.jpg' => 'credentials in the link are refused',
    'https://www.woodex.pk:8080/x.jpg' => 'a port other than 443 is refused',
    'https://127.0.0.1/x.jpg' => 'an IPv4 address is refused before it is resolved',
    'https://[::1]/x.jpg' => 'an IPv6 address is refused too',
    'https://localhost/x.jpg' => 'localhost is refused',
    'https://api.local/x.jpg' => '*.local is refused',
    'https://mail.internal/x.jpg' => '*.internal is refused',
    'https://v2.localhost/x.jpg' => '*.localhost is refused',
    'https://not a host/x.jpg' => 'a name that is not a name is refused',
    'ftp://www.woodex.pk/x.jpg' => 'another scheme is refused',
] as $url => $what) {
    eq(wx_fetch_url_ok($url)['ok'], false, $what);
}

/* Rule 4: the address. `::ffff:127.0.0.1` is the one that matters — it is *reserved* rather than private,
   so PHP's own flags pass it, which is exactly how a check like this gets walked around. */
foreach ([
    '8.8.8.8' => true, '1.1.1.1' => true, '2606:4700:4700::1111' => true,
    '127.0.0.1' => false, '10.1.2.3' => false, '172.16.5.5' => false, '192.168.1.1' => false,
    '169.254.169.254' => false, '0.0.0.0' => false, '::1' => false, '::' => false,
    '::ffff:127.0.0.1' => false, '::ffff:169.254.169.254' => false, 'fc00::1' => false, 'fe80::1' => false,
    '' => false, 'not-an-ip' => false,
] as $ip => $allowed) {
    eq(wx_fetch_ip_ok((string) $ip), $allowed, ($allowed ? 'public' : 'internal') . ' address ' . ($ip === '' ? '(empty)' : $ip));
}

/* Rule 6 and the shape check: a JSON answer is not a page to pick sections from, and 3 MB is the limit. */
eq(wx_fetch_html_ok("<div class=\"x\">hi</div>"), true, 'a fragment of HTML counts as a page');
eq(wx_fetch_html_ok('{"ok":true,"data":[]}'), false, 'a JSON answer is not a page');
eq(wx_fetch_html_ok(''), false, 'an empty answer is not a page');
eq(wx_fetch_html_ok(str_repeat('x', WX_FETCH_MAX_HTML + 1)), false, 'and neither is one past the size limit');

/* The transport, with a fake one: the rules are the part that has to be right, and they can be exercised
   without a network call. The map below is "what the world answers", so each test reads as one story. */
$world = static function (array $pages, array $dns = []): array {
    return [
        'resolve' => static fn(string $h): array => isset($dns[$h])
            ? ['ok' => true, 'why' => '', 'ips' => $dns[$h]]
            : ['ok' => true, 'why' => '', 'ips' => ['93.184.216.34']],
        'get' => static fn(string $u, int $max, string $accept): array => $pages[$u]
            ?? ['code' => 0, 'body' => '', 'location' => '', 'type' => ''],
    ];
};

$ok = wx_fetch_https('https://stock.example/photo.jpg', 1024, 'image/*', $world([
    'https://stock.example/photo.jpg' => ['code' => 200, 'body' => 'IMG', 'location' => '', 'type' => 'image/jpeg'],
]));
eq($ok['body'], 'IMG', 'a 200 comes back with its bytes');
eq($ok['hops'], 0, 'and with no redirect used');

/* The important one: a public link that redirects to the cloud metadata address. The first hop is fine, so
   a check that only looked at the first URL would follow this straight into the network it came from. */
throws('VALIDATION', 'url', static fn() => wx_fetch_https('https://stock.example/go', 1024, 'image/*', $world([
    'https://stock.example/go' => ['code' => 302, 'body' => '', 'location' => 'http://169.254.169.254/latest/meta-data/', 'type' => ''],
])), 'a redirect into the cloud metadata address is refused');

/* The same walk-around with a public-looking name whose address is internal: the name passes the URL rules
   and the address does not, and the address is what is checked at every hop. */
throws('VALIDATION', 'url', static fn() => wx_fetch_https('https://stock.example/go', 1024, 'image/*', $world(
    ['https://stock.example/go' => ['code' => 302, 'body' => '', 'location' => 'https://intranet.example/x', 'type' => '']],
    ['intranet.example' => ['10.0.0.5']]
)), 'a redirect to a name that resolves inside the network is refused');
throws('VALIDATION', 'url', static fn() => wx_fetch_https('https://mixed.example/x', 1024, 'image/*', $world(
    [],
    ['mixed.example' => ['93.184.216.34', '10.0.0.5']]
)), 'a name that resolves to a public and a private address is refused');
throws('VALIDATION', 'url', static fn() => wx_fetch_https('https://gone.example/x', 1024, 'image/*', $world(
    [],
    ['gone.example' => []]
)), 'and a name that does not resolve is refused, not guessed at');

/* A chain of redirects is followed to a point, then refused: an endless one holds a request open. */
throws('VALIDATION', 'url', static fn() => wx_fetch_https('https://loop.example/a', 1024, 'image/*', $world([
    'https://loop.example/a' => ['code' => 301, 'body' => '', 'location' => '/b', 'type' => ''],
    'https://loop.example/b' => ['code' => 301, 'body' => '', 'location' => '/c', 'type' => ''],
    'https://loop.example/c' => ['code' => 301, 'body' => '', 'location' => '/d', 'type' => ''],
    'https://loop.example/d' => ['code' => 301, 'body' => '', 'location' => '/e', 'type' => ''],
])), 'a redirect chain longer than three hops is refused');

/* A relative Location is resolved against what was asked for, so a site that redirects within itself works. */
$rel = wx_fetch_https('https://stock.example/a', 1024, 'image/*', $world([
    'https://stock.example/a' => ['code' => 302, 'body' => '', 'location' => '/b.jpg', 'type' => ''],
    'https://stock.example/b.jpg' => ['code' => 200, 'body' => 'IMG', 'location' => '', 'type' => 'image/jpeg'],
]));
eq($rel['url'], 'https://stock.example/b.jpg', 'a relative redirect lands on the resolved address');
eq($rel['hops'], 1, 'and counts as one hop');

throws('VALIDATION', 'url', static fn() => wx_fetch_https('https://stock.example/missing.jpg', 1024, 'image/*', $world([
    'https://stock.example/missing.jpg' => ['code' => 404, 'body' => 'not here', 'location' => '', 'type' => 'text/html'],
])), 'a 404 is refused with the code in the message');
throws('VALIDATION', 'url', static fn() => wx_fetch_https('https://stock.example/empty', 1024, 'image/*', $world([
    'https://stock.example/empty' => ['code' => 200, 'body' => '', 'location' => '', 'type' => 'text/html'],
])), 'an empty answer is refused');
throws('VALIDATION', 'url', static fn() => wx_fetch_https('https://stock.example/huge', 10, 'image/*', $world([
    'https://stock.example/huge' => ['code' => 200, 'body' => str_repeat('x', 50), 'location' => '', 'type' => 'text/plain'],
])), 'an answer past the cap is refused rather than truncated in silence');

/* The two wrappers the routes use: a page must look like a page, and both keep the rules. */
throws('VALIDATION', 'url', static fn() => wx_fetch_page('https://stock.example/api.json', $world([
    'https://stock.example/api.json' => ['code' => 200, 'body' => '{"a":1}', 'location' => '', 'type' => 'application/json'],
])), 'the section picker refuses a JSON answer');
eq(wx_fetch_page('https://stock.example/post', $world([
    'https://stock.example/post' => ['code' => 200, 'body' => '<html><body>x</body></html>', 'location' => '', 'type' => 'text/html'],
]))['hops'], 0, 'and accepts a page, at no more than three hops');


/* ============================================================== placements */
group('A section goes into a page, or the page is left alone');

/* The kinds and their markers: v2.1's own names, because v2.1's admin writes the same markers during the
   cut-over and two conventions would mean two sections appearing where there should be one. */
eq(wx_place_marker('testimonial'), '<!--wx:testimonials-->', 'a review section is marked the way v2.1 marked it');
eq(wx_place_marker('member', true), '<!--/wx:team-->', 'and the team closes with its own marker');
throws('VALIDATION', 'kind', static fn() => wx_place_kind('posts'), 'a kind that does not appear inside a page is refused');

/* Where a section may be placed: an .html file, and not one of the site's own machinery folders. */
ok(wx_place_rel_ok('about/index.html'), 'a page in a folder is a page');
ok(!wx_place_rel_ok('_private/secret.html'), 'a file in the private folder is not');
ok(!wx_place_rel_ok('assets/report.html'), 'nor is anything under assets');
ok(!wx_place_rel_ok('../outside.html'), 'nor is a path that climbs out of the site');

/* --- the reviews section ------------------------------------------------------------------------------- */
$items = [
    ['id' => 1, 'type' => 'testimonial', 'title' => 'Ayesha Khan', 'order' => 1, 'data' => ['text' => 'Quick, tidy, and they explained the price before starting.', 'rating' => 5, 'city' => 'Lahore', 'role' => 'Homeowner', 'photo' => '/assets/img/a.webp']],
    ['id' => 2, 'type' => 'testimonial', 'title' => 'Bilal <script>alert(1)</script>', 'order' => 2, 'data' => ['text' => 'Good work', 'rating' => 4, 'city' => 'Karachi']],
    ['id' => 3, 'type' => 'testimonial', 'title' => 'Nadia Iqbal', 'order' => 3, 'data' => ['text' => 'Second project with them.', 'rating' => 4]],
];
$set = ['kicker' => '', 'heading' => '', 'design' => 'cards', 'max' => 0];

$block = wx_place_block('testimonial', $items, $set);
ok(str_contains($block, '<!--wx:testimonials-->') && str_contains($block, '<!--/wx:testimonials-->'), 'the block is wrapped in the marker pair');
ok(str_contains($block, 'class="wx-tst wx-tst--cards"'), 'and carries the design class the stylesheet keys on');
ok(str_contains($block, 'aria-labelledby="wx-tst-title"') && str_contains($block, 'id="wx-tst-title"'), 'the heading is what labels the section for a screen reader');
ok(str_contains($block, 'aria-label="5 out of 5"'), 'the stars say what they mean out loud');
ok(!str_contains($block, '<script>') && str_contains($block, '&lt;script&gt;'), 'a review title cannot become markup');
ok(str_contains($block, 'wx-av'), 'a review with no photograph gets initials');
ok(str_contains($block, '<img src="/assets/img/a.webp"') && str_contains($block, 'loading="lazy"'), 'and one with a photograph gets the picture, lazily');
eq(substr_count($block, 'class="wx-tst-card'), 3, 'every live review is in the section');

/* The five designs are the ones the studio reviewed in v2.1 — not a new interpretation of them. */
foreach (['cards', 'spotlight', 'slider', 'wall', 'band'] as $d) {
    ok(str_contains(wx_place_block('testimonial', $items, ['design' => $d] + $set), 'wx-tst--' . $d), 'the ' . $d . ' design is the one that was asked for');
}
ok(str_contains(wx_place_block('testimonial', $items, ['design' => 'nope'] + $set), 'wx-tst--cards'), 'a design the list does not know falls back to cards rather than to nothing');
eq(substr_count(wx_place_block('testimonial', $items, ['max' => 2] + $set), 'class="wx-tst-card'), 2, 'a maximum is a maximum');
ok(str_contains(wx_place_block('testimonial', $items, ['design' => 'band'] + $set), '>4.3<'), 'the band shows the average rating');
ok(!str_contains($block, 'wx-tst-avg'), 'and the cards design does not');
eq(wx_place_block('testimonial', [], $set), '', 'no live reviews means no section at all');
eq(wx_place_block('member', [], $set), '', 'and no live people means no team');

/* --- the team ------------------------------------------------------------------------------------------ */
$team = [
    ['id' => 1, 'type' => 'member', 'title' => 'Sara Malik', 'order' => 1, 'data' => ['role' => 'Interior lead', 'featured' => false, 'showContact' => true, 'phone' => '0300 1234567', 'email' => 'sara@woodex.com.pk', 'linkedin' => 'https://www.linkedin.com/in/sara']],
    ['id' => 2, 'type' => 'member', 'title' => 'Omar Riaz', 'order' => 2, 'data' => ['role' => 'Site lead', 'dept' => 'Build', 'featured' => true, 'showContact' => false, 'phone' => '0300 9999999']],
];
$teamBlock = wx_place_block('member', $team, ['kicker' => '', 'heading' => '']);
ok(strpos($teamBlock, 'Omar Riaz') < strpos($teamBlock, 'Sara Malik'), 'the featured person is printed first');
ok(str_contains($teamBlock, 'wx-team-card is-featured'), 'and marked as featured');
ok(str_contains($teamBlock, 'Interior lead &middot; ') || str_contains($teamBlock, 'Interior lead'), 'a role is printed');
ok(str_contains($teamBlock, 'tel:03001234567'), 'a chosen phone number is a call link');
ok(!str_contains($teamBlock, '0300 9999999'), 'an unchosen one is not printed at all');
ok(str_contains($teamBlock, '>LinkedIn</a>'), 'the LinkedIn link is printed whenever there is one');
eq(substr_count($teamBlock, 'mailto:'), 1, 'only the person with an address gets a mail link');

/* --- placing it: replace what is there, insert where it goes, remove when the page is taken off -------- */
$page = "<!doctype html>\n<html><body><main>\n<section class=\"hm-hero\">x</section>\n</main>\n</body></html>";
$applied = wx_place_apply($page, 'testimonial', $block);
eq($applied['plan']['action'], 'insert', 'a page with no section gets one');
eq($applied['plan']['anchor'], 'the end of main content', 'inserted at the end of main, as v2.1 did');
ok(strpos($applied['html'], $block) !== false, 'and the block is in the page verbatim');
ok(strpos($applied['html'], $block) < strpos($applied['html'], '</main>'), 'before the closing main, which is where v2.1 put it');

$again = wx_place_apply($applied['html'], 'testimonial', $block);
eq($again['plan']['action'], 'replace', 'a second push replaces the section rather than adding another');
eq(substr_count($again['html'], '<!--wx:testimonials-->'), 1, 'so there is still exactly one marker');
eq($again['html'], $applied['html'], 'and pushing the same thing again writes the same bytes, so nothing is versioned');

$removed = wx_place_apply($applied['html'], 'testimonial', '');
eq($removed['plan']['action'], 'remove', 'taking the page off the list removes the section');
eq($removed['html'], $page, 'and gives the page back exactly as it was');

/* A page that has the trust strip gets the section above it — v2.1's first anchor. */
$trust = "<html><body><main>\n<section class=\"wx-trust\">trust</section>\n</main></body></html>";
$inTrust = wx_place_apply($trust, 'member', $teamBlock);
eq($inTrust['plan']['anchor'], 'the trust strip', 'a page with a trust strip is anchored on it');
ok(strpos($inTrust['html'], '<!--wx:team-->') < strpos($inTrust['html'], 'wx-trust'), 'and the team goes above it');

/* Two kinds on one page do not eat each other. */
$both = wx_place_apply(wx_place_apply($page, 'testimonial', $block)['html'], 'member', $teamBlock)['html'];
eq(substr_count($both, '<!--wx:testimonials-->'), 1, 'the reviews keep their marker');
eq(substr_count($both, '<!--wx:team-->'), 1, 'and the team keeps its own');
ok(strpos($both, '<!--wx:testimonials-->') < strpos($both, '<!--wx:team-->'), 'in the order they were placed');

/* A page with nowhere to put a section is refused, not appended to the end of the document where nobody
   would ever see it. */
$bare = "<html><body><p>hello</p></body></html>";
eq(wx_place_apply($bare, 'testimonial', $block)['plan']['action'], 'no-anchor', 'a page with no anchor cannot take a section');
eq(wx_place_apply($bare, 'testimonial', $block)['html'], $bare, 'and is left exactly as it was');
eq(wx_place_plan($page, 'testimonial', '')['action'], 'none', 'removing a section that was never there is nothing to do');

/* The excerpt the preview screen shows: a sentence either side, not the whole page. */
$at = (int) wx_place_plan($applied['html'], 'testimonial', $block)['at'];
$ex = wx_place_excerpt($applied['html'], $at);
ok(str_contains($ex['at'], 'wx:testimonials'), 'the preview points at the marker');
ok($ex['before'] !== '' && strlen($ex['before']) <= 200, 'with what comes before it');
ok(strlen($ex['after']) <= 300 && strlen($ex['after']) < strlen($applied['html']), 'and only as much of the page as shows where it lands');

/* --- the settings -------------------------------------------------------------------------------------- */
/* v2.1's shape, kept so the old admin screen reads the same truth during the cut-over: the state carries
   `placements`, one list of pages per kind plus a `<kind>Set` record beside it. The names come from the map
   itself — a kind that is not in it has no marker, and so could not be written into a page at all. */
eq(array_keys(WX_PLACE_KINDS), ['testimonial', 'member'], 'the two kinds are v2.1\'s two kinds');
eq(WX_PLACE_KINDS['testimonial']['marker'], 'testimonials', 'and the key the old admin reads is the one it wrote');
eq(array_keys(WX_PLACE_DESIGNS), ['cards', 'spotlight', 'slider', 'wall', 'band'], 'with the five designs it offered, in its order');
skip('reading and saving placements needs the database (wx_place_state reads, wx_place_save replaces the map)');
skip('the push writes pages through wx_page_write_many and needs the site tree and the database');


/* ============================================================== the legacy bridge's parameter names */
group('A v2.1 caller keeps its own words');

/* v2.1 names a page `path`; the route that reads it says `rel`. Translating is the whole job of this
   function, and getting it wrong is invisible until somebody opens the old page screen. */
eq(wx_legacy_params(['path' => 'rel'], ['path' => 'about/index.html'], []), ['rel' => 'about/index.html'], 'v2.1\'s `path` arrives as the route\'s `rel`');
eq(wx_legacy_params(['path' => 'rel'], [], ['path' => 'insights/a-post/index.html']), ['rel' => 'insights/a-post/index.html'], 'and is found in the query string when the caller sent it there');
eq(wx_legacy_params(['id'], ['id' => '17'], []), ['id' => 17], 'an integer parameter stays an integer');
eq(wx_legacy_params(['id'], [], ['id' => '17']), ['id' => 17], 'from the query too');
throws('VALIDATION', 'path', static fn() => wx_legacy_params(['path' => 'rel'], [], []), 'a missing parameter names the key the caller used, not the route\'s');
throws('VALIDATION', 'id', static fn() => wx_legacy_params(['id'], ['id' => ''], []), 'and an empty id is missing, not zero');

/* The copies v2.1 saved. The name is the caller's, so it is validated as a whole rather than cleaned up. */
ok(wx_page_backup_name_ok('20261013-141530-482.html'), 'a saved copy is named by its stamp');
ok(wx_page_backup_name_ok('20261013-141530.html'), 'with or without milliseconds');
ok(!wx_page_backup_name_ok('../../index.html'), 'a path that climbs out of the backup folder is not a name');
ok(!wx_page_backup_name_ok('index.html'), 'nor is a page');
ok(!wx_page_backup_name_ok('20261013-141530-482.html.bak'), 'nor is a copy of a copy');
eq(wx_page_backup_slug('insights/my-post/index.html'), 'insights_my_post_index_html', 'the folder per page is v2.1\'s own mangling, so its files are still found');
ok(str_ends_with(wx_page_backup_dir('index.html'), '/backups/index_html'), 'and it sits where v2.1 kept it, under _private/backups');
throws('VALIDATION', 'file', static fn() => wx_page_backup_read('index.html', 'nope.html'), 'reading a copy whose name is not a name is refused');
throws('VALIDATION', 'rel', static fn() => wx_page_backup_dir('../outside.html'), 'and a page path is validated before it is turned into a folder');

/* Nothing here touches the network: the default transport is only reached when a route calls it. */
skip('the real transport (wx_fetch_get) needs a network and is exercised on the host');

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
