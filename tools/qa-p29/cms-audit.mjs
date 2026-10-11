/**
 * WEBSITE & CMS MASTER AUDIT — every route, every API action, every response shape.
 *
 * For each screen in the Website & CMS area it records:
 *   - the API actions the screen calls, in order
 *   - for each call: ok flag, top-level keys, array sizes (so "empty" is visible)
 *   - whether a response is missing a key the real API sends (checked separately against api/*.php)
 *   - page errors (with file:line) and whether "Loading…" was still on screen
 *
 * Usage:
 *   PREVIEW_EMAIL=… PREVIEW_PASS=… node cms-audit.mjs http://127.0.0.1:8080 /tmp/cms-audit [route...]
 */
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/cms-audit';
const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';

const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

// The Website & CMS area, in the order the sidebar shows it.
const GROUPS = {
  'Pages & builder': ['pages', 'builder', 'library', 'global', 'heroes', 'redirects'],
  Content: ['blog', 'portfolio', 'services', 'cities', 'pagetpl', 'forms', 'estimator', 'faqs', 'testimonials', 'logos', 'team'],
  'Media & search': ['media', 'seo', 'seoagent', 'speed', 'health', 'theme'],
};
const ALL = Object.values(GROUPS).flat();
const wanted = process.argv[4] ? process.argv[4].split(',') : null;
const list = wanted ? ALL.filter(r => wanted.includes(r)) : ALL;

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 950 },
});
fs.mkdirSync(OUT, { recursive: true });

const page = await browser.newPage();
await page.setRequestInterception(true);
let calls = [];
page.on('request', r => {
  const u = new URL(r.url());
  if (u.hostname !== '127.0.0.1') return r.abort();
  if (/\/api\/(admin|builder)\.php$/.test(u.pathname) && r.method() === 'POST') {
    let a = '?';
    try { a = JSON.parse(r.postData() || '{}').action || '?'; } catch { /* keep ? */ }
    calls.push({ action: a, url: u.pathname, req: r });
  }
  r.continue();
});
page.on('response', async res => {
  const u = new URL(res.url());
  if (!/\/api\/(admin|builder)\.php$/.test(u.pathname)) return;
  // pair the response with the OLDEST outstanding request for the same endpoint (FIFO)
  const req = res.request();                        // exact identity, no guesswork
  const pending = calls.find(c => c.req === req);
  if (!pending) return;
  pending.done = true;
  let body = null;
  try { body = await res.json(); } catch { return; }
  const keys = Object.keys(body);
  const arrs = {};
  for (const k of keys) if (Array.isArray(body[k])) arrs[k] = body[k].length;
  pending.body = { ok: body.ok !== false, keys, arrays: arrs, error: typeof body.error === 'string' ? body.error.slice(0, 90) : null };
});
let errs = [];
page.on('pageerror', e => errs.push(String(e.stack || e.message).split('\n').slice(0, 2).join(' | ').slice(0, 200)));

const EMAIL = process.env.PREVIEW_EMAIL, PASS = process.env.PREVIEW_PASS;
if (!EMAIL || !PASS) { console.error('Set PREVIEW_EMAIL and PREVIEW_PASS.'); process.exit(2); }
await page.goto(BASE + '/admin/', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 900));
await page.$eval('#l-email', e => e.value = '');
await page.$eval('#l-pass', e => e.value = '');
await page.type('#l-email', EMAIL); await page.type('#l-pass', PASS);
await page.click('#l-btn');
await page.waitForFunction(() => document.querySelector('#auth') && document.querySelector('#auth').hidden, { timeout: 20000 });
await new Promise(r => setTimeout(r, 800));

const rows = [];
for (const route of list) {
  calls = []; errs = [];
  await page.evaluate(r => { location.hash = '#/' + r; }, route);
  await new Promise(r => setTimeout(r, 2600));
  const view = await page.evaluate(() => {
    const v = document.querySelector('#view');
    const txt = v ? v.textContent.replace(/\s+/g, ' ') : '';
    return {
      h1: v && v.querySelector('h1') ? v.querySelector('h1').textContent.trim() : null,
      loading: /Loading…/.test(txt),
      textLen: txt.length,
      empties: v ? [...v.querySelectorAll('.empty, .sp-empty')].map(e => e.textContent.trim().slice(0, 40)).slice(0, 2) : [],
    };
  });
  const POLL = new Set(['leads_count', 'appr_count', 'chat_list']);   // background badges, not screen data
  const api = calls.filter(c => c.body).map(c => ({
    action: c.action, poll: POLL.has(c.action), ok: c.body.ok, keys: c.body.keys,
    arrays: c.body.arrays, error: c.body.error,
  }));
  rows.push({ route, ...view, api, pageErrors: [...new Set(errs)] });
  const emptyish = api.filter(a => a.ok && Object.values(a.arrays || {}).every(n => n === 0) && Object.keys(a.arrays || {}).length);
  console.log(`${view.loading ? 'STUCK ' : 'ok    '}${route.padEnd(12)} h1=${String(view.h1).padEnd(22)} api=${String(api.length).padStart(2)} ${emptyish.length ? 'empty-lists:' + emptyish.map(e => e.action).join(',') : ''}${errs.length ? ' ERRORS:' + errs.length : ''}`);
  for (const a of api) {
    if (a.poll) continue;
    const arr = Object.entries(a.arrays || {}).map(([k, n]) => `${k}=${n}`).join(' ');
    console.log(`        · ${a.action.padEnd(20)} ${a.ok === false ? 'FAIL ' + (a.error || '') : 'keys:' + a.keys.join(',')}${arr ? '  [' + arr + ']' : ''}`);
  }
  if (errs.length) errs.forEach(e => console.log(`        ! ${e}`));
}

fs.writeFileSync(path.join(OUT, 'cms-audit.json'), JSON.stringify({ at: new Date().toISOString(), base: BASE, groups: GROUPS, rows }, null, 2));
const stuck = rows.filter(r => r.loading).length;
const bad = rows.filter(r => r.pageErrors.length).length;
const fails = rows.flatMap(r => r.api.filter(a => a.ok === false).map(a => `${r.route}/${a.action}`));
console.log(`\nSUMMARY ${rows.length} routes · stuck=${stuck} · with-page-errors=${bad} · failing-api-calls=${fails.length ? fails.join(', ') : 0}`);
console.log('report:', path.join(OUT, 'cms-audit.json'));
await browser.close();
