<?php
/* Woodex Admin v2.7 — BULK DOCUMENT MANAGER (actions bd_*)
   ---------------------------------------------------------------------------------------------
   Answers one question: "what documents exist for this period, and can I get them out in one go?"
   It does not invent a second document store — every row comes from the table the screen that owns
   it already writes:

     quotes      wx_quotes               via doc_all() + q_pub() from sales-lib.php
     invoices    wx_invoices             via doc_all() + inv_pub() (paid / balance / overdue)
     milestones  wx_region_milestones    progress certificates, joined to wx_region_projects
     expenses    wx_expenses             the v2.7 expense log
     leads       wx_leads                the enquiry book
     activity    wx_activity             the audit trail — owner and manager only

   The period is filtered on each document's own date field (the quote / invoice `date` inside its
   JSON payload, `due_date`, `spent_on`, `created_at`). Documents whose date cannot be parsed are
   reported in `undated` instead of being silently dropped.

   Actions: bd_types (catalogue + counts for the period), bd_pack (the rows themselves). */

const BD_MAX = 2000;

function bd_catalogue(): array {
    return [
        'quotes'     => ['label' => 'Quotations',            'icon' => 'file-text', 'value' => true,  'note' => 'one row per revision; the newest of a family is what the client holds'],
        'invoices'   => ['label' => 'Invoices & receipts',   'icon' => 'receipt',   'value' => true,  'note' => 'with paid, balance and overdue state'],
        'milestones' => ['label' => 'Progress certificates','icon' => 'shield-check', 'value' => true, 'note' => 'regional milestones with weight and approved-by'],
        'expenses'   => ['label' => 'Expense vouchers',      'icon' => 'table',     'value' => true,  'note' => 'the cash book, GST and withholding included'],
        'leads'      => ['label' => 'Enquiries',             'icon' => 'contact',   'value' => true,  'note' => 'the enquiry book with stage and value'],
        'activity'   => ['label' => 'Activity trail',        'icon' => 'activity',  'value' => false, 'note' => 'who changed what — owner and manager only'],
    ];
}

function bd_allowed(string $type, array $u): bool {
    return $type !== 'activity' || in_array($u['role'], ['owner', 'admin'], true);
}

/** from / to / label / preset. Defaults to the current month. */
function bd_period(array $in): array {
    $preset = (string)($in['preset'] ?? 'month');
    $from = (string)($in['from'] ?? ''); $to = (string)($in['to'] ?? '');
    $ok = fn($d) => (bool)preg_match('~^\d{4}-\d{2}-\d{2}$~', $d) && strtotime($d) !== false;
    switch ($preset) {
        case 'prev_month': $from = date('Y-m-01', strtotime('first day of last month')); $to = date('Y-m-t', strtotime($from)); break;
        case 'quarter': $q = (int)ceil(((int)date('n')) / 3); $from = date(sprintf('%d-%02d-01', (int)date('Y'), ($q - 1) * 3 + 1)); $to = date('Y-m-t', strtotime($from . ' +2 month')); break;
        case 'year': $from = date('Y-01-01'); $to = date('Y-12-31'); break;
        case 'custom': if (!$ok($from)) $from = date('Y-m-01'); if (!$ok($to)) $to = date('Y-m-t'); break;
        default: $from = date('Y-m-01'); $to = date('Y-m-t');
    }
    if (!$ok($from)) $from = date('Y-m-01');
    if (!$ok($to)) $to = date('Y-m-t');
    if ($to < $from) { $t = $from; $from = $to; $to = $t; }
    return ['preset' => $preset, 'from' => $from, 'to' => $to,
        'label' => date('j M Y', strtotime($from)) . ' → ' . date('j M Y', strtotime($to))];
}

/** Does a document date (string from a JSON payload) fall inside the period? '' = undated. */
function bd_in_period(string $d, array $p): ?bool {
    $d = trim($d);
    if ($d === '') return null;
    $t = strtotime($d);
    if (!$t) return null;
    return date('Y-m-d', $t) >= $p['from'] && date('Y-m-d', $t) <= $p['to'];
}

/** @return array{columns:string[],rows:array<int,array>,value:float,undated:int,truncated:bool} */
function bd_rows(string $type, array $p, string $status, string $q, array $u): array {
    $out = ['columns' => [], 'rows' => [], 'value' => 0.0, 'undated' => 0, 'truncated' => false];
    $match = function (string $hay, string $needle): bool { return $needle === '' || stripos($hay, $needle) !== false; };

    if ($type === 'quotes') {
        $out['columns'] = ['No', 'Date', 'Client', 'Project', 'Status', 'Total (Rs)'];
        $n = 0;
        foreach (doc_all('wx_quotes') as $x) {
            $r = q_pub($x);
            if ($status !== '' && (string)($r['status'] ?? '') !== $status) continue;
            if (!$match((string)($r['client']['name'] ?? '') . ' ' . (string)($r['no'] ?? '') . ' ' . (string)($r['project'] ?? ''), $q)) continue;
            $in = bd_in_period((string)($r['date'] ?? ''), $p);
            if ($in === null) { $out['undated']++; continue; }
            if (!$in) continue;
            $out['rows'][] = [(string)($r['no'] ?? ''), (string)($r['date'] ?? ''), (string)($r['client']['name'] ?? ''), (string)($r['project'] ?? ''),
                (string)($r['status'] ?? ''), round((float)($r['total'] ?? 0), 2)];
            $out['value'] += (float)($r['total'] ?? 0);
            if (++$n >= BD_MAX) { $out['truncated'] = true; break; }
        }
        return $out;
    }

    if ($type === 'invoices') {
        $out['columns'] = ['No', 'Date', 'Client', 'Total (Rs)', 'Paid (Rs)', 'Balance (Rs)', 'State', 'Due date'];
        $n = 0;
        foreach (doc_all('wx_invoices') as $x) {
            $r = inv_pub($x);
            $state = (string)($r['overdue'] ? 'overdue' : ($r['payStatus'] ?? ($r['status'] ?? 'unpaid')));
            if ($status !== '' && $state !== $status) continue;
            if (!$match((string)($r['client']['name'] ?? '') . ' ' . (string)($r['no'] ?? ''), $q)) continue;
            $in = bd_in_period((string)($r['date'] ?? ''), $p);
            if ($in === null) { $out['undated']++; continue; }
            if (!$in) continue;
            $out['rows'][] = [(string)($r['no'] ?? ''), (string)($r['date'] ?? ''), (string)($r['client']['name'] ?? ''),
                round((float)($r['total'] ?? 0), 2), round((float)($r['paid'] ?? 0), 2), round((float)($r['balance'] ?? 0), 2),
                $state, (string)($r['due_date'] ?? '')];
            $out['value'] += (float)($r['balance'] ?? 0);
            if (++$n >= BD_MAX) { $out['truncated'] = true; break; }
        }
        return $out;
    }

    if ($type === 'milestones') {
        $out['columns'] = ['Project', 'Node', 'Certificate', 'Weight %', 'Amount (Rs)', 'Due', 'Status', 'Approved by', 'Done at'];
        $w = ['m.due_date BETWEEN ? AND ?']; $b = [$p['from'], $p['to']];
        if ($status !== '' && preg_match('~^[a-z_]+$~', $status)) { $w[] = 'm.status = ?'; $b[] = $status; }
        $rows = q('SELECT m.*, p.code AS pcode, p.title AS ptitle FROM wx_region_milestones m
                   LEFT JOIN wx_region_projects p ON p.id = m.project_id
                   WHERE ' . implode(' AND ', $w) . ' ORDER BY m.due_date ASC, m.seq ASC LIMIT ' . BD_MAX, $b)->fetchAll();
        foreach ($rows as $r) {
            $proj = (string)($r['pcode'] ?: ('#' . $r['project_id'])) . ' — ' . (string)($r['ptitle'] ?? '');
            if (!$match($proj . ' ' . (string)$r['name'], $q)) continue;
            $out['rows'][] = [$proj, (string)$r['node'], (string)$r['name'], round((float)$r['weight_pct'], 2), (float)$r['amount'],
                (string)($r['due_date'] ?? ''), (string)$r['status'], (string)($r['approved_by'] ?? ''), (string)($r['done_at'] ?? '')];
            $out['value'] += (float)$r['amount'];
        }
        return $out;
    }

    if ($type === 'expenses') {
        $out['columns'] = ['Date', 'Category', 'Vendor', 'Detail', 'Location', 'Amount (Rs)', 'GST (Rs)', 'Total (Rs)', 'Status', 'Mode'];
        $w = ['spent_on BETWEEN ? AND ?']; $b = [$p['from'], $p['to']];
        if ($status !== '' && preg_match('~^[a-z]+$~', $status)) { $w[] = 'status = ?'; $b[] = $status; }
        $rows = q('SELECT * FROM wx_expenses WHERE ' . implode(' AND ', $w) . ' ORDER BY spent_on ASC, id ASC LIMIT ' . BD_MAX, $b)->fetchAll();
        foreach ($rows as $r) {
            $cat = function_exists('EXP_CATEGORIES') ? (EXP_CATEGORIES[$r['category']] ?? $r['category']) : $r['category'];
            $pay = function_exists('EXP_PAY_MODES') ? (EXP_PAY_MODES[$r['paid_by']] ?? $r['paid_by']) : $r['paid_by'];
            if (!$match($cat . ' ' . (string)$r['vendor'] . ' ' . (string)$r['detail'] . ' ' . (string)$r['note'], $q)) continue;
            $out['rows'][] = [(string)$r['spent_on'], $cat, (string)$r['vendor'], (string)$r['detail'], (string)$r['node'],
                (float)$r['amount'], (float)$r['tax_amt'], round((float)$r['amount'] + (float)$r['tax_amt'], 2), (string)$r['status'], $pay];
            $out['value'] += (float)$r['amount'] + (float)$r['tax_amt'];
        }
        return $out;
    }

    if ($type === 'leads') {
        $out['columns'] = ['Date', 'Name', 'Phone', 'Service', 'Source', 'Stage', 'Value (Rs)'];
        $w = ['DATE(created_at) BETWEEN ? AND ?']; $b = [$p['from'], $p['to']];
        if ($status !== '' && preg_match('~^[a-z_]+$~', $status)) { $w[] = 'stage = ?'; $b[] = $status; }
        $rows = q('SELECT created_at, name, phone, service, source, stage, value FROM wx_leads WHERE ' . implode(' AND ', $w) . '
                   ORDER BY created_at ASC LIMIT ' . BD_MAX, $b)->fetchAll();
        foreach ($rows as $r) {
            if (!$match((string)$r['name'] . ' ' . (string)$r['phone'] . ' ' . (string)$r['service'], $q)) continue;
            $out['rows'][] = [substr((string)$r['created_at'], 0, 10), (string)$r['name'], (string)$r['phone'],
                (string)$r['service'], (string)$r['source'], (string)$r['stage'], (float)$r['value']];
            $out['value'] += (float)$r['value'];
        }
        return $out;
    }

    if ($type === 'activity') {
        $out['columns'] = ['When', 'Who', 'Action', 'Target', 'IP'];
        $w = ['DATE(created_at) BETWEEN ? AND ?']; $b = [$p['from'], $p['to']];
        if ($status !== '' && preg_match('~^[a-z._]+$~', $status)) { $w[] = 'action LIKE ?'; $b[] = $status . '%'; }
        $rows = q('SELECT created_at, user_name, action, target, ip FROM wx_activity WHERE ' . implode(' AND ', $w) . '
                   ORDER BY created_at ASC LIMIT ' . BD_MAX, $b)->fetchAll();
        foreach ($rows as $r) {
            if (!$match((string)$r['user_name'] . ' ' . (string)$r['action'] . ' ' . (string)$r['target'], $q)) continue;
            $out['rows'][] = [(string)$r['created_at'], (string)($r['user_name'] ?? ''), (string)$r['action'], (string)($r['target'] ?? ''), (string)($r['ip'] ?? '')];
        }
        return $out;
    }

    return $out;
}

function bd_actions(string $action, array $in): bool {
    if (strpos($action, 'bd_') !== 0) return false;
    $u = need(['owner', 'admin', 'sales']);

    if ($action === 'bd_types') {
        $p = bd_period($in);
        $cat = bd_catalogue(); $types = [];
        foreach ($cat as $k => $meta) {
            if (!bd_allowed($k, $u)) continue;
            $r = bd_rows($k, $p, '', '', $u);
            $types[] = ['id' => $k, 'label' => $meta['label'], 'icon' => $meta['icon'], 'note' => $meta['note'],
                'value_column' => $meta['value'], 'documents' => count($r['rows']), 'value' => round($r['value'], 2),
                'undated' => $r['undated'], 'truncated' => $r['truncated']];
        }
        out(['ok' => true, 'period' => $p, 'types' => $types,
            'total' => ['documents' => array_sum(array_column($types, 'documents')), 'value' => round(array_sum(array_column($types, 'value')), 2)]]);
    }

    if ($action === 'bd_pack') {
        $p = bd_period($in);
        $want = array_values(array_filter((array)($in['types'] ?? []), 'is_string'));
        if (!$want) fail('Tick at least one document type to build a pack');
        $status = trim((string)($in['status'] ?? ''));
        $q = trim((string)($in['q'] ?? ''));
        $cat = bd_catalogue(); $pack = []; $docs = 0; $value = 0.0; $undated = 0;
        foreach ($want as $k) {
            if (!isset($cat[$k])) fail('Unknown document type “' . substr($k, 0, 20) . '”');
            if (!bd_allowed($k, $u)) fail('The activity trail is for the owner and managers only', 403);
            $r = bd_rows($k, $p, $status, $q, $u);
            $pack[$k] = ['label' => $cat[$k]['label'], 'icon' => $cat[$k]['icon'], 'columns' => $r['columns'],
                'rows' => $r['rows'], 'documents' => count($r['rows']), 'value' => round($r['value'], 2),
                'undated' => $r['undated'], 'truncated' => $r['truncated']];
            $docs += count($r['rows']); $value += $r['value']; $undated += $r['undated'];
        }
        log_act($u, 'bd.pack', $docs . ' document(s) packed for ' . $p['label'] . ' — ' . implode(', ', array_keys($pack)));
        out(['ok' => true, 'period' => $p, 'pack' => $pack,
            'total' => ['documents' => $docs, 'value' => round($value, 2), 'undated' => $undated,
                'types' => count($pack), 'generated_at' => now(), 'by' => (string)$u['name']]]);
    }

    fail('Unknown document action', 404);
    return true;
}
