// Browser regression (headless Chromium) for the admin copy. QA only; no production, no real API.
// Usage: node browser-regression.mjs <variantDir> <check> [role] [shotDir]
//   check: t16 (settings honesty, AD-05/06/07) | editor-dash (T-18, OV-01/03, editor role) | approvals-initial (fresh load on #/approvals)
//          | approvals (AD-10, in-app navigation to #/approvals) | security (#/security renders)
// Requires the QA-only install in tools/qa-p29 (see README). Prints booleans, counts and short UI text only.
// /api/* requests are answered by this script with stub fixtures; every other non-local request is blocked.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const chromiumMod = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href);
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const puppeteer = (await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href));
const pptr = puppeteer.default || puppeteer;

const variant = path.resolve(process.argv[2]);
const check = process.argv[3] || 't16';
const role = process.argv[4] || (check === 'editor-dash' ? 'editor' : 'owner');
const shotDir = process.argv[5] || null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Optional: JITTER=<seed> delays every local .js response by a seeded 0-400 ms (timing stress, not production behaviour).
const JITTER = process.env.JITTER ? Number(process.env.JITTER) : 0;
let rng = JITTER * 9301 + 49297;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  let file = path.join(variant, decodeURIComponent(u.pathname));
  if (u.pathname.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(variant) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const user = { id: 1, name: 'QA User', role, email: 'qa@qa.test' };
const requests = [];
function respond(action) {
  if (action === 'status') return { ok: true, needsSetup: false, driver: 'mysql', builderLocked: false, user };
  if (action === 'me') return { ok: true, user, caps: {}, builderToken: null };
  if (action === 'appr_count') return { ok: true, pending: 0 };
  if (action === 'leads_count') return { ok: true, unread: 0 };
  if (action === 'dashboard') return { ok: true, stats: { pages: 3 }, recent: [], kpi: {}, leads: [], chats: [], series: [], funnel: [], pipeline: [], tasks: [] };
  return { ok: true, avatars: {}, rows: [], items: [], list: [], total: 0, per: 20, pages: [], cfg: {}, apps: [] };
}

const launchArgs = chromiumMod.default.args;
const exe = await chromiumMod.default.executablePath();
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: exe, args: launchArgs, headless: true, defaultViewport: { width: 1280, height: 900 } });
const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];
const blockedExternal = [];
page.on('pageerror', e => pageErrors.push(String(e.message).split('\n')[0].slice(0, 160)));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().split('\n')[0].slice(0, 160)); });
await page.setRequestInterception(true);
page.on('request', req => {
  const url = new URL(req.url());
  if (url.hostname === '127.0.0.1' && url.pathname.startsWith('/api/')) {
    let action = '';
    try { action = JSON.parse(req.postData() || '{}').action || ''; } catch (e) {}
    requests.push(action || url.pathname);
    return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(action)) });
  }
  if (url.hostname === '127.0.0.1' && JITTER && url.pathname.endsWith('.js')) {
    rng = (rng * 9301 + 49297) % 233280; const ms = Math.floor((rng / 233280) * 400);
    return setTimeout(() => req.continue().catch(() => {}), ms);
  }
  if (url.hostname === '127.0.0.1') return req.continue();
  blockedExternal.push(url.hostname);
  return req.abort();
});
await page.evaluateOnNewDocument(() => { sessionStorage.setItem('wxaTok', 'qa-token'); });

const text = async sel => page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const shot = async name => { if (shotDir) { fs.mkdirSync(shotDir, { recursive: true }); await page.screenshot({ path: path.join(shotDir, name) }); } };
// Start at /admin/ (the URL users use). The sidebar link href="#/approvals" is same-document navigation only from this URL.
const hashFor = check === 't16' ? '#/settings/integrations' : check === 'security' ? '#/security' : check === 'approvals-initial' ? '#/approvals' : '#/dashboard';
await page.goto(base + '/admin/' + hashFor, { waitUntil: 'load' });
await sleep(2500);

const out = {};
if (check === 't16') {
  const first = await page.$('#conn-grid [data-app]');
  out.connectButtons = (await page.$$('#conn-grid [data-app]')).length;
  if (!first) out.result = 'no connector button';
  else {
    await first.click(); await sleep(500);
    const ping = await page.$('#conn-m-ping');
    out.pingButton = !!ping;
    if (ping) { await ping.click(); await sleep(400); }
    out.pingText = await text('#conn-ping-res');
    out.toastAfterPing = await text('#toast');
    await shot('t16-after-ping.png');
    if (await page.$('#conn-m-cancel')) { await (await page.$('#conn-m-cancel')).click(); await sleep(200); }
    if (await page.$('#st-save-btn')) { await (await page.$('#st-save-btn')).click(); await sleep(400); out.toastAfterSave = await text('#toast'); }
    else out.saveButton = 'not on this tab';
    const hay = [out.pingText, out.toastAfterPing, out.toastAfterSave].filter(Boolean).join(' ');
    const forbidden = ['200 OK', 'Ping successful', 'saved live', 'Connected & Verified', 'Live Connected'];
    out.forbiddenPresent = forbidden.filter(f => hay.includes(f));
    out.apiActionsDuringPingSave = requests.filter(a => /save|ping|test|connect|integ/i.test(a));
  }
} else if (check === 'editor-dash') {
  await sleep(1000);
  const view = (await text('#view')) || '';
  const dx = (await text('#dx')) || '';
  const txt = dx || view;
  out.role = role; out.route = hashFor;
  out.dashboardRequested = requests.includes('dashboard');
  out.errorCardShown = /Dashboard data is incomplete|Server error|went wrong|Could not load/i.test(view);
  out.stuckLoading = /Loading/.test(txt);
  out.viewStart = view.slice(0, 100);
  await shot('editor-dash.png');
} else if (check === 'approvals') {
  // Sidebar-style navigation: start on the dashboard, then follow the Approvals link.
  await sleep(800);
  const link = await page.$('a[href="#/approvals"]');
  out.urlBeforeClick = await page.evaluate(() => location.pathname);
  out.approvalsLink = !!link;
  if (link) await link.click(); else await page.evaluate(() => { location.hash = '#/approvals'; });
  await sleep(1200);
  out.queueRendered = !!(await page.$('#ap-tab')) && !!(await page.$('#ap-list'));
  out.viewsApprovalsSameAsSecurity = await page.evaluate(() => !!(window.WXA && WXA.VIEWS && WXA.VIEWS.approvals === WXA.VIEWS.security)).catch(() => 'no WXA');
  out.hashAfter = await page.evaluate(() => location.hash);
  out.securityRendered = /My Security/.test((await text('#view')) || '');
  out.viewStart = ((await text('#view')) || '').slice(0, 60);
  await shot('approvals.png');
} else if (check === 'approvals-initial') {
  // Fresh page load directly on #/approvals (initial-load timing; AD-10 residual).
  await sleep(1500);
  out.queueRendered = !!(await page.$('#ap-tab')) && !!(await page.$('#ap-list'));
  out.securityRendered = /My Security/.test((await text('#view')) || '');
  out.viewsApprovalsSameAsSecurity = await page.evaluate(() => !!(window.WXA && WXA.VIEWS && WXA.VIEWS.approvals === WXA.VIEWS.security)).catch(() => 'no WXA');
  out.viewStart = ((await text('#view')) || '').slice(0, 60);
} else if (check === 'security') {
  await sleep(800);
  out.securityRendered = /My Security/.test((await text('#view')) || '');
  out.viewStart = ((await text('#view')) || '').slice(0, 60);
  await shot('security.png');
}
out.jitterSeed = JITTER || null;
out.pageErrors = pageErrors.length; out.pageErrorSample = pageErrors.slice(0, 3);
out.consoleErrors = consoleErrors.length; out.consoleErrorSample = consoleErrors.slice(0, 3);
out.blockedExternalHosts = [...new Set(blockedExternal)];
console.log(JSON.stringify({ variant: path.basename(variant), check, role, ...out }, null, 2));
await browser.close();
server.close();
process.exit(0);
