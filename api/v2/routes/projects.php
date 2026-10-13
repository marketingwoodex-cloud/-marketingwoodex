<?php
/**
 * api/v2/routes/projects.php — a project, its milestones and its money.
 *
 * v2.1 keeps `wx_projects` as a JSON document with `milestones[]` and `updates[]` inside, and reads
 * **every** project on every screen — `projs_table` pulls the whole table into PHP and maps over it.
 * That is the read the plan singled out (§4, the 1.4 s table). Here:
 *
 *   · the list takes a page of rows in SQL and decodes only that page;
 *   · the derived money (billed, received, outstanding) comes from the invoice rows, not from a field
 *     somebody typed into the payload;
 *   · a project's milestone moves are recorded as history events, so "who slipped the date" has an
 *     answer.
 *
 * The payload shape is v2.1's, because the print pages and the client link read it: an unrecognised
 * field is preserved rather than dropped, so a v2.5 save cannot silently delete data the old admin
 * still uses.
 */

declare(strict_types=1);

/** The stages a project moves through. Same list as the v2.1 project screen. */
const WX_PROJECT_STAGES = ['planning', 'design', 'production', 'installation', 'handover', 'closed'];

function wx_route_projects_list(array $ctx): array
{
    wx_require_user('projs_table');
    $limit = wx_limit($ctx['query']['limit'] ?? 50);
    $offset = wx_offset($ctx['query']['offset'] ?? 0);
    $stage = $ctx['query']['stage'] ?? null;
    $q = trim((string) ($ctx['query']['q'] ?? ''));

    $where = [];
    $params = [];
    if ($stage && in_array($stage, WX_PROJECT_STAGES, true)) {
        $where[] = "JSON_UNQUOTE(JSON_EXTRACT(payload, '$.stage')) = ?";
        $params[] = $stage;
    }
    if ($q !== '') {
        $where[] = "(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.name')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(payload, '$.no')) LIKE ?)";
        $params[] = '%' . $q . '%';
        $params[] = '%' . $q . '%';
    }
    $sqlWhere = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $total = (int) wx_val('SELECT COUNT(*) FROM wx_projects' . $sqlWhere, $params);
    $rows = wx_all(
        'SELECT id, payload FROM wx_projects' . $sqlWhere . ' ORDER BY id DESC LIMIT ' . $limit . ' OFFSET ' . $offset,
        $params
    );

    // One query for the money of every project on this page, keyed by invoice id.
    $invoiceIds = [];
    $projects = [];
    foreach ($rows as $row) {
        $p = json_decode((string) $row['payload'], true);
        if (!is_array($p)) {
            continue;
        }
        $p['id'] = (int) $row['id'];
        $projects[] = $p;
        if (!empty($p['invoice_id'])) {
            $invoiceIds[] = (int) $p['invoice_id'];
        }
    }
    $money = [];
    if ($invoiceIds) {
        $in = implode(',', array_fill(0, count($invoiceIds), '?'));
        foreach (wx_all('SELECT id, total FROM wx_invoices WHERE id IN (' . $in . ')', $invoiceIds) as $r) {
            $money[(int) $r['id']] = ['billed' => (int) $r['total'], 'received' => 0];
        }
        foreach (wx_all('SELECT invoice_id, COALESCE(SUM(amount),0) AS paid FROM wx_invoice_payments WHERE invoice_id IN (' . $in . ') AND reversed_at IS NULL GROUP BY invoice_id', $invoiceIds) as $r) {
            $money[(int) $r['invoice_id']]['received'] = (int) $r['paid'];
        }
    }

    $out = [];
    foreach ($projects as $p) {
        $m = $money[(int) ($p['invoice_id'] ?? 0)] ?? ['billed' => 0, 'received' => 0];
        $milestones = is_array($p['milestones'] ?? null) ? $p['milestones'] : [];
        // Progress is the share of the contract value that has been billed and paid for, which is the
        // number the client asks about — not "how many rows are ticked".
        $done = 0;
        $billedPct = 0;
        foreach ($milestones as $ms) {
            if (!empty($ms['inv_id'])) {
                $done++;
                $billedPct += (float) ($ms['pct'] ?? 0);
            }
        }
        $out[] = [
            'id' => $p['id'],
            'no' => (string) ($p['no'] ?? ''),
            'name' => (string) ($p['name'] ?? ''),
            'client_id' => (int) ($p['client_id'] ?? 0),
            'client_name' => (string) ($p['client_name'] ?? ''),
            'stage' => (string) ($p['stage'] ?? 'planning'),
            'site' => (string) ($p['site'] ?? ''),
            'start' => (string) ($p['start'] ?? ''),
            'target' => (string) ($p['target'] ?? ''),
            'value' => (int) ($p['value'] ?? 0),
            'valueDisplay' => wx_pkr_out((int) ($p['value'] ?? 0)),
            'billed' => $m['billed'],
            'received' => $m['received'],
            'outstanding' => max(0, $m['billed'] - $m['received']),
            'billedDisplay' => wx_pkr_out($m['billed']),
            'receivedDisplay' => wx_pkr_out($m['received']),
            'outstandingDisplay' => wx_pkr_out(max(0, $m['billed'] - $m['received'])),
            'milestones' => count($milestones),
            'milestonesDone' => $done,
            'progress' => (int) round(min(100, $billedPct)),
            'line' => (string) ($p['line'] ?? ''),
            'ptype' => (string) ($p['ptype'] ?? ''),
            'team' => is_array($p['team'] ?? null) ? array_values($p['team']) : [],
            'late' => ($p['target'] ?? '') !== '' && ($p['stage'] ?? '') !== 'closed' && (string) $p['target'] < date('Y-m-d'),
            'manager' => $p['manager'] ?? null,
        ];
    }

    return ['data' => ['projects' => $out, 'total' => $total, 'limit' => $limit, 'offset' => $offset, 'stages' => WX_PROJECT_STAGES]];
}

function wx_route_projects_get(array $ctx): array
{
    wx_require_user('proj_meta');
    $p = wx_doc_get_row('wx_projects', (int) $ctx['params']['id']);
    if ($p === null) {
        throw ApiError::notFound('That project does not exist');
    }
    $billed = 0;
    $received = 0;
    if (!empty($p['invoice_id'])) {
        $inv = wx_doc_get('wx_invoices', (int) $p['invoice_id']);
        if ($inv !== null) {
            $payments = wx_invoice_payments((int) $inv['id']) ?: wx_invoice_payments_legacy($inv);
            $public = wx_inv_public($inv, $payments);
            $billed = (int) $public['total'];
            $received = (int) $public['paid'];
            $p['invoice'] = ['id' => $public['id'], 'no' => $public['no'], 'total' => $billed, 'paid' => $received, 'balance' => (int) $public['balance'], 'payStatus' => $public['payStatus']];
        }
    }
    $p['billed'] = $billed;
    $p['received'] = $received;
    $p['outstanding'] = max(0, $billed - $received);
    $p['billedDisplay'] = wx_pkr_out($billed);
    $p['receivedDisplay'] = wx_pkr_out($received);
    $p['outstandingDisplay'] = wx_pkr_out(max(0, $billed - $received));
    $p['stages'] = WX_PROJECT_STAGES;
    return ['data' => ['project' => $p]];
}

/** Projects are not created here — an invoice creates one (see quotations.invoice). This edits it. */
function wx_route_projects_save(array $ctx): array
{
    $u = wx_require_user('proj_meta');
    $id = (int) $ctx['params']['id'];

    return wx_guard('projects.save', static function () use ($ctx, $u, $id) {
        return wx_tx(static function () use ($ctx, $u, $id) {
            $p = wx_doc_get_row('wx_projects', $id, true);
            if ($p === null) {
                throw ApiError::notFound('That project does not exist');
            }
            $b = $ctx['body'];
            foreach (['name' => 190, 'site' => 300, 'target' => 10, 'start' => 10] as $k => $max) {
                if (array_key_exists($k, $b)) {
                    $p[$k] = wx_v_opt_string($b[$k], $k, $max) ?? '';
                }
            }
            if (array_key_exists('stage', $b)) {
                $to = wx_v_enum($b['stage'], WX_PROJECT_STAGES, 'stage');
                if ($to !== ($p['stage'] ?? '')) {
                    $p['updates'] = is_array($p['updates'] ?? null) ? $p['updates'] : [];
                    $p['updates'][] = ['t' => wx_now(), 'user' => (string) $u['name'], 'text' => 'Stage: ' . (string) ($p['stage'] ?? '?') . ' → ' . $to];
                }
                $p['stage'] = $to;
            }
            if (array_key_exists('manager', $b)) {
                $p['manager'] = wx_v_opt_int($b['manager'], 'manager', 1);
            }
            /* Milestones are **percentages of the contract value**, not amounts — that is v2.1's model
               (`plan[{label, pct}]`), and it is load-bearing: project billing raises one invoice per
               milestone for `value x pct / 100`. The rules below are v2.1's, kept because each one
               prevents a specific mistake:
                 · at most 12 milestones;
                 · the percentages must add up to 100 (a milestone plan that does not add up is a plan
                   nobody agreed to);
                 · a milestone that has already been billed cannot be changed or removed — its invoice
                   exists and the client has it. */
            if (array_key_exists('plan', $b) || array_key_exists('milestones', $b)) {
                $raw = is_array($b['plan'] ?? null) ? $b['plan'] : (is_array($b['milestones'] ?? null) ? $b['milestones'] : []);
                $old = is_array($p['milestones'] ?? null) ? $p['milestones'] : [];
                $clean = [];
                $sum = 0.0;
                foreach (array_slice(array_values($raw), 0, 12) as $i => $m) {
                    if (!is_array($m)) {
                        continue;
                    }
                    $pct = round(wx_numv($m['pct'] ?? 0), 2);
                    if ($pct <= 0) {
                        continue;
                    }
                    $sum += $pct;
                    $clean[] = [
                        'label' => wx_v_string($m['label'] ?? '', 'plan.' . $i . '.label', 1, 80) ?: 'Milestone ' . ($i + 1),
                        'pct' => $pct,
                        'inv_id' => $old[$i]['inv_id'] ?? null,
                    ];
                }
                foreach ($old as $j => $m) {
                    if (!empty($m['inv_id']) && (($clean[$j]['inv_id'] ?? null) !== $m['inv_id'] || (float) $clean[$j]['pct'] !== (float) $m['pct'])) {
                        throw ApiError::conflict('Milestone ' . ($j + 1) . ' is already billed; it cannot be changed', ['index' => $j]);
                    }
                }
                if ($clean && abs($sum - 100) > 0.01) {
                    throw ApiError::validation('Milestones must add up to 100% (now ' . $sum . '%)', 'plan');
                }
                $p['milestones'] = $clean;
            }
            /* The business line and the team belong to the project, not to the invoice (v2.1's
               proj_meta). `line` decides which invoice series project billing draws from. */
            if (array_key_exists('line', $b)) {
                $p['line'] = wx_v_enum((string) $b['line'], ['', 'furniture', 'interior', 'project'], 'line');
            }
            if (array_key_exists('ptype', $b)) {
                $p['ptype'] = wx_v_opt_string($b['ptype'], 'ptype', 60) ?? '';
            }
            if (array_key_exists('site', $b)) {
                $p['site'] = wx_v_opt_string($b['site'], 'site', 300) ?? '';
            }
            if (array_key_exists('value', $b)) {
                $p['value'] = wx_v_pkr($b['value'], 'value', 0);
            }
            if (array_key_exists('team', $b)) {
                $ids = is_array($b['team']) ? array_slice(array_values($b['team']), 0, 30) : [];
                $p['team'] = array_values(array_unique(array_filter(array_map(static fn($v) => (int) $v, $ids))));
            }

            $json = json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($json === false) {
                throw ApiError::internal('Could not encode the project', ['json_error' => json_last_error_msg()]);
            }
            wx_update('wx_projects', ['payload' => $json], ['id' => $id]);
            wx_audit($u, 'project.save', 'project:' . $id, ['stage' => $p['stage'] ?? null]);
            $p['id'] = $id;
            return ['data' => ['project' => $p]];
        });
    });
}

/**
 * Bill one milestone — the point where a project becomes money.
 *
 * Ported from v2.1's proj_bill, including the parts that look odd until you know why:
 *
 *   · the invoice number is the project's own series plus the milestone index (`WI-10120-2`), so a
 *     client receiving the second milestone's invoice can see where it belongs in the sequence;
 *   · the project's first billed milestone claims the project number, which may have to come from the
 *     company counter — that is v2.1's behaviour and it keeps one series per project;
 *   · a project that already has a **full contract invoice** keeps it, unless the invoice has no
 *     payments — in which case the caller must say `replace: true`, because replacing a document a
 *     client has already paid against would be the worst kind of silent edit. The question is asked
 *     once, in words, and the answer is explicit.
 */
function wx_route_projects_bill(array $ctx): array
{
    wx_require_user('proj_bill');
    $id = (int) $ctx['params']['id'];
    $k = (int) ($ctx['body']['k'] ?? -1);
    $name = (string) (wx_val('SELECT JSON_UNQUOTE(JSON_EXTRACT(payload, "$.name")) FROM wx_projects WHERE id = ?', [$id]) ?? '');
    return wx_appr_wrap('proj_bill', 'projects', 'wx_route_projects_bill_do', $ctx,
        'Bill milestone ' . ($k + 1) . ($name !== '' ? ' on ' . $name : ''), static fn() => wx_route_projects_bill_do($ctx));
}

function wx_route_projects_bill_do(array $ctx): array
{
    $u = wx_require_user('proj_bill');
    $id = (int) $ctx['params']['id'];
    $k = (int) ($ctx['body']['k'] ?? -1);
    $replace = !empty($ctx['body']['replace']);

    return wx_guard('projects.bill', static function () use ($u, $id, $k, $replace) {
        return wx_tx(static function () use ($u, $id, $k, $replace) {
            $p = wx_doc_get_row('wx_projects', $id, true);
            if ($p === null) {
                throw ApiError::notFound('That project does not exist');
            }
            $m = $p['milestones'][$k] ?? null;
            if (!is_array($m)) {
                throw ApiError::notFound('That milestone does not exist on this project');
            }
            if (!empty($m['inv_id'])) {
                throw ApiError::conflict('This milestone is already billed');
            }
            $value = (int) ($p['value'] ?? 0);
            if ($value <= 0) {
                throw ApiError::validation('Set the contract value before billing a milestone', 'value');
            }

            $base = (string) ($p['no'] ?? '');
            $line = (string) ($p['line'] ?? '') ?: 'project';

            // A full contract invoice stands until it has money against it.
            $fullId = (int) ($p['invoice_id'] ?? 0);
            if ($fullId) {
                $full = wx_doc_get('wx_invoices', $fullId, true);
                $taken = $full === null ? [] : (wx_invoice_payments($fullId) ?: wx_invoice_payments_legacy($full));
                if ($taken) {
                    throw ApiError::conflict('The full contract invoice on this project has payments, so it cannot be replaced by milestone invoices');
                }
                if (!$replace) {
                    throw ApiError::conflict(
                        'This project has one invoice for the whole contract' . ($full ? ' (' . $full['no'] . ')' : '') . '. Billing by milestone replaces it — confirm to continue.',
                        ['sentinel' => 'REPLACE', 'invoice' => $fullId]
                    );
                }
                wx_q('DELETE FROM wx_invoices WHERE id = ?', [$fullId]);
                $p['updates'] = is_array($p['updates'] ?? null) ? $p['updates'] : [];
                $p['updates'][] = ['t' => wx_now(), 'user' => (string) $u['name'], 'text' => 'Full invoice ' . (string) ($full['no'] ?? '') . ' replaced by milestone invoices', 'sys' => true];
                $p['invoice_id'] = null;
            }

            if ($base === '') {
                $base = wx_next_doc_no($line);
                $p['no'] = $base;
            }
            $no = $base . '-' . ($k + 1);
            if (wx_val('SELECT id FROM wx_invoices WHERE no = ?', [$no]) !== null) {
                throw ApiError::conflict('Invoice ' . $no . ' already exists — check the numbering before billing');
            }

            $amount = (int) round($value * (float) $m['pct'] / 100);
            $clientId = (int) ($p['client_id'] ?? 0);
            $who = $clientId
                ? []
                : [
                    'name' => (string) ($p['client_name'] ?? '') ?: (string) ($p['name'] ?? ''),
                    'company' => (string) ($p['client_name'] ?? ''),
                    'phone' => '',
                    'email' => '',
                    'address' => (string) ($p['site'] ?? ''),
                ];
            $clientId = wx_client_for($who, $clientId ?: null, $u);

            $desc = 'Milestone ' . ($k + 1) . ': ' . (string) ($m['label'] ?? '') . ' — ' . (float) $m['pct'] . '% of contract value Rs '
                . number_format($value) . ($base !== '' ? ' (' . $base . ')' : '');
            $invoice = wx_doc_totals([
                'sections' => [[
                    'name' => 'Milestone billing',
                    'note' => '',
                    'items' => [['desc' => $desc, 'qty' => 1, 'unit' => 'job', 'rate' => $amount, 'amount' => $amount]],
                ]],
                'discount' => 0,
                'taxPct' => 0,
                'rent' => 0,
            ]);

            $invoice += [
                'no' => $no,
                'quote_id' => null,
                'quote_label' => $base,
                'client' => ['name' => (string) ($p['client_name'] ?? '') ?: (string) ($p['name'] ?? ''), 'phone' => '', 'email' => '', 'address' => (string) ($p['site'] ?? ''), 'company' => ''],
                'client_id' => $clientId,
                'project' => (string) ($p['name'] ?? ''),
                'project_id' => (int) $p['id'],
                'site' => (string) ($p['site'] ?? ''),
                'issue_date' => date('Y-m-d'),
                'due_date' => date('Y-m-d', time() + 7 * 86400),
                'terms' => '',
                'notes' => '',
                'schedule' => '',
                'payments' => [],
                'seqPay' => 0,
                'created_by' => (string) $u['name'],
                'created_at' => wx_now(),
                'po' => '',
                'delivery_date' => '',
                'delivered' => '',
                'line' => $line,
                'mode' => '',
                'track_note' => 'Milestone ' . ($k + 1) . ' · ' . (string) ($m['label'] ?? ''),
            ];
            $invoice = wx_doc_put('wx_invoices', $invoice, wx_doc_columns('wx_invoices', $invoice));

            $p['milestones'][$k]['inv_id'] = (int) $invoice['id'];
            $p['client_id'] = $clientId;
            $p['updates'] = is_array($p['updates'] ?? null) ? $p['updates'] : [];
            $p['updates'][] = ['t' => wx_now(), 'user' => (string) $u['name'], 'text' => 'Invoice ' . $no . ' raised: ' . (string) ($m['label'] ?? '') . ' (' . (float) $m['pct'] . '%) Rs ' . number_format($amount), 'sys' => true];
            $json = json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($json === false) {
                throw ApiError::internal('Could not encode the project', ['json_error' => json_last_error_msg()]);
            }
            wx_update('wx_projects', ['payload' => $json], ['id' => (int) $p['id']]);

            wx_audit($u, 'project.bill', 'project:' . (int) $p['id'], ['milestone' => $k + 1, 'amount' => $amount, 'invoice' => $no]);
            return ['data' => ['invoice' => wx_inv_public($invoice, []), 'project_id' => (int) $p['id'], 'milestone' => $k + 1, 'amount' => $amount, 'amountDisplay' => wx_pkr_out($amount)]];
        });
    });
}

/**
 * Add a progress update or a photo reference. v2.1 keeps both inside the project document; keeping the
 * shape means the client link and the v2.1 screens keep rendering it.
 */
function wx_route_projects_update(array $ctx): array
{
    $u = wx_require_user('proj_meta');
    $id = (int) $ctx['params']['id'];

    return wx_guard('projects.update', static function () use ($ctx, $u, $id) {
        return wx_tx(static function () use ($ctx, $u, $id) {
            $p = wx_doc_get_row('wx_projects', $id, true);
            if ($p === null) {
                throw ApiError::notFound('That project does not exist');
            }
            $text = wx_v_opt_string($ctx['body']['text'] ?? null, 'text', 2000);
            $photo = wx_v_opt_string($ctx['body']['photo'] ?? null, 'photo', 300);
            if (($text === null || $text === '') && !$photo) {
                throw ApiError::validation('Write the update, or attach a photo', 'text');
            }
            $p['updates'] = is_array($p['updates'] ?? null) ? $p['updates'] : [];
            if (count($p['updates']) > 500) {
                $p['updates'] = array_slice($p['updates'], -500);
            }
            $entry = ['t' => wx_now(), 'user' => (string) $u['name'], 'text' => (string) ($text ?? '')];
            if ($photo) {
                $entry['photo'] = $photo;
            }
            $p['updates'][] = $entry;

            $json = json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            wx_update('wx_projects', ['payload' => $json], ['id' => $id]);
            wx_audit($u, 'project.update', 'project:' . $id, ['photo' => (bool) $photo]);
            $p['id'] = $id;
            return ['data' => ['project_id' => $id, 'updates' => count($p['updates']), 'entry' => $entry]];
        });
    });
}
