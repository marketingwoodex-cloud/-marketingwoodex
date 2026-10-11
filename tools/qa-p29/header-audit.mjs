// Page-header / KPI consistency probe for the admin (headless Chromium, preview stub API). QA only.
//
// U1.1 / U1.2: "page title bar: H1 24px/600, breadcrumb, toolbar gap" and "KPI row: 4-up grid,
// 18px padding, tabular numbers, tinted icon". This measures what each route actually renders
// instead of reading the CSS: H1 size/weight/margin, whether a breadcrumb follows it, whether the
// header carries a toolbar, and the KPI tiles (count, columns, tabular-nums, padding, icon tint).
//
// Usage: PREVIEW_PASS=<preview password> node header-audit.mjs [baseUrl] [outDir]
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

const base = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = process.argv[3] || '/tmp/header-audit';
const PREVIEW_EMAIL = process.env.PREVIEW_EMAIL || '';
const PREVIEW_PASS = process.env.PREVIEW_PASS || '';
if (!PREVIEW_PASS) { console.log('FAIL: set PREVIEW_PASS'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
fs.mkdirSync(outDir, { recursive: true });

const src = fs.readFileSync('/home/user/-marketingwoodex/woodex-live-p29-v2.1-pro/admin/admin.js', 'utf8');
const i = src.indexOf('var NAV = ['), j = src.indexOf('];', i);
const ROUTES = [...new Set([...src.slice(i, j).matchAll(/\["([a-z][a-z0-9_-]*)", "[^"]*"/g)].map(m => m[1]))];

// runs in the page
const MEASURE = () => {
  const px = v => Math.round(parseFloat(v) * 10) / 10;
  const out = { route: location.hash.replace(/^#\//, ''), h1: null, crumb: false, toolbar: false, kpi: null };
  const view = document.querySelector('#view');
  if (!view) return out;
  // the page header may be `.ph` (P29 screens) or `.page-header` / `.header-title-row`
  const h1 = view.querySelector('h1');
  if (h1) {
    const cs = getComputedStyle(h1);
    const r = h1.getBoundingClientRect();
    out.h1 = { text: (h1.textContent || '').trim().slice(0, 32), size: px(cs.fontSize), weight: cs.fontWeight, spacing: cs.letterSpacing, color: cs.color, top: Math.round(r.top), left: Math.round(r.left) };
    const ph = h1.closest('.ph, .page-header, .header-title-row, .card-h, header');
    out.crumb = !!(ph && ph.querySelector('.crumb, .breadcrumb, .bc'));
    out.toolbar = !!(ph && ph.querySelector('.toolbar, .ph-act, .page-actions, .btn, a.btn, button.btn'));
  }
  // KPI tiles: `.kpi` (classic) or `.dx-kpi` (smart dashboard)
  const tiles = [...view.querySelectorAll('.kpi, .dx-kpi')];
  if (tiles.length) {
    const first = tiles[0], cs = getComputedStyle(first);
    const grid = first.parentElement ? getComputedStyle(first.parentElement) : null;
    const val = first.querySelector('.v, b');
    const icon = first.querySelector('.kpi-ic, i[data-i]');
    out.kpi = {
      count: tiles.length,
      columns: grid ? grid.gridTemplateColumns.split(' ').length : null,
      gap: grid ? grid.gap : null,
      padding: cs.padding,
      radius: cs.borderRadius,
      valueTabular: val ? getComputedStyle(val).fontVariantNumeric : null,
      valueWeight: val ? getComputedStyle(val).fontWeight : null,
      iconTinted: icon ? getComputedStyle(icon).color : null,
      rowsDistinctTop: [...new Set(tiles.map(t => Math.round(t.getBoundingClientRect().top)))].length
    };
  }
  return out;
};

const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 120)));
await page.setRequestInterception(true);
page.on('request', r => new URL(r.url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
await page.goto(base + '/admin/', { waitUntil: 'load' });
await sleep(1200);
await page.$eval('#l-email', e => { e.value = ''; });
await page.$eval('#l-pass', e => { e.value = ''; });
await page.type('#l-email', PREVIEW_EMAIL);
await page.type('#l-pass', PREVIEW_PASS);
await page.click('#l-btn');
await sleep(2200);

const rows = [];
for (const route of ROUTES) {
  await page.evaluate(r => { location.hash = '#/' + r; }, route);
  await sleep(route === 'dashboard' ? 2200 : 1100);
  rows.push(await page.evaluate(MEASURE));
}

const withH1 = rows.filter(r => r.h1);
const bad = withH1.filter(r => r.h1.size !== 24 || (r.h1.weight !== '600' && r.h1.weight !== '700'));
const noCrumb = withH1.filter(r => !r.crumb);
const kpiRoutes = rows.filter(r => r.kpi);
const badKpi = kpiRoutes.filter(r => !/tabular-nums/.test(r.kpi.valueTabular || '') || r.kpi.columns !== 4);

console.log(`routes: ${rows.length} | with H1: ${withH1.length} | header size/weight off: ${bad.length} | no breadcrumb: ${noCrumb.length}`);
if (bad.length) bad.forEach(r => console.log(`  SIZE  ${r.route}  ${r.h1.size}px/${r.h1.weight}  "${r.h1.text}"`));
if (noCrumb.length) console.log('  no breadcrumb: ' + noCrumb.map(r => r.route).join(', '));
console.log(`KPI routes: ${kpiRoutes.length} | not 4-up or not tabular: ${badKpi.length}`);
kpiRoutes.forEach(r => console.log(`  KPI   ${r.route.padEnd(12)} tiles=${r.kpi.count} cols=${r.kpi.columns} gap=${r.kpi.gap} pad=${r.kpi.padding} tabular=${r.kpi.valueTabular} icon=${r.kpi.iconTinted}`));

fs.writeFileSync(path.join(outDir, 'headers.json'), JSON.stringify({ routes: rows, pageErrors }, null, 2));
console.log('report: ' + path.join(outDir, 'headers.json'));
await browser.close();
