/* Sales look probe — measures the §8.2 table/badge treatment on every sales
   route in BOTH light and dark mode, and screenshots each one.

   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node saleslook.mjs [base] [outdir]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/saleslook';
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
const page = await browser.newPage(); const errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 150)));
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) { await page.type('#l-email', process.env.PREVIEW_EMAIL); await page.type('#l-pass', process.env.PREVIEW_PASS); await page.click('#l-btn'); }
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

const routes = ['enquiries', 'pipeline', 'clients', 'quotes', 'invoices', 'transactions', 'projects', 'bookings', 'gantt', 'templates'];
const res = {};

const MEASURE = () => {
  const v = document.querySelector('#view') || document.body;
  const cs = el => (el ? getComputedStyle(el) : null);
  const th = v.querySelector('table.tbl thead th');
  const td = v.querySelector('table.tbl tbody td');
  const wrap = v.querySelector('.tbl-wrap');
  const ths = cs(th), tds = cs(td), ws = cs(wrap);

  const parse = c => { const m = (c || '').match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
  const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = p => 0.2126 * lin(p.r / 255) + 0.7152 * lin(p.g / 255) + 0.0722 * lin(p.b / 255);
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const bgOf = el => { let n = el; while (n && n !== document.documentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.05) return c; n = n.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

  // badges: measured contrast, so a dark-mode badge can't silently lose legibility
  const badges = [];
  for (const b of [...v.querySelectorAll('.badge')].slice(0, 8)) {
    const s = getComputedStyle(b);
    const fg = parse(s.color), bg = bgOf(b);
    if (fg) badges.push({ cls: b.className.slice(0, 40), ratio: +ratio(over(fg, bg), bg).toFixed(2), bg: s.backgroundColor });
  }

  return {
    dark: document.documentElement.classList.contains('dark'),
    pageBg: getComputedStyle(document.body).backgroundColor,
    h1: (v.querySelector('h1') || {}).textContent || null,
    hasTable: !!th,
    th: ths && { pad: ths.padding, transform: ths.textTransform, weight: ths.fontWeight, size: ths.fontSize, color: ths.color, bg: ths.backgroundColor, border: ths.borderBottomWidth },
    td: tds && { pad: tds.padding, color: tds.color, border: tds.borderBottomWidth },
    wrap: ws && { radius: ws.borderRadius, border: ws.borderWidth, bg: ws.backgroundColor },
    rows: v.querySelectorAll('table.tbl tbody tr').length,
    cards: v.querySelectorAll('.card .card, .kb-card, .dx-kpi').length,
    badgeCount: v.querySelectorAll('.badge').length,
    badges,
  };
};

for (const mode of ['light', 'dark']) {
  await page.evaluate(m => { localStorage.setItem('hs_theme', m); localStorage.setItem('wxaTheme', m); }, mode);
  res[mode] = {};
  /* Hash-only navigation is same-document: force a real load per mode so the
     theme bootstrap actually runs (otherwise "dark" silently measures light). */
  await page.goto(`${BASE}/admin/?theme=${mode}&t=${Date.now()}#/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(m => document.documentElement.classList.contains('dark') === (m === 'dark'), { timeout: 20000 }, mode)
    .catch(() => { console.log(`!! ${mode}: theme class did not apply`); });
  for (const r of routes) {
    await page.goto(`${BASE}/admin/?theme=${mode}#/${r}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#nav', { timeout: 25000 });
    await new Promise(x => setTimeout(x, 2400));
    const m = await page.evaluate(MEASURE);
    if (m.dark !== (mode === 'dark')) m.wrongMode = true;
    res[mode][r] = m;
    await page.screenshot({ path: path.join(OUT, `${mode}-${r}.png`) });
  }
}

fs.writeFileSync(path.join(OUT, 'saleslook.json'), JSON.stringify({ base: BASE, pageErrors: errs, res }, null, 1));
for (const mode of ['light', 'dark']) {
  console.log(`\n===== ${mode.toUpperCase()} =====`);
  console.log('route          th bg                     th pad      th tf   td pad      wrap r  rows badges  badge contrast');
  for (const r of routes) {
    const m = res[mode][r];
    const bmin = m.badges.length ? Math.min(...m.badges.map(b => b.ratio)) : null;
    console.log(`${r.padEnd(14)} ${String(m.th ? m.th.bg : '—').padEnd(24)} ${String(m.th ? m.th.pad : '—').padEnd(11)} ${String(m.th ? m.th.transform : '—').padEnd(7)} ${String(m.td ? m.td.pad : '—').padEnd(11)} ${String(m.wrap ? m.wrap.radius : '—').padEnd(7)} ${String(m.rows).padStart(4)} ${String(m.badgeCount).padStart(6)}  ${bmin === null ? '—' : (bmin < 4.5 ? `FAIL ${bmin}` : `ok ${bmin}`)}`);
  }
}
console.log('\npageErrors:', errs.length, errs.slice(0, 3));
await browser.close();
