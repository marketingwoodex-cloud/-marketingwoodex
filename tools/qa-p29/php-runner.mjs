/**
 * php-runner.mjs — run the real PHP API locally, with no MySQL server.
 *
 * PHP 8.3 compiled to WebAssembly (@php-wasm) executes the project's own files
 * against the host filesystem, so api/admin.php and friends run unmodified.
 * The database is a SQLite file driven through api/_lib/db-sqlite.php, which
 * translates the MySQL dialect the API is written in (every translation is
 * logged when trace is on).
 *
 * Usage
 *   node php-runner.mjs --check               # boot PHP, print version + extensions
 *   node php-runner.mjs --status              # run one real API action
 *   node php-runner.mjs --install             # create the SQLite DB from the schema
 *   node php-runner.mjs --seed               # create the QA logins
 *   node php-runner.mjs --action users        # send an action as the owner
 *
 * As a library:
 *   const r = await createRunner({ projectDir, trace: true });
 *   await r.install(); await r.seed(accounts);
 *   const res = await r.request({ action: 'status' });
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { PHP, PHPRequestHandler } from '@php-wasm/universal';
import { loadNodeRuntime, useHostFilesystem } from '@php-wasm/node';

const HERE = dirname(new URL(import.meta.url).pathname);
export const DEFAULT_PROJECT = resolve(HERE, '../../woodex-live-p29-v2.1-pro');
const PHP_VERSION = '8.3';

const enc = new TextEncoder();
const body = (o) => enc.encode(typeof o === 'string' ? o : JSON.stringify(o));

/** Read a JSON file, tolerating absence. */
function readJson(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

export async function createRunner(opts = {}) {
  const projectDir = opts.projectDir ?? DEFAULT_PROJECT;
  const trace = opts.trace !== false;
  const priv = join(projectDir, '_private');
  const dbFile = join(priv, 'db.json');
  const errLog = join(priv, 'qa-php-error.log');

  const php = new PHP(await loadNodeRuntime(PHP_VERSION, { emscriptenOptions: { processId: 1 } }));
  useHostFilesystem(php);
  php.mkdirTree(projectDir);
  // php-wasm runs with display_errors=1 + error_reporting=E_ALL: PHP warnings land in the
  // response body and stderr, which is exactly what a sweep wants to see.

  const handler = new PHPRequestHandler({
    php,
    documentRoot: projectDir,
    absoluteUrl: 'http://woodex.local',
  });

  const Q = (s) => JSON.stringify(String(s));  // safe single-line string for PHP source

  /** Pull the first balanced JSON object out of a body that may carry PHP warnings. */
  function extractJson(text) {
    const start = text.indexOf('{');
    if (start < 0) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (!depth) { try { return JSON.parse(text.slice(start, i + 1)); } catch { /* keep scanning */ } } }
    }
    return null;
  }

  const NOTICE_RE = /(?:<b>)?\b(Fatal error|Parse error|Warning|Notice|Deprecated|Uncaught\s+\w+)\b/g;
  function phpNotices(text) {
    const found = new Set();
    for (const m of String(text).matchAll(NOTICE_RE)) found.add(m[1]);
    return [...found];
  }

  /** Run a PHP snippet, return { json, text, errors, exitCode }. */
  async function phpRun(code) {
    let res;
    try {
      res = await php.run({ code: `<?php error_reporting(E_ALL); ${code}` });
    } catch (e) {
      // A PHP fatal makes run() throw; the response holds the error text — report, do not crash.
      res = e.response ?? {};
      if (!res.text && e.message) res = { text: e.message, errors: e.message, exitCode: 255 };
    }
    const text = String(res.text ?? '');
    const errors = String(res.errors ?? '');
    return { json: extractJson(text), text, errors, exitCode: res.exitCode, notices: phpNotices(text + errors) };
  }

  /** Send one API request the way the browser does. */
  async function request({ action, body: payload = {}, token = null, url = '/api/admin.php', method = 'POST', headers = {}, raw = null, contentType = 'application/json' } = {}) {
    const h = { 'Content-Type': contentType, ...headers };
    if (token) h['X-WX-ADM'] = token;
    let data = raw;
    if (data == null) {
      data = method === 'GET'
        ? body({ action })
        : body({ action, ...payload });
    } else if (typeof data === 'string' || data instanceof Uint8Array) {
      data = typeof data === 'string' ? enc.encode(data) : data;
    }
    const target = url + (method === 'GET' ? (url.includes('?') ? '&' : '?') + 'action=' + encodeURIComponent(String(action)) : '');
    const res = await handler.request({ method, url: target, headers: h, body: data });
    const text = String(res.text ?? '');
    const errors = String(res.errors ?? '');
    return {
      action,
      status: res.httpStatusCode,
      json: extractJson(text),
      text,
      errors,
      notices: phpNotices(text + errors),
      headers: res.headers,
    };
  }

  /** Raw pass-through: send exactly this method/url/headers/body to PHP (used by the preview server). */
  async function raw({ method = 'GET', url = '/', headers = {}, body = undefined } = {}) {
    const res = await handler.request({ method, url, headers, body });
    return {
      status: res.httpStatusCode,
      headers: res.headers ?? {},
      bytes: res.bytes ?? null,
      text: String(res.text ?? ''),
      errors: String(res.errors ?? ''),
    };
  }

  /** Write _private/db.json in sqlite mode (QA only — hosting uses mysql). */
  function useSqlite({ file = '_private/woodex.sqlite', traceOn = trace } = {}) {
    if (!existsSync(priv)) mkdirSync(priv, { recursive: true });
    const cur = readJson(dbFile, {}) ?? {};
    const cfg = {
      driver: 'sqlite',
      file,
      trace: traceOn,
      host: 'localhost',
      name: 'woodex',
      user: 'qa',
      pass: 'qa',
      ...(cur.mysqlOnly ? {} : {}),
    };
    writeFileSync(dbFile, JSON.stringify(cfg, null, 2));
    return cfg;
  }

  /** Create the schema by running the project's own MySQL dump through the translator. */
  async function install({ sqlFile = null } = {}) {
    const dump = sqlFile ?? (existsSync(join(projectDir, 'woodex-database.sql'))
      ? join(projectDir, 'woodex-database.sql')
      : join(projectDir, '_database/woodex-v20.sql'));
    const out = await phpRun(`
      require ${Q(join(projectDir, 'api/_lib/db.php'))};
      $c = json_decode((string)file_get_contents(${Q(dbFile)}), true);
      $pdo = wx_db($c);
      mig_reset(); // fresh database: let every *_migrate() run again
      $sql = (string)file_get_contents(${Q(dump)});
      $sql = preg_replace('~^--.*$~m', '', $sql);
      $n = 0; $errs = [];
      foreach (preg_split('~;\\s*\\n~', $sql) as $st) {
        $st = trim($st); if ($st === '') continue;
        try { $pdo->exec($st); $n++; }
        catch (Throwable $e) { $errs[] = substr(preg_replace('~\\s+~', ' ', $st), 0, 70) . ' :: ' . $e->getMessage(); }
      }
      $t = $pdo->query("SHOW TABLES LIKE 'wx\\\\_%'")->fetchAll(PDO::FETCH_COLUMN);
      echo json_encode(['statements' => $n, 'tables' => count($t), 'tableList' => $t, 'errors' => $errs, 'stats' => wx_sqlite_stats()]);
    `);
    return out.json ?? { statements: 0, tables: 0, errors: [out.text.slice(0, 400)] };
  }

  /** Create/refresh the QA logins. Pass accounts from .preview-accounts.local.json. */
  async function seed(accounts, { reset = false } = {}) {
    const seedFile = join(HERE, '.qa-seed.json');
    writeFileSync(seedFile, JSON.stringify(accounts, null, 2), { mode: 0o600 });
    const out = await phpRun(`
      require ${Q(join(projectDir, 'api/_lib/db.php'))};
      $c = json_decode((string)file_get_contents(${Q(dbFile)}), true);
      $pdo = wx_db($c);
      if (${reset ? 'true' : 'false'}) { $pdo->exec('DELETE FROM wx_throttle'); }
      $acc = json_decode((string)file_get_contents(${Q(seedFile)}), true) ?: [];
      $made = 0; $kept = 0; $errs = [];
      foreach ($acc as $a) {
        try {
          $ex = $pdo->prepare('SELECT id FROM wx_users WHERE email=?'); $ex->execute([strtolower($a['email'])]);
          if ($id = $ex->fetchColumn()) {
            /* The schema's demo seed ships other rows with the same emails and an unknown password.
               QA accounts must sign in with the QA password, so refresh the hash here. */
            $pdo->prepare('UPDATE wx_users SET name=?, role=?, pass_hash=?, active=1 WHERE id=?')
                ->execute([$a['name'] ?: 'QA User', $a['role'], password_hash($a['password'], PASSWORD_DEFAULT), $id]);
            $kept++; continue;
          }
          $pdo->prepare('INSERT INTO wx_users (name,email,role,pass_hash,active,pw_ver,created_at) VALUES (?,?,?,?,1,1,NOW())')
              ->execute([$a['name'] ?: 'QA User', strtolower($a['email']), $a['role'], password_hash($a['password'], PASSWORD_DEFAULT)]);
          $made++;
        } catch (Throwable $e) { $errs[] = $a['email'] . ' :: ' . $e->getMessage(); }
      }
      $n = (int)$pdo->query('SELECT COUNT(*) FROM wx_users')->fetchColumn();
      echo json_encode(['created' => $made, 'existing' => $kept, 'users' => $n, 'errors' => $errs]);
    `);
    return out.json ?? { errors: [out.text.slice(0, 400)] };
  }

  /** Turn a role into a live token the same way the browser does (via the login action). */
  async function login(email, password) {
    const res = await request({ action: 'login', body: { email, password } });
    if (!res.json?.token) return { ...res, error: res.json?.error ?? res.text.slice(0, 200) };
    return { token: res.json.token, builderToken: res.json.builderToken ?? null, user: res.json.user ?? null, status: res.status };
  }

  function sqlStats() { return statsCache; }
  let statsCache = null;
  async function refreshSqlStats() {
    const out = await phpRun(`
      require ${Q(join(projectDir, 'api/_lib/db.php'))};
      $c = json_decode((string)file_get_contents(${Q(dbFile)}), true);
      wx_db($c);
      echo json_encode(wx_sqlite_stats());
    `);
    statsCache = out.json ?? { translations: {}, udfCalls: {} };
    return statsCache;
  }

  /** Any PHP error text written to the shared error log (kept for long runs). */
  function tailPhpErrors(n = 20) {
    if (!existsSync(errLog)) return [];
    return readFileSync(errLog, 'utf8').split('\n').filter(Boolean).slice(-n);
  }

  async function close() { try { await php.exit?.(); } catch { /* best effort */ } }

  return { php, handler, projectDir, phpRun, request, raw, install, seed, login, useSqlite,
           sqlStats, refreshSqlStats, tailPhpErrors, close, dbFile, errLog };
}

export function loadAccounts(file = join(HERE, '.preview-accounts.local.json')) {
  const list = readJson(file, []);
  return Array.isArray(list) ? list : (list.accounts ?? []);
}

// ---------------------------------------------------------------- CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const has = (f) => args.includes(f);
  const val = (f, d = null) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const runner = await createRunner({ projectDir: val('--project', DEFAULT_PROJECT), trace: !has('--no-trace') });

  if (has('--check')) {
    const out = await runner.phpRun(`
      $ext = ['pdo_mysql','pdo_sqlite','sqlite3','json','mbstring','curl','openssl','zip','gd','intl'];
      $r = ['php' => PHP_VERSION, 'sapi' => PHP_SAPI];
      foreach ($ext as $e) $r['ext'][$e] = extension_loaded($e);
      $r['drivers'] = PDO::getAvailableDrivers();
      echo json_encode($r);
    `);
    console.log(out.json ? JSON.stringify(out.json, null, 2) : out.text);
  }

  if (has('--install')) {
    runner.useSqlite({});
    const r = await runner.install();
    console.log(JSON.stringify({ statements: r.statements, tables: r.tables, errors: r.errors, stats: r.stats?.translations }, null, 2));
  }

  if (has('--seed')) {
    const accounts = loadAccounts(val('--accounts', join(HERE, '.preview-accounts.local.json')));
    const r = await runner.seed(accounts, { reset: true });
    console.log(JSON.stringify(r, null, 2));
  }

  if (has('--php') || has('--php-file')) { // ad-hoc PHP through the same runtime
    const code = has('--php-file') ? readFileSync(val('--php-file'), 'utf8') : val('--php', 'echo "no code";');
    const out = await runner.phpRun(code);
    console.log(out.text.trim());
    if (out.errors) console.log('stderr: ' + out.errors.slice(0, 1200));
  }

  if (has('--status') || has('--action')) {
    const action = val('--action', 'status');
    const email = val('--email', null);
    let token = null;
    if (email) {
      const acc = loadAccounts().find((a) => a.email === email);
      if (!acc) throw new Error('account not in the accounts file: ' + email);
      const l = await runner.login(acc.email, acc.password);
      token = l.token ?? null;
      if (!token) { console.log(JSON.stringify({ action: 'login', status: l.status, error: l.error }, null, 2)); }
    }
    const res = await runner.request({ action, token, body: readJson(val('--body'), {}) ?? {} });
    console.log(JSON.stringify({ action, status: res.status, json: res.json, text: res.json ? undefined : res.text.slice(0, 600) }, null, 2));
    if (res.notices?.length) console.log('PHP notices: ' + res.notices.join(', '));
    if (res.errors) console.log('stderr: ' + res.errors.slice(0, 800));
  }

  await runner.close();
  process.exit(0);
}
