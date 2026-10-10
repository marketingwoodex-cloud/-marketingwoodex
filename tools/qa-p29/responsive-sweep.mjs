// Responsive sweep: loads every admin NAV route at a phone width and reports horizontal overflow.
// Usage: PREVIEW_PASS=... node responsive-sweep.mjs <baseUrl> <outFile.jsonl> [width]
// Overflow = an element whose right edge passes the viewport and is not inside a horizontal scroll container.
// Prints screen names, pixel overflow and selectors only. Never prints the password.
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

const base = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
const outFile = process.argv[3] || '/tmp/responsive.jsonl';
const width = parseInt(process.argv[4] || '390', 10);
const PREVIEW_EMAIL = process.env.PREVIEW_EMAIL || 'preview@woodex.test';
const PREVIEW_PASS = process.env.PREVIEW_PASS || '';
if (!PREVIEW_PASS) { console.log('FAIL: set PREVIEW_PASS'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Route ids come from the NAV array in admin.js (same parse as theme-contrast.mjs).
const adminJs = path.join(path.dirname(new URL(import.meta.url).pathname), '../../woodex-live-p29-v2.1-pro/admin/admin.js');
const src = fs.readFileSync(adminJs, 'utf8');
const i = src.indexOf('var NAV = ['); const j = src.indexOf('];', i);
const ids = [...new Set([...src.slice(i, j).matchAll(/\["([a-z][a-z0-9_-]*)", "[^"]*"/g)].map(m => m[1]))];

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { localStorage.setItem('wxaTheme', 'light'); });
await page.setRequestInterception(true);
page.on('request', req => { const u = new URL(req.url()); if (u.hostname === '127.0.0.1') return req.continue(); return req.abort(); });

await page.goto(base + '/admin/', { waitUntil: 'load' }); await sleep(1200);
await page.$eval('#l-email', e => { e.value = ''; }); await page.$eval('#l-pass', e => { e.value = ''; });
await page.type('#l-email', PREVIEW_EMAIL); await page.type('#l-pass', PREVIEW_PASS);
await page.click('#l-btn'); await sleep(1800);

const MEASURE = () => {
  const vw = document.documentElement.clientWidth;
  const inScroller = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
  const sel = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''));
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.side')) continue; // mobile sidebar is a hidden drawer
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 && !inScroller(el)) bad.push({ sel: sel(el), right: Math.round(r.right) });
  }
  return { vw, docOverflow: Math.max(0, document.documentElement.scrollWidth - vw), offenders: bad.length, sample: bad.slice(0, 3) };
};

const out = fs.createWriteStream(outFile);
const counts = { screens: 0, withOverflow: 0 };
for (const id of ids) {
  await page.evaluate(h => { location.hash = h; }, '#/' + id); await sleep(1100);
  const m = await page.evaluate(MEASURE).catch(e => ({ error: String(e.message).slice(0, 80) }));
  counts.screens++;
  if (m.docOverflow > 0 || m.offenders > 0) counts.withOverflow++;
  out.write(JSON.stringify({ screen: id, width, ...m }) + '\n');
}
out.end();
console.log(JSON.stringify(counts));
await browser.close();
