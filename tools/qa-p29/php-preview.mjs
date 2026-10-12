/**
 * php-preview.mjs — serve the real project, with the real PHP backend, in the live preview.
 *
 * The previous preview answered the API from fixtures. This one runs the project's own api/*.php
 * (PHP 8.3 in WebAssembly) against a SQLite database, so every screen in the preview is the real
 * backend answering with real code paths.
 *
 *   node php-preview.mjs [--port 8080] [--project <dir>] [--no-sync]
 *
 * Layout
 *   .qa-run/preview/        working copy (default .qa-run/preview) — the server never serves the
 *                           shipped tree directly: builder saves, page edits and media actions all
 *                           write here, so the shipped project cannot be damaged by clicking around.
 *   _private/woodex.sqlite  the database (created on first start from the real schema)
 *
 * Keeping the browser signed in
 *   The old fixture preview handed the browser tokens like "preview-token-master". Real PHP only
 *   accepts signed tokens, so this server bridges them: a known fixture token (or a session id it
 *   minted itself) is swapped for a freshly signed token for the same account before the request
 *   reaches PHP. Sign-in, sign-out and role gates all stay the real ones.
 *
 * Safety
 *   Outbound service credentials (Telegram / WhatsApp / Google / SMTP / Sheets) are blanked in the
 *   copy, so no screen can call a live service with a real secret from the preview. Internal
 *   secrets (config.json, security.json) are left alone — blanking those would break signing in.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync, readdirSync, copyFileSync, chmodSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, extname, normalize } from 'node:path';
import { createRunner, loadAccounts, DEFAULT_PROJECT } from './php-runner.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);
const argv = process.argv.slice(2);
const arg = (f, d = null) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const has = (f) => argv.includes(f);

const PORT = Number(arg('--port', '8080'));
const HOST = arg('--host', '0.0.0.0');
const SOURCE = resolve(arg('--project', DEFAULT_PROJECT));
const WORK = resolve(arg('--work', join(HERE, '.qa-run/preview')));
const ACCOUNTS_FILE = arg('--accounts', join(HERE, '.preview-accounts.local.json'));

/* Runtime files that must survive a source sync (sessions, database, migration memo). */
const KEEP = [
  '_private/db.json', '_private/security.json', '_private/security.json.lock',
  '_private/schema.json', '_private/s17.json', '_private/install-lock.json',
  '_private/config.json', '_private/demo.json', '_private/users.json',
];
const isRuntime = (rel) =>
  /^_private\/woodex\.sqlite/.test(rel) || /^_private\/qa-.*\.log$/.test(rel) ||
  KEEP.includes(rel) || /\.lock$/.test(rel) || /^_private\/backups\//.test(rel);

/** Copy the shipped project into the working copy (or refresh it), keeping runtime state. */
function syncProject() {
  const fresh = !existsSync(join(WORK, 'api/admin.php'));
  mkdirSync(WORK, { recursive: true });
  let copied = 0, skipped = 0;
  const walk = (rel) => {
    const from = join(SOURCE, rel), to = join(WORK, rel);
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (r === '.git' || r === 'node_modules' || r.startsWith('tools/')) continue;
        if (!existsSync(join(WORK, r))) mkdirSync(join(WORK, r), { recursive: true });
        walk(r);
        continue;
      }
      if (!fresh && isRuntime(r)) { skipped++; continue; }
      try { copyFileSync(join(SOURCE, r), join(WORK, r)); copied++; } catch { /* unreadable file */ }
    }
  };
  walk('');
  if (!fresh) console.log(`[sync] ${copied} file(s) refreshed from the shipped project, ${skipped} runtime file(s) kept`);
  return fresh;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.pdf': 'application/pdf', '.zip': 'application/zip', '.csv': 'text/csv',
  '.map': 'application/json', '.php': 'text/html; charset=utf-8', '.wasm': 'application/wasm',
};
const NO_STORE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.php']);

const main = async () => {
  console.log(`PHP preview — source ${SOURCE}`);
  const fresh = syncProject();
  if (fresh) console.log('[sync] first run: full copy');

  let runner = await createRunner({ projectDir: WORK, trace: true });
  runner.useSqlite({});
  if (fresh || !existsSync(join(WORK, '_private/woodex.sqlite'))) {
    const inst = await runner.install();
    console.log(`[db] schema installed: ${inst.statements} statements, ${inst.tables} tables, ${inst.errors.length} error(s)`);
    if (inst.errors?.length) console.log(JSON.stringify(inst.errors, null, 1));
  }
  const accounts = loadAccounts(ACCOUNTS_FILE);
  const seeded = await runner.seed(accounts, { reset: true });
  console.log(`[db] logins ready: ${seeded.users} users (${seeded.created} created, ${seeded.existing} refreshed)`);

  /* Blank outbound credentials so the preview cannot call a live service. */
  const sanitized = await runner.phpRun(`
    require ${JSON.stringify(join(WORK, 'api/_lib/db.php'))};
    $c = json_decode((string)file_get_contents(${JSON.stringify(join(WORK, '_private/db.json'))}), true);
    $pdo = wx_db($c); $n = 0;
    foreach ($pdo->query('SELECT k,v FROM wx_settings')->fetchAll(PDO::FETCH_ASSOC) as $r) {
      if (preg_match('~token|secret|key|pass|webhook|smtp|api~i', (string)$r['k']) && trim((string)$r['v']) !== '') {
        $pdo->prepare('UPDATE wx_settings SET v=? WHERE k=?')->execute(['', $r['k']]); $n++;
      }
    }
    echo json_encode(['settings' => $n]);
  `);
  console.log(`[db] outbound credential settings blanked: ${sanitized.json?.settings ?? '?'}`);

  /* --- the token bridge ------------------------------------------------------- */
  const realToken = /^\d+\.\d{10}\.[a-f0-9]{16}\.[a-f0-9]{64}$/;
  const realBuilder = /^\d{10}\.\d+\./;
  const byFixture = new Map();   // "preview-token-master" -> account
  for (const a of accounts) if (a.token) byFixture.set(a.token, a);
  const live = new Map();        // email -> { token, builder, at }

  async function sessionFor(account) {
    const hit = live.get(account.email);
    if (hit && Date.now() - hit.at < 6 * 3600 * 1000) return hit;
    const l = await runner.login(account.email, account.password);
    if (!l.token) throw new Error(`preview: cannot sign in ${account.email}: ${l.error}`);
    const s = { token: l.token, builder: l.builderToken ?? null, at: Date.now() };
    live.set(account.email, s);
    return s;
  }
  /* Pre-warm so the first click after a restart is fast. */
  for (const a of accounts) { try { await sessionFor(a); } catch (e) { console.log('[warn] ' + e.message); } }

  const pending = [];
  let busy = false;
  const queue = (fn) => new Promise((res, rej) => { pending.push([fn, res, rej]); pump(); });
  function pump() {
    if (busy || !pending.length) return;
    busy = true;
    const [fn, res, rej] = pending.shift();
    fn().then(res, rej).finally(() => { busy = false; pump(); });
  }

  const isAbort = (res) => res && /Aborted\(\)|RuntimeError|memory access out of bounds/.test(String(res.text) + String(res.errors));
  async function phpCall(phpRequest, tries = 2) {
    try {
      const res = await runner.raw(phpRequest);
      if (!isAbort(res)) return res;
    } catch (e) {
      if (tries <= 1) throw e;
    }
    if (tries <= 1) throw new Error('PHP runtime is not responding');
    console.log('[php] runtime restart');
    try { await runner.close(); } catch { /* gone */ }
    runner = await createRunner({ projectDir: WORK, trace: true });
    return phpCall(phpRequest, tries - 1);
  }

  const server = createServer(async (req, res) => {
    const t0 = Date.now();
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const query = (req.url || '/').includes('?') ? '?' + (req.url || '').split('?').slice(1).join('?') : '';
    let status = 0, note = '';

    try {
      const rel = normalize(urlPath).replace(/^([/\\])+/, '');
      if (rel.includes('..')) { status = 400; res.writeHead(400).end('bad path'); return; }
      let abs = join(WORK, rel);
      if (existsSync(abs) && statSync(abs).isDirectory()) abs = join(abs, 'index.html');

      /* Any PHP file goes through the real interpreter. */
      if (abs.toLowerCase().endsWith('.php')) {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = Buffer.concat(chunks);
        const extraHeaders = { ...req.headers };
        delete extraHeaders['content-length'];
        delete extraHeaders['connection'];

        /* Bridge fixture tokens → real signed tokens. */
        const adm = String(req.headers['x-wx-adm'] ?? '');
        let account = null;
        if (adm && !realToken.test(adm)) account = byFixture.get(adm) ?? null;
        if (account) {
          const s = await sessionFor(account);
          extraHeaders['x-wx-adm'] = s.token;
          if (s.builder && !realBuilder.test(String(req.headers['x-wx-csrf'] ?? ''))) extraHeaders['x-wx-csrf'] = s.builder;
        }
        const phpRes = await queue(() => phpCall({
          method: req.method,
          url: urlPath + query,
          headers: extraHeaders,
          body: body.length ? new Uint8Array(body) : undefined,
        }));
        status = phpRes.status;
        const out = {};
        for (const [k, v] of Object.entries(phpRes.headers ?? {})) out[k] = Array.isArray(v) ? v.join(', ') : String(v);
        out['cache-control'] = 'no-store';
        res.writeHead(status, out);
        const payload = phpRes.bytes ? Buffer.from(phpRes.bytes) : Buffer.from(phpRes.text ?? '');
        res.end(req.method === 'HEAD' ? undefined : payload);
        note = req.method;
        return;
      }

      /* Static files. */
      if (!existsSync(abs) || !statSync(abs).isFile()) {
        const notFound = join(WORK, '404.html');
        status = 404;
        if (existsSync(notFound)) {
          const html = readFileSync(notFound);
          res.writeHead(404, { 'content-type': MIME['.html'], 'cache-control': 'no-store' }).end(req.method === 'HEAD' ? undefined : html);
        } else {
          res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
        }
        return;
      }
      const ext = extname(abs).toLowerCase();
      const buf = readFileSync(abs);
      status = 200;
      res.writeHead(200, {
        'content-type': MIME[ext] ?? 'application/octet-stream',
        'content-length': String(buf.length),
        'cache-control': NO_STORE.has(ext) ? 'no-store' : 'public, max-age=3600',
        'x-content-type-options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : buf);
    } catch (e) {
      status = 500;
      note = String(e.message).slice(0, 200);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('preview error: ' + note);
    } finally {
      const ms = Date.now() - t0;
      if (ms > 250 || status >= 500) console.log(`${req.method} ${urlPath}${query} → ${status} ${ms}ms ${note}`);
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`PHP preview listening on http://${HOST}:${PORT} (work dir ${WORK})`);
    console.log(`sign in with the team accounts (${accounts.length} configured)`);
  });
};

main().catch((e) => { console.error('[fatal]', e); process.exit(1); });
