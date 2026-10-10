// Rendered-contrast check for the admin in light and dark (headless Chromium, preview stub API).
// Usage: PREVIEW_PASS=... node theme-contrast.mjs <baseUrl> <outDir>
// For each screen and theme: screenshot + every visible text element's computed colour vs its effective
// background (walking up ancestors). Prints counts, worst pairs (selector + ratio) and the sidebar/body colours.
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

const base = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = process.argv[3] || '/tmp/theme-shots';
const PREVIEW_PASS = process.env.PREVIEW_PASS || '';
const PREVIEW_EMAIL = process.env.PREVIEW_EMAIL || 'preview@woodex.test';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let SCREENS = [['dashboard', '#/dashboard'], ['settings', '#/settings/integrations'], ['security', '#/security'], ['approvals', '#/approvals']];
// ALL=1: every route id listed in the admin NAV (read from admin.js), in both themes.
// ADMIN_JS overrides the admin.js path. Writes per-screen JSON to <outDir>/results.json.
if (process.env.ALL === '1') {
  const adminJs = process.env.ADMIN_JS || path.join(path.dirname(new URL(import.meta.url).pathname), '../../woodex-live-p29-v2.1-pro/admin/admin.js');
  const src = fs.readFileSync(adminJs, 'utf8');
  const i = src.indexOf('var NAV = ['); const j = src.indexOf('];', i);
  const ids = [...new Set([...src.slice(i, j).matchAll(/\["([a-z][a-z0-9_-]*)", "[^"]*"/g)].map(m => m[1]))];
  SCREENS = ids.map(id => [id, '#/' + id]);
}

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1280, height: 900 } });
fs.mkdirSync(outDir, { recursive: true });

// Runs inside the page: returns text-element contrast pairs and key colours.
const AUDIT = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a) + 0.05, y = lum(b) + 0.05; return x > y ? x / y : y / x; };
  const bgOf = el => { let e = el; while (e && e !== document.documentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; e = e.parentElement; } return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }; };
  const sel = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  const pairs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let el;
  while ((el = walker.nextNode())) {
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(el);
    const fa = fg.a < 1 ? { ...fg, a: 1 } : fg;
    pairs.push({ sel: sel(el), ratio: Math.round(ratio(fa, bg) * 100) / 100, fg: cs.color, bg: `rgb(${bg.r},${bg.g},${bg.b})`, size: parseFloat(cs.fontSize), weight: +cs.fontWeight });
  }
  const sideBg = getComputedStyle(document.querySelector('.side') || document.body).backgroundColor;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const cardBg = (document.querySelector('.card') && getComputedStyle(document.querySelector('.card')).backgroundColor) || 'n/a';
  return { pairs, sideBg, bodyBg, cardBg, dark: document.documentElement.classList.contains('dark') };
};

const results = [];
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 100)));
  await page.setRequestInterception(true);
  page.on('request', req => { const u = new URL(req.url()); if (u.hostname === '127.0.0.1') return req.continue(); return req.abort(); });
  await page.evaluateOnNewDocument(t => { localStorage.setItem('wxaTheme', t); }, theme);
  await page.goto(base + '/admin/', { waitUntil: 'load' }); await sleep(1200);
  await page.$eval('#l-email', e => { e.value = ''; }); await page.$eval('#l-pass', e => { e.value = ''; });
  await page.type('#l-email', PREVIEW_EMAIL); await page.type('#l-pass', PREVIEW_PASS);
  await page.click('#l-btn'); await sleep(1800);
  for (const [name, hash] of SCREENS) {
    await page.evaluate(h => { location.hash = h; }, hash); await sleep(1400);
    const a = await page.evaluate(AUDIT);
    const under45 = a.pairs.filter(p => p.ratio < 4.5);
    const worst = [...a.pairs].sort((x, y) => x.ratio - y.ratio).slice(0, 3);
    const failSel = [...new Map(under45.map(p => [p.sel + ' ' + p.fg + ' on ' + p.bg, p])).values()].slice(0, 12).map(p => `${p.sel} ${p.ratio} ${p.fg} on ${p.bg}`);
    results.push({ theme, screen: name, failSel, textElements: a.pairs.length, belowAA: under45.length, worst, sidebar: a.sideBg, body: a.bodyBg, card: a.cardBg, dark: a.dark, pageErrors: errors.length });
    await page.screenshot({ path: path.join(outDir, `${theme}-${name}.png`) });
  }
  await page.close();
}
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 1));
for (const r of results) console.log(JSON.stringify(r));
if (process.env.ALL === '1') {
  for (const t of ['light', 'dark']) {
    const rs = results.filter(r => r.theme === t);
    const bad = rs.filter(r => r.belowAA > 0).map(r => r.screen + ':' + r.belowAA);
    const errs = rs.filter(r => r.pageErrors > 0).map(r => r.screen);
    const thin = rs.filter(r => r.textElements < 5).map(r => r.screen);
    console.log(`SUMMARY ${t}: screens=${rs.length} belowAA_screens=${bad.length} [${bad.join(' ')}] pageError_screens=${errs.length} [${errs.join(' ')}] thin_screens=${thin.length} [${thin.join(' ')}]`);
  }
}
await browser.close();
process.exit(0);
