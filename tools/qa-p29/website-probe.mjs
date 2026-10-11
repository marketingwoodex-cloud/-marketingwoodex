/**
 * Website-area probe — the screens the owner reported as dead ends.
 *
 * For each route it reports what actually rendered: the visible heading, whether a
 * "No builder access" refusal is on screen, row/card counts, the API actions the screen
 * asked for, and any page error. Also checks the invoice tracker's status chips, which
 * were reported as showing zero for every state.
 *
 * Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node website-probe.mjs [baseUrl] [outDir]
 */
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/site-probe';
const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const EMAIL = process.env.PREVIEW_EMAIL || '';
const PASS = process.env.PREVIEW_PASS || '';
const ROUTES = (process.env.ROUTES || 'pages,builder,library,global,heroes,redirects,telegram,timeline,invoices').split(',');

const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 950 },
});
fs.mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
let api = [], errs = [];
page.on('pageerror', e => errs.push(String(e.stack || e.message).slice(0, 240)));
page.on('request', r => {
  const u = new URL(r.url());
  if (u.pathname.endsWith('/api/admin.php') && r.method() === 'POST') {
    try { api.push(JSON.parse(r.postData() || '{}').action || '?'); } catch { api.push('?'); }
  }
});

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 20000 });
if (!await page.evaluate(() => sessionStorage.getItem('wxaTok'))) {
  await page.type('#l-email', EMAIL); await page.type('#l-pass', PASS); await page.click('#l-btn');
  await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 25000 });
}

const out = [];
for (const route of ROUTES) {
  api = []; errs = [];
  await page.evaluate(h => { location.hash = h; }, '#/' + route);
  await new Promise(r => setTimeout(r, 2600));
  const st = await page.evaluate(() => {
    const v = document.querySelector('#view');
    const txt = (v ? v.textContent : '').replace(/\s+/g, ' ').trim();
    const btn = s => [...document.querySelectorAll(s)].filter(b => b.offsetParent !== null).length;
    return {
      hash: location.hash,
      heading: ((v ? v.querySelector('h1') : null) || {}).textContent || '',
      noBuilderAccess: /No builder access/i.test(txt),
      checking: /Checking your builder access/i.test(txt),
      // A screen is only stuck when it shows the placeholder and has rendered nothing else:
      // gallery screens keep a "Loading…" label while their tiles stream in.
      loading: /Loading…/.test(txt) && !v.querySelector('img, tbody tr'),
      rows: (v ? v.querySelectorAll('tbody tr').length : 0),
      cards: (v ? v.querySelectorAll('.card').length : 0),
      buttons: btn('#view button, #view a.btn'),
      chips: [...document.querySelectorAll('#it-st button, #it-st [data-t]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()).slice(0, 6),
      text: txt.slice(0, 150),
    };
  });
  st.api = [...new Set(api)];
  st.errors = errs.slice(0, 2);
  out.push(st);
  await page.screenshot({ path: path.join(OUT, route + '.png') });
  console.log(route.padEnd(11), st.heading.slice(0, 34).padEnd(36), 'rows=' + String(st.rows).padEnd(3),
    'cards=' + String(st.cards).padEnd(3), 'btns=' + String(st.buttons).padEnd(3),
    st.noBuilderAccess ? 'NO-BUILDER-ACCESS' : '', st.loading ? 'STUCK-LOADING' : '',
    st.errors.length ? 'ERR ' + st.errors[0].slice(0, 70) : '');
  if (st.chips.length) console.log('            chips:', JSON.stringify(st.chips));
}
fs.writeFileSync(path.join(OUT, 'website-probe.json'), JSON.stringify(out, null, 2));
await browser.close();
