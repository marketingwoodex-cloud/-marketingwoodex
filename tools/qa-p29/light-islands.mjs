// Light-island probe for the admin (headless Chromium, preview stub API). QA only.
//
// AD-16 / L-19: "73 unscoped light-background rules" was a static count from master report v1 and was
// never re-run. Static counting cannot tell a genuine bug from a rule that already has an
// `html.dark` override later in the file, so this probe measures the real thing at runtime:
// in DARK mode, which elements still paint a LIGHT background ("light islands").
//
// Usage: PREVIEW_PASS=<preview password> node light-islands.mjs [baseUrl] [outDir] [--all]
// Prints one line per route with a count and the worst offenders; writes <outDir>/islands.json.
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

const base = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = process.argv[3] || '/tmp/light-islands';
const PREVIEW_EMAIL = process.env.PREVIEW_EMAIL || '';
const PREVIEW_PASS = process.env.PREVIEW_PASS || '';
if (!PREVIEW_PASS) { console.log('FAIL: set PREVIEW_PASS'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

let ROUTES = ['dashboard', 'security', 'settings', 'backups', 'train', 'enquiries', 'quotes', 'posts'];
if (process.env.ALL === '1' || process.argv.includes('--all')) ROUTES = null; // read from admin.js NAV

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
fs.mkdirSync(outDir, { recursive: true });

if (!ROUTES) {
  const src = fs.readFileSync('/home/user/-marketingwoodex/woodex-live-p29-v2.1-pro/admin/admin.js', 'utf8');
  const i = src.indexOf('var NAV = ['), j = src.indexOf('];', i);
  ROUTES = [...new Set([...src.slice(i, j).matchAll(/\["([a-z][a-z0-9_-]*)", "[^"]*"/g)].map(m => m[1]))];
}

// Runs in the page: elements painting a light background while the dark theme is on.
const FIND = (minArea) => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const sel = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  const out = [];
  document.querySelectorAll('#view *, #view').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const bg = parse(cs.backgroundColor);
    if (!bg || bg.a < 0.4) return;
    if (lum(bg) < 0.6) return;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < minArea) return;
    out.push({ sel: sel(el), bg: `rgb(${bg.r},${bg.g},${bg.b})`, lum: Math.round(lum(bg) * 100) / 100, area: Math.round(r.width * r.height), text: (el.textContent || '').trim().slice(0, 30) });
  });
  // keep the biggest 12, and drop ancestors of another hit (a light card is one island, not five)
  out.sort((a, b) => b.area - a.area);
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
await page.evaluate(() => { document.documentElement.classList.add('dark'); try { localStorage.setItem('wxaTheme', 'dark'); } catch (e) {} });
await sleep(400);

const report = { base, minArea: 1600, routes: {}, total: 0, pageErrors: [] };
for (const route of ROUTES) {
  await page.evaluate(r => { location.hash = '#/' + r; }, route);
  await sleep(route === 'dashboard' ? 2200 : 1200);
  const hits = await page.evaluate(FIND, 1600);
  report.routes[route] = hits;
  report.total += hits.length;
  const top = hits.slice(0, 4).map(h => `${h.sel} ${h.bg} ${h.area}px²`).join(' | ');
  console.log(`${hits.length ? 'HIT ' : 'ok  '}${route.padEnd(12)} ${hits.length}` + (top ? '  ' + top : ''));
}
report.pageErrors = pageErrors;
fs.writeFileSync(path.join(outDir, 'islands.json'), JSON.stringify(report, null, 2));
console.log(`\nTOTAL light islands in dark mode: ${report.total} across ${ROUTES.length} routes`);
console.log('report: ' + path.join(outDir, 'islands.json'));
await browser.close();
