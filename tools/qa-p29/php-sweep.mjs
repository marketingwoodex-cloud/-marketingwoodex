/**
 * php-sweep.mjs — execute EVERY API action against the real PHP, locally, and classify the result.
 *
 * Runs in a scratch copy of the project (.qa-run/project) so no action can touch the source
 * tree, with the database on SQLite (api/_lib/db-sqlite.php) and every outbound secret blanked
 * so nothing can reach Telegram / WhatsApp / Google / SMTP for real.
 *
 * What it proves: which actions answer, which are correctly refused for a role, and — the point
 * of the exercise — which ones crash the PHP (fatal), fail the database layer (translation gap)
 * or emit warnings/notices nobody sees in production.
 *
 *   node php-sweep.mjs                    # everything (352 admin + builder/chat/forms)
 *   node php-sweep.mjs --limit 25         # quick pass
 *   node php-sweep.mjs --actions users,status,media_list
 *   node php-sweep.mjs --fresh            # rebuild the sandbox copy + database first
 *   node php-sweep.mjs --sessions owner,anon
 */
import { cpSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { createRunner, loadAccounts, DEFAULT_PROJECT } from './php-runner.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);
const RUN_DIR = join(HERE, '.qa-run');
const SANDBOX = join(RUN_DIR, 'project');
const OUT_DIR = join(HERE, '.qa-out');
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d = null) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };

/** Copy of the project the sweep is allowed to mutate. */
function prepareSandbox(fresh) {
  if (fresh || !existsSync(join(SANDBOX, 'api/admin.php'))) {
    rmSync(RUN_DIR, { recursive: true, force: true });
    mkdirSync(RUN_DIR, { recursive: true });
    cpSync(DEFAULT_PROJECT, SANDBOX, { recursive: true });
  }
  return SANDBOX;
}

/** case '...' labels per file = the action surface, straight from the source. */
function extractActions(projectDir) {
  const out = {};
  for (const f of readdirSync(join(projectDir, 'api'))) {
    if (!f.endsWith('.php')) continue;
    const src = readFileSync(join(projectDir, 'api', f), 'utf8');
    const set = new Set();
    for (const m of src.matchAll(/case\s+'([a-z0-9_]+)'\s*:/g)) set.add(m[1]);
    if (set.size) out[f] = [...set];
  }
  return out;
}

const redact = (s) => String(s ?? '')
  .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>')
  .replace(/\b\d{6,}:[A-Za-z0-9_-]{25,}\b/g, '<token>')
  .replace(/Bearer\s+\S+/gi, 'Bearer <token>')
  .slice(0, 300);

/** PHP warnings / notices the browser never shows but the error log always gets. */
function warningLines(errors, text) {
  const seen = new Set();
  for (const m of String(errors + '\n' + text).matchAll(/PHP (Warning|Notice|Deprecated|Fatal error):\s*([^\n<]{0,220})/g)) {
    seen.add(m[1] + ': ' + m[2].replace(/\.php on line (\d+)/, '.php:$1').trim());
  }
  return [...seen];
}

function classify(res) {
  const text = String(res.text ?? '');
  const errors = String(res.errors ?? '');
  const all = text + errors;
  const msg = res.json?.error ?? '';
  const warns = warningLines(errors, text);
  if (/Fatal error|Parse error|Uncaught\s+\w+(Error|Exception)/.test(all)) {
    const m = all.match(/(?:Fatal error|Parse error|Uncaught[^:]*):\s*([^\n<]{0,200})/);
    return { kind: 'FATAL', msg: redact(m ? m[1] : all.slice(0, 160)), warns };
  }
  if (!res.json) {
    if (res.status >= 500) return { kind: 'FATAL', msg: redact(text.replace(/<[^>]+>/g, ' ').slice(0, 160) || 'empty 500 body'), warns };
    if (res.status === 403 || res.status === 405 || res.status === 401) return { kind: 'gated-text', msg: redact(text.replace(/<[^>]+>/g, ' ').slice(0, 120)), warns };
    return { kind: 'NON-JSON', msg: redact(text.replace(/<[^>]+>/g, ' ').slice(0, 160)), warns };
  }
  if (res.json.ok === false || msg) {
    if (res.status >= 500) return { kind: /database error/i.test(String(msg)) ? 'DB-ERROR' : 'SERVER-500', msg: redact(msg) };
    if (res.status === 503) return { kind: 'NO-DB', msg: redact(msg) };
    if (res.status === 401 || res.status === 403) return { kind: 'gated', msg: redact(msg) };
    if (res.status === 429) return { kind: 'throttled', msg: redact(msg) };
    if (res.status === 404) return { kind: 'not-found', msg: redact(msg) };
    return { kind: 'validated', msg: redact(msg), warns };
  }
  return { kind: 'ok', msg: '', warns };
}

/** Blank every outbound credential in the sandbox so no action can call a real service. */
async function sanitizeSecrets(runner) {
  const out = await runner.phpRun(`
    require ${JSON.stringify(join(SANDBOX, 'api/_lib/db.php'))};
    $c = json_decode((string)file_get_contents(${JSON.stringify(join(SANDBOX, '_private/db.json'))}), true);
    $pdo = wx_db($c);
    $cleared = [];
    foreach ($pdo->query('SELECT k,v FROM wx_settings')->fetchAll(PDO::FETCH_ASSOC) as $r) {
      if (preg_match('~token|secret|key|pass|webhook|smtp|api~i', (string)$r['k']) && trim((string)$r['v']) !== '') {
        $pdo->prepare('UPDATE wx_settings SET v=? WHERE k=?')->execute(['', $r['k']]);
        $cleared[] = $r['k'];
      }
    }
    $files = 0;
    foreach (glob(${JSON.stringify(join(SANDBOX, '_private'))} . '/*.json') as $f) {
      $j = json_decode((string)file_get_contents($f), true);
      if (!is_array($j)) continue;
      $w = false;
      array_walk_recursive($j, function (&$v, $k) use (&$w) {
        if (is_string($v) && $v !== '' && preg_match('~token|secret|key|pass|smtp|api_key|bearer~i', (string)$k)) { $v = ''; $w = true; }
      });
      if ($w) { file_put_contents($f, json_encode($j, JSON_PRETTY_PRINT)); $files++; }
    }
    echo json_encode(['settingsCleared' => $cleared, 'filesCleared' => $files]);
  `);
  return out.json ?? { settingsCleared: [], filesCleared: 0, error: out.text.slice(0, 200) };
}

async function resetThrottle(runner) {
  await runner.phpRun(`
    require ${JSON.stringify(join(SANDBOX, 'api/_lib/db.php'))};
    $c = json_decode((string)file_get_contents(${JSON.stringify(join(SANDBOX, '_private/db.json'))}), true);
    wx_db($c)->exec('DELETE FROM wx_throttle');
    echo json_encode(['ok' => true]);
  `);
}

const main = async () => {
  const fresh = has('--fresh');
  prepareSandbox(fresh);
  let runner = await createRunner({ projectDir: SANDBOX, trace: true });
  const restartEvery = Number(val('--restart-every', '120')) || 0;
  let sinceRestart = 0, restarts = 0, recovered = 0, aborts = 0;

  /* One WASM PHP process serves thousands of requests in this harness; its heap grows until the
     runtime aborts (Aborted()). Production PHP gets a fresh process per request, so this is a
     harness limit, not an app defect — restart the runtime before that happens and recover if it
     ever does. The database, sessions and tokens all live in files, so nothing is lost. */
  const reboot = async (why) => {
    try { await runner.close(); } catch { /* already gone */ }
    runner = await createRunner({ projectDir: SANDBOX, trace: true });
    sinceRestart = 0; restarts++;
    const rss = Math.round(process.memoryUsage().rss / 1048576);
    console.log(`  [runtime restart ${restarts} · ${why} · node rss ${rss}MB]`);
  };
  const isAbort = (res) => !res || /Aborted\(\)|RuntimeError|memory access out of bounds/.test(String(res.text ?? '') + String(res.errors ?? ''));

  runner.useSqlite({});
  if (fresh || !existsSync(join(SANDBOX, '_private/woodex.sqlite'))) {
    const inst = await runner.install();
    if (inst.errors?.length) console.log('SCHEMA ISSUES: ' + JSON.stringify(inst.errors, null, 1));
  }
  const accounts = loadAccounts();
  const seeded = await runner.seed(accounts, { reset: true });
  const sanitized = await sanitizeSecrets(runner);

  // ---- sessions
  const wanted = (val('--sessions') ?? '').split(',').filter(Boolean);
  const sessions = [{ label: 'anon', token: null, builder: null }];
  for (const a of accounts) {
    if (wanted.length && !wanted.includes(a.role) && !wanted.includes(a.email)) continue;
    const l = await runner.login(a.email, a.password);
    if (!l.token) { console.log(`! login failed for ${a.email} (${a.role}): ${l.error}`); continue; }
    sessions.push({ label: a.role, email: a.email, token: l.token, builder: l.builderToken });
  }

  // ---- action surface
  const perFile = extractActions(SANDBOX);
  const adminActions = new Set();
  for (const [f, list] of Object.entries(perFile)) {
    if (['builder.php', 'chat.php', 'forms.php', 'whatsapp.php', 'telegram.php'].includes(f)) continue;
    for (const a of list) adminActions.add(a);
  }
  const only = (val('--actions') ?? '').split(',').filter(Boolean);
  const limit = Number(val('--limit', '0')) || 0;
  let list = [...adminActions].sort();
  if (only.length) list = list.filter((a) => only.includes(a));
  if (limit) list = list.slice(0, limit);

  const builderActions = (perFile['builder.php'] ?? []).sort();
  console.log(`sandbox ${SANDBOX}`);
  console.log(`actions: ${list.length} admin.php + ${builderActions.length} builder.php · sessions: ${sessions.map((s) => s.label).join(', ')}`);
  console.log(`schema: tables=${(await runner.install === undefined) ? '?' : ''}${''} seeded=${seeded.users} users · secrets blanked: ${sanitized.settingsCleared?.length ?? 0} settings, ${sanitized.filesCleared ?? 0} files`);

  const results = [];
  const t0 = Date.now();
  let n = 0;

  const call = async (endpoint, action, session, extra = {}) => {
    if (endpoint === '/api/admin.php') await resetThrottle(runner);
    if (restartEvery && sinceRestart >= restartEvery) await reboot('scheduled');
    const started = Date.now();
    const send = async () => {
      try {
        return await runner.request({ action, url: endpoint, token: session.token, ...extra });
      } catch (e) {
        return { status: 0, text: String(e.message ?? e), json: null, errors: String(e.message ?? e), notices: [] };
      }
    };
    let res = await send();
    if (isAbort(res)) {
      aborts++;
      await reboot('runtime aborted');
      res = await send();      // one retry on a clean runtime
      if (isAbort(res)) { recovered++; }
    }
    sinceRestart++;
    const ms = Date.now() - started;
    const c = classify(res);
    const row = {
      endpoint, action, session: session.label, status: res.status, ms,
      kind: c.kind, msg: c.msg,
      warns: c.warns ?? [],
      okKeys: res.json && typeof res.json === 'object' ? Object.keys(res.json).filter((k) => k !== 'ok').slice(0, 6).join(',') : '',
    };
    results.push(row);
    n++;
    if (n % 40 === 0) console.log(`  ${n} calls · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    return row;
  };

  for (const action of list) {
    for (const s of sessions) await call('/api/admin.php', action, s);
  }
  for (const action of builderActions) {
    for (const s of sessions) {
      const extra = { headers: s.builder ? { 'X-WX-CSRF': s.builder } : {} };
      await call('/api/builder.php', action, s, extra);
    }
  }
  // Public endpoints: one anon call each, plus a GET.
  for (const [endpoint, actions] of [['/api/chat.php', ['cfg']], ['/api/forms.php', ['wa_click']]]) {
    for (const action of actions) await call(endpoint, action, { label: 'anon', token: null });
  }
  await call('/api/whatsapp.php', 'status', { label: 'anon', token: null }, { method: 'GET' });

  // ---- scoreboard
  const byKind = {};
  for (const r of results) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  const bad = results.filter((r) => ['FATAL', 'DB-ERROR', 'SERVER-500', 'NON-JSON'].includes(r.kind));
  const slow = [...results].sort((a, b) => b.ms - a.ms).slice(0, 12);

  /* Count PHP warnings by their text — one entry per distinct defect, with the actions hit. */
  const warnMap = new Map();
  for (const r of results) {
    for (const w of r.warns ?? []) {
      const e = warnMap.get(w) ?? { warning: w, calls: 0, actions: new Set() };
      e.calls++; e.actions.add(r.action);
      warnMap.set(w, e);
    }
  }
  const warn = [...warnMap.values()].map((e) => ({ warning: e.warning, calls: e.calls, actions: [...e.actions].slice(0, 8) }))
    .sort((a, b) => b.calls - a.calls);

  /* Translation counts come from the trace file: PHP statics reset between requests. */
  const traceFile = join(SANDBOX, '_private/qa-sql-trace.log');
  const sqlTranslations = {};
  if (existsSync(traceFile)) {
    for (const line of readFileSync(traceFile, 'utf8').split('\n')) {
      const tag = line.split('\t')[1];
      if (tag) sqlTranslations[tag] = (sqlTranslations[tag] ?? 0) + 1;
    }
  }
  const stats = { translations: sqlTranslations };

  const report = {
    generatedAt: new Date().toISOString(),
    sandbox: SANDBOX,
    totals: { calls: results.length, actions: list.length, builderActions: builderActions.length, sessions: sessions.length, seconds: Math.round((Date.now() - t0) / 1000), runtimeRestarts: restarts, runtimeAborts: aborts, unrecovered: recovered },
    byKind,
    sqlTranslations: stats.translations,
    sanitized: { settingsCleared: sanitized.settingsCleared, filesCleared: sanitized.filesCleared },
    bad: bad.map((r) => ({ ...r, text: undefined })),
    warnings: warn.slice(0, 80),
    slow,
    results,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'php-sweep.json'), JSON.stringify(report, null, 1));

  // ---- console summary
  console.log('\n=== by kind ===');
  for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(12)} ${v}`);
  console.log(`\nSQL translations from the trace log: ${JSON.stringify(stats.translations)}`);
  if (bad.length) {
    console.log(`\n=== ${bad.length} action(s) to fix ===`);
    for (const r of bad.slice(0, 60)) console.log(`  ${r.kind.padEnd(10)} ${r.action.padEnd(22)} [${r.session.padEnd(9)}] ${r.status} ${r.msg}`);
  }
  if (warn.length) {
    console.log(`\n=== ${warn.length} distinct PHP warning(s) — browser-invisible defects ===`);
    for (const w of warn.slice(0, 30)) console.log(`  ${String(w.calls).padStart(5)}x  ${w.warning.slice(0, 150)}\n         actions: ${w.actions.join(', ')}`);
  }
  console.log('\nslowest:');
  for (const s of slow) console.log(`  ${String(s.ms).padStart(6)}ms ${s.action} [${s.session}] ${s.kind}`);
  console.log(`\nartifact: ${join(OUT_DIR, 'php-sweep.json')}`);

  await runner.close();
  process.exit(0);
};

main().catch((e) => { console.error(e); process.exit(1); });
