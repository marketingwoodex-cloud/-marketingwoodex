<?php
/**
 * Woodex v2.6 — REGIONAL OPERATIONS library.
 * Included by api/admin.php (and therefore by api/mcp.php in WX_LIB_ONLY mode).
 *
 * Scope
 *   · Node registry read from /_templates/region-nodes.json, edited through the
 *     admin (overrides land in /_private/region-nodes.json, never web-readable).
 *   · Timber variant matrix read from /_templates/region-variants.json.
 *   · Node-scoped KPIs, lead / project / ledger / milestone queries — every query
 *     in this file carries the mandatory routing parameter and validates it
 *     against exactly one verified municipal node directory.
 *   · Board-foot / running-foot specification engine: floor-plan dimensions to
 *     quotation line items, including waste tolerance and regional fabrication
 *     labour rates. Board foot = (t_in × w_in × len_ft) / 12.
 *   · Quotation hand-off into the existing wx_quotes document store (sales-lib)
 *     so client links, versions and invoicing keep working unchanged.
 *
 * Actions: rgn_boot rgn_nodes rgn_node_save rgn_kpis rgn_leads rgn_projects
 *          rgn_project_get rgn_project_save rgn_milestones rgn_milestone_save
 *          rgn_milestone_approve rgn_ledger rgn_ledger_save rgn_estimate
 *          rgn_quote rgn_rates rgn_rate_save rgn_rate_sync rgn_variants
 *          rgn_variant_save rgn_reports rgn_health rgn_export
 */
declare(strict_types=1);
if (!defined('PRIVATE_DIR')) { http_response_code(404); exit; }

const RGN_NODES_TPL    = ROOT_DIR . '/_templates/region-nodes.json';
const RGN_VARIANTS_TPL = ROOT_DIR . '/_templates/region-variants.json';
const RGN_OVR_FILE     = PRIVATE_DIR . '/region-nodes.json';    // admin node edits
const RGN_EST_LOG      = PRIVATE_DIR . '/region-estimates.jsonl';
const RGN_SCHEMA_VER   = '2.6.0';
const RGN_MAX_PANELS   = 400;

/* ------------------------------------------------------------------ registry */

/** Template registry (verified directories) merged with admin overrides. */
function rgn_nodes(bool $activeOnly = false): array {
    static $cache = null;
    if ($cache === null) {
        $tpl = jread(RGN_NODES_TPL);
        $ovr = jread(RGN_OVR_FILE);
        $list = [];
        foreach ((array)($tpl['nodes'] ?? []) as $n) {
            if (!is_array($n) || empty($n['code']) || empty($n['dir'])) continue;
            $code = strtoupper(substr((string)$n['code'], 0, 8));
            $o = is_array($ovr[$code] ?? null) ? $ovr[$code] : [];
            $list[$code] = $n + ['code' => $code];
            foreach (['labour_index', 'waste_pct', 'lead_time_days', 'tax_pct', 'advance_pct', 'active', 'sort'] as $k)
                if (array_key_exists($k, $o)) $list[$code][$k] = $o[$k];
            $list[$code]['tax_pct']      = max(0, min(30, (float)($list[$code]['tax_pct'] ?? 18)));
            $list[$code]['advance_pct']  = max(0, min(100, (float)($list[$code]['advance_pct'] ?? 40)));
            $list[$code]['waste_pct']    = max(0, min(30, (float)($list[$code]['waste_pct'] ?? 12)));
            $list[$code]['labour_index'] = max(0.5, min(2.0, (float)($list[$code]['labour_index'] ?? 1)));
            $list[$code]['active']       = (int)($list[$code]['active'] ?? 1) === 1 ? 1 : 0;
        }
        uasort($list, function ($a, $b) { return ((int)$a['sort']) <=> ((int)$b['sort']); });
        $cache = $list;
    }
    if (!$activeOnly) return $cache;
    return array_filter($cache, function ($n) { return !empty($n['active']); });
}

function rgn_codes(): array { return array_keys(rgn_nodes()); }

/** Strict routing check: the code must resolve to exactly one verified node. */
function rgn_node(string $code): array {
    $code = strtoupper(trim($code));
    $all = rgn_nodes();
    if ($code === '' || !isset($all[$code])) fail('Routing parameter "' . substr($code, 0, 8) . '" is not one of the 12 operation nodes (' . implode(', ', rgn_codes()) . ')');
    return $all[$code];
}

function rgn_areas(string $code): array {
    $n = rgn_node($code); $out = [];
    foreach ((array)($n['areas'] ?? []) as $a) if (is_array($a)) $out[strtoupper((string)($a['code'] ?? ''))] = (string)($a['name'] ?? '');
    return $out;
}

function rgn_variants(): array {
    static $v = null;
    if ($v === null) { $t = jread(RGN_VARIANTS_TPL); $v = is_array($t) ? $t : []; }
    return $v;
}

/** Layout presets (5 marla … farmhouse) from the node registry template. */
function rgn_layouts(): array {
    static $l = null;
    if ($l === null) { $t = jread(RGN_NODES_TPL); $l = (array)($t['layout_specs'] ?? []); }
    return $l;
}

function rgn_presets(): array {
    return [
        ['key' => 'today',  'label' => 'Today'],
        ['key' => 'yday',   'label' => 'Yesterday'],
        ['key' => '7d',     'label' => 'Last 7 days'],
        ['key' => '30d',    'label' => 'Last 30 days'],
        ['key' => 'mtd',    'label' => 'Month to date'],
        ['key' => 'qtd',    'label' => 'Quarter to date'],
        ['key' => 'ytd',    'label' => 'Year to date'],
        ['key' => 'custom', 'label' => 'Custom range'],
    ];
}

/** Date-slicer window: preset or from/to, plus the comparison window. */
function rgn_window(array $in): array {
    $preset = (string)($in['preset'] ?? '30d');
    if (!in_array($preset, array_column(rgn_presets(), 'key'), true)) $preset = '30d';
    $from = preg_match('~^\d{4}-\d{2}-\d{2}$~', (string)($in['from'] ?? '')) ? (string)$in['from'] : '';
    $to   = preg_match('~^\d{4}-\d{2}-\d{2}$~', (string)($in['to'] ?? '')) ? (string)$in['to'] : '';
    if ($preset === 'custom' && $from && $to) {
        /* keep the supplied range */
    } else {
        $to = date('Y-m-d');
        switch ($preset) {
            case 'today': $from = $to; break;
            case 'yday':  $from = $to = date('Y-m-d', strtotime('-1 day')); break;
            case '7d':    $from = date('Y-m-d', strtotime('-6 days')); break;
            case '30d':   $from = date('Y-m-d', strtotime('-29 days')); break;
            case 'mtd':   $from = date('Y-m-01'); break;
            case 'qtd':   $q = (int)floor(((int)date('n') - 1) / 3); $from = date('Y-m-d', mktime(0, 0, 0, $q * 3 + 1, 1, (int)date('Y'))); break;
            case 'ytd':   $from = date('Y-01-01'); break;
            default:      $from = date('Y-m-d', strtotime('-29 days'));
        }
    }
    if ($from > $to) { $t = $from; $from = $to; $to = $t; }
    $days = (int)((strtotime($to) - strtotime($from)) / 86400) + 1;
    $pTo = date('Y-m-d', strtotime($from . ' -1 day'));
    $pFrom = date('Y-m-d', strtotime($pTo . ' -' . ($days - 1) . ' days'));
    $bucket = $days <= 1 ? 'hour' : ($days <= 62 ? 'day' : ($days <= 400 ? 'week' : 'month'));
    if (in_array((string)($in['bucket'] ?? ''), ['day', 'week', 'month'], true)) $bucket = (string)$in['bucket'];
    return ['preset' => $preset, 'from' => $from, 'to' => $to, 'days' => $days,
        'prev_from' => $pFrom, 'prev_to' => $pTo, 'bucket' => $bucket,
        'label' => $from === $to ? date('d M Y', strtotime($from)) : date('d M Y', strtotime($from)) . ' → ' . date('d M Y', strtotime($to))];
}

/** Axis buckets for the spark charts. */
function rgn_axis(array $w): array {
    $out = []; $t = strtotime($w['from']); $end = strtotime($w['to']);
    if ($w['bucket'] === 'hour') return [$w['from']];
    if ($w['bucket'] === 'week') $t = strtotime('monday this week', $t);
    if ($w['bucket'] === 'month') $t = strtotime(date('Y-m-01', $t));
    $guard = 0;
    while ($t <= $end && $guard++ < 1200) {
        if ($w['bucket'] === 'day')   { $out[] = date('Y-m-d', $t); $t = strtotime('+1 day', $t); }
        if ($w['bucket'] === 'week')  { $out[] = date('Y-m-d', $t); $t = strtotime('+7 days', $t); }
        if ($w['bucket'] === 'month') { $out[] = date('Y-m-01', $t); $t = strtotime('+1 month', $t); }
    }
    return $out ?: [$w['from']];
}

/* ------------------------------------------------------------------ helpers */

function rgn_have(string $table): bool {
    static $cache = [];
    if (!array_key_exists($table, $cache)) {
        try { $cache[$table] = (bool)q('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [$table])->fetchColumn(); }
        catch (Throwable $e) { $cache[$table] = false; }
    }
    return $cache[$table];
}
function rgn_have_col(string $table, string $col): bool {
    static $cache = [];
    $k = $table . '.' . $col;
    if (!array_key_exists($k, $cache)) {
        try { $cache[$k] = (bool)q('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', [$table, $col])->fetchColumn(); }
        catch (Throwable $e) { $cache[$k] = false; }
    }
    return $cache[$k];
}
/** Selected nodes; an empty selection means every active node. Each code is validated. */
function rgn_sel(array $in): array {
    $raw = $in['nodes'] ?? [];
    if (is_string($raw)) $raw = array_filter(array_map('trim', explode(',', $raw)));
    $codes = [];
    foreach ((array)$raw as $c) { $n = rgn_node((string)$c); $codes[] = $n['code']; }
    if (!$codes) $codes = array_keys(rgn_nodes(true));
    return array_values(array_unique($codes));
}
function rgn_ph(array $codes): string { return implode(',', array_fill(0, max(1, count($codes)), '?')); }
function rgn_money($n): int { return (int)max(0, round((float)$n)); }
function rgn_dt($v): string { $s = trim((string)$v); return preg_match('~^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$~', $s) ? $s : ''; }
function rgn_int($v, int $lo, int $hi): int { return (int)max($lo, min($hi, (int)round((float)$v))); }

/** Fallback rate book — identical numbers to /assets/js/estimator-rates.js. */
const RGN_SERVICES = [
    'interior-design'      => 'Interior Design',
    'fit-out'              => 'Office Fit-Out',
    'renovation'           => 'Renovation',
    'architecture'         => 'Architecture',
    '3d-visualization'     => '3D Visualization',
    'furniture'            => 'Custom Furniture',
    'turnkey-design-build' => 'Turnkey Design & Build',
];
const RGN_RATE_FALLBACK = [
    'interior-design'      => ['unit' => 'sqft',  'essential' => 150,   'standard' => 250,   'premium' => 400],
    'fit-out'              => ['unit' => 'sqft',  'essential' => 2800,  'standard' => 4200,  'premium' => 6500],
    'renovation'           => ['unit' => 'sqft',  'essential' => 1200,  'standard' => 2000,  'premium' => 3200],
    'architecture'         => ['unit' => 'sqft',  'essential' => 200,   'standard' => 350,   'premium' => 550],
    '3d-visualization'     => ['unit' => 'views', 'essential' => 15000, 'standard' => 25000, 'premium' => 45000],
    'furniture'            => ['unit' => 'sqft',  'essential' => 1500,  'standard' => 2500,  'premium' => 4000],
    'turnkey-design-build' => ['unit' => 'sqft',  'essential' => 3600,  'standard' => 5400,  'premium' => 7800],
];

/** Rate card: DB row when the regional schema is imported, else baseline × node index. */
function rgn_rate(string $node, string $service, string $finish): array {
    $n = rgn_node($node);
    if (!isset(RGN_RATE_FALLBACK[$service])) fail('Unknown estimator service "' . substr($service, 0, 40) . '"');
    $finish = in_array($finish, ['essential', 'standard', 'premium'], true) ? $finish : 'standard';
    $base = (float)RGN_RATE_FALLBACK[$service][$finish];
    $unit = (string)RGN_RATE_FALLBACK[$service]['unit'];
    $labour = 22.0 * (float)$n['labour_index'];
    $waste = (float)$n['waste_pct'];
    $source = 'template';
    if (rgn_have('wx_region_rate_cards')) {
        $r = q('SELECT base_rate,labour_pct,waste_pct,unit FROM wx_region_rate_cards WHERE node=? AND service_key=? AND finish_key=? AND active=1', [$node, $service, $finish])->fetch();
        if ($r) { $base = (float)$r['base_rate']; $labour = (float)$r['labour_pct']; $waste = (float)$r['waste_pct']; $unit = (string)$r['unit']; $source = 'db'; }
    }
    return ['service' => $service, 'label' => RGN_SERVICES[$service], 'finish' => $finish, 'unit' => $unit,
        'base_rate' => round($base, 2), 'labour_pct' => round($labour, 2), 'waste_pct' => $waste, 'source' => $source];
}

/* ------------------------------------------------- specification engine */

/** Board feet of one solid panel: bf = (t_in × w_in × len_ft) / 12 (metric input). */
function rgn_bf(float $t_mm, float $w_mm, float $len_mm): float {
    return round(($t_mm / 25.4) * ($w_mm / 25.4) * ($len_mm / 304.8) / 12, 3);
}
function rgn_rft(float $len_mm): float { return round($len_mm / 304.8, 3); }
function rgn_sqft(float $w_mm, float $len_mm, int $faces = 1): float {
    return round(($w_mm * $len_mm) / 92903.04 * max(1, $faces), 3);
}

/**
 * Full regional calculation. $in:
 *   node* service_key* finish_key layout_code qty area_sqft waste_pct labour_pct
 *   discount taxPct advance_pct plan_height_mm
 *   panels[]   {label,qty,t_mm,w_mm,len_mm,species_code,core_code,coating_code,faces}
 *   runs[]     {label,qty,len_mm,h_mm,d_mm,species_code,coating_code}
 *   hardware[] {code,qty}
 * Returns line items, the panel/run detail tables and the reconciliation block.
 */
function rgn_calc(array $in): array {
    $node = rgn_node((string)($in['node'] ?? ''));
    $service = (string)($in['service_key'] ?? '');
    if (!isset(RGN_RATE_FALLBACK[$service])) fail('Choose a service: ' . implode(', ', array_keys(RGN_SERVICES)));
    $rate = rgn_rate($node['code'], $service, (string)($in['finish_key'] ?? 'standard'));

    $V = rgn_variants();
    $species = []; foreach ((array)($V['species'] ?? []) as $s) $species[(string)$s['code']] = $s;
    $coatings = []; foreach ((array)($V['coatings'] ?? []) as $c) $coatings[(string)$c['code']] = $c;
    $cores = []; foreach ((array)($V['cores'] ?? []) as $c) $cores[(string)$c['code']] = $c;
    $hwkits = []; foreach ((array)($V['hardware_kits'] ?? []) as $h) $hwkits[(string)$h['code']] = $h;
    $transport = []; foreach ((array)($V['transport'] ?? []) as $t) $transport[(string)$t['zone']] = $t;
    $split = (array)($V['labour_split'] ?? []);

    $wastePct  = array_key_exists('waste_pct', $in) && $in['waste_pct'] !== '' ? max(0, min(30, (float)$in['waste_pct'])) : (float)$rate['waste_pct'];
    $labourPct = array_key_exists('labour_pct', $in) && $in['labour_pct'] !== '' ? max(0, min(60, (float)$in['labour_pct'])) : (float)$rate['labour_pct'];
    $taxPct    = array_key_exists('taxPct', $in) && $in['taxPct'] !== '' ? max(0, min(30, (float)$in['taxPct'])) : (float)$node['tax_pct'];
    $advPct    = array_key_exists('advance_pct', $in) && $in['advance_pct'] !== '' ? max(0, min(100, (float)$in['advance_pct'])) : (float)$node['advance_pct'];

    $layout = null;
    foreach (rgn_layouts() as $l) if ((string)($l['code'] ?? '') === (string)($in['layout_code'] ?? '')) $layout = $l;

    $area = (float)($in['area_sqft'] ?? 0); $areaSource = 'manual';
    if ($area <= 0 && $layout) { $area = (float)($layout['covered_sqft'] ?? 0); $areaSource = 'layout:' . $layout['code']; }
    if ($area <= 0 && isset($in['qty']) && (float)$in['qty'] > 0) { $area = (float)$in['qty']; $areaSource = 'qty'; }
    if ($area <= 0) fail('Enter the covered area or pick a layout preset');

    $lines = []; $panelRows = []; $runRows = [];
    $planHeight = max(0, (float)($in['plan_height_mm'] ?? 0));

    /* 1 — primary service line: area × finish rate */
    $serviceAmount = $area * $rate['base_rate'];
    $lines[] = ['section' => 'Scope', 'code' => $service,
        'desc' => $rate['label'] . ' · ' . ucfirst($rate['finish']) . ' finish · node ' . $node['city'],
        'unit' => $rate['unit'], 'qty' => $rate['unit'] === 'views' ? (int)($in['qty'] ?? $area) : round($area, 2),
        'rate' => (int)round($rate['base_rate']), 'amount' => (int)round($serviceAmount),
        'basis' => ['formula' => $rate['unit'] . ' × rate card', 'inputs' => ['area' => round($area, 2), 'rate' => $rate['base_rate'], 'source' => $areaSource, 'node_index' => $node['labour_index']]]];

    /* 2 — solid panels → board feet → material + waste + coating */
    $netBf = 0.0; $coatingSqft = 0.0; $materialNet = 0.0; $coatingCost = 0.0;
    foreach (array_slice((array)($in['panels'] ?? []), 0, RGN_MAX_PANELS) as $p) {
        if (!is_array($p)) continue;
        $t = max(1, (float)($p['t_mm'] ?? 18)); $w = max(1, (float)($p['w_mm'] ?? 0)); $len = max(1, (float)($p['len_mm'] ?? 0));
        $qty = max(0.01, (float)($p['qty'] ?? 1)); if ($w <= 1 || $len <= 1) continue;
        $sp = $species[(string)($p['species_code'] ?? '')] ?? $species['walnut-us-fas'];
        $co = $coatings[(string)($p['coating_code'] ?? '')] ?? $coatings['matte-pu-12'];
        $core = $cores[(string)($p['core_code'] ?? '')] ?? null;
        $bf = rgn_bf($t, $w, $len); $net = round($bf * $qty, 3);
        $matRate = round((float)$sp['rate_bf'] * (float)$node['labour_index'], 2);
        $mat = round($net * $matRate, 2);
        $sqft = rgn_sqft($w, $len, (int)($p['faces'] ?? 2)); $coat = round($sqft * $qty, 3);
        $coatRate = round((float)$co['rate_sqft'] * (float)$node['labour_index'], 2);
        $coatAmt = round($coat * $coatRate, 2);
        $netBf += $net; $coatingSqft += $coat; $materialNet += $mat; $coatingCost += $coatAmt;
        $panelRows[] = ['label' => clip($p['label'] ?? ($core['label'] ?? 'Panel'), 80), 'qty' => $qty,
            't_mm' => $t, 'w_mm' => $w, 'len_mm' => $len, 'bf_each' => $bf, 'net_bf' => $net,
            'species' => $sp['label'], 'species_code' => $sp['code'], 'species_rate_bf' => (int)round((float)$sp['rate_bf']),
            'coating' => $co['label'], 'coating_code' => $co['code'], 'core' => $core['label'] ?? '—',
            'material' => (int)round($mat), 'coating_cost' => (int)round($coatAmt),
            'formula' => 'BF = (t/25.4) × (w/25.4) × (len/304.8) / 12'];
    }
    $wasteBf = round($netBf * $wastePct / 100, 3);
    $wasteCost = round($materialNet * $wastePct / 100, 2);
    $grossBf = round($netBf + $wasteBf, 3);
    $material = $materialNet + $wasteCost;
    $avgBfRate = $netBf > 0 ? round($materialNet / $netBf, 2) : 0.0;
    if ($netBf > 0) {
        $lines[] = ['section' => 'Solid timber', 'code' => 'BF',
            'desc' => 'Solid timber — ' . count($panelRows) . ' panel types · average PKR ' . number_format($avgBfRate) . ' / board foot',
            'unit' => 'bf', 'qty' => $netBf, 'rate' => (int)round($avgBfRate), 'amount' => (int)round($materialNet),
            'basis' => ['formula' => 'net_bf × species rate_bf × node index', 'inputs' => ['net_bf' => $netBf, 'avg_rate_bf' => $avgBfRate, 'node_index' => $node['labour_index']]]];
        $lines[] = ['section' => 'Solid timber', 'code' => 'BF-W',
            'desc' => 'Waste tolerance ' . rtrim(rtrim(number_format($wastePct, 2, '.', ''), '0'), '.') . '% on board feet (node ' . $node['code'] . ' rate card)',
            'unit' => 'bf', 'qty' => $wasteBf, 'rate' => (int)round($avgBfRate), 'amount' => (int)round($wasteCost),
            'basis' => ['formula' => 'net_bf × waste_pct / 100', 'inputs' => ['net_bf' => $netBf, 'waste_pct' => $wastePct, 'gross_bf' => $grossBf]]];
        $lines[] = ['section' => 'Surface finishing', 'code' => 'COAT',
            'desc' => 'Surface coating — ' . round($coatingSqft, 2) . ' sq ft (2 faces on shutters, 1 on carcass)',
            'unit' => 'sqft', 'qty' => round($coatingSqft, 2), 'rate' => (int)round($coatingCost / max($coatingSqft, 0.001)), 'amount' => (int)round($coatingCost),
            'basis' => ['formula' => 'surface_sqft × coating rate_sqft × node index', 'inputs' => ['surface_sqft' => round($coatingSqft, 2), 'node_index' => $node['labour_index']]]];
    }

    /* 3 — running-foot items (counters, wardrobes, beams, slats) */
    $runLm = 0.0; $runAmount = 0.0;
    foreach (array_slice((array)($in['runs'] ?? []), 0, 200) as $r) {
        if (!is_array($r)) continue;
        $len = max(1, (float)($r['len_mm'] ?? 0)); $h = max(1, (float)($r['h_mm'] ?? 720)); $d = max(1, (float)($r['d_mm'] ?? 560));
        $qty = max(0.01, (float)($r['qty'] ?? 1)); if ($len <= 1) continue;
        $sp = $species[(string)($r['species_code'] ?? '')] ?? $species['walnut-us-fas'];
        $faceBf = rgn_bf(25, $h, $len) * 2 + rgn_bf(25, $d, $len) * 2;
        $rft = rgn_rft($len);
        $unitMat = round($faceBf * (float)$sp['rate_bf'] * (float)$node['labour_index'] * (1 + $wastePct / 100), 2);
        $unitLab = round($unitMat * $labourPct / 100, 2);
        $rateRft = (int)round(($unitMat + $unitLab) / max($rft, 0.001));
        $amt = round(($unitMat + $unitLab) * $qty, 2);
        $runLm += round($len / 1000 * $qty, 3); $runAmount += $amt;
        $runRows[] = ['label' => clip($r['label'] ?? 'Run', 80), 'qty' => $qty, 'len_mm' => $len, 'h_mm' => $h, 'd_mm' => $d,
            'rft_each' => $rft, 'rft_total' => round($rft * $qty, 2), 'bf_per_run' => round($faceBf, 3), 'species' => $sp['label'],
            'rate_rft' => $rateRft, 'amount' => (int)round($amt),
            'formula' => 'BF skeleton (2 × face + 2 × side at 25 mm) → × (1 + waste) → + labour ' . $labourPct . '%'];
        $lines[] = ['section' => 'Millwork runs', 'code' => 'RFT',
            'desc' => $runRows[count($runRows) - 1]['label'] . ' · ' . round($rft * $qty, 1) . ' running ft · ' . $sp['label'],
            'unit' => 'rft', 'qty' => round($rft * $qty, 2), 'rate' => $rateRft, 'amount' => (int)round($amt),
            'basis' => ['formula' => 'BF per run × species rate × (1 + waste) / running ft', 'inputs' => ['len_mm' => $len, 'h_mm' => $h, 'd_mm' => $d, 'qty' => $qty, 'waste_pct' => $wastePct]]];
    }

    /* 4 — hardware kits */
    $hwAmount = 0.0;
    foreach (array_slice((array)($in['hardware'] ?? []), 0, 100) as $h) {
        if (!is_array($h)) continue;
        $kit = $hwkits[(string)($h['code'] ?? '')] ?? null; if (!$kit) continue;
        $qty = max(0, (float)($h['qty'] ?? 0)); if ($qty <= 0) continue;
        $amt = round((float)$kit['rate'] * $qty, 2); $hwAmount += $amt;
        $lines[] = ['section' => 'Hardware', 'code' => (string)$kit['code'],
            'desc' => (string)$kit['label'] . ' — ' . (string)$kit['per'],
            'unit' => (string)$kit['unit'], 'qty' => $qty, 'rate' => (int)round((float)$kit['rate']), 'amount' => (int)round($amt),
            'basis' => ['formula' => 'qty × kit rate', 'inputs' => ['kit' => $kit['code'], 'qty' => $qty]]];
    }

    /* 5 — workshop labour, machine time, site fitting */
    $labourBase = $material + $coatingCost;
    $labour  = round($labourBase * $labourPct / 100, 2);
    $machine = round($labour * (float)($split['machine_pct'] ?? 35) / 100, 2);
    $site    = round($labourBase * (float)($split['on_site_pct'] ?? 12) / 100, 2);
    $bfRate  = $grossBf > 0 ? round($labour / $grossBf, 2) : 0.0;
    if ($labour > 0) $lines[] = ['section' => 'Fabrication', 'code' => 'LAB',
        'desc' => 'Workshop joinery labour @ ' . $labourPct . '% of material — ' . $node['city'] . ' fabrication rate PKR ' . number_format($bfRate) . ' / board foot',
        'unit' => 'job', 'qty' => 1, 'rate' => (int)round($labour), 'amount' => (int)round($labour),
        'basis' => ['formula' => '(material + coating) × labour_pct / 100', 'inputs' => ['material' => round($material, 2), 'coating' => round($coatingCost, 2), 'labour_pct' => $labourPct, 'labour_per_bf' => $bfRate]]];
    if ($machine > 0) $lines[] = ['section' => 'Fabrication', 'code' => 'MAC',
        'desc' => 'Machine time absorbed at ' . (float)($split['machine_pct'] ?? 35) . '% of joinery labour (CNC, edge banding, sanding)',
        'unit' => 'job', 'qty' => 1, 'rate' => (int)round($machine), 'amount' => (int)round($machine),
        'basis' => ['formula' => 'joinery × machine_pct', 'inputs' => ['joinery' => round($labour, 2)]]];
    if ($site > 0) $lines[] = ['section' => 'Installation', 'code' => 'SITE',
        'desc' => 'On-site fitting team — ' . $node['lead_time_days'] . '-day mobilisation for ' . $node['label'],
        'unit' => 'job', 'qty' => 1, 'rate' => (int)round($site), 'amount' => (int)round($site),
        'basis' => ['formula' => '(material + coating) × on_site_pct', 'inputs' => ['on_site_pct' => (float)($split['on_site_pct'] ?? 12)]]];

    /* 6 — transport by node zone */
    $tzone = (string)($node['zone'] ?? 'A');
    $tr = $transport[$tzone] ?? ['pct_of_material' => 2.5, 'min_pkr' => 12000, 'label' => 'Zone A'];
    $preTransport = $material + $coatingCost + $runAmount + $hwAmount + $labour + $machine + $site + $serviceAmount;
    $trAmount = round(max((float)$tr['min_pkr'], $preTransport * (float)$tr['pct_of_material'] / 100), 2);
    $lines[] = ['section' => 'Transport', 'code' => 'TRN',
        'desc' => 'Transport ' . (string)$tr['label'] . ' — ' . (float)$tr['pct_of_material'] . '% of material value, minimum PKR ' . number_format((float)$tr['min_pkr']),
        'unit' => 'job', 'qty' => 1, 'rate' => (int)round($trAmount), 'amount' => (int)round($trAmount),
        'basis' => ['formula' => 'max(min_pkr, subject_value × zone pct)', 'inputs' => ['zone' => $tzone, 'subject_value' => round($preTransport, 2)]]];

    /* totals */
    $subtotal = (int)round(array_sum(array_column($lines, 'amount')));
    $discount = rgn_money($in['discount'] ?? 0); if ($discount > $subtotal) $discount = $subtotal;
    $tax = (int)round(($subtotal - $discount) * $taxPct / 100);
    $total = $subtotal - $discount + $tax;
    $advance = (int)round($total * $advPct / 100);

    return [
        'node' => $node, 'rate' => $rate, 'lines' => $lines, 'panels' => $panelRows, 'runs' => $runRows,
        'spec' => ['service' => $rate['label'], 'service_key' => $service, 'finish' => $rate['finish'],
            'area_sqft' => round($area, 2), 'area_source' => $areaSource, 'layout' => $layout['label'] ?? '',
            'run_lm' => round($runLm, 3), 'plan_height_mm' => $planHeight],
        'recon' => ['net_bf' => round($netBf, 3), 'waste_pct' => $wastePct, 'waste_bf' => round($wasteBf, 3), 'gross_bf' => $grossBf,
            'avg_rate_bf' => $avgBfRate, 'coating_sqft' => round($coatingSqft, 2), 'material' => (int)round($material),
            'material_net' => (int)round($materialNet), 'waste_cost' => (int)round($wasteCost), 'coating' => (int)round($coatingCost),
            'labour_pct' => $labourPct, 'labour' => (int)round($labour), 'labour_per_bf' => $bfRate,
            'machine' => (int)round($machine), 'site' => (int)round($site), 'hardware' => (int)round($hwAmount),
            'service' => (int)round($serviceAmount), 'transport' => (int)round($trAmount), 'zone' => $tzone,
            'subtotal' => $subtotal, 'discount' => $discount, 'tax_pct' => $taxPct, 'tax' => $tax, 'total' => $total,
            'advance_pct' => $advPct, 'advance' => $advance, 'balance' => $total - $advance,
            'lead_time_days' => (int)$node['lead_time_days'], 'valid_days' => 15],
        'formulas' => (array)($V['formulas'] ?? []),
    ];
}

/* ------------------------------------------------- node-scoped data reads */

/** Leads for the selected nodes inside the window (node column, else routed by text). */
function rgn_leads(array $codes, array $w): array {
    $hasNode = rgn_have_col('wx_leads', 'node');
    $cols = 'id,created_at,name,phone,email,service,stage,value,location,budget,area,priority,quote_status,next_at,assigned_to,is_read' . ($hasNode ? ',node' : ',NULL AS node');
    if ($hasNode) $st = q('SELECT ' . $cols . ' FROM wx_leads WHERE node IN (' . rgn_ph($codes) . ') AND created_at BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 500',
        array_merge($codes, [$w['from'] . ' 00:00:00', $w['to'] . ' 23:59:59']));
    else $st = q('SELECT ' . $cols . ' FROM wx_leads WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 500', [$w['from'] . ' 00:00:00', $w['to'] . ' 23:59:59']);
    $rows = [];
    foreach ($st->fetchAll() as $x) {
        $x['id'] = (int)$x['id']; $x['value'] = (int)$x['value']; $x['is_read'] = (int)$x['is_read'];
        $x['node'] = !empty($x['node']) ? strtoupper((string)$x['node']) : rgn_guess_node((string)($x['location'] ?? '') . ' ' . (string)($x['service'] ?? ''));
        if (!in_array($x['node'], $codes, true)) continue;
        $rows[] = $x;
    }
    return $rows;
}

/** Historical routing fallback: text → node code (same map as the SQL backfill). */
function rgn_guess_node(string $hay): string {
    $hay = strtolower($hay);
    $map = ['lahore' => 'LHR', 'dha' => 'LHR', 'gulberg' => 'LHR', 'bahria' => 'LHR', 'model town' => 'LHR', 'johar' => 'LHR', 'lake city' => 'LHR',
        'islamabad' => 'ISB', 'karachi' => 'KHI', 'rawalpindi' => 'RWP', 'faisalabad' => 'FSD', 'gujranwala' => 'GRW',
        'multan' => 'MUX', 'peshawar' => 'PSH', 'sialkot' => 'SKT', 'bahawalpur' => 'BWP', 'quetta' => 'QTA', 'hyderabad' => 'HYD'];
    foreach ($map as $needle => $code) if (strpos($hay, $needle) !== false) return $code;
    return 'LHR';
}

/** Quotations carrying the regional tag. Documents are JSON: filter on the tag, then on the date. */
function rgn_quotes(array $codes, array $w, int $limit = 600): array {
    $rows = [];
    $likes = []; $args = [];
    foreach ($codes as $c) { $likes[] = 'data LIKE ?'; $args[] = '%"region":"' . $c . '"%'; }
    $st = q('SELECT id,no,status,data FROM wx_quotes WHERE (' . implode(' OR ', $likes) . ') ORDER BY id DESC LIMIT ' . (int)min(2000, max(50, $limit)), $args);
    foreach ($st->fetchAll() as $r) {
        $d = json_decode((string)$r['data'], true) ?: [];
        $region = strtoupper((string)($d['region'] ?? ''));
        if ($region === '' || !in_array($region, $codes, true)) continue;
        $created = substr((string)($d['created_at'] ?? ''), 0, 10);
        if ($created !== '' && ($created < $w['from'] || $created > $w['to'])) continue;
        $rows[] = ['id' => (int)$r['id'], 'no' => (string)$r['no'], 'status' => (string)$r['status'],
            'total' => (int)($d['total'] ?? 0), 'region' => $region, 'city' => (string)($d['site_city'] ?? ''),
            'client' => (string)($d['client']['name'] ?? ''), 'created_at' => (string)($d['created_at'] ?? ''),
            'version' => (int)($d['version'] ?? 1), 'link' => '?q=' . (int)$r['id']];
    }
    return $rows;
}

/** Regional project register (wx_region_projects) or a read-only view over wx_projects docs. */
function rgn_projects(array $codes, array $w, array $in = []): array {
    $stage = (string)($in['stage'] ?? '');
    $rows = [];
    if (rgn_have('wx_region_projects')) {
        $sql = 'SELECT * FROM wx_region_projects WHERE node IN (' . rgn_ph($codes) . ')';
        $args = $codes;
        if ($stage !== '' && $stage !== 'all') { $sql .= ' AND stage=?'; $args[] = $stage; }
        if (!empty($in['status']) && $in['status'] !== 'all') { $sql .= ' AND status=?'; $args[] = (string)$in['status']; }
        $sql .= " ORDER BY FIELD(stage,'survey','design','approval','fabrication','install','handover'), target_date IS NULL, target_date ASC, id DESC LIMIT 300";
        foreach (q($sql, $args)->fetchAll() as $p) {
            $p['id'] = (int)$p['id']; $p['contract_value'] = (int)$p['contract_value'];
            $p['marla'] = (float)$p['marla']; $p['covered_sqft'] = (int)$p['covered_sqft']; $p['run_length_lm'] = (float)$p['run_length_lm'];
            $p['source'] = 'region';
            $p['milestones_done'] = 0; $p['milestones_total'] = 0; $p['progress'] = 0;
            $rows[] = $p;
        }
        if ($rows) {
            $ids = array_column($rows, 'id');
            $st = q('SELECT project_id, COUNT(*) n, SUM(status="approved" OR status="done") d, SUM(weight_pct) w, SUM(CASE WHEN status="approved" OR status="done" THEN weight_pct ELSE 0 END) wd
                     FROM wx_region_milestones WHERE project_id IN (' . rgn_ph($ids) . ') GROUP BY project_id', $ids);
            $mm = [];
            foreach ($st->fetchAll() as $m) $mm[(int)$m['project_id']] = $m;
            foreach ($rows as &$p) {
                $m = $mm[$p['id']] ?? null;
                $p['milestones_total'] = $m ? (int)$m['n'] : 0;
                $p['milestones_done'] = $m ? (int)$m['d'] : 0;
                $p['progress'] = $m ? (int)round((float)$m['w'] > 0 ? ((float)$m['wd'] / (float)$m['w']) * 100 : 0) : 0;
            }
            unset($p);
        }
        return $rows;
    }
    /* Fallback: wx_projects documents (client + stages + milestones in JSON). */
    foreach (q('SELECT id,data FROM wx_projects ORDER BY id DESC LIMIT 300')->fetchAll() as $r) {
        $d = json_decode((string)$r['data'], true) ?: [];
        $node = strtoupper((string)($d['region'] ?? '')) ?: rgn_guess_node((string)($d['site'] ?? '') . ' ' . (string)($d['client']['address'] ?? ''));
        if (!in_array($node, $codes, true)) continue;
        $ms = (array)($d['milestones'] ?? []);
        $done = 0; foreach ($ms as $m) if (in_array((string)($m['status'] ?? ''), ['approved', 'done'], true)) $done++;
        $stageNow = (string)($d['stage'] ?? ($d['pstage'] ?? 'planning'));
        if ($stage !== '' && $stage !== 'all' && $stageNow !== $stage) continue;
        $rows[] = ['id' => (int)$r['id'], 'code' => 'WX-' . str_pad((string)$r['id'], 4, '0', STR_PAD_LEFT), 'node' => $node, 'area' => '',
            'title' => (string)($d['project'] ?? $d['name'] ?? 'Project'), 'client_id' => (int)($d['client_id'] ?? 0), 'lead_id' => (int)($d['lead_id'] ?? 0),
            'quote_id' => (int)($d['quote_id'] ?? 0), 'layout_code' => '', 'category_code' => '', 'service_key' => (string)($d['kind'] ?? ''),
            'finish_key' => '', 'marla' => 0, 'covered_sqft' => 0, 'run_length_lm' => 0,
            'stage' => $stageNow, 'status' => (string)($d['status'] ?? 'open'), 'contract_value' => (int)($d['value'] ?? 0),
            'advance_pct' => 40, 'manager_id' => (int)($d['manager_id'] ?? 0), 'start_date' => (string)($d['start_date'] ?? ''),
            'target_date' => (string)($d['target_date'] ?? ''), 'handover_date' => '', 'notes' => '',
            'created_at' => (string)($d['created_at'] ?? ''), 'source' => 'wx_projects',
            'milestones_total' => count($ms), 'milestones_done' => $done,
            'progress' => count($ms) ? (int)round($done / count($ms) * 100) : 0];
    }
    return $rows;
}

function rgn_milestones(array $codes, array $w, array $in = []): array {
    $rows = [];
    if (!rgn_have('wx_region_milestones')) return $rows;
    $status = (string)($in['status'] ?? '');
    $sql = 'SELECT m.*, p.code AS project_code, p.title AS project_title, p.contract_value FROM wx_region_milestones m
            LEFT JOIN wx_region_projects p ON p.id = m.project_id
            WHERE m.node IN (' . rgn_ph($codes) . ')';
    $args = $codes;
    if ($status !== '' && $status !== 'all') { $sql .= ' AND m.status=?'; $args[] = $status; }
    if (!empty($in['due_before'])) { $sql .= ' AND m.due_date <= ?'; $args[] = (string)$in['due_before']; }
    $sql .= ' ORDER BY FIELD(m.status,"pending","rejected","approved","done"), m.due_date IS NULL, m.due_date ASC LIMIT 300';
    foreach (q($sql, $args)->fetchAll() as $m) {
        $m['id'] = (int)$m['id']; $m['project_id'] = (int)$m['project_id']; $m['amount'] = (int)$m['amount'];
        $m['weight_pct'] = (float)$m['weight_pct']; $m['contract_value'] = (int)($m['contract_value'] ?? 0);
        $m['overdue'] = $m['status'] === 'pending' && !empty($m['due_date']) && $m['due_date'] < date('Y-m-d');
        $rows[] = $m;
    }
    return $rows;
}

function rgn_ledger(array $codes, array $w, array $in = []): array {
    $rows = [];
    if (rgn_have('wx_region_ledger')) {
        $kind = (string)($in['kind'] ?? '');
        $sql = 'SELECT l.*, p.code AS project_code, p.title AS project_title FROM wx_region_ledger l
                LEFT JOIN wx_region_projects p ON p.id = l.project_id
                WHERE l.node IN (' . rgn_ph($codes) . ')';
        $args = $codes;
        if ($kind !== '' && $kind !== 'all') { $sql .= ' AND l.kind=?'; $args[] = $kind; }
        if (!empty($in['status']) && $in['status'] !== 'all') { $sql .= ' AND l.status=?'; $args[] = (string)$in['status']; }
        $sql .= ' ORDER BY l.t DESC LIMIT 400';
        foreach (q($sql, $args)->fetchAll() as $l) {
            $l['id'] = (int)$l['id']; $l['project_id'] = (int)($l['project_id'] ?? 0); $l['amount'] = (int)$l['amount'];
            $l['overdue'] = in_array((string)$l['status'], ['due', 'partial'], true) && !empty($l['due_date']) && $l['due_date'] < date('Y-m-d');
            $rows[] = $l;
        }
        return $rows;
    }
    /* Fallback: invoices already in the sales store, routed by the client address text. */
    foreach (q('SELECT id,no,data FROM wx_invoices ORDER BY id DESC LIMIT 400')->fetchAll() as $r) {
        $d = json_decode((string)$r['data'], true) ?: [];
        $node = strtoupper((string)($d['region'] ?? '')) ?: rgn_guess_node((string)($d['site'] ?? '') . ' ' . (string)($d['client']['address'] ?? ''));
        if (!in_array($node, $codes, true)) continue;
        $paid = (int)array_sum(array_column((array)($d['payments'] ?? []), 'amount'));
        $total = (int)($d['total'] ?? 0);
        $rows[] = ['id' => (int)$r['id'], 'node' => $node, 'project_id' => (int)($d['project_id'] ?? 0), 'kind' => 'invoice',
            'ref' => (string)$r['no'], 'party' => (string)($d['client']['name'] ?? ''), 'amount' => $total,
            'status' => $paid >= $total && $total > 0 ? 'paid' : ($paid > 0 ? 'partial' : 'due'),
            't' => (string)($d['created_at'] ?? ''), 'due_date' => (string)($d['due_date'] ?? ''), 'note' => '', 'user_name' => '',
            'paid' => $paid, 'balance' => max(0, $total - $paid), 'source' => 'wx_invoices',
            'overdue' => $paid < $total && !empty($d['due_date']) && $d['due_date'] < date('Y-m-d')];
    }
    return $rows;
}

/* ------------------------------------------------- KPI aggregation */

function rgn_count_leads(array $codes, string $from, string $to): array {
    $hasNode = rgn_have_col('wx_leads', 'node');
    if ($hasNode) $r = q('SELECT COUNT(*) n, COALESCE(SUM(value),0) v FROM wx_leads WHERE node IN (' . rgn_ph($codes) . ') AND created_at BETWEEN ? AND ?',
        array_merge($codes, [$from . ' 00:00:00', $to . ' 23:59:59']))->fetch();
    else $r = q('SELECT COUNT(*) n, COALESCE(SUM(value),0) v FROM wx_leads WHERE created_at BETWEEN ? AND ?', [$from . ' 00:00:00', $to . ' 23:59:59'])->fetch();
    return [(int)($r['n'] ?? 0), (int)($r['v'] ?? 0)];
}

function rgn_series(array $axis, array $rows, string $dateKey, string $bucket, callable $weight): array {
    $out = array_fill(0, count($axis), 0.0);
    $idx = array_flip($axis);
    foreach ($rows as $r) {
        $d = substr((string)($r[$dateKey] ?? ''), 0, 10); if ($d === '') continue;
        $key = $bucket === 'day' ? $d : ($bucket === 'week' ? date('Y-m-d', strtotime('monday this week', strtotime($d))) : date('Y-m-01', strtotime($d)));
        if (isset($idx[$key])) $out[$idx[$key]] += $weight($r);
    }
    return array_map(function ($n) { return round($n, 2); }, $out);
}

function rgn_delta(array $cur, array $prev): array {
    $a = (int)array_sum($cur); $b = (int)array_sum($prev);
    if ($b === 0) return ['pct' => $a > 0 ? 100 : 0, 'dir' => $a > 0 ? 'up' : 'flat', 'prev' => 0];
    $pct = (int)round(($a - $b) / $b * 100);
    return ['pct' => abs($pct), 'dir' => $pct > 0 ? 'up' : ($pct < 0 ? 'down' : 'flat'), 'prev' => $b];
}

function rgn_stage_counts(array $rows): array {
    $S = ['new', 'contacted', 'visit', 'quote', 'won', 'lost'];
    $o = []; foreach ($S as $s) $o[$s] = ['n' => 0, 'value' => 0];
    foreach ($rows as $r) {
        $s = (string)($r['stage'] ?? 'new'); if (!isset($o[$s])) $s = 'new';
        $o[$s]['n']++; $o[$s]['value'] += (int)($r['value'] ?? 0);
    }
    return $o;
}

/** Everything the /admin regional dashboard renders, in one round trip. */
function rgn_kpis(array $in): array {
    $w = rgn_window($in);
    $codes = rgn_sel($in);
    $axis = rgn_axis($w);
    $all = rgn_nodes();

    $leads = rgn_leads($codes, $w);
    $leadsPrev = rgn_leads($codes, ['from' => $w['prev_from'], 'to' => $w['prev_to'], 'bucket' => $w['bucket']]);
    $quotes = rgn_quotes($codes, $w, 400);
    $quotesPrev = rgn_quotes($codes, ['from' => $w['prev_from'], 'to' => $w['prev_to']], 200);
    $projects = rgn_projects($codes, $w, ['stage' => (string)($in['stage'] ?? 'all')]);
    $milestones = rgn_milestones($codes, $w, []);
    $ledger = rgn_ledger($codes, $w, []);
    $estimates = rgn_estimate_log($w, $codes);

    /* ---- KPI 1 · total volume configurations */
    $volRows = array_merge(
        array_map(function ($l) { return ['created_at' => (string)$l['created_at'], 'n' => 1]; }, $leads),
        array_map(function ($q) { return ['created_at' => (string)$q['created_at'], 'n' => 1]; }, $quotes),
        array_map(function ($e) { return ['created_at' => (string)($e['t'] ?? ''), 'n' => 1]; }, $estimates)
    );
    $volSeries = rgn_series($axis, $volRows, 'created_at', $w['bucket'], function ($r) { return 1; });
    [$prevLeadN] = rgn_count_leads($codes, $w['prev_from'], $w['prev_to']);
    $volPrevTotal = $prevLeadN + count($quotesPrev) + 0;
    $volCur = count($leads) + count($quotes) + count($estimates);

    /* ---- KPI 2 · contract value under review */
    $reviewLeads = array_filter($leads, function ($l) { return in_array((string)$l['stage'], ['new', 'contacted', 'visit', 'quote'], true); });
    $reviewQuotes = array_filter($quotes, function ($q) { return in_array((string)$q['status'], ['draft', 'sent'], true); });
    $reviewValue = array_sum(array_column($reviewLeads, 'value')) + array_sum(array_column($reviewQuotes, 'total'));
    $prevReview = 0;
    foreach ($leadsPrev as $l) if (in_array((string)$l['stage'], ['new', 'contacted', 'visit', 'quote'], true)) $prevReview += (int)$l['value'];
    foreach ($quotesPrev as $q) if (in_array((string)$q['status'], ['draft', 'sent'], true)) $prevReview += (int)$q['total'];
    $reviewRows = array_merge(
        array_map(function ($l) { return ['created_at' => (string)$l['created_at'], 'v' => (int)$l['value']]; }, $reviewLeads),
        array_map(function ($q) { return ['created_at' => (string)$q['created_at'], 'v' => (int)$q['total']]; }, $reviewQuotes)
    );
    $reviewSeries = rgn_series($axis, $reviewRows, 'created_at', $w['bucket'], function ($r) { return (int)$r['v']; });

    /* ---- KPI 3 · pending milestone approvals */
    $pendingMs = array_values(array_filter($milestones, function ($m) { return (string)$m['status'] === 'pending'; }));
    $msRows = array_map(function ($m) { return ['t' => (string)($m['due_date'] ?: $m['done_at'] ?: date('Y-m-d')), 'n' => 1]; }, $pendingMs);
    $msSeries = rgn_series($axis, $msRows, 't', $w['bucket'], function ($r) { return 1; });
    $approvalsPending = 0;
    if (function_exists('appr_list')) { try { $approvalsPending = count((array)appr_list('pending')); } catch (Throwable $e) { $approvalsPending = 0; } }

    /* ---- KPI 4 · ledger health */
    $received = 0; $receivable = 0; $overdue = 0; $paidRows = [];
    foreach ($ledger as $l) {
        $paid = isset($l['paid']) ? (int)$l['paid'] : ($l['status'] === 'paid' ? (int)$l['amount'] : 0);
        $bal = isset($l['balance']) ? (int)$l['balance'] : max(0, (int)$l['amount'] - $paid);
        if (in_array((string)$l['kind'], ['receipt', 'invoice'], true)) {
            $received += $paid; $receivable += $bal;
            if (!empty($l['overdue'])) $overdue += $bal;
            if ($paid > 0) $paidRows[] = ['t' => (string)$l['t'], 'v' => $paid];
        }
        if ((string)$l['kind'] === 'po') $receivable += 0;
    }
    $recSeries = rgn_series($axis, $paidRows, 't', $w['bucket'], function ($r) { return (int)$r['v']; });
    $healthScore = ($received + $receivable + $overdue) > 0 ? (int)max(0, min(100, round($received / max(1, $received + $overdue) * 100))) : 100;

    /* ---- per-node breakdown */
    $nodeRows = [];
    foreach ($all as $code => $n) {
        $inNode = in_array($code, $codes, true);
        $nl = $inNode ? array_values(array_filter($leads, function ($l) use ($code) { return $l['node'] === $code; })) : [];
        $np = $inNode ? array_values(array_filter($projects, function ($p) use ($code) { return strtoupper((string)$p['node']) === $code; })) : [];
        $nq = $inNode ? array_values(array_filter($quotes, function ($q) use ($code) { return $q['region'] === $code; })) : [];
        $nm = $inNode ? array_values(array_filter($milestones, function ($m) use ($code) { return strtoupper((string)$m['node']) === $code; })) : [];
        $nodeRows[] = ['code' => $code, 'city' => $n['city'], 'label' => $n['label'], 'dir' => $n['dir'], 'zone' => $n['zone'],
            'index' => (float)$n['labour_index'], 'waste_pct' => (float)$n['waste_pct'], 'lead_time_days' => (int)$n['lead_time_days'],
            'active' => (bool)$n['active'], 'selected' => $inNode,
            'leads' => count($nl), 'lead_value' => (int)array_sum(array_column($nl, 'value')),
            'quotes' => count($nq), 'quote_value' => (int)array_sum(array_column($nq, 'total')),
            'projects' => count($np), 'project_value' => (int)array_sum(array_column($np, 'contract_value')),
            'pending_ms' => count(array_filter($nm, function ($m) { return (string)$m['status'] === 'pending'; })),
            'areas' => array_values((array)($n['areas'] ?? []))];
    }

    /* ---- alerts */
    $alerts = [];
    $orphan = 0;
    if (rgn_have_col('wx_leads', 'node')) $orphan = (int)q("SELECT COUNT(*) FROM wx_leads WHERE node IS NULL OR node=''")->fetchColumn();
    if ($orphan > 0) $alerts[] = ['level' => 'warn', 'text' => $orphan . ' leads carry no routing parameter', 'fix' => 'Import _database/woodex-regions.sql → section 10 backfills them.', 'route' => '#/enquiries'];
    if ($overdue > 0) $alerts[] = ['level' => 'bad', 'text' => 'Overdue receivables ' . rgn_pkr($overdue) . ' across ' . count(array_filter($ledger, function ($l) { return !empty($l['overdue']); })) . ' entries', 'fix' => 'Open the ledger and trigger reminder runs.', 'route' => '#/regional/ledger'];
    $dueSoon = array_values(array_filter($pendingMs, function ($m) { return !empty($m['due_date']) && $m['due_date'] <= date('Y-m-d', strtotime('+3 days')); }));
    if ($dueSoon) $alerts[] = ['level' => 'warn', 'text' => count($dueSoon) . ' milestones due within 3 days', 'fix' => 'Approve or reschedule on the Approvals canvas.', 'route' => '#/regional/approvals'];
    if (!$estimates) $alerts[] = ['level' => 'info', 'text' => 'No estimator runs logged in this window', 'fix' => 'Run the estimator to seed the volume series.', 'route' => '#/regional/estimator'];
    if (!$leads && !$quotes) $alerts[] = ['level' => 'info', 'text' => 'No leads in the selected window', 'fix' => 'Widen the date slicer or check the node filters.', 'route' => '#/regional'];

    return [
        'window' => $w, 'axis' => $axis, 'nodes_selected' => $codes,
        'kpi' => [
            ['key' => 'volume', 'label' => 'Total volume configurations', 'value' => $volCur, 'valueLabel' => number_format($volCur),
                'sub' => count($leads) . ' leads · ' . count($quotes) . ' quotations · ' . count($estimates) . ' estimator runs',
                'delta' => rgn_delta($volSeries, array_fill(0, count($axis), $volPrevTotal / max(1, count($axis)))),
                'series' => $volSeries, 'unit' => 'configs', 'route' => '#/regional/configs'],
            ['key' => 'contract', 'label' => 'Contract value under review', 'value' => (int)$reviewValue, 'valueLabel' => rgn_pkr($reviewValue),
                'sub' => count($reviewLeads) . ' open leads · ' . count($reviewQuotes) . ' quotations awaiting decision',
                'delta' => rgn_delta($reviewSeries, array_fill(0, count($axis), $prevReview / max(1, count($axis)))),
                'series' => $reviewSeries, 'unit' => 'PKR', 'route' => '#/regional/pipeline'],
            ['key' => 'milestones', 'label' => 'Pending milestone approvals', 'value' => count($pendingMs), 'valueLabel' => number_format(count($pendingMs)),
                'sub' => count($dueSoon) . ' due within 3 days · ' . $approvalsPending . ' master approvals queued',
                'delta' => ['pct' => 0, 'dir' => 'flat', 'prev' => 0],
                'series' => $msSeries, 'unit' => 'milestones', 'route' => '#/regional/approvals'],
            ['key' => 'ledger', 'label' => 'Ledger health', 'value' => $healthScore, 'valueLabel' => $healthScore . '%',
                'sub' => 'Received ' . rgn_pkr($received) . ' · receivable ' . rgn_pkr($receivable) . ' · overdue ' . rgn_pkr($overdue),
                'delta' => rgn_delta($recSeries, array_fill(0, count($axis), 0)),
                'series' => $recSeries, 'unit' => '%', 'route' => '#/regional/ledger'],
        ],
        'funnel' => rgn_stage_counts($leads),
        'nodes' => $nodeRows,
        'alerts' => $alerts,
        'recent' => array_slice(array_map(function ($l) {
            return ['id' => (int)$l['id'], 'name' => (string)$l['name'], 'node' => (string)$l['node'], 'city' => rgn_city((string)$l['node']),
                'service' => (string)$l['service'], 'stage' => (string)$l['stage'], 'value' => (int)$l['value'],
                'location' => (string)$l['location'], 'created_at' => (string)$l['created_at'], 'next_at' => (string)$l['next_at']];
        }, $leads), 12),
        'quotes' => array_slice($quotes, 0, 10),
        'projects' => array_slice($projects, 0, 12),
        'milestones' => array_slice($pendingMs, 0, 12),
        'ledger' => array_slice($ledger, 0, 14),
        'totals' => ['leads' => count($leads), 'quotes' => count($quotes), 'projects' => count($projects),
            'milestones_pending' => count($pendingMs), 'received' => (int)$received, 'receivable' => (int)$receivable, 'overdue' => (int)$overdue,
            'estimates' => count($estimates)],
        'tables' => ['nodes' => rgn_have('wx_region_nodes'), 'rate_cards' => rgn_have('wx_region_rate_cards'),
            'projects' => rgn_have('wx_region_projects'), 'milestones' => rgn_have('wx_region_milestones'),
            'ledger' => rgn_have('wx_region_ledger'), 'variants' => rgn_have('wx_region_variants'),
            'lead_node_col' => rgn_have_col('wx_leads', 'node')],
        'generated_at' => now(),
    ];
}

function rgn_city(string $code): string { $a = rgn_nodes(); return (string)($a[strtoupper($code)]['city'] ?? $code); }

/** PKR formatter mirroring the admin JS one (Cr / Lac / plain). */
function rgn_pkr($n): string {
    $n = (float)$n;
    $neg = $n < 0; $n = abs($n);
    if ($n >= 1e7) return ($neg ? '-' : '') . 'PKR ' . rtrim(rtrim(number_format($n / 1e7, 2), '0'), '.') . ' Cr';
    if ($n >= 1e5) return ($neg ? '-' : '') . 'PKR ' . rtrim(rtrim(number_format($n / 1e5, 1), '0'), '.') . ' Lac';
    return ($neg ? '-' : '') . 'PKR ' . number_format($n);
}

/* ------------------------------------------------- estimator log + health */

function rgn_estimate_log(array $w, array $codes = []): array {
    $rows = [];
    if (!is_file(RGN_EST_LOG)) return $rows;
    $fh = @fopen(RGN_EST_LOG, 'r'); if (!$fh) return $rows;
    while (($line = fgets($fh)) !== false) {
        $d = json_decode(trim($line), true); if (!is_array($d)) continue;
        $t = substr((string)($d['t'] ?? ''), 0, 10);
        if ($t === '' || $t < $w['from'] || $t > $w['to']) continue;
        if ($codes && !in_array(strtoupper((string)($d['node'] ?? '')), $codes, true)) continue;
        $rows[] = $d;
    }
    fclose($fh);
    return array_slice(array_reverse($rows), 0, 500);
}

function rgn_log_estimate(array $u, array $calc, array $in): void {
    $row = ['t' => now(), 'user' => (string)$u['name'], 'node' => (string)$calc['node']['code'],
        'service' => (string)$calc['spec']['service_key'], 'finish' => (string)$calc['spec']['finish'],
        'area_sqft' => (float)$calc['spec']['area_sqft'], 'net_bf' => (float)$calc['recon']['net_bf'],
        'gross_bf' => (float)$calc['recon']['gross_bf'], 'labour_per_bf' => (float)$calc['recon']['labour_per_bf'],
        'total' => (int)$calc['recon']['total'], 'quote_no' => (string)($in['quote_no'] ?? '')];
    @file_put_contents(RGN_EST_LOG, json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
    @chmod(RGN_EST_LOG, 0600);
}

/** Registry / directory / parameter audit for the Regional operations health card. */
function rgn_health(array $in = []): array {
    $checks = [];
    $add = function (string $group, string $name, bool $ok, string $detail = '', string $fix = '') use (&$checks) {
        $checks[] = ['group' => $group, 'name' => $name, 'ok' => $ok, 'detail' => $detail, 'fix' => $fix];
    };
    $nodes = rgn_nodes();
    $add('Registry', 'Node registry template', is_file(RGN_NODES_TPL), is_file(RGN_NODES_TPL) ? RGN_NODES_TPL : 'missing', 'Restore /_templates/region-nodes.json from git.');
    $add('Registry', 'Verified node count', count($nodes) === 12, count($nodes) . ' nodes', 'The module expects exactly 12 municipal nodes.');
    $missing = [];
    foreach ($nodes as $n) if (!is_file(ROOT_DIR . rtrim((string)$n['dir'], '/') . '/index.html')) $missing[] = (string)$n['dir'];
    $add('Directories', 'Node directories on disk', !$missing, $missing ? 'missing: ' . implode(', ', $missing) : 'all 12 index.html files found', 'Create the missing city directory or correct the registry.');
    $add('Registry', 'Variant matrix', is_file(RGN_VARIANTS_TPL), count((array)(rgn_variants()['species'] ?? [])) . ' species · ' . count((array)(rgn_variants()['coatings'] ?? [])) . ' coatings', 'Restore /_templates/region-variants.json.');
    $add('Database', 'Routing parameter on wx_leads', rgn_have_col('wx_leads', 'node'), rgn_have_col('wx_leads', 'node') ? 'node column present' : 'column missing', 'Import _database/woodex-regions.sql — section 7 adds it.');
    foreach (['wx_region_nodes' => 'Node registry table', 'wx_region_rate_cards' => 'Rate card table', 'wx_region_projects' => 'Project register',
              'wx_region_milestones' => 'Milestone table', 'wx_region_ledger' => 'Ledger table'] as $t => $label)
        $add('Database', $label, rgn_have($t), rgn_have($t) ? 'present' : 'not imported', 'Import _database/woodex-regions.sql in phpMyAdmin.');
    if (rgn_have('wx_region_rate_cards')) {
        $n = (int)q('SELECT COUNT(*) FROM wx_region_rate_cards')->fetchColumn();
        $add('Database', 'Rate card coverage', $n >= 252, $n . ' rows (expected 252 = 12 × 7 × 3)', 'Run rgn_rate_sync from Regional operations → Rate cards.');
    }
    $orphan = 0;
    if (rgn_have_col('wx_leads', 'node')) $orphan = (int)q("SELECT COUNT(*) FROM wx_leads WHERE node IS NULL OR node=''")->fetchColumn();
    $add('Routing', 'Leads without a node', $orphan === 0, $orphan . ' unassigned', 'Run section 10 of the SQL import to backfill from city text.');
    $nodesSeen = [];
    if (rgn_have_col('wx_leads', 'node')) foreach (q('SELECT node, COUNT(*) n FROM wx_leads WHERE node IS NOT NULL GROUP BY node')->fetchAll() as $r) $nodesSeen[(string)$r['node']] = (int)$r['n'];
    $add('Routing', 'Nodes carrying leads', count($nodesSeen) > 0, count($nodesSeen) . ' of 12 nodes have leads', 'Publish the city landing pages to feed the quieter nodes.');
    $add('Estimator', 'Estimator runs logged', is_file(RGN_EST_LOG), is_file(RGN_EST_LOG) ? (count(file(RGN_EST_LOG)) . ' runs') : 'no log yet', 'Run the estimator once to create /_private/region-estimates.jsonl.');
    $bad = 0;
    foreach (rgn_quotes(array_keys($nodes), ['from' => date('Y-m-d', strtotime('-365 days')), 'to' => date('Y-m-d'), 'bucket' => 'month'], 200) as $q) if ($q['total'] <= 0) $bad++;
    $add('Quotations', 'Regional quotations with a total', $bad === 0, $bad . ' with a zero total', 'Reopen and recalculate those quotations.');
    $okCount = count(array_filter($checks, function ($c) { return $c['ok']; }));
    return ['ok' => $okCount === count($checks), 'score' => (int)round($okCount / max(1, count($checks)) * 100), 'checks' => $checks, 'generated_at' => now()];
}

/** CSV export payload for the current node filter. */
function rgn_export(array $in): array {
    $w = rgn_window($in);
    $codes = rgn_sel($in);
    $kind = (string)($in['kind'] ?? 'leads');
    $head = []; $body = [];
    if ($kind === 'ledger') {
        $head = ['node', 'city', 'kind', 'ref', 'party', 'amount', 'status', 'date', 'due_date', 'overdue', 'project'];
        foreach (rgn_ledger($codes, $w, $in) as $l)
            $body[] = [(string)$l['node'], rgn_city((string)$l['node']), (string)$l['kind'], (string)$l['ref'], (string)$l['party'],
                (string)($l['amount'] ?? 0), (string)$l['status'], (string)$l['t'], (string)($l['due_date'] ?? ''),
                !empty($l['overdue']) ? 'yes' : 'no', (string)($l['project_code'] ?? '')];
    } elseif ($kind === 'projects') {
        $head = ['code', 'node', 'city', 'title', 'stage', 'status', 'contract_value', 'progress_pct', 'target_date', 'manager_id'];
        foreach (rgn_projects($codes, $w, $in) as $p)
            $body[] = [(string)($p['code'] ?? ''), (string)$p['node'], rgn_city((string)$p['node']), (string)$p['title'],
                (string)$p['stage'], (string)$p['status'], (string)($p['contract_value'] ?? 0), (string)($p['progress'] ?? 0),
                (string)($p['target_date'] ?? ''), (string)($p['manager_id'] ?? '')];
    } elseif ($kind === 'milestones') {
        $head = ['project', 'node', 'city', 'seq', 'name', 'kind', 'weight_pct', 'amount', 'due_date', 'status', 'approved_by'];
        foreach (rgn_milestones($codes, $w, $in) as $m)
            $body[] = [(string)($m['project_code'] ?? ''), (string)$m['node'], rgn_city((string)$m['node']), (string)$m['seq'], (string)$m['name'],
                (string)$m['kind'], (string)$m['weight_pct'], (string)$m['amount'], (string)($m['due_date'] ?? ''), (string)$m['status'], (string)($m['approved_by'] ?? '')];
    } else {
        $head = ['id', 'node', 'city', 'name', 'phone', 'email', 'service', 'stage', 'value', 'location', 'budget', 'priority', 'created_at', 'next_at'];
        foreach (rgn_leads($codes, $w) as $l)
            $body[] = [$l['id'], (string)$l['node'], rgn_city((string)$l['node']), (string)$l['name'], (string)$l['phone'], (string)$l['email'],
                (string)$l['service'], (string)$l['stage'], (string)$l['value'], (string)$l['location'], (string)($l['budget'] ?? ''),
                (string)($l['priority'] ?? ''), (string)$l['created_at'], (string)($l['next_at'] ?? '')];
    }
    $csv = '';
    $esc = function ($v) { $s = (string)$v; return preg_match('~[",\n]~', $s) ? '"' . str_replace('"', '""', $s) . '"' : $s; };
    $csv .= implode(',', array_map($esc, $head)) . "\n";
    foreach ($body as $row) $csv .= implode(',', array_map($esc, $row)) . "\n";
    return ['filename' => 'woodex-regional-' . $kind . '-' . $w['from'] . '_' . $w['to'] . '.csv', 'csv' => $csv, 'rows' => count($body),
        'window' => $w, 'nodes' => $codes];
}

/* ------------------------------------------------- writes */

/** Project register row from input, node-validated. */
function rgn_project_save(array $u, array $in): array {
    if (!rgn_have('wx_region_projects')) fail('The regional tables are not imported yet — run _database/woodex-regions.sql');
    $node = rgn_node((string)($in['node'] ?? ''))['code'];
    $id = (int)($in['id'] ?? 0);
    $row = [
        'node' => $node,
        'area' => clip($in['area'] ?? '', 16),
        'title' => clip($in['title'] ?? '', 190),
        'client_id' => (int)($in['client_id'] ?? 0) ?: null,
        'lead_id' => (int)($in['lead_id'] ?? 0) ?: null,
        'quote_id' => (int)($in['quote_id'] ?? 0) ?: null,
        'layout_code' => clip($in['layout_code'] ?? '', 12),
        'category_code' => clip($in['category_code'] ?? '', 12),
        'service_key' => clip($in['service_key'] ?? '', 40),
        'finish_key' => clip($in['finish_key'] ?? '', 20),
        'marla' => (float)($in['marla'] ?? 0),
        'covered_sqft' => rgn_int($in['covered_sqft'] ?? 0, 0, 2000000),
        'run_length_lm' => round((float)($in['run_length_lm'] ?? 0), 2),
        'stage' => in_array((string)($in['stage'] ?? ''), array_column((array)(jread(RGN_NODES_TPL)['stages'] ?? []), 'code'), true) ? (string)$in['stage'] : 'survey',
        'status' => in_array((string)($in['status'] ?? ''), ['open', 'hold', 'done', 'cancelled'], true) ? (string)$in['status'] : 'open',
        'contract_value' => rgn_money($in['contract_value'] ?? 0),
        'advance_pct' => max(0, min(100, (float)($in['advance_pct'] ?? 40))),
        'manager_id' => (int)($in['manager_id'] ?? 0) ?: null,
        'start_date' => rgn_dt($in['start_date'] ?? '') ?: null,
        'target_date' => rgn_dt($in['target_date'] ?? '') ?: null,
        'handover_date' => rgn_dt($in['handover_date'] ?? '') ?: null,
        'notes' => clip($in['notes'] ?? '', 4000),
    ];
    $spec = is_array($in['spec'] ?? null) ? json_encode($in['spec'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : (string)($in['spec_json'] ?? '');
    if ($row['title'] === '') fail('Project title is required');
    if ($row['target_date'] && $row['start_date'] && $row['target_date'] < $row['start_date']) fail('Target date cannot be before the start date');
    if ($id > 0) {
        $cur = q('SELECT * FROM wx_region_projects WHERE id=?', [$id])->fetch(); if (!$cur) fail('Project not found', 404);
        $set = []; $args = [];
        foreach ($row as $k => $v) { $set[] = "`$k`=?"; $args[] = $v; }
        if ($spec !== '') { $set[] = '`spec_json`=?'; $args[] = $spec; }
        $set[] = '`updated_at`=?'; $args[] = now(); $args[] = $id;
        q('UPDATE wx_region_projects SET ' . implode(', ', $set) . ' WHERE id=?', $args);
    } else {
        $seq = (int)q('SELECT COUNT(*) FROM wx_region_projects WHERE node=?', [$node])->fetchColumn() + 1;
        $code = clip($in['code'] ?? '', 24) ?: $node . '-' . date('y') . '-' . str_pad((string)$seq, 3, '0', STR_PAD_LEFT);
        if (q('SELECT id FROM wx_region_projects WHERE code=?', [$code])->fetch()) $code .= '-' . substr((string)time(), -3);
        q('INSERT INTO wx_region_projects (`code`,`node`,`area`,`title`,`client_id`,`lead_id`,`quote_id`,`layout_code`,`category_code`,`service_key`,`finish_key`,`marla`,`covered_sqft`,`run_length_lm`,`stage`,`status`,`contract_value`,`advance_pct`,`manager_id`,`start_date`,`target_date`,`handover_date`,`notes`,`spec_json`,`created_at`,`updated_at`)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [$code, $row['node'], $row['area'], $row['title'], $row['client_id'], $row['lead_id'], $row['quote_id'], $row['layout_code'], $row['category_code'],
             $row['service_key'], $row['finish_key'], $row['marla'], $row['covered_sqft'], $row['run_length_lm'], $row['stage'], $row['status'], $row['contract_value'],
             $row['advance_pct'], $row['manager_id'], $row['start_date'], $row['target_date'], $row['handover_date'], $row['notes'], $spec !== '' ? $spec : null, now(), now()]);
        $id = (int)db()->lastInsertId();
        $row['code'] = $code;
    }
    log_act($u, 'regional.project.save', ($row['code'] ?? ('#' . $id)) . ' · ' . $node . ' · ' . $row['title']);
    return ['id' => $id] + $row + ['code' => $row['code'] ?? '#' . $id];
}

/** Standard six-step milestone plan, weighted to 100%. */
function rgn_milestone_plan(array $calc): array {
    $stages = (array)(jread(RGN_NODES_TPL)['stages'] ?? []);
    $weights = ['survey' => 10, 'design' => 15, 'approval' => 15, 'fabrication' => 30, 'install' => 20, 'handover' => 10];
    $total = (int)($calc['recon']['total'] ?? 0);
    $items = []; $seq = 1;
    foreach ($stages as $s) {
        $code = (string)($s['code'] ?? 'step'); $w = (float)($weights[$code] ?? 10);
        $items[] = ['seq' => $seq++, 'name' => (string)($s['label'] ?? $code), 'kind' => $code === 'approval' ? 'approval' : 'progress',
            'weight_pct' => $w, 'amount' => (int)round($total * $w / 100)];
    }
    return $items;
}

function rgn_seed_milestones(int $projectId, string $node, array $calc, array $u): int {
    if (!rgn_have('wx_region_milestones') || $projectId <= 0) return 0;
    $n = 0;
    foreach (rgn_milestone_plan($calc) as $m) {
        q('INSERT INTO wx_region_milestones (project_id,node,seq,name,kind,weight_pct,amount,due_date,status,note) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [$projectId, $node, $m['seq'], $m['name'], $m['kind'], $m['weight_pct'], $m['amount'],
             date('Y-m-d', strtotime('+' . ($m['seq'] * (int)$calc['recon']['lead_time_days'] . ' days'))), 'pending', 'Seeded from the regional estimator']);
        $n++;
    }
    log_act($u, 'regional.milestones.seed', $node . ' · project #' . $projectId . ' · ' . $n . ' milestones');
    return $n;
}

/** Quotation document handed to the existing sales pipeline (wx_quotes). */
function rgn_quote_create(array $u, array $in): array {
    $calc = rgn_calc($in);
    $node = $calc['node'];
    $clientName = clip($in['name'] ?? ($in['client']['name'] ?? ''), 120);
    if ($clientName === '') fail('Client name is required for a quotation');
    $sections = [];
    foreach ($calc['lines'] as $l) {
        $sec = (string)$l['section'];
        if (!isset($sections[$sec])) $sections[$sec] = ['name' => $sec, 'note' => '', 'area' => 0, 'items' => []];
        $sections[$sec]['items'][] = ['desc' => (string)$l['desc'], 'qty' => (float)$l['qty'], 'unit' => (string)$l['unit'],
            'rate' => (float)$l['rate'], 'amount' => (float)$l['amount'], 'kind' => '', 'code' => (string)$l['code']];
    }
    $specNote = 'Board feet ' . $calc['recon']['net_bf'] . ' net + ' . $calc['recon']['waste_bf'] . ' waste = ' . $calc['recon']['gross_bf']
        . ' bf · ' . (float)$calc['recon']['labour_pct'] . '% workshop labour at PKR ' . number_format((float)$calc['recon']['labour_per_bf']) . ' / bf · '
        . $node['city'] . ' node index ' . $node['labour_index'] . ' · ' . $calc['recon']['lead_time_days'] . '-day lead time';
    $sections = array_values($sections);
    $sections[] = ['name' => 'Specification basis', 'note' => '', 'area' => 0, 'items' => [
        ['desc' => $specNote, 'qty' => 0, 'unit' => 'job', 'rate' => 0, 'amount' => 0, 'kind' => 'spec', 'code' => 'SPEC'],
        ['desc' => 'Routing node ' . $node['code'] . ' → ' . $node['dir'] . ' · waste tolerance ' . (float)$calc['recon']['waste_pct'] . '% · zone ' . $calc['recon']['zone'] . ' transport',
         'qty' => 0, 'unit' => 'job', 'rate' => 0, 'amount' => 0, 'kind' => 'spec', 'code' => 'RGN'],
    ]];
    $kindOk = ['design', 'fitout', 'renovation', 'other'];
    $kind = in_array((string)($in['kind'] ?? ''), $kindOk, true) ? (string)$in['kind'] : (strpos((string)$calc['spec']['service_key'], 'fit-out') !== false ? 'fitout' : 'other');
    $terms = clip($in['terms'] ?? '', 3000) ?: "50% advance payment with work order.\n40% on completion of fabrication and site work.\n10% on handover and snag closure.\nPayment charged on actual dimensions of the fabricated work.\nRates valid 15 days as per market rates.";
    $now = now();
    $hasSales = function_exists('next_no') && function_exists('doc_totals') && function_exists('quote_put');

    $doc = ['no' => $hasSales ? next_no() : ('WR-' . date('ymd') . '-' . substr((string)time(), -4)),
        'version' => 1, 'option' => '', 'status' => 'draft',
        'lead_id' => (int)($in['lead_id'] ?? 0) ?: null, 'client_id' => (int)($in['client_id'] ?? 0) ?: null,
        'client' => ['name' => $clientName, 'phone' => clip($in['phone'] ?? '', 40), 'email' => clip($in['email'] ?? '', 190),
            'address' => clip($in['site'] ?? '', 300), 'company' => clip($in['company'] ?? '', 120)],
        'project' => clip($in['project'] ?? ($in['title'] ?? ''), 160),
        'site' => clip($in['site'] ?? '', 200), 'site_city' => $node['city'], 'region' => $node['code'],
        'region_dir' => $node['dir'], 'kind' => $kind, 'qtype' => 'furniture', 'date' => date('Y-m-d'),
        'valid_days' => 15, 'sections' => $sections, 'discount' => (float)$calc['recon']['discount'], 'taxPct' => (float)$calc['recon']['tax_pct'],
        'terms' => $terms, 'notes' => clip($in['notes'] ?? '', 2000),
        'intro' => clip($in['intro'] ?? ('Regional quotation prepared by the ' . $node['label'] . ' — all rates bound to the ' . $node['city'] . ' rate card.'), 1500),
        'design' => 'premium', 'layout' => 'project', 'scope' => clip($in['scope'] ?? '', 6000),
        'sign_name' => clip($in['sign_name'] ?? '', 80), 'sign_title' => clip($in['sign_title'] ?? '', 80),
        'rent' => 0, 'advance' => (float)$calc['recon']['advance'], 'blocks' => ['summary', 'items', 'totals', 'terms', 'bank', 'sign'],
        'created_by' => (string)$u['name'], 'created_at' => $now, 'sent_at' => null, 'approved_at' => null,
        'updated_at' => $now, 'history' => [['t' => $now, 'user' => (string)$u['name'], 'text' => 'Created from the regional estimator · node ' . $node['code']]],
        'spec' => ['node' => $node['code'], 'city' => $node['city'], 'service' => $calc['spec']['service_key'], 'finish' => $calc['spec']['finish'],
            'area_sqft' => $calc['spec']['area_sqft'], 'net_bf' => $calc['recon']['net_bf'], 'waste_bf' => $calc['recon']['waste_bf'],
            'gross_bf' => $calc['recon']['gross_bf'], 'waste_pct' => $calc['recon']['waste_pct'], 'labour_pct' => $calc['recon']['labour_pct'],
            'labour_per_bf' => $calc['recon']['labour_per_bf'], 'zone' => $calc['recon']['zone'], 'lead_time_days' => $calc['recon']['lead_time_days']],
    ];
    if ($hasSales) { $doc = quote_put(doc_totals($doc)); }
    else { $doc['subtotal'] = $calc['recon']['subtotal']; $doc['tax'] = $calc['recon']['tax']; $doc['total'] = $calc['recon']['total']; }

    if (!empty($doc['lead_id']) && function_exists('lead_stage') && in_array((string)q('SELECT stage FROM wx_leads WHERE id=?', [(int)$doc['lead_id']])->fetchColumn(), ['new', 'contacted', 'visit'], true)) {
        lead_stage((int)$doc['lead_id'], ['new', 'contacted', 'visit'], 'quote', $u, (string)$doc['no']);
    }
    log_act($u, 'regional.quote.create', $doc['no'] . ' · ' . $node['code'] . ' · ' . $clientName . ' · ' . rgn_pkr($doc['total']));
    rgn_log_estimate($u, $calc, ['quote_no' => (string)$doc['no']]);

    $project = null; $milestones = 0;
    if (!empty($in['create_project'])) {
        $project = rgn_project_save($u, ['node' => $node['code'], 'area' => (string)($in['area_code'] ?? ''),
            'title' => (string)($doc['project'] ?: ($clientName . ' · ' . $node['city'])),
            'client_id' => $doc['client_id'], 'lead_id' => $doc['lead_id'], 'quote_id' => (int)$doc['id'],
            'layout_code' => (string)($in['layout_code'] ?? ''), 'category_code' => clip($in['category_code'] ?? '', 12),
            'service_key' => (string)$calc['spec']['service_key'], 'finish_key' => (string)$calc['spec']['finish'],
            'covered_sqft' => (int)round((float)$calc['spec']['area_sqft']), 'run_length_lm' => (float)$calc['spec']['run_lm'],
            'stage' => 'survey', 'status' => 'open', 'contract_value' => (int)$doc['total'],
            'advance_pct' => (float)$calc['recon']['advance_pct'],
            'start_date' => date('Y-m-d'), 'target_date' => date('Y-m-d', strtotime('+' . (int)$calc['recon']['lead_time_days'] . ' days')),
            'notes' => 'From quotation ' . $doc['no'], 'spec' => $doc['spec']]);
        $milestones = rgn_seed_milestones((int)$project['id'], $node['code'], $calc, $u);
    }
    return ['quote' => $doc, 'project' => $project, 'milestones' => $milestones, 'calc' => $calc];
}

/* ------------------------------------------------- rate cards, variants, reports */

function rgn_rate_cards(string $node): array {
    $n = rgn_node($node);
    $rows = [];
    $db = [];
    if (rgn_have('wx_region_rate_cards')) {
        foreach (q('SELECT service_key,finish_key,unit,base_rate,labour_pct,waste_pct,updated_at FROM wx_region_rate_cards WHERE node=? ORDER BY service_key, FIELD(finish_key,"essential","standard","premium")', [$node])->fetchAll() as $r)
            $db[(string)$r['service_key'] . '|' . (string)$r['finish_key']] = $r;
    }
    foreach (RGN_RATE_FALLBACK as $sk => $sv) {
        foreach (['essential', 'standard', 'premium'] as $fk) {
            $key = $sk . '|' . $fk;
            $base = isset($db[$key]) ? (float)$db[$key]['base_rate'] : (float)$sv[$fk];
            $lab = isset($db[$key]) ? (float)$db[$key]['labour_pct'] : round(22.0 * (float)$n['labour_index'], 2);
            $wst = isset($db[$key]) ? (float)$db[$key]['waste_pct'] : (float)$n['waste_pct'];
            $rows[] = ['service_key' => $sk, 'service' => RGN_SERVICES[$sk], 'finish_key' => $fk, 'unit' => (string)$sv['unit'],
                'base_rate' => $base, 'labour_pct' => $lab, 'waste_pct' => $wst,
                'stored' => isset($db[$key]), 'updated_at' => (string)($db[$key]['updated_at'] ?? ''),
                'effective_rate' => round($base, 2), 'labour_index' => (float)$n['labour_index']];
        }
    }
    return ['node' => ['code' => $n['code'], 'city' => $n['city'], 'label' => $n['label'], 'dir' => $n['dir'], 'index' => (float)$n['labour_index'],
        'waste_pct' => (float)$n['waste_pct'], 'zone' => $n['zone'], 'lead_time_days' => (int)$n['lead_time_days'], 'tax_pct' => (float)$n['tax_pct']],
        'rows' => $rows, 'source' => rgn_have('wx_region_rate_cards') ? 'database' : 'template'];
}

function rgn_rate_sync_all(): int {
    if (!rgn_have('wx_region_rate_cards')) fail('Import _database/woodex-regions.sql first — wx_region_rate_cards is missing');
    $n = 0;
    foreach (rgn_nodes(true) as $code => $node) {
        foreach (RGN_RATE_FALLBACK as $sk => $sv) {
            foreach (['essential', 'standard', 'premium'] as $fk) {
                q('INSERT INTO wx_region_rate_cards (node,service_key,finish_key,unit,base_rate,labour_pct,waste_pct,active,updated_at) VALUES (?,?,?,?,?,?,?,1,?)
                   ON DUPLICATE KEY UPDATE unit=VALUES(unit), updated_at=VALUES(updated_at)',
                    [$code, $sk, $fk, (string)$sv['unit'], (float)$sv[$fk], round(22.0 * (float)$node['labour_index'], 2), (float)$node['waste_pct'], now()]);
                $n++;
            }
        }
    }
    return $n;
}

/** Monthly performance matrix per node (12 months) + totals. */
function rgn_reports(array $in): array {
    $codes = rgn_sel($in);
    $months = rgn_int($in['months'] ?? 12, 3, 24);
    $from = date('Y-m-01', strtotime('-' . ($months - 1) . ' months'));
    $to = date('Y-m-t');
    $w = ['from' => $from, 'to' => $to, 'bucket' => 'month', 'days' => (int)((strtotime($to) - strtotime($from)) / 86400) + 1, 'preset' => 'custom', 'label' => $from . ' → ' . $to, 'prev_from' => date('Y-m-01', strtotime('-' . ($months * 2 - 1) . ' months')), 'prev_to' => date('Y-m-d', strtotime($from . ' -1 day'))];
    $axis = rgn_axis($w);
    $leads = rgn_leads($codes, $w);
    $quotes = rgn_quotes($codes, $w, 1200);
    $projects = rgn_projects($codes, $w, []);
    $ledger = rgn_ledger($codes, $w, []);
    $mk = function ($rows, $key) { return array_column($rows, $key); };

    $matrix = [];
    foreach ($axis as $m) {
        $mm = substr($m, 0, 7);
        $l = array_filter($leads, function ($x) use ($mm) { return substr((string)$x['created_at'], 0, 7) === $mm; });
        $q = array_filter($quotes, function ($x) use ($mm) { return substr((string)$x['created_at'], 0, 7) === $mm; });
        $p = array_filter($projects, function ($x) use ($mm) { return substr((string)($x['created_at'] ?? ''), 0, 7) === $mm; });
        $rec = 0; $due = 0; $ovd = 0;
        foreach ($ledger as $row) {
            if (substr((string)$row['t'], 0, 7) === $mm) $rec += isset($row['paid']) ? (int)$row['paid'] : (int)$row['amount'];
            if (substr((string)$row['t'], 0, 7) === $mm) $due += isset($row['balance']) ? (int)$row['balance'] : 0;
            if (!empty($row['overdue']) && substr((string)$row['t'], 0, 7) <= $mm) $ovd += isset($row['balance']) ? (int)$row['balance'] : (int)$row['amount'];
        }
        $matrix[] = ['month' => $mm, 'label' => date('M Y', strtotime($m . '-01')), 'leads' => count($l), 'lead_value' => array_sum($mk($l, 'value')),
            'quotes' => count($q), 'quote_value' => array_sum($mk($q, 'total')), 'won' => count(array_filter($q, function ($x) { return (string)$x['status'] === 'approved'; })),
            'projects' => count($p), 'contract_value' => array_sum($mk($p, 'contract_value')), 'received' => $rec, 'receivable' => $due, 'overdue' => $ovd];
    }
    $byNode = [];
    foreach (rgn_nodes(true) as $code => $node) {
        if (!in_array($code, $codes, true)) continue;
        $l = array_filter($leads, function ($x) use ($code) { return (string)$x['node'] === $code; });
        $q = array_filter($quotes, function ($x) use ($code) { return (string)$x['region'] === $code; });
        $p = array_filter($projects, function ($x) use ($code) { return strtoupper((string)$x['node']) === $code; });
        $byNode[] = ['code' => $code, 'city' => $node['city'], 'leads' => count($l), 'lead_value' => array_sum($mk($l, 'value')),
            'quotes' => count($q), 'quote_value' => array_sum($mk($q, 'total')),
            'projects' => count($p), 'contract_value' => array_sum($mk($p, 'contract_value')),
            'win_rate' => count($q) ? (int)round(count(array_filter($q, function ($x) { return (string)$x['status'] === 'approved'; })) / count($q) * 100) : 0];
    }
    usort($byNode, function ($a, $b) { return $b['quote_value'] <=> $a['quote_value']; });
    return ['window' => $w, 'months' => $months, 'matrix' => $matrix, 'nodes' => $byNode, 'nodes_selected' => $codes,
        'best' => $byNode ? $byNode[0] : null, 'worst' => $byNode ? $byNode[count($byNode) - 1] : null,
        'totals' => ['leads' => array_sum($mk($leads, 'value')), 'lead_count' => count($leads), 'quote_count' => count($quotes),
            'quote_value' => array_sum($mk($quotes, 'total')), 'project_count' => count($projects), 'contract_value' => array_sum($mk($projects, 'contract_value'))]];
}

/* ------------------------------------------------- dispatcher */

function rgn_actions(string $action, array $in): bool {
    if (strpos($action, 'rgn_') !== 0) return false;
    $READ  = ['owner', 'admin', 'sales'];   // editor/support reach the registry + rate book through SHARED in roles-lib.php
    $WRITE = ['owner', 'admin', 'sales'];
    $OA    = ['owner', 'admin'];

    switch ($action) {
        case 'rgn_boot': {
            $u = need();
            $nodes = [];
            foreach (rgn_nodes() as $code => $n) {
                $nodes[] = ['code' => $code, 'city' => $n['city'], 'label' => $n['label'], 'dir' => $n['dir'], 'zone' => $n['zone'],
                    'labour_index' => (float)$n['labour_index'], 'waste_pct' => (float)$n['waste_pct'], 'tax_pct' => (float)$n['tax_pct'],
                    'advance_pct' => (float)$n['advance_pct'], 'lead_time_days' => (int)$n['lead_time_days'], 'active' => (bool)$n['active'],
                    'areas' => array_values((array)($n['areas'] ?? []))];
            }
            $V = rgn_variants();
            out(['ok' => true, 'user' => ['name' => (string)$u['name'], 'role' => (string)$u['role']], 'version' => RGN_SCHEMA_VER,
                'nodes' => $nodes, 'layouts' => rgn_layouts(), 'services' => RGN_SERVICES, 'presets' => rgn_presets(),
                'stages' => (array)(jread(RGN_NODES_TPL)['stages'] ?? []), 'categories' => (array)(jread(RGN_NODES_TPL)['categories'] ?? []),
                'species' => (array)($V['species'] ?? []), 'coatings' => (array)($V['coatings'] ?? []), 'cores' => (array)($V['cores'] ?? []),
                'hardware_kits' => (array)($V['hardware_kits'] ?? []), 'transport' => (array)($V['transport'] ?? []), 'formulas' => (array)($V['formulas'] ?? []),
                'tables' => ['nodes' => rgn_have('wx_region_nodes'), 'rate_cards' => rgn_have('wx_region_rate_cards'), 'projects' => rgn_have('wx_region_projects'),
                    'milestones' => rgn_have('wx_region_milestones'), 'ledger' => rgn_have('wx_region_ledger'), 'variants' => rgn_have('wx_region_variants'),
                    'lead_node_col' => rgn_have_col('wx_leads', 'node')],
                'currency' => 'PKR', 'tax_pct' => 18]);
        }
        case 'rgn_nodes': { need($READ); out(['ok' => true, 'nodes' => array_values(rgn_nodes()), 'stages' => (array)(jread(RGN_NODES_TPL)['stages'] ?? [])]); }
        case 'rgn_node_save': {
            $u = need($OA);
            $code = rgn_node((string)($in['node'] ?? ''))['code'];
            $ovr = jread(RGN_OVR_FILE);
            $ovr[$code] = ['labour_index' => max(0.5, min(2.0, (float)($in['labour_index'] ?? 1))),
                'waste_pct' => max(0, min(30, (float)($in['waste_pct'] ?? 12))),
                'tax_pct' => max(0, min(30, (float)($in['tax_pct'] ?? 18))),
                'advance_pct' => max(0, min(100, (float)($in['advance_pct'] ?? 40))),
                'lead_time_days' => rgn_int($in['lead_time_days'] ?? 14, 1, 180),
                'active' => !empty($in['active']) ? 1 : 0, 'updated_at' => now(), 'by' => (string)$u['name']];
            jwrite(RGN_OVR_FILE, $ovr);
            log_act($u, 'regional.node.save', $code . ' index ' . $ovr[$code]['labour_index'] . ' · waste ' . $ovr[$code]['waste_pct'] . '%');
            out(['ok' => true, 'node' => rgn_node($code)]);
        }
        case 'rgn_kpis': { need($READ); out(['ok' => true] + rgn_kpis($in)); }
        case 'rgn_leads': {
            need($READ);
            $w = rgn_window($in); $codes = rgn_sel($in);
            $rows = rgn_leads($codes, $w);
            $q = mb_strtolower(trim((string)($in['q'] ?? '')));
            if ($q !== '') $rows = array_values(array_filter($rows, function ($r) use ($q) {
                foreach (['name', 'phone', 'email', 'service', 'location', 'budget', 'tags', 'node'] as $k) if (mb_strpos(mb_strtolower((string)($r[$k] ?? '')), $q) !== false) return true;
                return false;
            }));
            foreach ((array)($in['stages'] ?? []) as $s) { if (!is_string($s) || $s === '') continue; $rows = array_values(array_filter($rows, function ($r) use ($s) { return (string)$r['stage'] === $s; })); }
            foreach ((array)($in['priorities'] ?? []) as $p) { if (!is_string($p) || $p === '') continue; $rows = array_values(array_filter($rows, function ($r) use ($p) { return (string)($r['priority'] ?? '') === $p; })); }
            if (!empty($in['unread'])) $rows = array_values(array_filter($rows, function ($r) { return empty($r['is_read']); }));
            if (!empty($in['min_value'])) $rows = array_values(array_filter($rows, function ($r) use ($in) { return (int)$r['value'] >= (int)$in['min_value']; }));
            $sort = (string)($in['sort'] ?? 'created_at');
            usort($rows, function ($a, $b) use ($sort) { return $sort === 'value' ? ((int)$b['value'] <=> (int)$a['value']) : strcmp((string)$b['created_at'], (string)$a['created_at']); });
            $per = rgn_int($in['per'] ?? 40, 10, 200); $page = rgn_int($in['page'] ?? 1, 1, 500);
            $total = count($rows);
            $facets = ['stages' => [], 'priorities' => [], 'nodes' => []];
            foreach ($rows as $r) {
                $s = (string)$r['stage']; $facets['stages'][$s] = ($facets['stages'][$s] ?? 0) + 1;
                $p = (string)($r['priority'] ?? 'normal'); $facets['priorities'][$p] = ($facets['priorities'][$p] ?? 0) + 1;
                $facets['nodes'][(string)$r['node']] = ($facets['nodes'][(string)$r['node']] ?? 0) + 1;
            }
            out(['ok' => true, 'rows' => array_slice($rows, ($page - 1) * $per, $per), 'total' => $total, 'page' => $page, 'per' => $per,
                'facets' => $facets, 'window' => $w, 'nodes_selected' => $codes,
                'sum_value' => (int)array_sum(array_column($rows, 'value'))]);
        }
        case 'rgn_projects': { need($READ); $w = rgn_window($in); $codes = rgn_sel($in); out(['ok' => true, 'rows' => rgn_projects($codes, $w, $in), 'window' => $w, 'nodes_selected' => $codes]); }
        case 'rgn_project_get': {
            need($READ);
            if (!rgn_have('wx_region_projects')) fail('The regional tables are not imported yet');
            $id = (int)($in['id'] ?? 0);
            $p = q('SELECT * FROM wx_region_projects WHERE id=?', [$id])->fetch(); if (!$p) fail('Project not found', 404);
            rgn_node((string)$p['node']);
            $ms = rgn_have('wx_region_milestones') ? q('SELECT * FROM wx_region_milestones WHERE project_id=? ORDER BY seq', [$id])->fetchAll() : [];
            $lg = rgn_have('wx_region_ledger') ? q('SELECT * FROM wx_region_ledger WHERE project_id=? ORDER BY t DESC LIMIT 100', [$id])->fetchAll() : [];
            out(['ok' => true, 'project' => $p, 'spec' => json_decode((string)($p['spec_json'] ?? ''), true), 'milestones' => $ms, 'ledger' => $lg,
                'node' => rgn_node((string)$p['node'])]);
        }
        case 'rgn_project_save': { $u = need($WRITE); out(['ok' => true, 'project' => rgn_project_save($u, $in)]); }
        case 'rgn_milestones': { need($READ); $w = rgn_window($in); $codes = rgn_sel($in); out(['ok' => true, 'rows' => rgn_milestones($codes, $w, $in), 'window' => $w]); }
        case 'rgn_milestone_save': {
            $u = need($WRITE);
            if (!rgn_have('wx_region_milestones')) fail('Import _database/woodex-regions.sql first');
            $pid = (int)($in['project_id'] ?? 0);
            $p = q('SELECT id,node FROM wx_region_projects WHERE id=?', [$pid])->fetch(); if (!$p) fail('Project not found', 404);
            $id = (int)($in['id'] ?? 0);
            $row = [rgn_int($in['seq'] ?? 10, 1, 999), clip($in['name'] ?? '', 160), clip($in['kind'] ?? 'progress', 20),
                max(0, min(100, (float)($in['weight_pct'] ?? 10))), rgn_money($in['amount'] ?? 0),
                rgn_dt($in['due_date'] ?? '') ?: null, clip($in['note'] ?? '', 500)];
            if ($row[1] === '') fail('Milestone name is required');
            if ($id > 0) {
                $cur = q('SELECT id FROM wx_region_milestones WHERE id=? AND project_id=?', [$id, $pid])->fetch(); if (!$cur) fail('Milestone not found', 404);
                q('UPDATE wx_region_milestones SET seq=?,name=?,kind=?,weight_pct=?,amount=?,due_date=?,note=? WHERE id=?', array_merge($row, [$id]));
            } else {
                q('INSERT INTO wx_region_milestones (project_id,node,seq,name,kind,weight_pct,amount,due_date,status,note) VALUES (?,?,?,?,?,?,?,?,?,?)',
                    array_merge([$pid, (string)$p['node']], $row, ['pending']));
                $id = (int)db()->lastInsertId();
            }
            log_act($u, 'regional.milestone.save', '#' . $id . ' · project #' . $pid . ' · ' . $row[1]);
            out(['ok' => true, 'id' => $id]);
        }
        case 'rgn_milestone_approve': {
            $u = need($OA);
            if (!rgn_have('wx_region_milestones')) fail('Import _database/woodex-regions.sql first');
            $id = (int)($in['id'] ?? 0);
            $m = q('SELECT * FROM wx_region_milestones WHERE id=?', [$id])->fetch(); if (!$m) fail('Milestone not found', 404);
            $to = in_array((string)($in['status'] ?? 'approved'), ['approved', 'rejected', 'pending'], true) ? (string)$in['status'] : 'approved';
            $note = clip($in['note'] ?? '', 500);
            q('UPDATE wx_region_milestones SET status=?, approved_by=?, done_at=?, note=? WHERE id=?',
                [$to, $to === 'approved' ? (string)$u['name'] : null, $to === 'approved' ? now() : null, $note, $id]);
            $posted = 0;
            if ($to === 'approved' && !empty($in['post_payment']) && rgn_have('wx_region_ledger')) {
                $amt = rgn_money($in['amount'] ?? $m['amount']);
                q('INSERT INTO wx_region_ledger (node,project_id,kind,ref,party,amount,status,t,due_date,note,user_name) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                    [(string)$m['node'], (int)$m['project_id'], 'invoice', '', (string)($in['party'] ?? ''), $amt, 'due', now(),
                     date('Y-m-d', strtotime('+15 days')), 'Milestone approval: ' . (string)$m['name'], (string)$u['name']]);
                $posted = $amt;
            }
            $open = (int)q("SELECT COUNT(*) FROM wx_region_milestones WHERE project_id=? AND status='pending'", [(int)$m['project_id']])->fetchColumn();
            if ($open === 0 && rgn_have('wx_region_projects') && (string)($in['stage'] ?? '')) {
                q('UPDATE wx_region_projects SET stage=?, updated_at=? WHERE id=?', [clip($in['stage'], 20), now(), (int)$m['project_id']]);
            }
            log_act($u, 'regional.milestone.' . $to, '#' . $id . ' · ' . (string)$m['name'] . ' · project #' . (int)$m['project_id'] . ($posted ? ' · invoiced ' . rgn_pkr($posted) : ''));
            out(['ok' => true, 'id' => $id, 'status' => $to, 'posted' => $posted, 'remaining' => $open]);
        }
        case 'rgn_ledger': { need($READ); $w = rgn_window($in); $codes = rgn_sel($in); out(['ok' => true, 'rows' => rgn_ledger($codes, $w, $in), 'window' => $w, 'nodes_selected' => $codes]); }
        case 'rgn_ledger_save': {
            $u = need($WRITE);
            if (!rgn_have('wx_region_ledger')) fail('Import _database/woodex-regions.sql first');
            $node = rgn_node((string)($in['node'] ?? ''))['code'];
            $kind = in_array((string)($in['kind'] ?? ''), ['invoice', 'receipt', 'po', 'labour'], true) ? (string)$in['kind'] : 'invoice';
            $status = in_array((string)($in['status'] ?? ''), ['due', 'partial', 'paid', 'cancelled'], true) ? (string)$in['status'] : 'due';
            $id = (int)($in['id'] ?? 0);
            $row = [$node, (int)($in['project_id'] ?? 0) ?: null, $kind, clip($in['ref'] ?? '', 40), clip($in['party'] ?? '', 160),
                rgn_money($in['amount'] ?? 0), $status, rgn_dt($in['t'] ?? '') ?: now(), rgn_dt($in['due_date'] ?? '') ?: null, clip($in['note'] ?? '', 300), (string)$u['name']];
            if ((int)$row[5] <= 0) fail('Amount must be greater than zero');
            if ($id > 0) {
                $cur = q('SELECT id FROM wx_region_ledger WHERE id=?', [$id])->fetch(); if (!$cur) fail('Entry not found', 404);
                q('UPDATE wx_region_ledger SET node=?,project_id=?,kind=?,ref=?,party=?,amount=?,status=?,t=?,due_date=?,note=?,user_name=? WHERE id=?', array_merge($row, [$id]));
            } else { q('INSERT INTO wx_region_ledger (node,project_id,kind,ref,party,amount,status,t,due_date,note,user_name) VALUES (?,?,?,?,?,?,?,?,?,?,?)', $row); $id = (int)db()->lastInsertId(); }
            log_act($u, 'regional.ledger.save', $kind . ' ' . $node . ' ' . rgn_pkr($row[5]) . ' · ' . $row[4]);
            out(['ok' => true, 'id' => $id]);
        }
        case 'rgn_estimate': {
            $u = need($READ);
            $calc = rgn_calc($in);
            if (!empty($in['save_log'])) rgn_log_estimate($u, $calc, $in);
            out(['ok' => true] + $calc);
        }
        case 'rgn_quote': {
            $u = need($WRITE);
            $res = rgn_quote_create($u, $in);
            out(['ok' => true, 'quote' => $res['quote'], 'project' => $res['project'], 'milestones' => $res['milestones'],
                'calc' => ['recon' => $res['calc']['recon'], 'lines' => $res['calc']['lines'], 'panels' => $res['calc']['panels'], 'runs' => $res['calc']['runs'],
                    'spec' => $res['calc']['spec'], 'node' => $res['calc']['node']['code']]]);
        }
        case 'rgn_rates': { need($READ); out(['ok' => true] + rgn_rate_cards((string)($in['node'] ?? ''))); }
        case 'rgn_rate_save': {
            $u = need($OA);
            if (!rgn_have('wx_region_rate_cards')) fail('Import _database/woodex-regions.sql first');
            $node = rgn_node((string)($in['node'] ?? ''))['code'];
            $service = (string)($in['service_key'] ?? '');
            if (!isset(RGN_RATE_FALLBACK[$service])) fail('Unknown service key');
            $finish = in_array((string)($in['finish_key'] ?? ''), ['essential', 'standard', 'premium'], true) ? (string)$in['finish_key'] : 'standard';
            $base = max(0, (float)($in['base_rate'] ?? 0));
            $lab = max(0, min(60, (float)($in['labour_pct'] ?? 0)));
            $waste = max(0, min(30, (float)($in['waste_pct'] ?? 0)));
            q('INSERT INTO wx_region_rate_cards (node,service_key,finish_key,unit,base_rate,labour_pct,waste_pct,active,updated_at) VALUES (?,?,?,?,?,?,?,1,?)
               ON DUPLICATE KEY UPDATE unit=VALUES(unit), base_rate=VALUES(base_rate), labour_pct=VALUES(labour_pct), waste_pct=VALUES(waste_pct), active=1, updated_at=VALUES(updated_at)',
                [$node, $service, $finish, (string)RGN_RATE_FALLBACK[$service]['unit'], $base, $lab, $waste, now()]);
            log_act($u, 'regional.rate.save', $node . ' · ' . $service . ' · ' . $finish . ' → PKR ' . $base);
            out(['ok' => true] + rgn_rate_cards($node));
        }
        case 'rgn_rate_sync': {
            $u = need($OA);
            $n = rgn_rate_sync_all();
            log_act($u, 'regional.rate.sync', $n . ' rows across 12 nodes');
            out(['ok' => true, 'rows' => $n]);
        }
        case 'rgn_variants': {
            need($READ);
            $V = rgn_variants();
            $node = (string)($in['node'] ?? '');
            $ovr = [];
            if ($node !== '' && rgn_have('wx_region_variants')) {
                $code = rgn_node($node)['code'];
                foreach (q('SELECT * FROM wx_region_variants WHERE node=? AND active=1', [$code])->fetchAll() as $r) $ovr[] = $r;
            }
            out(['ok' => true, 'species' => (array)($V['species'] ?? []), 'coatings' => (array)($V['coatings'] ?? []), 'cores' => (array)($V['cores'] ?? []),
                'hardware_kits' => (array)($V['hardware_kits'] ?? []), 'transport' => (array)($V['transport'] ?? []), 'labour_split' => (array)($V['labour_split'] ?? []),
                'formulas' => (array)($V['formulas'] ?? []), 'overrides' => $ovr]);
        }
        case 'rgn_variant_save': {
            $u = need($OA);
            if (!rgn_have('wx_region_variants')) fail('Import _database/woodex-regions.sql first');
            $node = rgn_node((string)($in['node'] ?? ''))['code'];
            $species = clip($in['species_code'] ?? '', 40);
            $codes = array_column((array)(rgn_variants()['species'] ?? []), 'code');
            if (!in_array($species, $codes, true)) fail('Unknown species code');
            $coating = clip($in['coating_code'] ?? '', 40) ?: null;
            $core = clip($in['core_code'] ?? '', 30) ?: null;
            $rateBf = array_key_exists('rate_bf', $in) ? max(0, (float)$in['rate_bf']) : null;
            $coatRate = array_key_exists('coat_rate_sqft', $in) ? max(0, (float)$in['coat_rate_sqft']) : null;
            $lab = array_key_exists('labour_pct', $in) ? max(0, min(60, (float)$in['labour_pct'])) : null;
            $waste = array_key_exists('waste_pct', $in) ? max(0, min(30, (float)$in['waste_pct'])) : null;
            q('INSERT INTO wx_region_variants (node,species_code,coating_code,core_code,rate_bf,coat_rate_sqft,labour_pct,waste_pct,active,updated_at) VALUES (?,?,?,?,?,?,?,?,1,?)
               ON DUPLICATE KEY UPDATE rate_bf=VALUES(rate_bf), coat_rate_sqft=VALUES(coat_rate_sqft), labour_pct=VALUES(labour_pct), waste_pct=VALUES(waste_pct), active=1, updated_at=VALUES(updated_at)',
                [$node, $species, $coating, $core, $rateBf, $coatRate, $lab, $waste, now()]);
            log_act($u, 'regional.variant.save', $node . ' · ' . $species . ($coating ? ' + ' . $coating : '') . ' → ' . ($rateBf !== null ? 'PKR ' . $rateBf . '/bf' : 'inherit'));
            out(['ok' => true]);
        }
        case 'rgn_reports': { need($READ); out(['ok' => true] + rgn_reports($in)); }
        case 'rgn_health': { need($READ); out(['ok' => true] + rgn_health($in)); }
        case 'rgn_export': { need($READ); out(['ok' => true] + rgn_export($in)); }
        default: fail('Unknown regional action', 404);
    }
    return true;
}
