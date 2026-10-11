<?php
/* Woodex Admin v2.7 — EXPENSE LOG (actions exp_*)
   ---------------------------------------------------------------------------------------------
   The shop's cash book. One row per voucher — board, hardware, polish, glass, transport, site and
   workshop wages, tools, rent, utilities, phone, marketing, software, taxes, professional fees,
   repairs, travel — so the monthly cost of doing business is visible next to what was billed.

   Money is sensitive: every action here needs an owner or a manager. Everyone else gets a 403
   from need() rather than an empty list, so a Sales login cannot infer costs from the shape of a
   response.

   Tables (created by migrate() in api/admin.php and by _database/woodex-expenses.sql):
     wx_expenses          one voucher per row, PKR, GST and withholding recorded separately
     wx_expense_budgets   a monthly cap per category, used for the budget-versus-actual bars

   Conventions kept from the rest of the admin: amounts are pre-tax (`amount`) with `tax_amt`
   computed at `tax_pct` (GST 18 % default), so a vendor bill of Rs 100,000 + GST is stored as
   100,000 / 18 / 18,000 and the cash paid is 118,000. `wht_amt` is money we withheld at source —
   it is part of the bill, it is not paid to the vendor, and it is what gets filed.
   Receipts reuse the media-library path pattern so a voucher can point at a scanned bill. */

const EXP_CATEGORIES = [
    'board' => 'Board & raw material',
    'hardware' => 'Hardware & fittings',
    'polish' => 'Polish, paint & adhesive',
    'glass' => 'Glass, mirrors & acrylic',
    'transport' => 'Transport, fuel & loading',
    'wages' => 'Site labour (daily wages)',
    'workshop' => 'Workshop & machine labour',
    'tools' => 'Machinery, tools & blades',
    'rent' => 'Rent — workshop & showroom',
    'utilities' => 'Electricity, gas & water',
    'phone' => 'Internet & phone',
    'marketing' => 'Marketing & advertising',
    'software' => 'Software & subscriptions',
    'taxes' => 'Taxes & government fees',
    'professional' => 'Professional fees',
    'repairs' => 'Repairs & maintenance',
    'travel' => 'Travel & food',
    'misc' => 'Miscellaneous',
];
const EXP_PAY_MODES = [
    'cash' => 'Cash', 'bank' => 'Bank transfer', 'cheque' => 'Cheque',
    'jazzcash' => 'JazzCash', 'easypaisa' => 'Easypaisa', 'card' => 'Card', 'credit' => 'On credit',
];
const EXP_STATUS = ['paid' => 'Paid', 'pending' => 'Pending approval', 'credit' => 'On credit'];

/** The 12 verified node codes, read from the regional registry so there is one list in the codebase. */
function exp_nodes(): array {
    if (function_exists('rgn_nodes')) {
        $n = rgn_nodes();
        if (is_array($n) && $n) return array_keys($n);
    }
    return ['LHR', 'ISB', 'KHI', 'RWP', 'FSD', 'GRW', 'MUX', 'PSH', 'SKT', 'BWP', 'QTA', 'HYD'];
}

function exp_meta(): array {
    return ['categories' => EXP_CATEGORIES, 'pay' => EXP_PAY_MODES, 'status' => EXP_STATUS, 'nodes' => exp_nodes()];
}

/** Month filter → a half-open date range, so the index on spent_on is actually used. */
function exp_range(array $in): array {
    $m = (string)($in['month'] ?? '');
    if (!preg_match('~^\d{4}-\d{2}$~', $m)) $m = date('Y-m');
    [$y, $mo] = array_map('intval', explode('-', $m));
    $from = sprintf('%04d-%02d-01', $y, $mo);
    $to = date('Y-m-t', strtotime($from));
    return [$m, $from, $to];
}

function exp_month_prev(string $month): string {
    return date('Y-m', strtotime($month . '-01 -1 month'));
}

function exp_where(array $in, array &$p): string {
    $w = ['spent_on BETWEEN ? AND ?'];
    [, $from, $to] = exp_range($in);
    $p[] = $from; $p[] = $to;
    $cat = (string)($in['cat'] ?? '');
    if ($cat !== '' && isset(EXP_CATEGORIES[$cat])) { $w[] = 'category = ?'; $p[] = $cat; }
    $node = (string)($in['node'] ?? '');
    if ($node !== '' && in_array($node, exp_nodes(), true)) { $w[] = 'node = ?'; $p[] = $node; }
    $st = (string)($in['status'] ?? '');
    if ($st !== '' && isset(EXP_STATUS[$st])) { $w[] = 'status = ?'; $p[] = $st; }
    $pay = (string)($in['pay'] ?? '');
    if ($pay !== '' && isset(EXP_PAY_MODES[$pay])) { $w[] = 'paid_by = ?'; $p[] = $pay; }
    $qq = trim((string)($in['q'] ?? ''));
    if ($qq !== '') { $w[] = '(vendor LIKE ? OR detail LIKE ? OR note LIKE ? OR project LIKE ?)'; $like = '%' . $qq . '%'; array_push($p, $like, $like, $like, $like); }
    return implode(' AND ', $w);
}

function exp_row(array $r): array {
    return [
        'id' => (int)$r['id'], 'spent_on' => (string)$r['spent_on'], 'category' => (string)$r['category'],
        'cat_label' => EXP_CATEGORIES[$r['category']] ?? $r['category'], 'node' => (string)$r['node'],
        'vendor' => (string)$r['vendor'], 'detail' => (string)$r['detail'],
        'amount' => (float)$r['amount'], 'tax_pct' => (float)$r['tax_pct'], 'tax_amt' => (float)$r['tax_amt'],
        'wht_amt' => (float)$r['wht_amt'], 'total' => round((float)$r['amount'] + (float)$r['tax_amt'], 2),
        'paid_by' => (string)$r['paid_by'], 'pay_label' => EXP_PAY_MODES[$r['paid_by']] ?? $r['paid_by'],
        'status' => (string)$r['status'], 'project' => (string)$r['project'], 'receipt' => (string)$r['receipt'],
        'recurring' => (int)$r['recurring'], 'note' => (string)$r['note'],
        'created_by' => (string)$r['created_by'], 'created_at' => (string)$r['created_at'],
    ];
}

/** Accepts only a path inside the media library — the same rule the logos and media screens use. */
function exp_receipt(string $p): string {
    $p = trim($p);
    if ($p === '') return '';
    if (!preg_match('~^/assets/(uploads|img)/[\w./-]+\.(webp|png|jpe?g|gif|svg|pdf)$~i', $p)) return '';
    if (strpos($p, '..') !== false) return '';
    return mb_substr($p, 0, 190);
}

function exp_clean(array $in): array {
    $d = trim((string)($in['spent_on'] ?? ''));
    if (!preg_match('~^\d{4}-\d{2}-\d{2}$~', $d) || strtotime($d) === false) fail('Pick the date the money was spent');
    $cat = (string)($in['category'] ?? '');
    if (!isset(EXP_CATEGORIES[$cat])) fail('Pick a category');
    $node = (string)($in['node'] ?? '');
    if (!in_array($node, exp_nodes(), true)) fail('Pick one of the 12 office locations');
    $amount = round((float)($in['amount'] ?? 0), 2);
    if ($amount <= 0) fail('Enter the amount — vouchers without an amount cannot be logged');
    if ($amount > 100000000) fail('That amount looks wrong (over Rs 10,00,00,000). Split the voucher.');
    $taxPct = (float)($in['tax_pct'] ?? 0);
    if ($taxPct < 0 || $taxPct > 30) fail('GST is between 0 % and 30 %');
    $wht = round((float)($in['wht_amt'] ?? 0), 2);
    if ($wht < 0 || $wht > $amount) fail('The withheld amount cannot be more than the bill itself');
    $pay = (string)($in['paid_by'] ?? 'cash');
    if (!isset(EXP_PAY_MODES[$pay])) $pay = 'cash';
    $st = (string)($in['status'] ?? 'paid');
    if (!isset(EXP_STATUS[$st])) $st = 'paid';
    return [
        'spent_on' => $d, 'category' => $cat, 'node' => $node,
        'vendor' => mb_substr(trim(strip_tags((string)($in['vendor'] ?? ''))), 0, 160),
        'detail' => mb_substr(trim(strip_tags((string)($in['detail'] ?? ''))), 0, 255),
        'amount' => $amount, 'tax_pct' => $taxPct, 'tax_amt' => round($amount * $taxPct / 100, 2),
        'wht_amt' => $wht, 'paid_by' => $pay, 'status' => $st,
        'project' => mb_substr(trim(strip_tags((string)($in['project'] ?? ''))), 0, 40),
        'receipt' => exp_receipt((string)($in['receipt'] ?? '')),
        'recurring' => !empty($in['recurring']) ? 1 : 0,
        'note' => mb_substr(trim(strip_tags((string)($in['note'] ?? ''))), 0, 255),
    ];
}

function exp_get(int $id): ?array {
    if ($id <= 0) return null;
    $s = q('SELECT * FROM wx_expenses WHERE id = ?', [$id]);
    $r = $s->fetch(PDO::FETCH_ASSOC);
    return $r ? exp_row($r) : null;
}

function exp_kpis_calc(array $in): array {
    [$month, $from, $to] = exp_range($in);
    $tot = q('SELECT COUNT(*) n, COALESCE(SUM(amount),0) a, COALESCE(SUM(tax_amt),0) t, COALESCE(SUM(wht_amt),0) w
              FROM wx_expenses WHERE spent_on BETWEEN ? AND ?', [$from, $to])->fetch(PDO::FETCH_ASSOC);
    $st = function (string $s) use ($from, $to): array {
        $r = q('SELECT COUNT(*) n, COALESCE(SUM(amount + tax_amt),0) v FROM wx_expenses WHERE spent_on BETWEEN ? AND ? AND status = ?',
            [$from, $to, $s])->fetch(PDO::FETCH_ASSOC);
        return ['n' => (int)$r['n'], 'value' => round((float)$r['v'], 2)];
    };
    $rec = q('SELECT COALESCE(SUM(amount),0) v, COUNT(*) n FROM wx_expenses WHERE spent_on BETWEEN ? AND ? AND recurring = 1',
        [$from, $to])->fetch(PDO::FETCH_ASSOC);
    $byCat = [];
    foreach (q('SELECT category, COUNT(*) n, COALESCE(SUM(amount),0) a, COALESCE(SUM(tax_amt),0) t
                FROM wx_expenses WHERE spent_on BETWEEN ? AND ? GROUP BY category ORDER BY a DESC', [$from, $to])->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $byCat[] = ['key' => $r['category'], 'label' => EXP_CATEGORIES[$r['category']] ?? $r['category'],
            'n' => (int)$r['n'], 'amount' => round((float)$r['a'], 2), 'tax' => round((float)$r['t'], 2)];
    }
    $byNode = [];
    foreach (q('SELECT node, COUNT(*) n, COALESCE(SUM(amount),0) a FROM wx_expenses WHERE spent_on BETWEEN ? AND ?
                GROUP BY node ORDER BY a DESC', [$from, $to])->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $byNode[] = ['key' => $r['node'], 'n' => (int)$r['n'], 'amount' => round((float)$r['a'], 2)];
    }
    $caps = [];
    foreach (q('SELECT category, cap_month FROM wx_expense_budgets')->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $caps[$r['category']] = (float)$r['cap_month'];
    }
    $daysIn = (int)date('t', strtotime($from));
    $isThisMonth = $month === date('Y-m');
    $day = $isThisMonth ? (int)date('j') : $daysIn;
    $sum = round((float)$tot['a'], 2);
    $avg = $day > 0 ? $sum / $day : 0;
    return [
        'month' => $month, 'from' => $from, 'to' => $to, 'days' => $daysIn, 'day' => $day,
        'count' => (int)$tot['n'], 'sum' => $sum, 'tax' => round((float)$tot['t'], 2), 'wht' => round((float)$tot['w'], 2),
        'with_tax' => round($sum + (float)$tot['t'], 2),
        'pending' => $st('pending'), 'credit' => $st('credit'), 'paid' => $st('paid'),
        'recurring' => ['value' => round((float)$rec['v'], 2), 'n' => (int)$rec['n']],
        'avg_day' => round($avg, 2), 'projected' => round($avg * $daysIn, 2),
        'by_cat' => $byCat, 'by_node' => $byNode, 'caps' => $caps,
        'top' => $byCat ? $byCat[0] : null,
        'over_budget' => array_values(array_filter($byCat, function ($c) use ($caps) {
            return isset($caps[$c['key']]) && $caps[$c['key']] > 0 && $c['amount'] > $caps[$c['key']];
        })),
        'meta' => exp_meta(),
    ];
}

function exp_actions(string $action, array $in): bool {
    if (strpos($action, 'exp_') !== 0) return false;
    $u = need(['owner', 'admin']);

    if ($action === 'exp_list') {
        $p = [];
        $where = exp_where($in, $p);
        $limit = max(1, min(1000, (int)($in['limit'] ?? 400)));
        $rows = q('SELECT * FROM wx_expenses WHERE ' . $where . ' ORDER BY spent_on DESC, id DESC LIMIT ' . $limit, $p)
            ->fetchAll(PDO::FETCH_ASSOC);
        $sum = 0; $tax = 0;
        $out = [];
        foreach ($rows as $r) { $x = exp_row($r); $sum += $x['amount']; $tax += $x['tax_amt']; $out[] = $x; }
        [, $from, $to] = exp_range($in);
        out(['ok' => true, 'items' => $out, 'count' => count($out),
            'totals' => ['amount' => round($sum, 2), 'tax' => round($tax, 2), 'with_tax' => round($sum + $tax, 2)],
            'range' => ['month' => $in['month'] ?? date('Y-m'), 'from' => $from, 'to' => $to],
            'meta' => exp_meta()]);
    }

    if ($action === 'exp_kpis') out(['ok' => true, 'kpis' => exp_kpis_calc($in)]);

    if ($action === 'exp_get') {
        $row = exp_get((int)($in['id'] ?? 0));
        if (!$row) fail('That voucher is no longer there', 404);
        out(['ok' => true, 'item' => $row, 'meta' => exp_meta()]);
    }

    if ($action === 'exp_save') {
        $d = exp_clean($in);
        $id = (int)($in['id'] ?? 0);
        if ($id > 0) {
            if (!exp_get($id)) fail('That voucher is no longer there', 404);
            q('UPDATE wx_expenses SET spent_on=?, category=?, node=?, vendor=?, detail=?, amount=?, tax_pct=?, tax_amt=?,
               wht_amt=?, paid_by=?, status=?, project=?, receipt=?, recurring=?, note=?, updated_at=? WHERE id=?',
                [$d['spent_on'], $d['category'], $d['node'], $d['vendor'], $d['detail'], $d['amount'], $d['tax_pct'], $d['tax_amt'],
                 $d['wht_amt'], $d['paid_by'], $d['status'], $d['project'], $d['receipt'], $d['recurring'], $d['note'], now(), $id]);
            log_act($u, 'exp.save', 'updated voucher #' . $id . ' — ' . EXP_CATEGORIES[$d['category']] . ' Rs ' . number_format($d['amount'], 2));
        } else {
            q('INSERT INTO wx_expenses (spent_on, category, node, vendor, detail, amount, tax_pct, tax_amt, wht_amt, paid_by,
               status, project, receipt, recurring, note, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [$d['spent_on'], $d['category'], $d['node'], $d['vendor'], $d['detail'], $d['amount'], $d['tax_pct'], $d['tax_amt'],
                 $d['wht_amt'], $d['paid_by'], $d['status'], $d['project'], $d['receipt'], $d['recurring'], $d['note'],
                 (string)$u['name'], now()]);
            $id = (int)db()->lastInsertId();
            log_act($u, 'exp.save', 'logged ' . EXP_CATEGORIES[$d['category']] . ' Rs ' . number_format($d['amount'], 2) . ' (' . $d['node'] . ')');
        }
        out(['ok' => true, 'item' => exp_get($id)]);
    }

    if ($action === 'exp_duplicate') {
        $src = exp_get((int)($in['id'] ?? 0));
        if (!$src) fail('That voucher is no longer there', 404);
        q('INSERT INTO wx_expenses (spent_on, category, node, vendor, detail, amount, tax_pct, tax_amt, wht_amt, paid_by,
           status, project, receipt, recurring, note, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [$src['spent_on'], $src['category'], $src['node'], $src['vendor'], $src['detail'], $src['amount'], $src['tax_pct'],
             $src['tax_amt'], $src['wht_amt'], $src['paid_by'], 'pending', $src['project'], $src['receipt'], 0,
             $src['note'], (string)$u['name'], now()]);
        $id = (int)db()->lastInsertId();
        log_act($u, 'exp.save', 'copied voucher #' . $src['id'] . ' to a new pending voucher #' . $id);
        out(['ok' => true, 'item' => exp_get($id)]);
    }

    if ($action === 'exp_del') {
        $id = (int)($in['id'] ?? 0);
        $row = exp_get($id);
        if (!$row) fail('That voucher is already gone', 404);
        q('DELETE FROM wx_expenses WHERE id = ?', [$id]);
        log_act($u, 'exp.del', 'deleted ' . $row['cat_label'] . ' Rs ' . number_format($row['amount'], 2) . ' dated ' . $row['spent_on']);
        out(['ok' => true, 'id' => $id]);
    }

    if ($action === 'exp_budget_save') {
        $caps = (array)($in['caps'] ?? []);
        $n = 0;
        foreach ($caps as $cat => $v) {
            if (!isset(EXP_CATEGORIES[$cat])) continue;
            $v = round((float)$v, 2);
            if ($v < 0) continue;
            if ($v == 0) { q('DELETE FROM wx_expense_budgets WHERE category = ?', [$cat]); continue; }
            q('INSERT INTO wx_expense_budgets (category, cap_month, updated_at) VALUES (?,?,?)
               ON DUPLICATE KEY UPDATE cap_month = VALUES(cap_month), updated_at = VALUES(updated_at)', [$cat, $v, now()]);
            $n++;
        }
        log_act($u, 'exp.budget', $n . ' monthly category cap' . ($n === 1 ? '' : 's') . ' saved');
        out(['ok' => true, 'kpis' => exp_kpis_calc($in)]);
    }

    if ($action === 'exp_recurring_copy') {
        [$month] = exp_range($in);
        $from = exp_month_prev($month);
        $src = q('SELECT * FROM wx_expenses WHERE recurring = 1 AND spent_on BETWEEN ? AND ?', [$from . '-01', date('Y-m-t', strtotime($from . '-01'))])
            ->fetchAll(PDO::FETCH_ASSOC);
        $added = 0; $skipped = 0;
        foreach ($src as $r) {
            $day = (int)date('j', strtotime($r['spent_on']));
            $target = sprintf('%s-%02d', $month, min($day, (int)date('t', strtotime($month . '-01'))));
            $dup = q('SELECT id FROM wx_expenses WHERE recurring = 1 AND category = ? AND amount = ? AND vendor = ? AND spent_on BETWEEN ? AND ?',
                [$r['category'], $r['amount'], $r['vendor'], $month . '-01', date('Y-m-t', strtotime($month . '-01'))])->fetch(PDO::FETCH_ASSOC);
            if ($dup) { $skipped++; continue; }
            q('INSERT INTO wx_expenses (spent_on, category, node, vendor, detail, amount, tax_pct, tax_amt, wht_amt, paid_by,
               status, project, receipt, recurring, note, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [$target, $r['category'], $r['node'], $r['vendor'], $r['detail'], $r['amount'], $r['tax_pct'], $r['tax_amt'],
                 $r['wht_amt'], $r['paid_by'], 'pending', $r['project'], '', 1, 'Copied from ' . $from,
                 (string)$u['name'], now()]);
            $added++;
        }
        log_act($u, 'exp.copy', $added . ' recurring voucher' . ($added === 1 ? '' : 's') . ' copied into ' . $month . ' (' . $skipped . ' already there)');
        out(['ok' => true, 'added' => $added, 'skipped' => $skipped, 'from' => $from, 'month' => $month, 'kpis' => exp_kpis_calc($in)]);
    }

    fail('Unknown expense action', 404);
    return true;
}
