// Design-batch check for woodex-live-p29-v2.1-pro (headless Chromium, preview stub API). QA only.
//
// Covers the U1–U3 / AS-27 / AS-28 / OV-2 / AU-10 batch:
//   1. every route below renders in both themes without a page error;
//   2. the dashboard chart is painted from the theme tokens and REPAINTS when the theme flips
//      (canvas pixels before/after, not the CSS source) — OV-2 / AD-18;
//   3. the AI Assistant tab strip has real icon-to-label spacing — AU-10;
//   4. which inline `style="…#hex"` literals are still painted — the U2/AS-30 hit list.
//
// Usage: PREVIEW_PASS=<preview password> node ui-design-batch.mjs [baseUrl] [outDir]
// Prints a one-line summary and writes <outDir>/report.json plus one PNG per route and theme.
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

const base = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = process.argv[3] || '/tmp/ui-design-batch';
const PREVIEW_EMAIL = process.env.PREVIEW_EMAIL || '';
const PREVIEW_PASS = process.env.PREVIEW_PASS || '';
if (!PREVIEW_PASS) { console.log('FAIL: set PREVIEW_PASS'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ROUTES = ['dashboard', 'train', 'aicenter', 'security', 'settings', 'backups'];

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
fs.mkdirSync(outDir, { recursive: true });
const report = { base, routes: {}, chart: {}, tabs: {}, literals: {}, pageErrors: [] };

// ------------------------------------------------------------------ helpers
const setTheme = (page, mode) => page.evaluate(m => {
  const d = document.documentElement;
  d.classList.toggle('dark', m === 'dark');
  try { localStorage.setItem('wxaTheme', m); } catch (e) {}
}, mode);

// Mean colour of the "chart ink": pixels that differ from the page background, averaged.
const inkColour = sel => {
  const cv = document.querySelector(sel);
  if (!cv) return { error: 'no canvas' };
  const ctx = cv.getContext('2d');
  const { width: w, height: h } = cv;
  const d = ctx.getImageData(0, 0, w, h).data;
  let r = 0, g = 0, b = 0, n = 0, darkest = { l: 999, c: null };
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 40) continue;
    const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    if (sat > 30) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; if (lum < darkest.l) darkest = { l: lum, c: [d[i], d[i + 1], d[i + 2]] }; }
  }
  return n ? { rgb: [Math.round(r / n), Math.round(g / n), Math.round(b / n)], pixels: n, strongest: darkest.c } : { error: 'no coloured pixels' };
};

// Icon-to-label gap inside a segmented control (AU-10): range over the text node, minus the icon box.
const tabGaps = sel => [...document.querySelectorAll(sel + ' button')].map(b => {
  const icon = b.querySelector('i[data-i]');
  const node = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
  if (!icon || !node) return { label: b.textContent.trim(), gap: null };
  const r = document.createRange(); r.selectNodeContents(node);
  const rb = r.getBoundingClientRect(), ib = icon.getBoundingClientRect();
  return { label: b.textContent.trim(), gap: Math.round((rb.left - ib.right) * 10) / 10, iconW: Math.round(ib.width) };
});

const inlineLiterals = () => {
  const hits = [];
  document.querySelectorAll('[style]').forEach(el => {
    const m = (el.getAttribute('style') || '').match(/#[0-9a-fA-F]{3,8}\b/g);
    if (m) m.forEach(c => hits.push({ sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''), colour: c.toLowerCase() }));
  });
  const counts = {};
  hits.forEach(h => { counts[h.colour] = (counts[h.colour] || 0) + 1; });
  return { total: hits.length, byColour: counts, sample: hits.slice(0, 8) };
};

// ------------------------------------------------------------------ run
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 160)));
await page.setRequestInterception(true);
page.on('request', req => { const u = new URL(req.url()); return u.hostname === '127.0.0.1' ? req.continue() : req.abort(); });

await page.goto(base + '/admin/', { waitUntil: 'load' });
await sleep(1200);
// sign-in page in both themes (the gold login button is now a token)
for (const mode of ['light', 'dark']) {
  await setTheme(page, mode);
  await sleep(300);
  await page.screenshot({ path: path.join(outDir, 'login-' + mode + '.png') });
}
await setTheme(page, 'light');
await page.$eval('#l-email', e => { e.value = ''; });
await page.$eval('#l-pass', e => { e.value = ''; });
await page.type('#l-email', PREVIEW_EMAIL);
await page.type('#l-pass', PREVIEW_PASS);
await page.click('#l-btn');
await sleep(2200);

for (const mode of ['light', 'dark']) {
  await setTheme(page, mode);
  for (const route of ROUTES) {
    await page.evaluate(r => { location.hash = '#/' + r; }, route);
    await sleep(route === 'dashboard' ? 2600 : 1500);
    const info = await page.evaluate(() => ({ heading: (document.querySelector('#view h1, #view .ph h1') || {}).textContent || '', palette: !!(window.WXPalette && window.WXPalette.palette), keys: window.WXPalette ? window.WXPalette.keys() : [] }));
    report.routes[route + ':' + mode] = info;
    report.literals[route + ':' + mode] = await page.evaluate(inlineLiterals);
    if (route === 'train') report.tabs[mode] = await page.evaluate(tabGaps, '#ai-subnav');
    await page.screenshot({ path: path.join(outDir, route + '-' + mode + '.png'), fullPage: false });
  }
}

// ---- chart: does it repaint on a theme flip, and with the theme tokens? (OV-2 / AD-18)
await page.evaluate(() => { location.hash = '#/dashboard'; });
await setTheme(page, 'light');
await sleep(3000);
report.chart.light = await page.evaluate(inkColour, '#dx-ch');
await page.click('#dark-btn');
await sleep(2500);
report.chart.dark = await page.evaluate(inkColour, '#dx-ch');
report.chart.repainted = !!(report.chart.light.rgb && report.chart.dark.rgb) &&
  (Math.abs(report.chart.light.rgb[2] - report.chart.dark.rgb[2]) > 8 || Math.abs(report.chart.light.rgb[0] - report.chart.dark.rgb[0]) > 8);
report.chart.hint = 'light ~ [37,99,235] blue-600, dark ~ [96,165,250] blue-400 when the tokens are used';
report.pageErrors = pageErrors;

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ chart: report.chart, tabs: report.tabs, pageErrors: pageErrors.length }, null, 2));
console.log('report: ' + path.join(outDir, 'report.json'));
await browser.close();
