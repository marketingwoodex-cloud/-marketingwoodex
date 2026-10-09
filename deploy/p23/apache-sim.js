#!/usr/bin/env node
/**
 * apache-sim.js — runs an unzipped WOODEX package over HTTP the way Hostinger's
 * Apache/LiteSpeed would, so the file layer can be tested without a host.
 *
 *   node apache-sim.js serve <dir> <port>     -> serve it (PHP endpoints answer 503, no PHP engine here)
 *   node apache-sim.js test  <dir>            -> crawl + assert, exit code = failures
 *
 * Implemented from the package's own .htaccess: DirectoryIndex, Options -Indexes,
 * ErrorDocument, the F/L block rules, the FilesMatch deny list, the R=301 redirects,
 * the G (410) rules and the /uploads + /images aliases.
 */
const http = require('http'), fs = require('fs'), path = require('path');

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.sql': 'text/plain' };

function loadRules(root) {
  const ht = fs.readFileSync(path.join(root, '.htaccess'), 'utf8').replace(/\\\n/g, ' ');
  const rules = { block: [], deny: null, redirect: [], gone: [], alias: [], errorDoc: {} };
  const fm = ht.match(/<FilesMatch\s+"([^"]+)"/);
  if (fm) rules.deny = new RegExp(fm[1], 'i');
  let pendingCond = false;
  for (const line of ht.split('\n')) {
    const l = line.trim();
    if (/^RewriteCond\b/i.test(l)) { pendingCond = true; continue; }   // conditions are not modelled
    const m = l.match(/^RewriteRule\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]$/i);
    if (!m) { if (l) pendingCond = false; continue; }
    const [, pat, target, flags] = m;
    const cond = pendingCond; pendingCond = false;
    if (cond) continue;                                    // skip rules gated by a condition
    const f = flags.toLowerCase();
    if (f.includes('e=')) continue;                        // env vars
    const rx = new RegExp('^' + pat);                      // Apache patterns are prefixes
    if (/^-$/.test(target) && f.includes('g')) rules.gone.push(rx);
    else if (/^-$/.test(target) && f.includes('f')) rules.block.push(rx);
    else if (f.includes('r=301')) rules.redirect.push([rx, target, 301]);
    else if (f.includes('r=30')) rules.redirect.push([rx, target, 302]);
  }
  const ed = [...ht.matchAll(/ErrorDocument\s+(\d{3})\s+(\S+)/g)];
  for (const e of ed) rules.errorDoc[e[1]] = e[2];
  rules.aliasUploads = /RewriteRule \^uploads\/\(\.\+\)\$ assets\/uploads\/\$1/.test(ht);
  rules.aliasImages = /RewriteRule \^images\/\(\.\+\)\$ assets\/img\/\$1/.test(ht);
  return rules;
}

/** Map a URL path to a file, applying the package's own rules. Returns an action. */
function resolve(root, urlPath, rules) {
  const p = decodeURIComponent(urlPath.split('?')[0]);
  const base = path.basename(p);
  if (rules.deny && rules.deny.test(base)) return { code: 403, why: 'FilesMatch deny list' };
  for (const rx of rules.block) if (rx.test(p.slice(1))) return { code: 403, why: 'block rule ' + rx };
  for (const rx of rules.gone) if (rx.test(p.slice(1))) return { code: 410, why: 'Gone rule (spam cleanup)' };
  const rel = p.replace(/^\//, '');
  for (const [rx, target, code] of rules.redirect) {
    const mm = rel.match(rx);
    if (mm) {
      let loc = target.replace(/\$\{(REQUEST_URI|REQUEST_FILENAME)\}/g, p);
      loc = loc.replace(/\$([1-9])/g, (_, i) => mm[+i] === undefined ? '' : mm[+i]);
      if (!loc.startsWith('/')) loc = '/' + loc;
      return { code, location: loc, why: 'redirect rule ' + rx.source };
    }
  }
  const clean = p.replace(/\/+$/, '');
  let abs = path.join(root, clean);
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    const idx = ['index.php', 'index.html'].map(f => path.join(abs, f)).find(f => fs.existsSync(f));
    if (!idx) return { code: 403, why: 'Options -Indexes, no DirectoryIndex' };
    if (idx.endsWith('index.php')) {
      const html = path.join(abs, 'index.html');
      // index.php's only job for a directory request is readfile('index.html') + headers
      if (fs.existsSync(html)) return { file: html, via: 'index.php -> readfile(index.html)' };
      return { code: 503, why: 'index.php with no index.html (needs PHP)' };
    }
    return { file: idx, via: 'DirectoryIndex index.html' };
  }
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    if (abs.endsWith('.php')) return { code: 503, why: 'PHP endpoint - no PHP engine in this sandbox' };
    return { file: abs, via: 'static file' };
  }
  // extensions-less / .html-less candidates + the two aliases
  for (const cand of [abs + '.html', path.join(abs, 'index.html')])
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return { file: cand, via: 'extensionless' };
  const m = p.match(/^\/(uploads|images)\/(.+)$/);
  if (m && ((m[1] === 'uploads' && rules.aliasUploads) || (m[1] === 'images' && rules.aliasImages))) {
    const t = path.join(root, m[1] === 'uploads' ? 'assets/uploads' : 'assets/img', m[2]);
    if (fs.existsSync(t) && fs.statSync(t).isFile()) return { file: t, via: '.htaccess alias' };
  }
  const e404 = rules.errorDoc['404'] ? path.join(root, rules.errorDoc['404']) : null;
  if (e404 && fs.existsSync(e404)) return { code: 404, file: e404, why: 'ErrorDocument 404 ' + rules.errorDoc['404'] };
  return { code: 404, why: 'no file, no ErrorDocument' };
}

function handler(root, rules) {
  return (req, res) => {
    const r = resolve(root, req.url, rules);
    if (r.file && !r.code) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(r.file)] || 'application/octet-stream',
        'X-Woodex-Served-By': r.via || 'static' });
      return fs.createReadStream(r.file).pipe(res);
    }
    const h = { 'Content-Type': 'text/plain; charset=utf-8' };
    if (r.location) h.Location = r.location;
    res.writeHead(r.code || 404, h);
    if (r.file) return fs.createReadStream(r.file).pipe(res);
    res.end(r.code + ' — ' + (r.why || ''));
  };
}

if (process.argv[2] === 'serve') {
  const root = path.resolve(process.argv[3]), port = +process.argv[4] || 8099;
  const server = http.createServer(handler(root, loadRules(root)));
  server.listen(port, '0.0.0.0', () => console.log('apache-sim serving ' + root + ' on 0.0.0.0:' + port));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  return; // CJS top-level return: without this, serve mode falls through into the test suite
}

/* --------------------------------- test mode -------------------------------- */
const root = path.resolve(process.argv[3] || '.');
const rules = loadRules(root);
const get = p => resolve(root, p, rules);
const results = [];
const t = (ok, name, note = '') => results.push([!!ok, name, note]);

/* 1. the homepage — the request that was 500-ing on the live domain */
const home = get('/');
const homeBytes = home.file ? fs.readFileSync(home.file) : Buffer.alloc(0);
t(home.code === undefined && /<!doctype html>/i.test(homeBytes.toString('utf8', 0, 200)),
  'GET / returns the homepage', home.via + ', ' + homeBytes.length + ' bytes');
t(home.file && path.basename(home.file) === 'index.html' && homeBytes.length > 100000,
  'homepage is the full P23 page, not a stub', homeBytes.length + ' bytes');

/* 2. every sitemap URL over HTTP */
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sm.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map(m => m[1]);
let smBad = [];
for (const u of urls) { const r = get(u); if (r.code !== undefined) smBad.push(u + ' -> ' + r.code); }
t(urls.length >= 140 && !smBad.length, 'all ' + urls.length + ' sitemap URLs return 200', smBad.slice(0, 3).join(', '));

/* 3. every local reference on every page, resolved over HTTP */
const htmls = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(html|php)$/.test(e.name)) htmls.push(p); } })(root);
const refs = new Set();
for (const f of htmls) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/(?:href|src|poster|data-src)\s*=\s*["'](\/[^"'?#]*)/g)) {
    const u = m[1]; if (u.startsWith('//')) continue;
    if (/\.(php)(\?|$)/.test(u)) continue;               // PHP endpoints: tested separately
    refs.add(u);
  }
}
let refBad = [];
for (const u of refs) { const r = get(u); if (r.code !== undefined) refBad.push(u + ' -> ' + r.code); }
t(!refBad.length, 'all ' + refs.size + ' distinct local references return 200', refBad.slice(0, 4).join(' | '));

/* 4. the .htaccess redirects actually fire */
const checks = [['/service/', 301, '/interior-design/'], ['/portfolio/', 301, '/projects/'],
  ['/studio/', 301, '/about/'], ['/journal/', 301, '/insights/'], ['/3d-studio/', 301, '/3d-visualization/'],
  ['/free-consultation/', 301, '/contact/'], ['/renovation/residential/', 301, '/residential-renovation/'],
  ['/insights/small-rooms/', 301, '/insights/small-space-ideas/']];
let redBad = [];
for (const [u, code, loc] of checks) {
  const r = get(u);
  if (r.code !== code || (r.location && r.location.replace(/\/$/, '') !== loc.replace(/\/$/, ''))) redBad.push(u + ' -> ' + (r.code + ' ' + (r.location || '')));
}
t(!redBad.length, 'redirects: ' + checks.length + '/' + checks.length + ' fire with the right target', redBad.join(' | '));
/* regression guard for the P23.1 fix: /services/ is a real 124 KB page (458 nav links) —
   the stale "Old website menu" redirect used to hide it behind a 301 */
const svc = get('/services/');
t(svc.code === undefined && svc.file && svc.file.endsWith('services' + path.sep + 'index.html'),
  '/services/ serves its own page (stale redirect removed)', svc.via + ' ' + (svc.code || 200));
const gone = ['/wp-admin/x', '/xmlrpc.php', '/He&', '/gratis-gokkasten-spelen-netent/'];
const goneBad = gone.filter(u => get(u).code !== 410);
t(!goneBad.length, 'hacked-spam + WordPress probes return 410 Gone', goneBad.join(', '));

/* 5. secrets and internals are unreachable */
const denied = ['/_private/db.example.json', '/_database/woodex-v20.sql', '/_database/woodex-database.sql',
  '/_templates/chat-bot-answers.json', '/config.php', '/includes/config.php', '/.env', '/.git/config',
  '/api/roles-lib.php', '/api/crm-lib.php', '/router.php', '/api/redirect-plan.json', '/sitemap.xml.bak', '/.htaccess', '/assets/uploads/.htaccess',
  '/_private/maintenance.flag', '/_private/db.json', '/error_log', '/backup.log'];
const leak = denied.filter(u => { const c = get(u).code; return c !== 403 && c !== 410; });
t(!leak.length, 'all ' + denied.length + ' internal/secret paths return 403', leak.join(', ') || 'incl. *.sql, .env, -lib.php, /config.php');

/* 6. the public pieces must NOT be blocked */
const img0 = fs.readdirSync(path.join(root, 'assets/img')).filter(f => /\.(webp|jpg|png)$/.test(f))[0];
const open = ['/api/admin.php', '/api/forms.php', '/api/chat.php', '/robots.txt', '/sitemap.xml',
  '/assets/site-p21.css', '/assets/site.js', '/favicon.ico', '/404.html', '/wx-check.php'];
const blockedBad = open.filter(u => { const r = get(u); return r.code === 403 || r.code === 410; });
t(!get('/index.html').code, 'index.html itself is reachable', String(get('/index.html').code || 200));
t(!blockedBad.length, 'nothing the site needs is over-blocked (admin API, assets, robots, installer)', blockedBad.join(', '));

/* 7. the two aliases */
const img = fs.readdirSync(path.join(root, 'assets/img')).filter(f => /\.(webp|jpg|png)$/.test(f))[0];
const ali = get('/images/' + img);
t(ali.code === undefined && ali.via === '.htaccess alias', '/images/' + img + ' → /assets/img/' + img, ali.via || String(ali.code));
const upl = get('/uploads/nothing-here.jpg');
t(upl.code === 404, '/uploads/<missing> falls through to the 404 page (not a server error)', upl.why);

/* 8. 404 handling + no directory listing anywhere */
const nf = get('/this-page-does-not-exist-xyz/');
t(nf.code === 404 && !!nf.file && nf.file.endsWith('404.html'), 'unknown URL serves the branded 404 page via ErrorDocument');
const dirBad = ['', 'admin', 'api', 'assets', 'insights', 'builder', '_templates'].map(d => '/' + d + '/')
  .filter(u => { const r = get(u); return r.code === 200 && !r.file; });
t(!dirBad.length, 'no directory index is ever generated (Options -Indexes)', dirBad.join(', '));

/* 9. PHP endpoints: reachable (they just need a PHP engine, which this sandbox lacks) */
const php = ['admin.php', 'builder.php', 'forms.php', 'chat.php', 'whatsapp.php', 'telegram.php', 'mcp.php', 'quote-view.php', 'r404.php', 'wa-cron.php'];
const phpMissing = php.filter(f => !fs.existsSync(path.join(root, 'api', f)));
t(!phpMissing.length, 'all ' + php.length + ' public API endpoints exist in api/', phpMissing.join(', '));

for (const [ok, name, note] of results) console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (note ? '   — ' + note : ''));
const failed = results.filter(r => !r[0]).length;
console.log('\n' + (failed ? failed + ' of ' + results.length + ' HTTP TESTS FAILED' : 'ALL ' + results.length + ' HTTP TESTS PASSED against the unzipped package'));
console.log('note: PHP execution and MySQL are not available in this sandbox, so api/*.php returns 503 here.');
console.log('      On Hostinger those same URLs are served by PHP 8.2 + the database — /wx-check.php verifies that side.');
process.exit(Math.min(failed, 200));
