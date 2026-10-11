/**
 * MASTER QA — every admin route, every API action it calls, what actually renders.
 *
 * For each route it reports:
 *   - pageErrors (JS crashes)
 *   - apiCalls: which admin actions the screen asked for
 *   - stuck: a "Loading…" placeholder still on screen after the wait (screen never completed)
 *   - empty states / row counts / visible text volume
 *   - rendering time
 *
 * Usage:
 *   PREVIEW_EMAIL=… PREVIEW_PASS=… node master-qa.mjs http://127.0.0.1:8080 /tmp/master-qa [route...]
 *   ROUTES=dashboard,bookings runs only those. SHOTS=1 saves a screenshot per problem route.
 */
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/master-qa';
const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';

const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

// ---- route list: read it out of the app's own NAV array -------------------------------
const ADMIN = '/home/user/-marketingwoodex/woodex-live-p29-v2.1-pro/admin';
const src = fs.readFileSync(path.join(ADMIN, 'admin.js'), 'utf8');
const i = src.indexOf('var NAV =');
const j = src.indexOf('\n  ];', i);
const ROUTES = [...new Set([...src.slice(i, j).matchAll(/\["([a-z][a-z0-9_-]*)", "[^"]*"/g)].map(m => m[1]))];
const only = process.env.ROUTES ? process.env.ROUTES.split(',').map(s => s.trim()) : null;
const list = only ? ROUTES.filter(r => only.includes(r)) : ROUTES;

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 950 },
});

fs.mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
await page.setRequestInterception(true);
let apiLog = [];
page.on('request', r => {
  const u = new URL(r.url());
  if (u.hostname !== '127.0.0.1') return r.abort();
  if (u.pathname.endsWith('/api/admin.php') && r.method() === 'POST') {
    try { apiLog.push(JSON.parse(r.postData() || '{}').action || '?'); } catch { apiLog.push('?'); }
  }
  r.continue();
});
let errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));

// sign in once
await page.goto(BASE + '/admin/', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 900));
const EMAIL = process.env.PREVIEW_EMAIL, PASS = process.env.PREVIEW_PASS;
if (!EMAIL || !PASS) {
  console.error('Set PREVIEW_EMAIL and PREVIEW_PASS (the account the preview server was started with).');
  process.exit(2);
}
await page.type('#l-email', EMAIL);
await page.type('#l-pass', PASS);
await page.click('#l-btn');
await new Promise(r => setTimeout(r, 2500));

const rows = [];
for (const route of list) {
  errs = []; apiLog = [];
  const t0 = Date.now();
  await page.evaluate(r => { location.hash = '#/' + r; }, route);
  // let the screen finish: poll until the loading placeholder is gone (max 6s)
  let stuck = false;
  for (let k = 0; k < 24; k++) {
    await new Promise(r => setTimeout(r, 250));
    const loading = await page.evaluate(() => {
      const v = document.querySelector('#view');
      return v ? /Loading…|Loading\.\.\.|Loading…/.test(v.textContent) : false;
    });
    if (!loading) { stuck = false; break; }
    stuck = true;
  }
  await new Promise(r => setTimeout(r, 400));
  const info = await page.evaluate(() => {
    const v = document.querySelector('#view');
    const txt = v ? v.textContent.replace(/\s+/g, ' ').trim() : '';
    const empties = v ? [...v.querySelectorAll('.empty')].map(e => e.textContent.trim().slice(0, 48)) : [];
    return {
      textLen: txt.length,
      rows: v ? v.querySelectorAll('tbody tr, .card, .row, .it-row').length : 0,
      emptyStates: empties.slice(0, 3),
      h1: v && v.querySelector('h1') ? v.querySelector('h1').textContent.trim() : null,
      loadingText: /Loading…|Loading\.\.\./.test(txt),
    };
  });
  const row = { route, ms: Date.now() - t0, ...info, stuck: stuck || info.loadingText,
                apiCalls: [...new Set(apiLog)],
                pageErrors: [...new Set(errs)] };
  rows.push(row);
  const flag = row.stuck ? 'STUCK  ' : (row.pageErrors.length ? 'ERRORS ' : 'ok     ');
  console.log(`${flag}${route.padEnd(14)} ${String(row.ms).padStart(5)}ms  rows=${String(row.rows).padStart(4)}  api=${row.apiCalls.length}  ${row.apiCalls.slice(0, 6).join(',')}${row.apiCalls.length > 6 ? ',…' : ''}`);
  if (row.pageErrors.length) console.log(`         ↳ ${row.pageErrors.join(' | ')}`);
  if (row.stuck && process.env.SHOTS) { await page.screenshot({ path: path.join(OUT, `stuck-${route}.png`), fullPage: false }); }
}

fs.writeFileSync(path.join(OUT, 'master-qa.json'), JSON.stringify({ at: new Date().toISOString(), base: BASE, rows }, null, 2));
const stuckN = rows.filter(r => r.stuck).length;
const errN = rows.filter(r => r.pageErrors.length).length;
console.log(`\nSUMMARY: ${rows.length} routes · stuck=${stuckN} · with-page-errors=${errN}`);
console.log(`report: ${path.join(OUT, 'master-qa.json')}`);
await browser.close();
